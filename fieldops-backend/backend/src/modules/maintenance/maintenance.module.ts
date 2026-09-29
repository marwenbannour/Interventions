import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenancePlan } from './entities/maintenance-plan.entity';
import { MaintenanceController } from './maintenance.controller';
import { MAINTENANCE_QUEUE, MaintenanceProcessor } from './maintenance.processor';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [TypeOrmModule.forFeature([MaintenancePlan]), BullModule.registerQueue({ name: MAINTENANCE_QUEUE })],
  providers: [MaintenanceService, MaintenanceProcessor],
  controllers: [MaintenanceController],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
