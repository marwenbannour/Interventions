import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../tasks/entities/task.entity';
import { SlaPolicy } from './entities/sla-policy.entity';
import { SlaController } from './sla.controller';
import { SCHEDULER_QUEUE, SchedulerProcessor } from './sla.processor';
import { SlaService } from './sla.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SlaPolicy, Task]), BullModule.registerQueue({ name: SCHEDULER_QUEUE })],
  providers: [SlaService, SchedulerProcessor],
  controllers: [SlaController],
  exports: [SlaService],
})
export class SlaModule {}
