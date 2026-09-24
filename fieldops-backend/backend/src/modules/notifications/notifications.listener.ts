import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Role } from '../../common/enums/role.enum';
import {
  Events, SlaEventPayload, TaskAssignedPayload, WorkflowNotifyPayload,
} from '../../common/events';
import { UsersService } from '../users/users.service';
import { NotificationChannel } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';

const METRIC_LABEL: Record<SlaEventPayload['metric'], string> = {
  ack: 'prise en charge',
  arrival: 'arrivée sur site',
  intervention: "durée d'intervention",
  close: 'clôture',
};

/** Règles de notification déclenchées par les événements métier. */
@Injectable()
export class NotificationsListener {
  constructor(private readonly notifications: NotificationsService, private readonly users: UsersService) {}

  @OnEvent(Events.TASK_ASSIGNED, { async: true, promisify: true })
  async onAssigned(p: TaskAssignedPayload) {
    if (!p.agentId) return;
    await this.notifications.notify({
      organizationId: p.organizationId,
      userIds: [p.agentId],
      type: 'TASK_ASSIGNED',
      title: 'Nouvelle intervention',
      body: `${p.reference} — ${p.title}`,
      data: { taskId: p.taskId },
    });
  }

  @OnEvent(Events.WORKFLOW_NOTIFY, { async: true, promisify: true })
  async onWorkflowNotify(p: WorkflowNotifyPayload) {
    const userIds = await this.resolveTargets(p.organizationId, p.targets, p);
    const render = (s: string) => s.replace('{reference}', p.reference).replace('{title}', p.title).replace('{status}', p.status);
    await this.notifications.notify({
      organizationId: p.organizationId,
      userIds,
      type: 'TASK_STATUS',
      title: render(p.title),
      body: render(p.body),
      data: { taskId: p.taskId, status: p.status },
      channels: p.channels as NotificationChannel[] | undefined,
    });
  }

  @OnEvent(Events.SLA_WARNING, { async: true, promisify: true })
  async onSlaWarning(p: SlaEventPayload) {
    const userIds = await this.resolveTargets(p.organizationId, ['SUPERVISORS', 'AGENT'], p);
    await this.notifications.notify({
      organizationId: p.organizationId,
      userIds,
      type: 'SLA_WARNING',
      title: `⚠️ SLA bientôt dépassé — ${p.reference}`,
      body: `Échéance ${METRIC_LABEL[p.metric]} à ${new Date(p.dueAt).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })}`,
      data: { taskId: p.taskId, metric: p.metric },
    });
  }

  @OnEvent(Events.SLA_BREACHED, { async: true, promisify: true })
  async onSlaBreached(p: SlaEventPayload) {
    const userIds = await this.resolveTargets(p.organizationId, ['SUPERVISORS', 'ADMINS'], p);
    await this.notifications.notify({
      organizationId: p.organizationId,
      userIds,
      type: 'SLA_BREACHED',
      title: `🔴 SLA dépassé — ${p.reference}`,
      body: `Délai de ${METRIC_LABEL[p.metric]} dépassé pour « ${p.title} »`,
      data: { taskId: p.taskId, metric: p.metric },
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL],
    });
  }

  private async resolveTargets(orgId: string, targets: string[], p: { agentId?: string | null; clientId: string }) {
    const ids: string[] = [];
    const roleMap: Record<string, Role> = { SUPERVISORS: Role.SUPERVISOR, ADMINS: Role.ADMIN, DIRECTION: Role.DIRECTION };
    const roles = targets.map((t) => roleMap[t]).filter(Boolean);
    if (roles.length) ids.push(...(await this.users.findByRoles(orgId, roles)).map((u) => u.id));
    if (targets.includes('AGENT') && p.agentId) ids.push(p.agentId);
    if (targets.includes('CLIENT')) ids.push(...(await this.users.findClientUsers(orgId, p.clientId)).map((u) => u.id));
    return ids;
  }
}
