import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { LocationService } from '../location/location.service';
import { AgentQueryDto, UpdateAgentDto } from './dto/agent.dto';
import { AgentProfile, AgentStatus } from './entities/agent-profile.entity';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(AgentProfile) private readonly repo: Repository<AgentProfile>,
    private readonly location: LocationService,
  ) {}

  async list(orgId: string, q: AgentQueryDto) {
    const qb = this.repo
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.user', 'u')
      .where('a.organizationId = :orgId', { orgId })
      .orderBy('u.lastName', 'ASC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit);
    if (q.status) qb.andWhere('a.status = :status', { status: q.status });
    if (q.zoneId) qb.andWhere('a.zoneId = :zoneId', { zoneId: q.zoneId });
    if (q.skill) qb.andWhere(':skill = ANY(a.skills)', { skill: q.skill });
    if (q.onDuty !== undefined) qb.andWhere('a.isOnDuty = :onDuty', { onDuty: q.onDuty });
    if (q.search) qb.andWhere('(u.firstName ILIKE :s OR u.lastName ILIKE :s OR u.email ILIKE :s)', { s: `%${q.search}%` });

    const [data, total] = await qb.getManyAndCount();
    const loads = await this.activeLoad(orgId, data.map((a) => a.userId));
    return paginate(
      data.map((a) => ({ ...a, activeTasks: loads.get(a.userId) ?? 0 })),
      total,
      q,
    );
  }

  async getByUserId(orgId: string, userId: string) {
    const a = await this.repo.findOne({ where: { organizationId: orgId, userId }, relations: { user: true } });
    if (!a) throw new NotFoundException('Agent introuvable');
    return a;
  }

  async get(orgId: string, id: string) {
    const a = await this.repo.findOne({ where: [{ organizationId: orgId, id }, { organizationId: orgId, userId: id }], relations: { user: true } });
    if (!a) throw new NotFoundException('Agent introuvable');
    const live = await this.location.liveForAgent(orgId, a.userId);
    return { ...a, position: live };
  }

  async update(orgId: string, id: string, dto: UpdateAgentDto) {
    const a = await this.repo.findOne({ where: { organizationId: orgId, id } });
    if (!a) throw new NotFoundException('Agent introuvable');
    return this.repo.save(Object.assign(a, dto));
  }

  /** Validation / suspension d'un agent (§6.1 "validation des agents"). */
  async setStatus(orgId: string, id: string, status: AgentStatus, actorId: string) {
    const a = await this.repo.findOne({ where: { organizationId: orgId, id } });
    if (!a) throw new NotFoundException('Agent introuvable');
    a.status = status;
    if (status === AgentStatus.ACTIVE) {
      a.validatedById = actorId;
      a.validatedAt = new Date();
    }
    if (status === AgentStatus.SUSPENDED && a.isOnDuty) {
      a.isOnDuty = false;
      await this.location.removeLive(orgId, a.userId);
    }
    return this.repo.save(a);
  }

  /** Prise / fin de service : délimite les périodes de suivi GPS autorisées. */
  async setDuty(orgId: string, userId: string, onDuty: boolean) {
    const a = await this.getByUserId(orgId, userId);
    if (onDuty && a.status !== AgentStatus.ACTIVE) {
      throw new BadRequestException('Profil agent non validé');
    }
    a.isOnDuty = onDuty;
    a.dutyStartedAt = onDuty ? new Date() : null;
    if (!onDuty) await this.location.removeLive(orgId, userId);
    return this.repo.save(a);
  }

  /** Nombre d'interventions actives (non terminales) par agent. */
  async activeLoad(orgId: string, agentIds: string[]): Promise<Map<string, number>> {
    if (agentIds.length === 0) return new Map();
    const rows: { agentId: string; count: number }[] = await this.repo.query(
      `SELECT "agentId", COUNT(*)::int AS count FROM tasks
       WHERE "organizationId" = $1 AND "agentId" = ANY($2)
         AND status NOT IN ('COMPLETED','EVALUATED','CANCELLED')
       GROUP BY "agentId"`,
      [orgId, agentIds],
    );
    return new Map(rows.map((r) => [r.agentId, r.count]));
  }

  findActiveWithSkills(orgId: string, skills: string[]) {
    const qb = this.repo
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.user', 'u')
      .where('a.organizationId = :orgId AND a.status = :st', { orgId, st: AgentStatus.ACTIVE })
      .andWhere(`u.status = 'ACTIVE'`);
    if (skills.length) qb.andWhere('a.skills @> :skills', { skills });
    return qb.getMany();
  }
}
