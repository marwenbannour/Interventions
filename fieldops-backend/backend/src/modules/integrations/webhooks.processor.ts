import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { WEBHOOK_EVENTS } from '../../common/events';
import { WEBHOOKS_QUEUE, WebhooksService } from './webhooks.service';

@Processor(WEBHOOKS_QUEUE, { concurrency: 10 })
export class WebhooksProcessor extends WorkerHost {
  constructor(private readonly webhooks: WebhooksService) {
    super();
  }

  async process(job: Job<{ deliveryId: string }>) {
    const isLast = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    return this.webhooks.deliver(job.data.deliveryId, isLast);
  }
}

/** Relaie les événements métier exposables vers les abonnements webhooks. */
@Injectable()
export class WebhooksRelay implements OnModuleInit {
  private readonly logger = new Logger(WebhooksRelay.name);

  constructor(private readonly emitter: EventEmitter2, private readonly webhooks: WebhooksService) {}

  onModuleInit() {
    for (const event of WEBHOOK_EVENTS) {
      this.emitter.on(event, (payload: Record<string, unknown> & { organizationId?: string }) => {
        if (!payload?.organizationId) return;
        this.webhooks
          .dispatch(payload.organizationId, event, payload)
          .catch((e) => this.logger.error(`Diffusion webhook ${event} : ${(e as Error).message}`));
      });
    }
  }
}
