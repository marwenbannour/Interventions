import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Brackets, DataSource, EntityManager, Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { Permission, roleHasPermission } from '../../common/enums/permission.enum';
import { Role } from '../../common/enums/role.enum';
import { EventSource, PhotoType } from '../../common/enums/task.enums';
import { Events, TaskAssignedPayload, TaskEventPayload, TaskTransitionedPayload, WorkflowNotifyPayload } from '../../common/events';
import { AuthUser } from '../../common/types/auth-user';
import { toPoint } from '../../common/utils/geo';
import { AgentProfile, AgentStatus } from '../agents/entities/agent-profile.entity';
import { Site } from '../clients/entities/site.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { Photo } from '../photos/entities/photo.entity';
import { SlaService } from '../sla/sla.service';
import { User } from '../users/entities/user.entity';
import { WorkflowDefinition } from '../workflows/entities/workflow-definition.entity';
import { WorkflowEngineService } from '../workflows/workflow-engine.service';
import { Milestone, WorkflowAction } from '../workflows/workflow.types';
import { ChecklistUpdateDto, CreateTaskDto, NoteDto, TaskQueryDto, TransitionDto, UpdateTaskDto } from './dto/task.dto';
import { Task } from './entities/task.entity';
import { TaskEvent } from './entities/task-event.entity';

const MILESTONE_FIELD: Record<Milestone, keyof Task> = {
  PLANNED: 'plannedAt',
  ASSIGNED: 'assignedAt',
  ACCEPTED: 'acceptedAt',
  EN_ROUTE: 'enRouteAt',
  ARRIVED: 'arrivedAt',
  STARTED: 'startedAt',
  COMPLETED: 'completedAt',
  EVALUATED: 'evaluatedAt',
  CANCELLED: 'cancelledAt',
};

export const TERMINAL_STATUSES = ['COMPLETED', 'EVALUATED', 'CANCELLED'];

