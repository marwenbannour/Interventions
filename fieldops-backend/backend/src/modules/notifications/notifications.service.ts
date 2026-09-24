import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { In, IsNull, Repository } from 'typeorm';
import { Events } from '../../common/events';
import { paginate } from '../../common/dto/pagination.dto';
import { DeviceToken } from './entities/device-token.entity';
import { Notification, NotificationChannel, NotificationStatus } from './entities/notification.entity';
import { NotificationQueryDto } from './dto/notification.dto';

export const NOTIFICATIONS_QUEUE = 'notifications';

export interface NotifyInput {
  organizationId: string;
  userIds: string[];
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
}

export interface TransientInput {
  organizationId: string;
  userId: string;
  channel: 'EMAIL' | 'SMS';
  title: string;
  body: string;
}

const JOB_OPTS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
    @InjectRepository(DeviceToken) private readonly devices: Repository<DeviceToken>,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Crée une notification par destinataire et par canal, puis délègue l'envoi
   * au worker BullMQ (retry exponentiel + suivi de livraison §6.10).
   */
  async notify(input: NotifyInput): Promise<Notification[]> {
    const userIds = [...new Set(input.userIds.filter(Boolean))];
    if (userIds.length === 0) return [];
    const channels = input.channels?.length ? input.channels : [NotificationChannel.IN_APP, NotificationChannel.PUSH];

    const rows = userIds.flatMap((userId) =>
      channels.map((channel) =>
        this.repo.create({
          organizationId: input.organizationId,
          userId,
          channel,
          type: input.type,
          title: input.title,
          body: input.body,
          data: input.data ?? null,
          status: channel === NotificationChannel.IN_APP ? NotificationStatus.SENT : NotificationStatus.PENDING,
          sentAt: channel === NotificationChannel.IN_APP ? new Date() : null,
        }),
      ),
    );
    const saved = await this.repo.save(rows);

    for (const n of saved) {
      if (n.channel === NotificationChannel.IN_APP) {
        this.events.emit(Events.NOTIFICATION_CREATED, n);
      } else {
        await this.queue.add('deliver', { notificationId: n.id }, JOB_OPTS);
      }
    }
    return saved;
  }

  /** Message éphémère non persisté (ex. OTP) : le contenu sensible n'est pas stocké en base. */
  async sendTransient(input: TransientInput) {
    await this.queue.add('transient', input, { ...JOB_OPTS, attempts: 3, removeOnComplete: true, removeOnFail: true });
  }

  async listForUser(userId: string, q: NotificationQueryDto) {
    const where: any = { userId, channel: NotificationChannel.IN_APP };
    if (q.unreadOnly) where.readAt = IsNull();
    const [data, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    });
    const unread = await this.repo.count({ where: { userId, channel: NotificationChannel.IN_APP, readAt: IsNull() } });
    return { ...paginate(data, total, q), unread };
  }

  async markRead(userId: string, ids: string[] | 'all') {
    const where: any = { userId, readAt: IsNull() };
    if (ids !== 'all') where.id = In(ids);
    await this.repo.update(where, { readAt: new Date(), status: NotificationStatus.READ });
  }

  async registerDevice(orgId: string, userId: string, token: string, platform: string) {
    await this.devices.upsert(
      { organizationId: orgId, userId, token, platform, lastSeenAt: new Date() },
      { conflictPaths: ['token'] },
    );
  }

  async unregisterDevice(userId: string, token: string) {
    await this.devices.delete({ userId, token });
  }

  deliveryStats(orgId: string, since: Date) {
    return this.repo
      .createQueryBuilder('n')
      .select('n.channel', 'channel')
      .addSelect('n.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('n.organizationId = :orgId AND n.createdAt >= :since', { orgId, since })
      .andWhere('n.channel != :inApp', { inApp: NotificationChannel.IN_APP })
      .groupBy('n.channel')
      .addGroupBy('n.status')
      .getRawMany();
  }
}
