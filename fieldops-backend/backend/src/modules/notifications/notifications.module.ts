import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { DeviceToken } from './entities/device-token.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsListener } from './notifications.listener';
import { NotificationsProcessor } from './notifications.processor';
import { NOTIFICATIONS_QUEUE, NotificationsService } from './notifications.service';
import { EmailProvider, PushProvider, SmsProvider } from './providers/providers';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, DeviceToken, User]),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
  ],
  providers: [NotificationsService, NotificationsProcessor, NotificationsListener, PushProvider, EmailProvider, SmsProvider],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
