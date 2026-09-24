import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([WorkflowDefinition])],
  providers: [WorkflowEngineService, WorkflowsService],
  controllers: [WorkflowsController],
  exports: [WorkflowEngineService, WorkflowsService],
})
export class WorkflowsModule {}
