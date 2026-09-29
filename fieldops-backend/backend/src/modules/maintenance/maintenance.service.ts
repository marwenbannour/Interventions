import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';
import { TaskOrigin } from '../../common/enums/task.enums';
import { Events } from '../../common/events';
import { AuthUser } from '../../common/types/auth-user';
import { Asset } from '../assets/entities/asset.entity';
import { Site } from '../clients/entities/site.entity';
import { Task } from '../tasks/entities/task.entity';
import { TasksService } from '../tasks/tasks.service';
import { CreateMaintenancePlanDto, MaintenanceQueryDto, UpdateMaintenancePlanDto } from './dto/maintenance.dto';
import { MaintenancePlan } from './entities/maintenance-plan.entity';
import { firstIndexAfter, occurrenceAt } from './recurrence';

export interface GenerationResult {
  planId: string;
  taskId?: string;
  reference?: string;
  dueAt: string;
  status: 'CREATED' | 'ALREADY_EXISTS' | 'FAILED';
  error?: string;
}

/** Maintenance préventive (V3) : plans récurrents et génération automatique des interventions. */
@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectRepository(MaintenancePlan) private readonly plans: Repository<MaintenancePlan>,
    private readonly ds: DataSource,
    private readonly tasks: TasksService,
    private readonly events: EventEmitter2,
  ) {}

  async create(user: AuthUser, dto: CreateMaintenancePlanDto) {
    const orgId = user.organizationId;
    const site = await this.ds.getRepository(Site).findOne({ where: { id: dto.siteId, organizationId: orgId } });
    if (!site) throw new NotFoundException('Site introuvable');
    await this.assertAsset(orgId, site.id, dto.assetId);
    const startAt = new Date(dto.startAt);
    if (dto.endAt && new Date(dto.endAt) <= startAt) throw new BadRequestException('La fin doit suivre le début');
    const plan = this.plans.create({
      ...dto,
      organizationId: orgId,
      clientId: site.clientId,
      interval: dto.interval ?? 1,
      leadTimeDays: dto.leadTimeDays ?? 7,
      startAt,
      endAt: dto.endAt ? new Date(dto.endAt) : null,
      checklist: dto.checklist ?? [],
      requiredSkills: dto.requiredSkills ?? [],
      occurrenceIndex: 0,
      nextDueAt: startAt,
      createdById: user.id,
    });
    return this.plans.save(plan);
  }

  async list(user: AuthUser, q: MaintenanceQueryDto) {
    const qb = this.plans
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.site', 'site')
      .leftJoinAndSelect('p.asset', 'asset')
      .where('p.organizationId = :org', { org: user.organizationId })
      .orderBy('p.isActive', 'DESC')
      .addOrderBy('p.nextDueAt', 'ASC', 'NULLS LAST')
      .offset((q.page - 1) * q.limit)
      .limit(q.limit);
    if (q.siteId) qb.andWhere('p.siteId = :s', { s: q.siteId });
    if (q.assetId) qb.andWhere('p.assetId = :a', { a: q.assetId });
    if (q.active !== undefined) qb.andWhere('p.isActive = :act', { act: q.active });
    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, q);
  }

  async get(orgId: string, id: string) {
    const p = await this.plans.findOne({ where: { id, organizationId: orgId }, relations: { site: true, asset: true } });
    if (!p) throw new NotFoundException('Plan de maintenance introuvable');
    return p;
  }

  async update(user: AuthUser, id: string, dto: UpdateMaintenancePlanDto) {
    const p = await this.get(user.organizationId, id);
    if (dto.assetId !== undefined) await this.assertAsset(user.organizationId, p.siteId, dto.assetId);
    const recurrenceChanged =
      (dto.startAt && new Date(dto.startAt).getTime() !== p.startAt.getTime()) ||
      (dto.frequency && dto.frequency !== p.frequency) ||
      (dto.interval && dto.interval !== p.interval);
    Object.assign(p, {
      ...dto,
      startAt: dto.startAt ? new Date(dto.startAt) : p.startAt,
      endAt: dto.endAt !== undefined ? (dto.endAt ? new Date(dto.endAt) : null) : p.endAt,
    });
    if (recurrenceChanged) {
      // Nouvelle récurrence : on repart de la première échéance future (pas de rattrapage rétroactif).
      p.occurrenceIndex = firstIndexAfter(p.startAt, p.frequency, p.interval, new Date(Date.now() - 1));
    }
    p.nextDueAt = this.dueAt(p, p.occurrenceIndex);
    return this.plans.save(p);
  }

  /** Prochaines échéances (aperçu calendrier). */
  async preview(orgId: string, id: string, count: number) {
    const p = await this.get(orgId, id);
    const out: string[] = [];
    for (let n = p.occurrenceIndex; out.length < count; n++) {
      const d = this.dueAt(p, n);
      if (!d) break;
      out.push(d.toISOString());
    }
    return { planId: p.id, occurrences: out };
  }

  async generatedTasks(orgId: string, id: string) {
    await this.get(orgId, id);
    return this.ds.getRepository(Task).find({
      where: { organizationId: orgId, maintenancePlanId: id },
      order: { scheduledStart: 'DESC' },
      take: 50,
    });
  }

  /** Génération forcée de la prochaine occurrence (bouton « Générer maintenant »). */
  async generateNow(orgId: string, id: string): Promise<GenerationResult> {
    return this.ds.transaction(async (m) => {
      const p = await m.findOne(MaintenancePlan, { where: { id, organizationId: orgId }, lock: { mode: 'pessimistic_write' } });
      if (!p) throw new NotFoundException('Plan de maintenance introuvable');
      if (!p.nextDueAt) throw new BadRequestException('Plan terminé : plus aucune échéance');
      const r = await this.generateOccurrence(p);
      await m.save(p);
      return r;
    });
  }

  /**
   * Scan périodique : génère les occurrences arrivées dans leur fenêtre de préparation.
   * `FOR UPDATE SKIP LOCKED` + index unique (plan, date) sur les tâches : une seule génération
   * par occurrence, même si plusieurs instances exécutent le scan en parallèle.
   */
  async scan(now = new Date()): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];
    await this.ds.transaction(async (m) => {
      const due = await m
        .getRepository(MaintenancePlan)
        .createQueryBuilder('p')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('p.isActive = true AND p.nextDueAt IS NOT NULL')
        .andWhere(`p.nextDueAt - make_interval(days => p.leadTimeDays) <= :now`, { now })
        .orderBy('p.nextDueAt', 'ASC')
        .limit(200)
        .getMany();
      for (const p of due) {
        results.push(await this.generateOccurrence(p, now));
        await m.save(p);
      }
    });
    const created = results.filter((r) => r.status === 'CREATED').length;
    if (created) this.logger.log(`Maintenance préventive : ${created} intervention(s) générée(s)`);
    return results;
  }

  /** Crée l'intervention de l'occurrence courante puis avance le plan (mutation en mémoire). */
  private async generateOccurrence(p: MaintenancePlan, now = new Date()): Promise<GenerationResult> {
    const dueAt = p.nextDueAt!;
    const base: GenerationResult = { planId: p.id, dueAt: dueAt.toISOString(), status: 'FAILED' };
    // L'auteur du plan porte la création ; rôle SUPERVISOR pour passer les contrôles métier.
    const actor: AuthUser = { id: p.createdById, organizationId: p.organizationId, role: Role.SUPERVISOR, email: 'maintenance@fieldops' };
    let result: GenerationResult;
    try {
      const task = await this.tasks.create(
        actor,
        {
          siteId: p.siteId,
          assetId: p.assetId ?? undefined,
          type: p.taskType,
          title: p.title,
          description: p.description ?? undefined,
          priority: p.priority,
          requiredSkills: p.requiredSkills,
          checklist: p.checklist.map((c) => ({ label: c.label, required: c.required ?? true })),
          estimatedDurationMin: p.estimatedDurationMin ?? undefined,
          scheduledStart: dueAt.toISOString(),
          scheduledEnd: p.estimatedDurationMin ? new Date(dueAt.getTime() + p.estimatedDurationMin * 60_000).toISOString() : undefined,
        },
        { origin: TaskOrigin.PREVENTIVE, maintenancePlanId: p.id, autoDispatch: !p.defaultAgentId },
      );
      if (p.defaultAgentId) {
        await this.tasks.assign(actor, task.id, p.defaultAgentId).catch((e) =>
          this.logger.warn(`Plan ${p.id} : affectation par défaut impossible (${(e as Error).message})`),
        );
      }
      p.generatedCount += 1;
      p.lastGeneratedAt = now;
      p.lastTaskId = task.id;
      result = { ...base, status: 'CREATED', taskId: task.id, reference: task.reference };
      this.events.emit(Events.MAINTENANCE_GENERATED, { organizationId: p.organizationId, planId: p.id, taskId: task.id });
    } catch (e: any) {
      if (e?.code === '23505' || e?.driverError?.code === '23505') {
        result = { ...base, status: 'ALREADY_EXISTS' };
      } else {
        this.logger.error(`Plan ${p.id} : génération échouée — ${e?.message}`);
        return { ...base, error: e?.message };
      }
    }
    // Avance à la première échéance future : au plus une occurrence en retard est rattrapée.
    p.occurrenceIndex = Math.max(p.occurrenceIndex + 1, firstIndexAfter(p.startAt, p.frequency, p.interval, now, p.occurrenceIndex + 1));
    p.nextDueAt = this.dueAt(p, p.occurrenceIndex);
    if (!p.nextDueAt) p.isActive = false;
    return result;
  }

  private dueAt(p: MaintenancePlan, n: number): Date | null {
    const d = occurrenceAt(p.startAt, p.frequency, p.interval, n);
    return p.endAt && d > p.endAt ? null : d;
  }

  private async assertAsset(orgId: string, siteId: string, assetId?: string | null) {
    if (!assetId) return;
    const a = await this.ds.getRepository(Asset).findOne({ where: { id: assetId, organizationId: orgId } });
    if (!a || a.siteId !== siteId) throw new BadRequestException("L'équipement n'appartient pas à ce site");
  }
}
