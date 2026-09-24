import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { Events, LocationUpdatedPayload } from '../../common/events';
import { toPoint } from '../../common/utils/geo';
import { REDIS } from '../../infra/redis/redis.module';
import { AgentProfile } from '../agents/entities/agent-profile.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { LocationPingDto } from './dto/location.dto';
import { LocationPing } from './entities/location-ping.entity';

const geoKey = (org: string) => `geo:org:${org}`;
const locKey = (agentId: string) => `loc:agent:${agentId}`;
const STALE_AFTER_MS = 10 * 60_000;

export interface LivePosition {
  agentId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  battery?: number | null;
  taskId?: string | null;
  recordedAt: string;
  stale: boolean;
  distanceKm?: number;
}

/**
 * Géolocalisation temps réel (§10) : position courante dans Redis (GEO + HASH),
 * historique archivé dans PostGIS.
 */
@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(LocationPing) private readonly pings: Repository<LocationPing>,
    @InjectRepository(AgentProfile) private readonly agents: Repository<AgentProfile>,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly orgs: OrganizationsService,
    private readonly events: EventEmitter2,
  ) {}

  async record(orgId: string, agentId: string, input: LocationPingDto[]) {
    const settings = await this.orgs.getSettings(orgId);
    const profile = await this.agents.findOne({ where: { userId: agentId, organizationId: orgId } });
    if (!profile) throw new ForbiddenException('Profil agent introuvable');
    if (settings.trackingOnlyOnDuty && !profile.isOnDuty) {
      throw new ForbiddenException('Suivi GPS autorisé uniquement pendant le service');
    }

    // Rejette les horodatages incohérents (futur > 5 min).
    const now = Date.now();
    const valid = input.filter((p) => new Date(p.recordedAt).getTime() <= now + 5 * 60_000);
    if (valid.length === 0) return { accepted: 0 };

    await this.pings.insert(
      valid.map((p) => ({
        organizationId: orgId,
        agentId,
        location: toPoint(p.lat, p.lng)!,
        accuracy: p.accuracy ?? null,
        speed: p.speed ?? null,
        heading: p.heading ?? null,
        battery: p.battery ?? null,
        taskId: p.taskId ?? null,
        recordedAt: new Date(p.recordedAt),
      })),
    );

    const latest = valid.reduce((a, b) => (new Date(a.recordedAt) > new Date(b.recordedAt) ? a : b));
    const current = await this.redis.hget(locKey(agentId), 'recordedAt');
    if (!current || new Date(current) <= new Date(latest.recordedAt)) {
      const payload: LocationUpdatedPayload = {
        organizationId: orgId,
        agentId,
        lat: latest.lat,
        lng: latest.lng,
        accuracy: latest.accuracy ?? null,
        speed: latest.speed ?? null,
        heading: latest.heading ?? null,
        battery: latest.battery ?? null,
        taskId: latest.taskId ?? null,
        recordedAt: new Date(latest.recordedAt).toISOString(),
      };
      await this.redis
        .multi()
        .geoadd(geoKey(orgId), latest.lng, latest.lat, agentId)
        .hset(locKey(agentId), this.toHash(payload))
        .expire(locKey(agentId), 24 * 3600)
        .exec();
      this.events.emit(Events.LOCATION_UPDATED, payload);
    }
    return { accepted: valid.length, intervalSec: settings.locationIntervalSec };
  }

  async live(orgId: string): Promise<LivePosition[]> {
    const ids = await this.redis.zrange(geoKey(orgId), 0, -1);
    return this.hydrate(orgId, ids);
  }

  async liveForAgent(orgId: string, agentId: string): Promise<LivePosition | null> {
    const [p] = await this.hydrate(orgId, [agentId]);
    return p ?? null;
  }

  /** Agents les plus proches (Redis GEOSEARCH) — base du dispatching par proximité. */
  async nearby(orgId: string, lat: number, lng: number, radiusKm: number): Promise<LivePosition[]> {
    const res = (await this.redis.geosearch(
      geoKey(orgId), 'FROMLONLAT', lng, lat, 'BYRADIUS', radiusKm, 'km', 'ASC', 'WITHDIST',
    )) as [string, string][];
    const dist = new Map(res.map(([id, d]) => [id, parseFloat(d)]));
    const positions = await this.hydrate(orgId, res.map(([id]) => id));
    return positions.filter((p) => !p.stale).map((p) => ({ ...p, distanceKm: dist.get(p.agentId) }));
  }

  async history(orgId: string, agentId: string, from: Date, to: Date) {
    const rows = await this.pings
      .createQueryBuilder('p')
      .select(['p.recordedAt AS "recordedAt"', 'p.accuracy AS accuracy', 'p.speed AS speed', 'p.taskId AS "taskId"'])
      .addSelect('ST_Y(p.location::geometry)', 'lat')
      .addSelect('ST_X(p.location::geometry)', 'lng')
      .where('p.organizationId = :orgId AND p.agentId = :agentId', { orgId, agentId })
      .andWhere('p.recordedAt BETWEEN :from AND :to', { from, to })
      .orderBy('p.recordedAt', 'ASC')
      .limit(10_000)
      .getRawMany();
    const distance = await this.pings.query(
      `SELECT COALESCE(ST_Length(ST_MakeLine(location::geometry ORDER BY "recordedAt")::geography), 0) / 1000 AS km
       FROM location_pings WHERE "organizationId" = $1 AND "agentId" = $2 AND "recordedAt" BETWEEN $3 AND $4`,
      [orgId, agentId, from, to],
    );
    return { points: rows, distanceKm: Number(distance[0]?.km ?? 0) };
  }

  async removeLive(orgId: string, agentId: string) {
    await this.redis.multi().zrem(geoKey(orgId), agentId).del(locKey(agentId)).exec();
  }

  /** Purge selon la politique de rétention (§13, §19). */
  async purgeOlderThan(orgId: string, days: number) {
    const r = await this.pings
      .createQueryBuilder()
      .delete()
      .where('"organizationId" = :orgId AND "recordedAt" < :limit', {
        orgId,
        limit: new Date(Date.now() - days * 86_400_000),
      })
      .execute();
    return r.affected ?? 0;
  }

  private async hydrate(orgId: string, ids: string[]): Promise<LivePosition[]> {
    if (ids.length === 0) return [];
    const pipe = this.redis.pipeline();
    ids.forEach((id) => pipe.hgetall(locKey(id)));
    const res = (await pipe.exec()) ?? [];
    const out: LivePosition[] = [];
    const orphans: string[] = [];
    res.forEach(([, h], i) => {
      const hash = h as Record<string, string>;
      if (!hash || !hash.lat) {
        orphans.push(ids[i]);
        return;
      }
      const num = (v?: string) => (v === undefined || v === '' ? null : Number(v));
      out.push({
        agentId: ids[i],
        lat: Number(hash.lat),
        lng: Number(hash.lng),
        accuracy: num(hash.accuracy),
        speed: num(hash.speed),
        heading: num(hash.heading),
        battery: num(hash.battery),
        taskId: hash.taskId || null,
        recordedAt: hash.recordedAt,
        stale: Date.now() - new Date(hash.recordedAt).getTime() > STALE_AFTER_MS,
      });
    });
    if (orphans.length) await this.redis.zrem(geoKey(orgId), ...orphans);
    return out;
  }

  private toHash(p: LocationUpdatedPayload): Record<string, string> {
    const h: Record<string, string> = {};
    Object.entries(p).forEach(([k, v]) => {
      if (k !== 'organizationId' && k !== 'agentId') h[k] = v === null || v === undefined ? '' : String(v);
    });
    return h;
  }
}
