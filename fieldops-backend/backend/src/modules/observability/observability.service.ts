import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { Events } from '../../common/events';
import { businessEvents, queueJobs } from '../../common/observability/metrics';
import { DOCUMENTS_QUEUE } from '../documents/documents.processor';
import { WEBHOOKS_QUEUE } from '../integrations/webhooks.service';
import { MAINTENANCE_QUEUE } from '../maintenance/maintenance.processor';
import { NOTIFICATIONS_QUEUE } from '../notifications/notifications.service';
import { SCHEDULER_QUEUE } from '../sla/sla.processor';

export const OBSERVED_QUEUES = [NOTIFICATIONS_QUEUE, SCHEDULER_QUEUE, MAINTENANCE_QUEUE, DOCUMENTS_QUEUE, WEBHOOKS_QUEUE];
const KNOWN_EVENTS = new Set<string>(Object.values(Events));

@Injectable()
export class ObservabilityService implements OnModuleInit {
  private readonly queues: Queue[];

  constructor(
    private readonly emitter: EventEmitter2,
    @InjectQueue(NOTIFICATIONS_QUEUE) q1: Queue,
    @InjectQueue(SCHEDULER_QUEUE) q2: Queue,
    @InjectQueue(MAINTENANCE_QUEUE) q3: Queue,
    @InjectQueue(DOCUMENTS_QUEUE) q4: Queue,
    @InjectQueue(WEBHOOKS_QUEUE) q5: Queue,
  ) {
    this.queues = [q1, q2, q3, q4, q5];
  }

  onModuleInit() {
    // Compteur par type d'événement métier (label borné aux événements déclarés).
    this.emitter.onAny((event) => {
      const name = String(event);
      if (KNOWN_EVENTS.has(name) && name !== Events.LOCATION_UPDATED) businessEvents.inc({ event: name });
    });
  }

  /** Profondeur des files : alerte sur notifications en échec / webhooks en attente (§20). */
  async sampleQueues() {
    await Promise.all(
      this.queues.map(async (q) => {
        const c = await q.getJobCounts('waiting', 'active', 'delayed', 'failed').catch(() => null);
        if (!c) return;
        for (const [state, n] of Object.entries(c)) queueJobs.set({ queue: q.name, state }, n);
      }),
    );
  }
}
