import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Job, Queue } from 'bullmq';
import { Events, TaskTransitionedPayload } from '../../common/events';
import { DocumentsService } from './documents.service';

export const DOCUMENTS_QUEUE = 'documents';

/** Génération asynchrone : la clôture terrain n'attend pas le rendu PDF (photos à télécharger). */
@Processor(DOCUMENTS_QUEUE, { concurrency: 2 })
export class DocumentsProcessor extends WorkerHost {
  constructor(private readonly docs: DocumentsService) {
    super();
  }

  async process(job: Job<{ organizationId: string; taskId: string }>) {
    if (job.name === 'task-report') return this.docs.generateTaskReport(job.data.organizationId, job.data.taskId);
  }
}

@Injectable()
export class DocumentsListener {
  constructor(@InjectQueue(DOCUMENTS_QUEUE) private readonly queue: Queue) {}

  @OnEvent(Events.TASK_TRANSITIONED, { async: true, promisify: true })
  async onTransition(p: TaskTransitionedPayload) {
    if (p.to !== 'COMPLETED') return;
    // jobId par tâche et par minute : dédoublonne un événement reçu deux fois (ex. rejeu offline).
    await this.queue.add(
      'task-report',
      { organizationId: p.organizationId, taskId: p.taskId },
      { jobId: `report-${p.taskId}-${Date.now() - (Date.now() % 60_000)}`, attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: 100, removeOnFail: 500 },
    );
  }
}
