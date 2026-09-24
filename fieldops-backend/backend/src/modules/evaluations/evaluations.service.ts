import { ConflictException, ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';
import { EventSource } from '../../common/enums/task.enums';
import { Events } from '../../common/events';
import { AuthUser } from '../../common/types/auth-user';
import { AgentProfile } from '../agents/entities/agent-profile.entity';
import { Task } from '../tasks/entities/task.entity';
import { TasksService } from '../tasks/tasks.service';
import { CreateEvaluationDto, EvaluationQueryDto } from './dto/evaluation.dto';
import { Evaluation } from './entities/evaluation.entity';

/** Évaluation client (§6.12) : clôt le cycle de vie de l'intervention. */
@Injectable()
export class EvaluationsService {
  constructor(
    @InjectRepository(Evaluation) private readonly repo: Repository<Evaluation>,
    @InjectRepository(AgentProfile) private readonly agents: Repository<AgentProfile>,
    private readonly tasks: TasksService,
    private readonly events: EventEmitter2,
  ) {}

  async create(user: AuthUser, dto: CreateEvaluationDto) {
    const task = await this.tasks.getForUser(user, dto.taskId);
    if (user.role === Role.CLIENT && task.clientId !== user.clientId) throw new ForbiddenException();
    if (await this.repo.exist({ where: { taskId: task.id } })) throw new ConflictException('Intervention déjà évaluée');
    if (task.status !== 'COMPLETED') {
      throw new UnprocessableEntityException("Seule une intervention terminée peut être évaluée");
    }

    const evaluation = await this.repo.save(
      this.repo.create({
        organizationId: user.organizationId,
        taskId: task.id,
        agentId: task.agentId ?? null,
        authorId: user.id,
        rating: dto.rating,
        punctualityRating: dto.punctualityRating ?? null,
        qualityRating: dto.qualityRating ?? null,
        comment: dto.comment ?? null,
      }),
    );
    await this.tasks.transition('SYSTEM', user.organizationId, task.id, { to: 'EVALUATED', comment: `Note ${dto.rating}/5` }, { source: EventSource.SYSTEM });
    if (task.agentId) await this.refreshAgentScore(user.organizationId, task.agentId);
    this.events.emit(Events.EVALUATION_CREATED, { ...this.tasks.payload(task, user.id), rating: dto.rating, evaluationId: evaluation.id });
    return evaluation;
  }

  async list(user: AuthUser, q: EvaluationQueryDto) {
    const qb = this.repo
      .createQueryBuilder('e')
      .innerJoin(Task, 't', 't.id = e.taskId')
      .addSelect(['t.reference', 't.title', 't.clientId', 't.siteId'])
      .where('e.organizationId = :org', { org: user.organizationId })
      .orderBy('e.createdAt', 'DESC')
      .offset((q.page - 1) * q.limit)
      .limit(q.limit);
    if (user.role === Role.CLIENT) qb.andWhere('t.clientId = :cid', { cid: user.clientId });
    if (q.clientId) qb.andWhere('t.clientId = :c', { c: q.clientId });
    if (q.agentId) qb.andWhere('e.agentId = :a', { a: q.agentId });
    if (q.taskId) qb.andWhere('e.taskId = :tid', { tid: q.taskId });
    const total = await qb.getCount();
    const { raw, entities } = await qb.getRawAndEntities();
    const data = entities.map((e, i) => ({ ...e, taskReference: raw[i]?.t_reference, taskTitle: raw[i]?.t_title }));
    return paginate(data, total, q);
  }

  /** Score qualité agent (0-100) = moyenne glissante des 50 dernières notes × 20. */
  private async refreshAgentScore(orgId: string, agentUserId: string) {
    const r = await this.repo.query(
      `SELECT AVG(rating)::float AS avg FROM (
         SELECT rating FROM evaluations WHERE "organizationId" = $1 AND "agentId" = $2 ORDER BY "createdAt" DESC LIMIT 50
       ) x`,
      [orgId, agentUserId],
    );
    if (r[0]?.avg != null) {
      await this.agents.update({ organizationId: orgId, userId: agentUserId }, { qualityScore: (r[0].avg * 20).toFixed(2) });
    }
  }
}
