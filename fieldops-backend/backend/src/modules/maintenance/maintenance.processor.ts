import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { MaintenanceService } from './maintenance.service';

export const MAINTENANCE_QUEUE = 'maintenance';

@Processor(MAINTENANCE_QUEUE)
export class MaintenanceProcessor extends WorkerHost implements OnModuleInit {
  constructor(@InjectQueue(MAINTENANCE_QUEUE) private readonly queue: Queue, private readonly service: MaintenanceService) {
    super();
  }

  async onModuleInit() {
    if (process.env.SCHEDULERS_ENABLED === 'false') return; // ex. workers dédiés, tests d'intégration
    // Toutes les 15 min : largement suffisant pour des échéances exprimées en jours.
    await this.queue.upsertJobScheduler('maintenance-scan', { every: 15 * 60_000 }, { name: 'maintenance-scan' });
    // Le planificateur persiste dans Redis : au redémarrage il reprend son rythme sans passage immédiat.
    // Scan au démarrage pour ne pas attendre jusqu'à 15 min (génération idempotente, sans doublon).
    await this.queue.add('maintenance-scan', {}, { removeOnComplete: true, removeOnFail: 100 });
  }

  async process(job: Job) {
    if (job.name === 'maintenance-scan') return this.service.scan();
  }
}
