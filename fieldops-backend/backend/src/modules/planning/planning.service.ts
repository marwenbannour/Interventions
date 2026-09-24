import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthUser } from '../../common/types/auth-user';
import { fromPoint } from '../../common/utils/geo';
import { AgentsService } from '../agents/agents.service';
import { AgentProfile, AgentStatus } from '../agents/entities/agent-profile.entity';
import { Site } from '../clients/entities/site.entity';
import { LocationService } from '../location/location.service';
import { Task } from '../tasks/entities/task.entity';
import { TERMINAL_STATUSES } from '../tasks/tasks.service';
import { PlanningQueryDto } from './dto/planning.dto';

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Planification & dispatch (§6.6) : vue planning par agent et aide à l'affectation. */
@Injectable()
export class PlanningService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(AgentProfile) private readonly agents: Repository<AgentProfile>,
    @InjectRepository(Site) private readonly sites: Repository<Site>,
    private readonly agentsService: AgentsService,
    private readonly location: LocationService,
  ) {}

  async board(user: AuthUser, q: PlanningQueryDto) {
    const from = new Date(q.from);
    const to = new Date(q.to);
    if (to <= from) throw new BadRequestException('"to" doit être postérieur à "from"');
    if (to.getTime() - from.getTime() > 31 * 86_400_000) throw new BadRequestException('Période limitée à 31 jours');
    const orgId = user.organizationId;

    const agentQb = this.agents
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.user', 'u')
      .where('a.organizationId = :orgId AND a.status = :st', { orgId, st: AgentStatus.ACTIVE })
      .orderBy('u.lastName', 'ASC');
    if (q.zoneId) agentQb.andWhere('a.zoneId = :z', { z: q.zoneId });
    if (q.teamId) agentQb.andWhere('a.teamId = :tm', { tm: q.teamId });
    const agents = await agentQb.getMany();

    const tasks = await this.tasks
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.site', 'site')
      .where('t.organizationId = :orgId', { orgId })
      .andWhere(
        `(COALESCE(t.scheduledStart, t.createdAt) BETWEEN :from AND :to
          OR (t.scheduledStart IS NULL AND t.status NOT IN (:...terminal)))`,
        { from, to, terminal: TERMINAL_STATUSES },
      )
      .andWhere(`t.status != 'CANCELLED'`)
      .orderBy('COALESCE(t.scheduledStart, t.createdAt)', 'ASC')
      .getMany();

    const byAgent = new Map<string, Task[]>();
    const unassigned: Task[] = [];
    for (const t of tasks) {
      if (!t.agentId) unassigned.push(t);
      else byAgent.set(t.agentId, [...(byAgent.get(t.agentId) ?? []), t]);
    }
    const live = new Map((await this.location.live(orgId)).map((p) => [p.agentId, p]));

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      agents: agents.map((a) => {
        const list = byAgent.get(a.userId) ?? [];
        const plannedMinutes = list.reduce((s, t) => s + (t.estimatedDurationMin ?? 60), 0);
        return {
          agentId: a.userId,
          profileId: a.id,
          name: `${a.user.firstName} ${a.user.lastName}`,
          skills: a.skills,
          zoneId: a.zoneId,
          isOnDuty: a.isOnDuty,
          position: live.get(a.userId) ?? null,
          plannedMinutes,
          tasks: list.map((t) => this.slim(t)),
        };
      }),
      unassigned: unassigned.map((t) => this.slim(t)),
    };
  }

  /**
   * Suggestion d'agents pour une intervention : compétences requises (filtre dur),
   * puis score combinant distance, charge et qualité.
   */
  async suggest(user: AuthUser, taskId: string, limit = 5) {
    const orgId = user.organizationId;
    const task = await this.tasks.findOne({ where: { id: taskId, organizationId: orgId } });
    if (!task) throw new NotFoundException('Intervention introuvable');
    const site = await this.sites.findOneBy({ id: task.siteId });
    const target = fromPoint(site?.location);

    const candidates = await this.agentsService.findActiveWithSkills(orgId, task.requiredSkills ?? []);
    const ids = candidates.map((c) => c.userId);
    const load = await this.agentsService.activeLoad(orgId, ids);
    const live = new Map((await this.location.live(orgId)).map((p) => [p.agentId, p]));

    const scored = candidates.map((a) => {
      const pos = live.get(a.userId);
      const distanceKm = target && pos && !pos.stale ? Math.round(haversineKm(target, pos) * 10) / 10 : null;
      const activeTasks = load.get(a.userId) ?? 0;
      const capacity = Math.max(a.maxConcurrentTasks, 1);
      const loadRatio = Math.min(activeTasks / capacity, 1);
      const quality = a.qualityScore != null ? Number(a.qualityScore) / 100 : 0.8;
      const distanceScore = distanceKm == null ? 0.3 : Math.max(0, 1 - distanceKm / 50);
      const score =
        0.45 * distanceScore + 0.3 * (1 - loadRatio) + 0.15 * quality + (a.isOnDuty ? 0.1 : 0);
      const reasons: string[] = [];
      if (distanceKm != null) reasons.push(`${distanceKm} km du site`);
      else reasons.push('position inconnue');
      reasons.push(`${activeTasks}/${capacity} interventions actives`);
      if (!a.isOnDuty) reasons.push('hors service');
      return {
        agentId: a.userId,
        name: `${a.user.firstName} ${a.user.lastName}`,
        skills: a.skills,
        isOnDuty: a.isOnDuty,
        activeTasks,
        maxConcurrentTasks: a.maxConcurrentTasks,
        distanceKm,
        qualityScore: a.qualityScore != null ? Number(a.qualityScore) : null,
        full: activeTasks >= capacity,
        score: Math.round(score * 1000) / 1000,
        reasons,
      };
    });
    scored.sort((x, y) => Number(x.full) - Number(y.full) || y.score - x.score);
    return { taskId, requiredSkills: task.requiredSkills, suggestions: scored.slice(0, limit) };
  }

  private slim(t: Task) {
    return {
      id: t.id, reference: t.reference, title: t.title, type: t.type, priority: t.priority, status: t.status,
      scheduledStart: t.scheduledStart, scheduledEnd: t.scheduledEnd, estimatedDurationMin: t.estimatedDurationMin,
      site: t.site ? { id: t.site.id, name: t.site.name, location: fromPoint(t.site.location) } : null,
      slaAtRisk: !!(t.ackBreached || t.arrivalBreached || t.interventionBreached || t.closeBreached),
    };
  }
}
