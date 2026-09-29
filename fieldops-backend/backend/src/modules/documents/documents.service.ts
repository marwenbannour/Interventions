import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash } from 'crypto';
import { DataSource, In, Not } from 'typeorm';
import { Events, WorkflowNotifyPayload } from '../../common/events';
import { AuthUser } from '../../common/types/auth-user';
import { StorageService } from '../../infra/storage/storage.service';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { Photo, PhotoValidation } from '../photos/entities/photo.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskEvent } from '../tasks/entities/task-event.entity';
import { TasksService } from '../tasks/tasks.service';
import { User } from '../users/entities/user.entity';
import { renderTaskReport, TaskReportData } from './task-report.pdf';

const REPORT_PHOTO_TYPES = ['BEFORE', 'AFTER', 'PROOF', 'ANOMALY'];
const EMBEDDABLE = ['image/jpeg', 'image/png'];
const MAX_PHOTOS = 9;

/** Documents générés (V3) : rapport d'intervention PDF signé par empreinte. */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly storage: StorageService,
    private readonly tasks: TasksService,
    private readonly orgs: OrganizationsService,
    private readonly events: EventEmitter2,
  ) {}

  /** Génère (ou régénère) le rapport, le stocke dans S3 et enregistre son empreinte. */
  async generateTaskReport(orgId: string, taskId: string) {
    const data = await this.collect(orgId, taskId);
    const pdf = await renderTaskReport(data);
    const sha256 = createHash('sha256').update(pdf).digest('hex');
    const key = `org/${orgId}/tasks/${taskId}/report-${Date.now()}.pdf`;
    await this.storage.put(key, pdf, 'application/pdf', { sha256, reference: data.reference });

    const task = await this.ds.getRepository(Task).findOneByOrFail({ id: taskId });
    const previousKey = task.reportKey;
    const generatedAt = new Date();
    // update() ciblé : ne touche ni la version optimiste ni updatedAt des autres champs métier.
    await this.ds.getRepository(Task).update({ id: taskId }, { reportKey: key, reportSha256: sha256, reportGeneratedAt: generatedAt });
    await this.ds.getRepository(TaskEvent).save(
      this.ds.getRepository(TaskEvent).create({
        organizationId: orgId, taskId, type: 'REPORT_GENERATED', occurredAt: generatedAt,
        data: { sha256, sizeBytes: pdf.length, regenerated: !!previousKey },
      }),
    );
    if (previousKey) await this.storage.delete(previousKey).catch(() => undefined);

    const payload = this.tasks.payload(task);
    this.events.emit(Events.REPORT_GENERATED, { ...payload, sha256, generatedAt: generatedAt.toISOString() });
    if (!previousKey) {
      const np: WorkflowNotifyPayload = {
        ...payload, targets: ['CLIENT'], title: 'Rapport disponible — {reference}',
        body: "Le rapport de l'intervention « {title} » est disponible dans votre espace.", channels: ['IN_APP', 'EMAIL'],
      };
      this.events.emit(Events.WORKFLOW_NOTIFY, np);
    }
    this.logger.log(`Rapport ${data.reference} généré (${Math.round(pdf.length / 1024)} Ko, sha256 ${sha256.slice(0, 12)}…)`);
    return { sha256, generatedAt, sizeBytes: pdf.length };
  }

  /** Lien de téléchargement temporaire (le client ne voit que ses interventions). */
  async reportLink(user: AuthUser, taskId: string) {
    const task = await this.tasks.getForUser(user, taskId);
    if (!task.reportKey) throw new NotFoundException('Rapport non encore généré pour cette intervention');
    const url = await this.storage.signedGetUrl(task.reportKey, 600, `rapport-${task.reference}.pdf`);
    return { url, sha256: task.reportSha256, generatedAt: task.reportGeneratedAt, expiresInSec: 600 };
  }

  /** Vérification d'intégrité : un PDF reçu correspond-il à l'empreinte enregistrée ? */
  async verify(user: AuthUser, taskId: string, sha256: string) {
    const task = await this.tasks.getForUser(user, taskId);
    return { reference: task.reference, valid: !!task.reportSha256 && task.reportSha256 === sha256.toLowerCase() };
  }

  private async collect(orgId: string, taskId: string): Promise<TaskReportData> {
    const task = await this.ds.getRepository(Task).findOne({
      where: { id: taskId, organizationId: orgId },
      relations: { site: true, client: true, agent: true, asset: true },
    });
    if (!task) throw new NotFoundException('Intervention introuvable');
    const org = await this.ds.getRepository(Organization).findOneByOrFail({ id: orgId });
    const settings = await this.orgs.getSettings(orgId);

    const noteEvents = await this.ds.getRepository(TaskEvent).find({
      where: { taskId, type: 'NOTE' },
      order: { occurredAt: 'ASC' },
    });
    const authorIds = [...new Set(noteEvents.map((e) => e.actorId).filter(Boolean))] as string[];
    const authors = authorIds.length ? await this.ds.getRepository(User).findBy({ id: In(authorIds) }) : [];
    const authorName = (id?: string | null) => {
      const u = authors.find((a) => a.id === id);
      return u ? `${u.firstName} ${u.lastName}` : null;
    };

    const photos = await this.ds.getRepository(Photo).find({
      where: { taskId, type: In(REPORT_PHOTO_TYPES) as any, validation: Not(PhotoValidation.REJECTED) },
      order: { takenAt: 'ASC' },
    });
    const embeddable = photos.filter((p) => EMBEDDABLE.includes(p.contentType)).slice(0, MAX_PHOTOS);
    const photoBuffers: TaskReportData['photos'] = [];
    for (const p of embeddable) {
      try {
        photoBuffers.push({ type: p.type, takenAt: p.takenAt, image: await this.storage.get(p.storageKey) });
      } catch (e) {
        this.logger.warn(`Photo ${p.id} illisible pour le rapport : ${(e as Error).message}`);
      }
    }
    let signature: TaskReportData['signature'] = null;
    if (task.signatureKey) {
      try {
        signature = { image: await this.storage.get(task.signatureKey), name: task.signedByName };
      } catch {
        signature = null;
      }
    }
    const evaluation = await this.ds.getRepository(Evaluation).findOne({ where: { taskId } });
    const reworkOf = task.reworkOfTaskId ? await this.ds.getRepository(Task).findOneBy({ id: task.reworkOfTaskId }) : null;

    return {
      organizationName: org.name,
      reference: task.reference,
      title: task.title,
      description: task.description,
      type: task.type,
      priority: task.priority,
      origin: task.origin,
      status: task.status,
      isRework: task.isRework,
      reworkOfReference: reworkOf?.reference ?? null,
      client: { name: task.client.name, contractReference: task.client.contractReference },
      site: task.site,
      asset: task.asset ?? null,
      agentName: task.agent ? `${task.agent.firstName} ${task.agent.lastName}` : null,
      timeline: [
        { label: 'Création', at: task.createdAt },
        { label: 'Affectation', at: task.assignedAt ?? null },
        { label: 'Acceptation', at: task.acceptedAt ?? null },
        { label: 'Départ', at: task.enRouteAt ?? null },
        { label: 'Arrivée sur site', at: task.arrivedAt ?? null },
        { label: "Début d'intervention", at: task.startedAt ?? null },
        { label: 'Fin', at: task.completedAt ?? null },
      ],
      sla: [
        { label: 'Prise en charge', dueAt: task.ackDueAt ?? null, breached: task.ackBreached },
        { label: 'Arrivée sur site', dueAt: task.arrivalDueAt ?? null, breached: task.arrivalBreached },
        { label: "Durée d'intervention", dueAt: task.interventionDueAt ?? null, breached: task.interventionBreached },
        { label: 'Clôture', dueAt: task.closeDueAt ?? null, breached: task.closeBreached },
      ],
      checklist: task.checklist,
      notes: noteEvents.map((e) => ({ at: e.occurredAt, author: authorName(e.actorId), text: e.comment ?? '' })),
      completionNotes: task.completionNotes,
      photos: photoBuffers,
      signature,
      evaluation: evaluation ? { rating: evaluation.rating, comment: evaluation.comment } : null,
      generatedAt: new Date(),
      timezone: settings.timezone,
    };
  }
}
