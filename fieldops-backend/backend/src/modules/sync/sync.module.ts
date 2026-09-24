import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../tasks/entities/task.entity';
import { WorkflowDefinition } from '../workflows/entities/workflow-definition.entity';
import { SyncOperation } from './entities/sync-operation.entity';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [TypeOrmModule.forFeature([SyncOperation, Task, WorkflowDefinition])],
  providers: [SyncService],
  controllers: [SyncController],
})
export class SyncModule {}
