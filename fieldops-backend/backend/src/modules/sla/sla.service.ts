import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { EventSource } from '../../common/enums/task.enums';
import { Events, SlaEventPayload } from '../../common/events';
import { Task } from '../tasks/entities/task.entity';
import { TaskEvent } from '../tasks/entities/task-event.entity';
import { Milestone } from '../workflows/workflow.types';
import { CreateSlaPolicyDto, UpdateSlaPolicyDto } from './dto/sla.dto';
import { SlaPolicy } from './entities/sla-policy.entity';

type Metric = SlaEventPayload['metric'];

/** Métrique → (colonne échéance, colonne jalon atteint, colonne dépassement). */
const METRICS: Record<Metric, { due: keyof Task; done: keyof Task; breached: keyof Task }> = {
  ack: { due: 'ackDueAt', done: 'acceptedAt', breached: 'ackBreached' },
  arrival: { due: 'arrivalDueAt', done: 'arrivedAt', breached: 'arrivalBreached' },
  intervention: { due: 'interventionDueAt', done: 'completedAt', breached: 'interventionBreached' },
  close: { due: 'closeDueAt', done: 'completedAt', breached: 'closeBreached' },
};

const addMin = (d: Date, m?: number | null) => (m ? new Date(d.getTime() + m * 60_000) : null);

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    @InjectRepository(SlaPolicy) private readonly policies: Repository<SlaPolicy>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly events: EventEmitter2,
  ) {}

  // ---------- CRUD ----------
  list(orgId: string) {
    return this.policies.find({ where: { organizationId: orgId }, order: { name: 'ASC' } });
  }
  create(orgId: string, dto: CreateSlaPolicyDto) {
    return this.policies.save(this.policies.create({ ...dto, organizationId: orgId }));
  }
  async update(orgId: string, id: string, dto: UpdateSlaPolicyDto) {
    const p = await this.policies.findOne({ where: { id, organizationId: orgId } });
    if (!p) throw new NotFoundException('Politique SLA introuvable');
    return this.policies.save(Object.assign(p, dto));
  }

  /** Politique la plus spécifique : site > client > type > priorité. */
  async resolve(task: Pick<Task, 'organizationId' | 'clientId' | 'siteId' | 'type' | 'priority'>, m?: EntityManager) {
    const repo = m ? m.getRepository(SlaPolicy) : this.policies;
    const candidates = await repo
      .createQueryBuilder('p')
      .where('p.organizationId = :org AND p.isActive = true', { org: task.organizationId })
      .andWhere('(p.siteId IS NULL OR p.siteId = :siteId)', { siteId: task.siteId })
      .andWhere('(p.clientId IS NULL OR p.clientId = :clientId)', { clientId: task.clientId })
      .andWhere('(p.taskType IS NULL OR p.taskType = :type)', { type: task.type })
      .andWhere('(p.priority IS NULL OR p.priority = :priority)', { priority: task.priority })
      .getMany();
    const score = (p: SlaPolicy) => (p.siteId ? 8 : 0) + (p.clientId ? 4 : 0) + (p.taskType ? 2 : 0) + (p.priority ? 1 : 0);
    return candidates.sort((a, b) => score(b) - score(a))[0] ?? null;
  }

  /** Calcule les échéances initiales à la création (ou replanification). */
  async applyDeadlines(task: Task, m?: EntityManager) {
    const policy = await this.resolve(task, m);
    task.slaPolicyId = policy?.id ?? null;
    if (!policy) {
      task.ackDueAt = task.arrivalDueAt = task.closeDueAt = task.interventionDueAt = null;
      return;
    }
    const created = task.createdAt ?? new Date();
    const base = task.scheduledStart && task.scheduledStart > created ? task.scheduledStart : created;
    task.ackDueAt = addMin(base, policy.acknowledgeMinutes);
    task.arrivalDueAt = addMin(base, policy.arrivalMinutes);
    task.closeDueAt = addMin(base, policy.closureMinutes);
    if (task.startedAt) task.interventionDueAt = addMin(task.startedAt, policy.interventionMinutes);
  }

  /** Mise à jour au passage d'un jalon : fige le respect / dépassement. */
  async onMilestone(task: Task, milestone: Milestone, at: Date, m?: EntityManager) {
    switch (milestone) {
      case 'ACCEPTED':
        if (task.ackDueAt) task.ackBreached = task.ackBreached || at > task.ackDueAt;
        break;
      case 'ARRIVED':
        if (task.arrivalDueAt) task.arrivalBreached = task.arrivalBreached || at > task.arrivalDueAt;
        break;
      case 'STARTED': {
        if (task.slaPolicyId && !task.interventionDueAt) {
          const repo = m ? m.getRepository(SlaPolicy) : this.policies;
          const p = await repo.findOne({ where: { id: task.slaPolicyId } });
          task.interventionDueAt = addMin(at, p?.interventionMinutes);
        }
        break;
      }
      case 'COMPLETED':
        if (task.interventionDueAt) task.interventionBreached = task.interventionBreached || at > task.interventionDueAt;
        if (task.closeDueAt) task.closeBreached = task.closeBreached || at > task.closeDueAt;
        break;
    }
  }

  /**
   * Scan périodique (job BullMQ, exécuté par une seule instance) :
   * alertes préventives (T-x min) et dépassements en temps réel.
   */
  async scan(now = new Date()): Promise<{ warnings: number; breaches: number }> {
    let warnings = 0;
    let breaches = 0;
    for (const metric of Object.keys(METRICS) as Metric[]) {
      const { due, done, breached } = METRICS[metric];
      const rows: (Task & { warningMinutesBefore: number | null })[] = await this.tasks
        .createQueryBuilder('t')
        .leftJoin(SlaPolicy, 'p', 'p.id = t.slaPolicyId')
        .select('t')
        .addSelect('p.warningMinutesBefore', 'warningMinutesBefore')
        .where(`t.${String(due)} IS NOT NULL`)
        .andWhere(`t.${String(done)} IS NULL`)
        .andWhere(`t.${String(breached)} = false`)
        .andWhere(`t.status NOT IN ('COMPLETED','EVALUATED','CANCELLED')`)
        .andWhere(`t.${String(due)} <= :horizon`, { horizon: new Date(now.getTime() + 24 * 3600_000) })
        .getRawAndEntities()
        .then(({ raw, entities }) =>
          entities.map((e, i) => Object.assign(e, { warningMinutesBefore: raw[i]?.warningMinutesBefore ?? 15 })),
        );

      for (const t of rows) {
        const dueAt = t[due] as Date;
        const payload: SlaEventPayload = {
          organizationId: t.organizationId, taskId: t.id, reference: t.reference, title: t.title,
          status: t.status, agentId: t.agentId, clientId: t.clientId, siteId: t.siteId,
          metric, dueAt: dueAt.toISOString(),
        };
        if (now > dueAt) {
          const res = await this.tasks
            .createQueryBuilder()
            .update(Task)
            .set({ [breached]: true, slaAlertsSent: () => `array_append("slaAlertsSent", '${metric}:breach')` } as any)
            .where('id = :id AND ' + `"${String(breached)}" = false`, { id: t.id })
            .execute();
          if (res.affected) {
            breaches++;
            await this.tasks.manager.insert(TaskEvent, {
              organizationId: t.organizationId, taskId: t.id, type: 'SLA_BREACH',
              data: { metric, dueAt: payload.dueAt }, occurredAt: now, source: EventSource.SYSTEM,
            });
            this.events.emit(Events.SLA_BREACHED, payload);
          }
        } else if (
          t.warningMinutesBefore !== null &&
          now.getTime() >= dueAt.getTime() - (t.warningMinutesBefore ?? 15) * 60_000 &&
          !t.slaAlertsSent.includes(`${metric}:warning`)
        ) {
          const res = await this.tasks
            .createQueryBuilder()
            .update(Task)
            .set({ slaAlertsSent: () => `array_append("slaAlertsSent", '${metric}:warning')` } as any)
            .where(`id = :id AND NOT ('${metric}:warning' = ANY("slaAlertsSent"))`, { id: t.id })
            .execute();
          if (res.affected) {
            warnings++;
            this.events.emit(Events.SLA_WARNING, payload);
          }
        }
      }
    }
    if (warnings || breaches) this.logger.log(`Scan SLA : ${warnings} alerte(s), ${breaches} dépassement(s)`);
    return { warnings, breaches };
  }

  /** Interventions à risque (échéance dans l'horizon donné ou dépassée). */
  atRisk(orgId: string, horizonMinutes = 60) {
    const horizon = new Date(Date.now() + horizonMinutes * 60_000);
    return this.tasks
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.site', 'site')
      .leftJoinAndSelect('t.agent', 'agent')
      .where('t.organizationId = :orgId', { orgId })
      .andWhere(`t.status NOT IN ('COMPLETED','EVALUATED','CANCELLED')`)
      .andWhere(
        `((t.acceptedAt IS NULL AND t.ackDueAt <= :h) OR (t.arrivedAt IS NULL AND t.arrivalDueAt <= :h)
          OR (t.completedAt IS NULL AND t.interventionDueAt <= :h) OR (t.completedAt IS NULL AND t.closeDueAt <= :h))`,
        { h: horizon },
      )
      .orderBy('LEAST(t.ackDueAt, t.arrivalDueAt, t.interventionDueAt, t.closeDueAt)', 'ASC')
      .limit(200)
      .getMany();
  }
}