export interface TransitionOptions {
  source?: EventSource;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(TaskEvent) private readonly taskEvents: Repository<TaskEvent>,
    private readonly ds: DataSource,
    private readonly engine: WorkflowEngineService,
    private readonly sla: SlaService,
    private readonly orgs: OrganizationsService,
    private readonly events: EventEmitter2,
  ) {}

  // =====================================================================
  // Création / lecture
  // =====================================================================

  async create(user: AuthUser, dto: CreateTaskDto): Promise<Task> {
    const orgId = user.organizationId;
    const site = await this.ds.getRepository(Site).findOne({ where: { id: dto.siteId, organizationId: orgId } });
    if (!site) throw new NotFoundException('Site introuvable');
    if (dto.parentTaskId && !(await this.tasks.exist({ where: { id: dto.parentTaskId, organizationId: orgId } }))) {
      throw new NotFoundException("Tâche d'origine introuvable");
    }
    const workflow = await this.engine.resolveForType(orgId, dto.type);

    const task = await this.ds.transaction(async (m) => {
      const t = m.create(Task, {
        organizationId: orgId,
        reference: await this.orgs.nextTaskReference(orgId, m),
        title: dto.title,
        description: dto.description,
        type: dto.type,
        priority: dto.priority,
        status: workflow.initialState,
        workflowId: workflow.id,
        clientId: site.clientId,
        siteId: site.id,
        createdById: user.id,
        requiredSkills: dto.requiredSkills ?? [],
        checklist: (dto.checklist ?? []).map((i) => ({
          id: i.id ?? randomUUID(),
          label: i.label,
          required: i.required ?? true,
          done: false,
        })),
        parentTaskId: dto.parentTaskId ?? null,
        scheduledStart: dto.scheduledStart ? new Date(dto.scheduledStart) : null,
        scheduledEnd: dto.scheduledEnd ? new Date(dto.scheduledEnd) : null,
        estimatedDurationMin: dto.estimatedDurationMin ?? null,
      });
      t.createdAt = new Date();
      await this.sla.applyDeadlines(t, m);
      const saved = await m.save(t);
      await this.addEvent(m, saved, { type: 'CREATED', actorId: user.id, toStatus: saved.status });
      return saved;
    });

    this.events.emit(Events.TASK_CREATED, this.payload(task, user.id));
    if (dto.agentId) return this.assign(user, task.id, dto.agentId);
    return task;
  }

  async findAll(user: AuthUser, q: TaskQueryDto) {
    const qb = this.tasks
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.site', 'site')
      .leftJoinAndSelect('t.client', 'client')
      .leftJoinAndSelect('t.agent', 'agent')
      .where('t.organizationId = :orgId', { orgId: user.organizationId })
      // Jointures many-to-one uniquement → offset/limit SQL direct (pas de sous-requête DISTINCT).
      .offset((q.page - 1) * q.limit)
      .limit(q.limit);

    this.applyVisibility(qb, user);
    if (q.status) qb.andWhere('t.status IN (:...statuses)', { statuses: q.status.split(',').map((s) => s.trim()) });
    if (q.agentId) qb.andWhere('t.agentId = :agentId', { agentId: q.agentId });
    if (q.clientId) qb.andWhere('t.clientId = :clientId', { clientId: q.clientId });
    if (q.siteId) qb.andWhere('t.siteId = :siteId', { siteId: q.siteId });
    if (q.type) qb.andWhere('t.type = :type', { type: q.type });
    if (q.priority) qb.andWhere('t.priority = :priority', { priority: q.priority });
    if (q.from) qb.andWhere('COALESCE(t.scheduledStart, t.createdAt) >= :from', { from: q.from });
    if (q.to) qb.andWhere('COALESCE(t.scheduledStart, t.createdAt) <= :to', { to: q.to });
    if (q.updatedSince) qb.andWhere('t.updatedAt > :us', { us: q.updatedSince });
    if (q.active) qb.andWhere('t.status NOT IN (:...terminal)', { terminal: TERMINAL_STATUSES });
    if (q.slaBreached) {
      qb.andWhere('(t.ackBreached OR t.arrivalBreached OR t.interventionBreached OR t.closeBreached)');
    }
    if (q.search) {
      qb.andWhere(
        new Brackets((w) =>
          w.where('t.reference ILIKE :s', { s: `%${q.search}%` }).orWhere('t.title ILIKE :s').orWhere('site.name ILIKE :s'),
        ),
      );
    }
    // Priorité métier : urgentes d'abord, puis par date prévue.
    qb.orderBy(`CASE t.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 ELSE 3 END`, 'ASC')
      .addOrderBy('COALESCE(t.scheduledStart, t.createdAt)', 'ASC');

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, q);
  }

  async findOne(user: AuthUser, id: string) {
    const task = await this.tasks.findOne({
      where: { id, organizationId: user.organizationId },
      relations: { site: true, client: true, agent: true, workflow: true },
    });
    if (!task) throw new NotFoundException('Intervention introuvable');
    this.assertCanView(user, task);
    const photoCounts = await this.photoCounts(task.id);
    const settings = await this.orgs.getSettings(user.organizationId);
    const availableTransitions = this.engine.available(task.workflow, {
      task, user, site: task.site, photoCounts, defaultGeofenceMeters: settings.defaultGeofenceMeters,
    });
    return { ...task, photoCounts, availableTransitions };
  }

  async getForUser(user: AuthUser, id: string): Promise<Task> {
    const task = await this.tasks.findOne({ where: { id, organizationId: user.organizationId } });
    if (!task) throw new NotFoundException('Intervention introuvable');
    this.assertCanView(user, task);
    return task;
  }

  async history(user: AuthUser, id: string) {
    await this.getForUser(user, id);
    const rows = await this.taskEvents
      .createQueryBuilder('e')
      .leftJoin(User, 'u', 'u.id = e.actorId')
      .select('e')
      .addSelect(`u.firstName || ' ' || u.lastName`, 'actorName')
      .where('e.taskId = :id', { id })
      .orderBy('e.occurredAt', 'ASC')
      .addOrderBy('e.recordedAt', 'ASC')
      .getRawAndEntities();
    return rows.entities.map((e, i) => ({ ...e, actorName: rows.raw[i]?.actorName ?? null }));
  }

  async update(user: AuthUser, id: string, dto: UpdateTaskDto) {
    return this.ds.transaction(async (m) => {
      const task = await this.lock(m, user.organizationId, id);
      if (TERMINAL_STATUSES.includes(task.status)) throw new UnprocessableEntityException('Intervention clôturée');
      const before = { priority: task.priority, scheduledStart: task.scheduledStart };
      Object.assign(task, {
        ...dto,
        scheduledStart: dto.scheduledStart !== undefined ? new Date(dto.scheduledStart) : task.scheduledStart,
        scheduledEnd: dto.scheduledEnd !== undefined ? new Date(dto.scheduledEnd) : task.scheduledEnd,
      });
      // Priorité ou planning modifiés → recalcul des échéances SLA.
      if (task.priority !== before.priority || task.scheduledStart?.getTime() !== before.scheduledStart?.getTime()) {
        await this.sla.applyDeadlines(task, m);
      }
      const saved = await m.save(task);
      await this.addEvent(m, saved, { type: 'UPDATED', actorId: user.id, data: dto as any });
      this.events.emit(Events.TASK_UPDATED, this.payload(saved, user.id));
      return saved;
    });
  }

  // =====================================================================
  // Affectation (§6.6)
  // =====================================================================

  async assign(user: AuthUser, id: string, agentId: string) {
    const orgId = user.organizationId;
    const profile = await this.ds.getRepository(AgentProfile).findOne({ where: { organizationId: orgId, userId: agentId } });
    if (!profile) throw new BadRequestException("L'utilisateur n'est pas un agent de l'organisation");
    if (profile.status !== AgentStatus.ACTIVE) throw new UnprocessableEntityException('Agent non validé ou suspendu');

    let previousAgentId: string | null | undefined;
    const task = await this.ds.transaction(async (m) => {
      const t = await this.lock(m, orgId, id);
      if (TERMINAL_STATUSES.includes(t.status)) throw new UnprocessableEntityException('Intervention clôturée');
      const missing = t.requiredSkills.filter((s) => !profile.skills.includes(s));
      if (missing.length) {
        throw new UnprocessableEntityException({ message: 'Compétences manquantes', missing });
      }
      previousAgentId = t.agentId;
      t.agentId = agentId;
      t.assignedAt = new Date();
      await this.addEvent(m, t, { type: 'ASSIGNED', actorId: user.id, data: { agentId, previousAgentId } });

      // Passage automatique à "Assignée" si le workflow l'autorise depuis l'état courant.
      const def = await m.findOneByOrFail(WorkflowDefinition, { id: t.workflowId });
      const assignedState = def.states.find((s) => s.milestone === 'ASSIGNED');
      if (assignedState && this.engine.findTransition(def, t.status, assignedState.code, user)) {
        const from = t.status;
        t.status = assignedState.code;
        await this.addEvent(m, t, { type: 'TRANSITION', actorId: user.id, fromStatus: from, toStatus: t.status });
      } else if (previousAgentId && previousAgentId !== agentId && t.status !== assignedState?.code) {
        // Réaffectation en cours d'exécution : on revient à "Assignée" pour acceptation par le nouvel agent.
        if (assignedState && ['ACCEPTED', 'EN_ROUTE'].includes(t.status)) {
          const from = t.status;
          t.status = assignedState.code;
          t.acceptedAt = null;
          t.enRouteAt = null;
          await this.addEvent(m, t, { type: 'TRANSITION', actorId: user.id, fromStatus: from, toStatus: t.status, comment: 'Réaffectation' });
        }
      }
      return m.save(t);
    });

    const payload: TaskAssignedPayload = { ...this.payload(task, user.id), previousAgentId };
    this.events.emit(Events.TASK_ASSIGNED, payload);
    return task;
  }

  async unassign(user: AuthUser, id: string) {
    return this.ds.transaction(async (m) => {
      const t = await this.lock(m, user.organizationId, id);
      if (!['CREATED', 'PLANNED', 'ASSIGNED', 'ACCEPTED'].includes(t.status)) {
        throw new UnprocessableEntityException("Désaffectation impossible à ce stade d'exécution");
      }
      const prev = t.agentId;
      t.agentId = null;
      t.assignedAt = t.acceptedAt = null;
      const from = t.status;
      if (from !== 'CREATED') t.status = 'PLANNED';
      await this.addEvent(m, t, { type: 'UNASSIGNED', actorId: user.id, fromStatus: from, toStatus: t.status, data: { previousAgentId: prev } });
      const saved = await m.save(t);
      this.events.emit(Events.TASK_UPDATED, this.payload(saved, user.id));
      return saved;
    });
  }

  // =====================================================================
  // Transitions de workflow (§7-8)
  // =====================================================================

  async transition(user: AuthUser | 'SYSTEM', orgId: string, id: string, dto: TransitionDto, opts: TransitionOptions = {}) {
    const actorId = user === 'SYSTEM' ? null : user.id;
    const occurredAt = this.safeOccurredAt(dto.occurredAt);
    const deferred: WorkflowAction[] = [];
    let from = '';

    const task = await this.ds.transaction(async (m) => {
      const t = await this.lock(m, orgId, id);
      if (user !== 'SYSTEM') this.assertCanView(user, t);
      const def = await m.findOneByOrFail(WorkflowDefinition, { id: t.workflowId });
      const site = await m.findOneBy(Site, { id: t.siteId });
      const settings = await this.orgs.getSettings(orgId);

      const transition = this.engine.assertTransition(def, {
        task: t, user, to: dto.to, comment: dto.comment, lat: dto.lat, lng: dto.lng, site,
        photoCounts: await this.photoCounts(t.id, m),
        defaultGeofenceMeters: settings.defaultGeofenceMeters,
      });

      from = t.status;
      t.status = dto.to;

      const milestone = this.engine.state(def, dto.to)?.milestone;
      if (milestone) {
        (t as any)[MILESTONE_FIELD[milestone]] = occurredAt;
        await this.sla.onMilestone(t, milestone, occurredAt, m);
      }
      if (dto.to === 'IN_PROGRESS' && from === 'CONTROL') {
        t.completedAt = null; // reprise après contrôle non conforme
      }

      for (const action of transition.actions ?? []) {
        if (action.type === 'UNASSIGN_AGENT') {
          t.agentId = null;
          t.assignedAt = t.acceptedAt = null;
        } else deferred.push(action);
      }
      if (dto.comment && dto.to === 'COMPLETED') t.completionNotes = dto.comment;

      const saved = await m.save(t);
      await this.addEvent(m, saved, {
        type: 'TRANSITION', actorId, fromStatus: from, toStatus: dto.to, comment: dto.comment,
        location: toPoint(dto.lat, dto.lng), occurredAt, source: opts.source,
      });
      return saved;
    });

    // Effets de bord après commit : notifications, temps réel.
    const base = this.payload(task, actorId);
    const tp: TaskTransitionedPayload = { ...base, from, to: dto.to };
    this.events.emit(Events.TASK_TRANSITIONED, tp);
    for (const a of deferred) {
      if (a.type === 'NOTIFY') {
        const np: WorkflowNotifyPayload = { ...base, targets: a.targets, title: a.title, body: a.body, channels: a.channels };
        this.events.emit(Events.WORKFLOW_NOTIFY, np);
      }
    }
    return task;
  }

  /** Transition vers le premier état cible autorisé parmi une liste (endpoints start/complete). */
  async transitionToFirst(user: AuthUser, id: string, targets: string[], dto: Omit<TransitionDto, 'to'>) {
    const t = await this.tasks.findOne({ where: { id, organizationId: user.organizationId }, relations: { workflow: true } });
    if (!t) throw new NotFoundException('Intervention introuvable');
    const to = targets.find((c) => this.engine.findTransition(t.workflow, t.status, c, user));
    if (!to) throw new UnprocessableEntityException(`Action impossible depuis l'état ${t.status}`);
    return this.transition(user, user.organizationId, id, { ...dto, to });
  }

  // =====================================================================
  // Exécution terrain : checklist, notes
  // =====================================================================

  async updateChecklist(user: AuthUser, id: string, dto: ChecklistUpdateDto, opts: TransitionOptions = {}) {
    return this.ds.transaction(async (m) => {
      const t = await this.lock(m, user.organizationId, id);
      this.assertCanExecute(user, t);
      const occurredAt = this.safeOccurredAt(dto.occurredAt);
      for (const upd of dto.items) {
        const item = t.checklist.find((i) => i.id === upd.id);
        if (!item) throw new BadRequestException(`Élément de checklist inconnu : ${upd.id}`);
        item.done = upd.done;
        item.value = upd.value ?? item.value ?? null;
        item.doneAt = upd.done ? occurredAt.toISOString() : null;
      }
      t.checklist = [...t.checklist];
      const saved = await m.save(t);
      await this.addEvent(m, saved, { type: 'CHECKLIST', actorId: user.id, data: { items: dto.items }, occurredAt, source: opts.source });
      this.events.emit(Events.TASK_UPDATED, this.payload(saved, user.id));
      return saved;
    });
  }

  async addNote(user: AuthUser, id: string, dto: NoteDto, opts: TransitionOptions = {}) {
    const t = await this.getForUser(user, id);
    const ev = await this.addEvent(this.ds.manager, t, {
      type: 'NOTE', actorId: user.id, comment: dto.text, occurredAt: this.safeOccurredAt(dto.occurredAt), source: opts.source,
    });
    return ev;
  }

  async setSignature(orgId: string, id: string, key: string, signedByName?: string | null) {
    await this.tasks.update({ id, organizationId: orgId }, { signatureKey: key, signedByName: signedByName ?? null });
  }

  // =====================================================================
  // Helpers
  // =====================================================================

  /** Verrou pessimiste : sérialise les modifications concurrentes (web + mobile + sync). */
  private async lock(m: EntityManager, orgId: string, id: string) {
    const t = await m.findOne(Task, { where: { id, organizationId: orgId }, lock: { mode: 'pessimistic_write' } });
    if (!t) throw new NotFoundException('Intervention introuvable');
    return t;
  }

  async photoCounts(taskId: string, m: EntityManager = this.ds.manager) {
    const rows: { type: PhotoType; total: number; validated: number }[] = await m
      .getRepository(Photo)
      .createQueryBuilder('p')
      .select('p.type', 'type')
      .addSelect('COUNT(*)::int', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE p.validation = 'VALIDATED')::int`, 'validated')
      .where('p.taskId = :taskId', { taskId })
      .andWhere(`p.validation != 'REJECTED'`)
      .groupBy('p.type')
      .getRawMany();
    return Object.fromEntries(rows.map((r) => [r.type, { total: r.total, validated: r.validated }])) as Partial<
      Record<PhotoType, { total: number; validated: number }>
    >;
  }

  private addEvent(
    m: EntityManager,
    t: Task,
    e: Partial<Omit<TaskEvent, 'id' | 'organizationId' | 'taskId' | 'recordedAt'>> & { type: string },
  ) {
    return m.save(
      m.create(TaskEvent, {
        organizationId: t.organizationId,
        taskId: t.id,
        occurredAt: e.occurredAt ?? new Date(),
        source: e.source ?? EventSource.ONLINE,
        ...e,
      }),
    );
  }

  /** Horodatage terrain accepté s'il est plausible (pas dans le futur, < 7 jours). */
  private safeOccurredAt(iso?: string): Date {
    if (!iso) return new Date();
    const d = new Date(iso);
    const now = Date.now();
    if (isNaN(d.getTime()) || d.getTime() > now + 5 * 60_000 || d.getTime() < now - 7 * 86_400_000) return new Date();
    return d;
  }

  applyVisibility(qb: any, user: AuthUser) {
    if (roleHasPermission(user.role, Permission.TASK_READ_ALL)) return;
    if (user.role === Role.AGENT) qb.andWhere('t.agentId = :me', { me: user.id });
    else if (user.role === Role.CLIENT) qb.andWhere('t.clientId = :cid', { cid: user.clientId });
    else qb.andWhere('1 = 0');
  }

  assertCanView(user: AuthUser, t: Task) {
    if (roleHasPermission(user.role, Permission.TASK_READ_ALL)) return;
    if (user.role === Role.AGENT && t.agentId === user.id) return;
    if (user.role === Role.CLIENT && t.clientId === user.clientId) return;
    throw new ForbiddenException('Accès non autorisé à cette intervention');
  }

  assertCanExecute(user: AuthUser, t: Task) {
    if (user.role === Role.AGENT && t.agentId !== user.id) throw new ForbiddenException("Réservé à l'agent affecté");
    if (!roleHasPermission(user.role, Permission.TASK_EXECUTE)) throw new ForbiddenException();
    if (TERMINAL_STATUSES.includes(t.status)) throw new UnprocessableEntityException('Intervention clôturée');
  }

  payload(t: Task, actorId?: string | null): TaskEventPayload {
    return {
      organizationId: t.organizationId, taskId: t.id, reference: t.reference, title: t.title, status: t.status,
      agentId: t.agentId, clientId: t.clientId, siteId: t.siteId, actorId,
    };
  }
}
