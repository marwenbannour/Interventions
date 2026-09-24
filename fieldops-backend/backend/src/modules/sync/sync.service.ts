import { HttpException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { In, MoreThan, Not, Repository } from 'typeorm';
import { EventSource } from '../../common/enums/task.enums';
import { AuthUser } from '../../common/types/auth-user';
import { Role } from '../../common/enums/role.enum';
import { OrganizationsService } from '../organizations/organizations.service';
import { ChecklistUpdateDto, NoteDto, TransitionDto } from '../tasks/dto/task.dto';
import { Task } from '../tasks/entities/task.entity';
import { TasksService, TERMINAL_STATUSES } from '../tasks/tasks.service';
import { WorkflowDefinition } from '../workflows/entities/workflow-definition.entity';
import { SyncOperationDto, SyncOpType, SyncPullQueryDto, SyncPushDto } from './dto/sync.dto';
import { SyncOperation, SyncOpStatus } from './entities/sync-operation.entity';

export type SyncResultStatus = 'APPLIED' | 'DUPLICATE' | 'REJECTED';

export interface SyncOpResult {
  clientOpId: string;
  status: SyncResultStatus;
  error?: { code: string; message: string; details?: unknown };
  /** État serveur de la tâche après traitement : le mobile l'utilise pour résoudre le conflit. */
  task?: Partial<Task> | null;
}

/**
 * Synchronisation offline-first (§11).
 * Règles :
 *  - chaque opération porte un clientOpId unique → rejouer un lot est sans effet (DUPLICATE) ;
 *  - les opérations sont appliquées dans l'ordre chronologique local (clientTimestamp) ;
 *  - l'horodatage local est conservé dans l'historique (occurredAt, source=OFFLINE_SYNC) ;
 *  - le serveur fait foi : une transition invalide est REJECTED avec l'état serveur courant ;
 *  - une transition vers l'état déjà courant est considérée APPLIED (convergence).
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(SyncOperation) private readonly ops: Repository<SyncOperation>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(WorkflowDefinition) private readonly workflows: Repository<WorkflowDefinition>,
    private readonly tasksService: TasksService,
    private readonly orgs: OrganizationsService,
  ) {}

  async push(user: AuthUser, dto: SyncPushDto) {
    const sorted = [...dto.operations].sort(
      (a, b) => Date.parse(a.clientTimestamp) - Date.parse(b.clientTimestamp),
    );
    const results: SyncOpResult[] = [];
    for (const op of sorted) results.push(await this.applyOne(user, op));
    return { serverTime: new Date().toISOString(), results };
  }

  private async applyOne(user: AuthUser, op: SyncOperationDto): Promise<SyncOpResult> {
    const previous = await this.ops.findOne({ where: { userId: user.id, clientOpId: op.clientOpId } });
    if (previous) {
      return {
        clientOpId: op.clientOpId,
        status: previous.status === SyncOpStatus.APPLIED ? 'DUPLICATE' : 'REJECTED',
        error: previous.status === SyncOpStatus.REJECTED ? (previous.result as any)?.error : undefined,
        task: await this.snapshot(user.organizationId, op.taskId),
      };
    }

    let status: SyncOpStatus = SyncOpStatus.APPLIED;
    let error: SyncOpResult['error'];
    try {
      await this.execute(user, op);
    } catch (e) {
      status = SyncOpStatus.REJECTED;
      error = this.toError(e);
    }

    try {
      await this.ops.insert({
        organizationId: user.organizationId,
        userId: user.id,
        clientOpId: op.clientOpId,
        type: op.type,
        status,
        result: error ? { error } : null,
        clientTimestamp: new Date(op.clientTimestamp),
      });
    } catch (e: any) {
      if (e?.code === '23505') return { clientOpId: op.clientOpId, status: 'DUPLICATE', task: await this.snapshot(user.organizationId, op.taskId) };
      throw e;
    }
    return { clientOpId: op.clientOpId, status, error, task: await this.snapshot(user.organizationId, op.taskId) };
  }

  private async execute(user: AuthUser, op: SyncOperationDto) {
    const opts = { source: EventSource.OFFLINE_SYNC };
    switch (op.type) {
      case SyncOpType.TASK_TRANSITION: {
        const dto = await this.validated(TransitionDto, { ...op.payload, occurredAt: op.clientTimestamp });
        const current = await this.tasks.findOne({ where: { id: op.taskId, organizationId: user.organizationId } });
        if (current && current.status === dto.to) return; // déjà dans l'état cible → convergence
        await this.tasksService.transition(user, user.organizationId, op.taskId, dto, opts);
        return;
      }
      case SyncOpType.CHECKLIST_UPDATE: {
        const dto = await this.validated(ChecklistUpdateDto, { ...op.payload, occurredAt: op.clientTimestamp });
        await this.tasksService.updateChecklist(user, op.taskId, dto, opts);
        return;
      }
      case SyncOpType.TASK_NOTE: {
        const dto = await this.validated(NoteDto, { ...op.payload, occurredAt: op.clientTimestamp });
        await this.tasksService.addNote(user, op.taskId, dto, opts);
        return;
      }
    }
  }

  /**
   * Pull incrémental : tâches du périmètre de l'utilisateur modifiées depuis `since`,
   * + identifiants des tâches sorties du périmètre (réaffectées / annulées) à purger localement.
   */
  async pull(user: AuthUser, q: SyncPullQueryDto) {
    const serverTime = new Date();
    const since = q.since ? new Date(q.since) : null;
    const where: any = { organizationId: user.organizationId };
    if (user.role === Role.AGENT) where.agentId = user.id;
    else if (user.role === Role.CLIENT) where.clientId = user.clientId;

    const tasks = await this.tasks.find({
      where: since ? { ...where, updatedAt: MoreThan(since) } : { ...where, status: Not(In(TERMINAL_STATUSES)) },
      relations: { site: true, client: true },
      order: { scheduledStart: 'ASC' },
      take: 500,
    });

    // Tâches retirées à l'agent depuis le dernier pull (réaffectation).
    let removedTaskIds: string[] = [];
    if (since && user.role === Role.AGENT) {
      const rows: { taskId: string }[] = await this.tasks.query(
        `SELECT DISTINCT e."taskId" FROM task_events e
          JOIN tasks t ON t.id = e."taskId"
         WHERE e."organizationId" = $1 AND e."recordedAt" > $2
           AND e.type IN ('ASSIGNED','UNASSIGNED') AND e.data->>'previousAgentId' = $3::text
           AND (t."agentId" IS DISTINCT FROM $3::uuid)`,
        [user.organizationId, since, user.id],
      );
      removedTaskIds = rows.map((r) => r.taskId);
    }

    const workflowIds = [...new Set(tasks.map((t) => t.workflowId))];
    const workflows = workflowIds.length ? await this.workflows.findBy({ id: In(workflowIds) }) : [];
    const settings = await this.orgs.getSettings(user.organizationId);

    return {
      serverTime: serverTime.toISOString(),
      full: !since,
      tasks,
      removedTaskIds,
      workflows,
      settings: {
        locationIntervalSec: settings.locationIntervalSec,
        trackingOnlyOnDuty: settings.trackingOnlyOnDuty,
        defaultGeofenceMeters: settings.defaultGeofenceMeters,
      },
    };
  }

  private async snapshot(orgId: string, taskId: string) {
    const t = await this.tasks.findOne({ where: { id: taskId, organizationId: orgId } });
    if (!t) return null;
    return {
      id: t.id, status: t.status, agentId: t.agentId, checklist: t.checklist, version: t.version, updatedAt: t.updatedAt,
    } as Partial<Task>;
  }

  private async validated<T extends object>(cls: new () => T, plain: object): Promise<T> {
    const inst = plainToInstance(cls, plain);
    const errors = await validate(inst, { whitelist: true });
    if (errors.length) {
      const msg = errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; ');
      throw Object.assign(new Error(msg), { code: 'VALIDATION_ERROR' });
    }
    return inst;
  }

  private toError(e: unknown): SyncOpResult['error'] {
    if (e instanceof HttpException) {
      const r = e.getResponse() as any;
      return {
        code: r?.code ?? r?.error ?? `HTTP_${e.getStatus()}`,
        message: Array.isArray(r?.message) ? r.message.join('; ') : r?.message ?? e.message,
        details: r?.missing ?? r?.details,
      };
    }
    const err = e as any;
    if (err?.code !== 'VALIDATION_ERROR') this.logger.error(`Sync op error: ${err?.message}`, err?.stack);
    return { code: err?.code ?? 'INTERNAL', message: err?.message ?? 'Erreur interne' };
  }
}
