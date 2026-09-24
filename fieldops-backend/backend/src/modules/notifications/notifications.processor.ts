import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { DeviceToken } from './entities/device-token.entity';
import { Notification, NotificationChannel, NotificationStatus } from './entities/notification.entity';
import { NOTIFICATIONS_QUEUE, TransientInput } from './notifications.service';
import { EmailProvider, PushProvider, SmsProvider } from './providers/providers';

@Processor(NOTIFICATIONS_QUEUE, { concurrency: 10 })
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
    @InjectRepository(DeviceToken) private readonly devices: Repository<DeviceToken>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly push: PushProvider,
    private readonly email: EmailProvider,
    private readonly sms: SmsProvider,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'transient') return this.processTransient(job.data as TransientInput);
    if (job.name === 'deliver') return this.deliver(job.data.notificationId, job.attemptsMade + 1);
  }

  private async processTransient(input: TransientInput) {
    const user = await this.users.findOne({ where: { id: input.userId } });
    if (!user) return;
    if (input.channel === 'SMS') {
      if (!user.phone) throw new Error('Aucun numéro de téléphone');
      await this.sms.send(user.phone, input.body);
    } else {
      await this.email.send(user.email, input.title, input.body);
    }
  }

  private async deliver(notificationId: string, attempt: number) {
    const n = await this.repo.findOne({ where: { id: notificationId } });
    if (!n || n.status === NotificationStatus.SENT) return;
    const user = await this.users.findOne({ where: { id: n.userId } });
    if (!user) return;

    await this.repo.update(n.id, { attempts: attempt });

    switch (n.channel) {
      case NotificationChannel.PUSH: {
        const tokens = await this.devices.find({ where: { userId: n.userId } });
        if (tokens.length === 0) {
          await this.repo.update(n.id, { status: NotificationStatus.FAILED, lastError: 'Aucun appareil enregistré' });
          return;
        }
        const { invalidTokens } = await this.push.send({
          tokens: tokens.map((t) => t.token),
          title: n.title,
          body: n.body,
          data: { ...(n.data ?? {}), notificationId: n.id, type: n.type },
        });
        if (invalidTokens.length) await this.devices.delete({ token: In(invalidTokens) });
        break;
      }
      case NotificationChannel.EMAIL:
        await this.email.send(user.email, n.title, n.body);
        break;
      case NotificationChannel.SMS:
        if (!user.phone) {
          await this.repo.update(n.id, { status: NotificationStatus.FAILED, lastError: 'Aucun numéro' });
          return;
        }
        await this.sms.send(user.phone, `${n.title} — ${n.body}`);
        break;
    }
    await this.repo.update(n.id, { status: NotificationStatus.SENT, sentAt: new Date(), lastError: null });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error) {
    this.logger.warn(`Job ${job.name}#${job.id} échec (tentative ${job.attemptsMade}) : ${err.message}`);
    if (job.name === 'deliver' && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      await this.repo.update(job.data.notificationId, { status: NotificationStatus.FAILED, lastError: err.message });
    }
  }
}
