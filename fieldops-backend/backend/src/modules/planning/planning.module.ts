import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentProfile } from '../agents/entities/agent-profile.entity';
import { Site } from '../clients/entities/site.entity';
import { Task } from '../tasks/entities/task.entity';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, AgentProfile, Site])],
  providers: [PlanningService],
  controllers: [PlanningController],
})
export class PlanningModule {}
