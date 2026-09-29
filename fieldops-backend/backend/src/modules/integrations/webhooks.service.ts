import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { createHmac, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { WEBHOOK_EVENTS } from '../../common/events';
import { webhookDeliveries } from '../../common/observability/metrics';
import { AuthUser } from '../../common/types/auth-user';
import { CreateWebhookDto, DeliveryQueryDto, UpdateWebhookDto } from './dto/integrations.dto';
import { DeliveryStatus, WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { assertWebhookUrl } from './url-guard';

export const WEBHOOKS_QUEUE = 'webhooks';
export const PING_EVENT = 'ping';
/** Au-delà, l'abonnement est suspendu automatiquement (système tiers durablement indisponible). */
export const MAX_CONSECUTIVE_FAILURES = 50;
const DELIVERY_ATTEMPTS = 8; // backoff exponentiel 30 s → ~1 h cumulée

/** Signature « t=<unix>,v1=<hex> » sur `${t}.${body}` — même principe que Stripe (anti-rejeu par horodatage). */
export function signPayload(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const v1 = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${v1}`;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(WebhookEndpoint) private readonly endpoints: Repository<WebhookEndpoint>,
    @InjectRepository(WebhookDelivery) private readonly deliveries: Repository<WebhookDelivery>,
    @InjectQueue(WEBHOOKS_QUEUE) private readonly queue: Queue,
  ) {}

  async create(user: AuthUser, dto: CreateWebhookDto) {
    this.assertEvents(dto.events);
    await assertWebhookUrl(dto.url);
    const secret = `whsec_${randomBytes(24).toString('hex')}`;
    const saved = await this.endpoints.save(
      this.endpoints.create({ ...dto, organizationId: user.organizationId, secret, createdById: user.id }),
    );
    const { secret: _s, ...rest } = saved;
    // Le secret n'est communiqué qu'une seule fois.
    return { ...rest, secret };
  }

  list(orgId: string) {
    return this.endpoints.find({ where: { organizationId: orgId }, order: { createdAt: 'DESC' } });
  }

  async get(orgId: string, id: string) {
    const e = await this.endpoints.findOne({ where: { id, organizationId: orgId } });
    if (!e) throw new NotFoundException('Webhook introuvable');
    return e;
  }

  async update(orgId: string, id: string, dto: UpdateWebhookDto) {
    const e = await this.get(orgId, id);
    if (dto.events) this.assertEvents(dto.events);
    if (dto.url) await assertWebhookUrl(dto.url);
    Object.assign(e, dto);
    if (dto.isActive) {
      e.consecutiveFailures = 0;
      e.disabledReason = null;
    }
    return this.endpoints.save(e);
  }

  async remove(orgId: string, id: string) {
    const e = await this.get(orgId, id);
    await this.deliveries.delete({ endpointId: e.id });
    await this.endpoints.remove(e);
  }

  async rotateSecret(orgId: string, id: string) {
    await this.get(orgId, id);
    const secret = `whsec_${randomBytes(24).toString('hex')}`;
    await this.endpoints.update({ id, organizationId: orgId }, { secret });
    return { id, secret };
  }

  async listDeliveries(orgId: string, endpointId: string, q: DeliveryQueryDto) {
    await this.get(orgId, endpointId);
    const [data, total] = await this.deliveries.findAndCount({
      where: { organizationId: orgId, endpointId, ...(q.status ? { status: q.status as DeliveryStatus } : {}) },
      order: { createdAt: 'DESC' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    });
    return paginate(data, total, q);
  }

  async test(orgId: string, id: string) {
    const e = await this.get(orgId, id);
    const [d] = await this.enqueue(orgId, [e], PING_EVENT, { message: 'Test de configuration FieldOps', endpointId: e.id });
    return { deliveryId: d.id, status: 'QUEUED' };
  }

  async redeliver(orgId: string, deliveryId: string) {
    const d = await this.deliveries.findOne({ where: { id: deliveryId, organizationId: orgId } });
    if (!d) throw new NotFoundException('Livraison introuvable');
    await this.deliveries.update(d.id, { status: DeliveryStatus.PENDING, error: null });
    await this.queue.add('deliver', { deliveryId: d.id }, this.jobOpts(`${d.id}-r${Date.now()}`));
    return { deliveryId: d.id, status: 'QUEUED' };
  }

  /** Diffusion d'un événement métier vers les abonnements actifs de l'organisation. */
  async dispatch(orgId: string, event: string, data: Record<string, unknown>) {
    const endpoints = await this.endpoints
      .createQueryBuilder('e')
      .where('e.organizationId = :orgId AND e.isActive = true', { orgId })
      .andWhere("(:event = ANY(e.events) OR '*' = ANY(e.events))", { event })
      .getMany();
    if (endpoints.length) await this.enqueue(orgId, endpoints, event, data);
  }

  /** Envoi HTTP d'une livraison (appelé par le worker BullMQ). Lève une erreur pour déclencher un nouvel essai. */
  async deliver(deliveryId: string, isLastAttempt: boolean) {
    const d = await this.deliveries.findOne({ where: { id: deliveryId } });
    if (!d || d.status === DeliveryStatus.SUCCESS) return;
    const endpoint = await this.endpoints
      .createQueryBuilder('e')
      .addSelect('e.secret')
      .where('e.id = :id', { id: d.endpointId })
      .getOne();
    if (!endpoint || (!endpoint.isActive && d.event !== PING_EVENT)) {
      await this.deliveries.update(d.id, { status: DeliveryStatus.FAILED, error: 'Abonnement supprimé ou suspendu' });
      return;
    }

    const body = JSON.stringify({
      id: d.id,
      event: d.event,
      createdAt: d.createdAt.toISOString(),
      organizationId: d.organizationId,
      data: d.payload,
    });
    const started = Date.now();
    let status: number | null = null;
    let responseBody: string | null = null;
    let error: string | null = null;
    try {
      await assertWebhookUrl(endpoint.url); // re-vérifiée à l'envoi (DNS rebinding)
      const res = await fetch(endpoint.url, {
        method: 'POST',
        redirect: 'manual', // une redirection pourrait contourner la protection SSRF
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FieldOps-Webhooks/3.0',
          'X-FieldOps-Event': d.event,
          'X-FieldOps-Delivery': d.id,
          'X-FieldOps-Signature': signPayload(endpoint.secret, body),
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      status = res.status;
      responseBody = (await res.text().catch(() => '')).slice(0, 1000);
      if (res.status < 200 || res.status >= 300) error = `HTTP ${res.status}`;
    } catch (e) {
      error = (e as Error).message ?? String(e);
    }
    const durationMs = Date.now() - started;
    const ok = !error;
    webhookDeliveries.inc({ event: d.event, outcome: ok ? 'success' : isLastAttempt ? 'failed' : 'retry' });

    await this.deliveries.update(d.id, {
      attempts: d.attempts + 1,
      responseStatus: status,
      responseBody,
      error,
      durationMs,
      status: ok ? DeliveryStatus.SUCCESS : isLastAttempt ? DeliveryStatus.FAILED : DeliveryStatus.PENDING,
      deliveredAt: ok ? new Date() : null,
    });

    if (ok) {
      await this.endpoints.update(endpoint.id, { consecutiveFailures: 0, lastDeliveryAt: new Date(), lastStatusCode: status });
      return;
    }
    if (isLastAttempt) {
      const failures = endpoint.consecutiveFailures + 1;
      const disable = failures >= MAX_CONSECUTIVE_FAILURES;
      await this.endpoints.update(endpoint.id, {
        consecutiveFailures: failures,
        lastStatusCode: status,
        ...(disable ? { isActive: false, disabledReason: `${failures} échecs consécutifs` } : {}),
      });
      if (disable) this.logger.warn(`Webhook ${endpoint.id} suspendu après ${failures} échecs`);
      return;
    }
    throw new Error(`Livraison ${d.id} échouée : ${error}`);
  }

  private async enqueue(orgId: string, endpoints: WebhookEndpoint[], event: string, data: Record<string, unknown>) {
    const rows = await this.deliveries.save(
      endpoints.map((e) => this.deliveries.create({ organizationId: orgId, endpointId: e.id, event, payload: data })),
    );
    await this.queue.addBulk(rows.map((d) => ({ name: 'deliver', data: { deliveryId: d.id }, opts: this.jobOpts(d.id) })));
    return rows;
  }

  private jobOpts(jobId: string) {
    return {
      jobId,
      attempts: DELIVERY_ATTEMPTS,
      backoff: { type: 'exponential' as const, delay: 30_000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    };
  }

  private assertEvents(events: string[]) {
    const allowed = new Set<string>([...WEBHOOK_EVENTS, '*']);
    const bad = events.filter((e) => !allowed.has(e));
    if (bad.length) throw new UnprocessableEntityException({ message: 'Événements inconnus', invalid: bad, allowed: [...allowed] });
  }
}
