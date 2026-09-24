import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { LocationService } from '../location/location.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { SlaService } from './sla.service';
import { DataSource } from 'typeorm';

export const SCHEDULER_QUEUE = 'scheduler';

/**
 * Jobs planifiés (repeatable BullMQ) : exécutés une seule fois même avec plusieurs
 * instances de l'API (backend stateless, §19).
 */
@Processor(SCHEDULER_QUEUE)
export class SchedulerProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(SchedulerProcessor.name);

  constructor(
    @InjectQueue(SCHEDULER_QUEUE) private readonly queue: Queue,
    private readonly sla: SlaService,
    private readonly location: LocationService,
    private readonly orgs: OrganizationsService,
    private readonly ds: DataSource,
  ) {
    super();
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    await this.queue.upsertJobScheduler('sla-scan', { every: 60_000 }, { name: 'sla-scan' });
    await this.queue.upsertJobScheduler('retention-purge', { pattern: '0 3 * * *' }, { name: 'retention-purge' });
  }

  async process(job: Job) {
    switch (job.name) {
      case 'sla-scan':
        return this.sla.scan();
      case 'retention-purge':
        return this.purge();
    }
  }

  private async purge() {
    const orgs: { id: string }[] = await this.ds.query('SELECT id FROM organizations WHERE "isActive" = true');
    for (const { id } of orgs) {
      const s = await this.orgs.getSettings(id);
      const n = await this.location.purgeOlderThan(id, s.locationRetentionDays);
      if (n) this.logger.log(`Rétention : ${n} position(s) purgée(s) pour ${id}`);
    }
  }
}
