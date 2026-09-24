import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/types/auth-user';
import { ReportQueryDto } from './dto/report.dto';

interface Scope {
  where: string;
  params: unknown[];
  from: Date;
  to: Date;
}

const pct = (n: number | null | undefined) => (n == null ? null : Math.round(Number(n) * 1000) / 10);
const num = (n: unknown, d = 1) => (n == null ? null : Math.round(Number(n) * 10 ** d) / 10 ** d);

/** Reporting & KPI (§6.13) — agrégations SQL directes pour tenir le P95 < 300 ms. */
@Injectable()
export class ReportsService {
  constructor(private readonly ds: DataSource) {}

  private scope(user: AuthUser, q: ReportQueryDto, alias = 't'): Scope {
    const to = q.to ? new Date(q.to) : new Date();
    const from = q.from ? new Date(q.from) : new Date(to.getTime() - 30 * 86_400_000);
    const params: unknown[] = [user.organizationId, from, to];
    const conds = [`${alias}."organizationId" = $1`, `${alias}."createdAt" BETWEEN $2 AND $3`];
    let clientId = q.clientId;
    if (user.role === Role.CLIENT) {
      if (clientId && clientId !== user.clientId) throw new ForbiddenException();
      clientId = user.clientId ?? undefined;
    }
    if (clientId) {
      params.push(clientId);
      conds.push(`${alias}."clientId" = $${params.length}`);
    }
    if (q.siteId) {
      params.push(q.siteId);
      conds.push(`${alias}."siteId" = $${params.length}`);
    }
    return { where: conds.join(' AND '), params, from, to };
  }

