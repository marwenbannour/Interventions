import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { OBSERVED_QUEUES, ObservabilityService } from './observability.service';
import { RequestContextMiddleware } from './request-context.middleware';

@Module({
  imports: OBSERVED_QUEUES.map((name) => BullModule.registerQueue({ name })),
  providers: [ObservabilityService],
  controllers: [MetricsController],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*path');
  }
}
