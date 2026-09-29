import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from './entities/api-key.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { IntegrationsController } from './integrations.controller';
import { WebhooksProcessor, WebhooksRelay } from './webhooks.processor';
import { WEBHOOKS_QUEUE, WebhooksService } from './webhooks.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([WebhookEndpoint, WebhookDelivery, ApiKey]), BullModule.registerQueue({ name: WEBHOOKS_QUEUE })],
  providers: [WebhooksService, ApiKeysService, WebhooksProcessor, WebhooksRelay],
  controllers: [IntegrationsController],
  exports: [ApiKeysService, WebhooksService],
})
export class IntegrationsModule {}