  async dashboard(user: AuthUser, q: ReportQueryDto) {
    const s = this.scope(user, q);
    const org = user.organizationId;
    const [byStatus, totals, today, agents, rating] = await Promise.all([
      this.ds.query(`SELECT status, COUNT(*)::int AS count FROM tasks t WHERE ${s.where} GROUP BY status ORDER BY count DESC`, s.params),
      this.ds.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status IN ('COMPLETED','EVALUATED'))::int AS completed,
                COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled,
                COUNT(*) FILTER (WHERE "ackBreached" OR "arrivalBreached" OR "interventionBreached" OR "closeBreached")::int AS "slaBreached",
                AVG(EXTRACT(EPOCH FROM ("completedAt" - "startedAt")) / 60) FILTER (WHERE "completedAt" IS NOT NULL AND "startedAt" IS NOT NULL) AS "avgInterventionMin",
                AVG(EXTRACT(EPOCH FROM ("arrivedAt" - "createdAt")) / 60) FILTER (WHERE "arrivedAt" IS NOT NULL) AS "avgArrivalMin"
           FROM tasks t WHERE ${s.where}`,
        s.params,
      ),
      this.ds.query(
        `SELECT COUNT(*)::int AS scheduled,
                COUNT(*) FILTER (WHERE status NOT IN ('COMPLETED','EVALUATED','CANCELLED'))::int AS open,
                COUNT(*) FILTER (WHERE "agentId" IS NULL AND status NOT IN ('CANCELLED'))::int AS unassigned
           FROM tasks WHERE "organizationId" = $1 AND COALESCE("scheduledStart","createdAt")::date = CURRENT_DATE`,
        [org],
      ),
      this.ds.query(
        `SELECT COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
                COUNT(*) FILTER (WHERE status = 'ACTIVE' AND "isOnDuty")::int AS "onDuty"
           FROM agent_profiles WHERE "organizationId" = $1`,
        [org],
      ),
      this.ds.query(
        `SELECT AVG(e.rating)::float AS avg, COUNT(*)::int AS count
           FROM evaluations e JOIN tasks t ON t.id = e."taskId" WHERE ${s.where}`,
        s.params,
      ),
    ]);
    const t = totals[0];
    return {
      period: { from: s.from.toISOString(), to: s.to.toISOString() },
      tasks: {
        total: t.total,
        completed: t.completed,
        cancelled: t.cancelled,
        completionRate: t.total ? pct(t.completed / t.total) : null,
        slaBreached: t.slaBreached,
        slaComplianceRate: t.total ? pct(1 - t.slaBreached / t.total) : null,
        avgInterventionMin: num(t.avgInterventionMin),
        avgArrivalMin: num(t.avgArrivalMin),
        byStatus,
      },
      today: user.role === Role.CLIENT ? undefined : today[0],
      agents: user.role === Role.CLIENT ? undefined : agents[0],
      satisfaction: { avgRating: num(rating[0].avg, 2), evaluations: rating[0].count },
    };
  }

  /** Respect des SLA par indicateur, par client et par priorité. */
  async sla(user: AuthUser, q: ReportQueryDto) {
    const s = this.scope(user, q);
    const metric = (due: string, breached: string, done: string) => `
      COUNT(*) FILTER (WHERE "${due}" IS NOT NULL AND ("${done}" IS NOT NULL OR "${breached}"))::int AS "${due}_n",
      COUNT(*) FILTER (WHERE "${due}" IS NOT NULL AND "${breached}")::int AS "${due}_b"`;
    const cols = [
      metric('ackDueAt', 'ackBreached', 'acceptedAt'),
      metric('arrivalDueAt', 'arrivalBreached', 'arrivedAt'),
      metric('interventionDueAt', 'interventionBreached', 'completedAt'),
      metric('closeDueAt', 'closeBreached', 'completedAt'),
    ].join(',');
    const shape = (r: any) => {
      const m = (k: string) => ({
        measured: r[`${k}_n`],
        breached: r[`${k}_b`],
        complianceRate: r[`${k}_n`] ? pct(1 - r[`${k}_b`] / r[`${k}_n`]) : null,
      });
      return { ack: m('ackDueAt'), arrival: m('arrivalDueAt'), intervention: m('interventionDueAt'), close: m('closeDueAt') };
    };
    const [global, byClient, byPriority] = await Promise.all([
      this.ds.query(`SELECT COUNT(*)::int AS total, ${cols} FROM tasks t WHERE ${s.where}`, s.params),
      this.ds.query(
        `SELECT c.id AS "clientId", c.name AS "clientName", COUNT(*)::int AS total, ${cols}
           FROM tasks t JOIN clients c ON c.id = t."clientId" WHERE ${s.where}
          GROUP BY c.id, c.name ORDER BY c.name`,
        s.params,
      ),
      this.ds.query(`SELECT t.priority, COUNT(*)::int AS total, ${cols} FROM tasks t WHERE ${s.where} GROUP BY t.priority`, s.params),
    ]);
    return {
      period: { from: s.from.toISOString(), to: s.to.toISOString() },
      global: { total: global[0].total, ...shape(global[0]) },
      byClient: byClient.map((r: any) => ({ clientId: r.clientId, clientName: r.clientName, total: r.total, ...shape(r) })),
      byPriority: byPriority.map((r: any) => ({ priority: r.priority, total: r.total, ...shape(r) })),
    };
  }

  /** Performance agents : volume, ponctualité, durée moyenne, satisfaction. */
  async agents(user: AuthUser, q: ReportQueryDto) {
    const s = this.scope(user, q);
    const rows = await this.ds.query(
      `SELECT u.id AS "agentId", u."firstName" || ' ' || u."lastName" AS name,
              COUNT(t.id)::int AS assigned,
              COUNT(t.id) FILTER (WHERE t.status IN ('COMPLETED','EVALUATED'))::int AS completed,
              COUNT(t.id) FILTER (WHERE t."arrivalDueAt" IS NOT NULL AND t."arrivedAt" IS NOT NULL)::int AS "arrivalMeasured",
              COUNT(t.id) FILTER (WHERE t."arrivalDueAt" IS NOT NULL AND t."arrivedAt" IS NOT NULL AND NOT t."arrivalBreached")::int AS "onTime",
              AVG(EXTRACT(EPOCH FROM (t."completedAt" - t."startedAt")) / 60) FILTER (WHERE t."completedAt" IS NOT NULL AND t."startedAt" IS NOT NULL) AS "avgInterventionMin",
              AVG(EXTRACT(EPOCH FROM (t."arrivedAt" - t."enRouteAt")) / 60) FILTER (WHERE t."arrivedAt" IS NOT NULL AND t."enRouteAt" IS NOT NULL) AS "avgTravelMin",
              AVG(e.rating)::float AS "avgRating",
              COUNT(e.id)::int AS evaluations,
              COUNT(t.id) FILTER (WHERE t."ackBreached" OR t."arrivalBreached" OR t."interventionBreached" OR t."closeBreached")::int AS "slaBreached"
         FROM agent_profiles a
         JOIN users u ON u.id = a."userId"
         LEFT JOIN tasks t ON t."agentId" = a."userId" AND ${s.where}
         LEFT JOIN evaluations e ON e."taskId" = t.id
        WHERE a."organizationId" = $1
        GROUP BY u.id, u."firstName", u."lastName"
        ORDER BY completed DESC, name ASC`,
      s.params,
    );
    return {
      period: { from: s.from.toISOString(), to: s.to.toISOString() },
      agents: rows.map((r: any) => ({
        agentId: r.agentId,
        name: r.name,
        assigned: r.assigned,
        completed: r.completed,
        punctualityRate: r.arrivalMeasured ? pct(r.onTime / r.arrivalMeasured) : null,
        avgInterventionMin: num(r.avgInterventionMin),
        avgTravelMin: num(r.avgTravelMin),
        avgRating: num(r.avgRating, 2),
        evaluations: r.evaluations,
        slaBreached: r.slaBreached,
      })),
    };
  }

  /** Volume et qualité par site (vue client / direction). */
  async sites(user: AuthUser, q: ReportQueryDto) {
    const s = this.scope(user, q);
    const rows = await this.ds.query(
      `SELECT si.id AS "siteId", si.name AS "siteName", c.name AS "clientName",
              COUNT(t.id)::int AS total,
              COUNT(t.id) FILTER (WHERE t.status IN ('COMPLETED','EVALUATED'))::int AS completed,
              COUNT(t.id) FILTER (WHERE t."ackBreached" OR t."arrivalBreached" OR t."interventionBreached" OR t."closeBreached")::int AS "slaBreached",
              AVG(e.rating)::float AS "avgRating"
         FROM tasks t
         JOIN sites si ON si.id = t."siteId"
         JOIN clients c ON c.id = t."clientId"
         LEFT JOIN evaluations e ON e."taskId" = t.id
        WHERE ${s.where}
        GROUP BY si.id, si.name, c.name
        ORDER BY total DESC`,
      s.params,
    );
    return {
      period: { from: s.from.toISOString(), to: s.to.toISOString() },
      sites: rows.map((r: any) => ({ ...r, avgRating: num(r.avgRating, 2) })),
    };
  }

  toCsv(rows: Record<string, unknown>[]): string {
    if (!rows.length) return '';
    const flat = rows.map((r) => this.flatten(r));
    const headers = [...new Set(flat.flatMap((r) => Object.keys(r)))];
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    // Séparateur « ; » : ouverture directe dans Excel FR.
    return '\uFEFF' + [headers.join(';'), ...flat.map((r) => headers.map((h) => esc(r[h])).join(';'))].join('\n');
  }

  private flatten(o: Record<string, any>, prefix = ''): Record<string, unknown> {
    return Object.entries(o).reduce<Record<string, unknown>>((acc, [k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) Object.assign(acc, this.flatten(v, key));
      else acc[key] = v;
      return acc;
    }, {});
  }
}
