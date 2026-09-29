import { Counter, collectDefaultMetrics, Gauge, Histogram, Registry } from 'prom-client';

/** Registre Prometheus unique du processus (§20 observabilité, V3). */
export const registry = new Registry();
registry.setDefaultLabels({ service: 'fieldops-api' });
collectDefaultMetrics({ register: registry, prefix: 'fieldops_' });

export const httpDuration = new Histogram({
  name: 'fieldops_http_request_duration_seconds',
  help: 'Durée des requêtes HTTP',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5],
  registers: [registry],
});

export const syncOperations = new Counter({
  name: 'fieldops_sync_operations_total',
  help: 'Opérations offline rejouées via /sync/push, par type et résultat',
  labelNames: ['type', 'status'] as const,
  registers: [registry],
});

export const webhookDeliveries = new Counter({
  name: 'fieldops_webhook_deliveries_total',
  help: 'Tentatives de livraison de webhooks',
  labelNames: ['event', 'outcome'] as const,
  registers: [registry],
});

export const businessEvents = new Counter({
  name: 'fieldops_business_events_total',
  help: 'Événements métier émis (création, transitions, SLA, réinterventions…)',
  labelNames: ['event'] as const,
  registers: [registry],
});

export const queueJobs = new Gauge({
  name: 'fieldops_queue_jobs',
  help: 'Jobs BullMQ par file et état (échantillonné à chaque scrape)',
  labelNames: ['queue', 'state'] as const,
  registers: [registry],
});
