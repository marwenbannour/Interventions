import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TaskEvent } from './entities/task-event.entity';
import { ServiceRequestsController } from './service-requests.controller';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskEvent])],
  providers: [TasksService],
  controllers: [TasksController, ServiceRequestsController],
  exports: [TasksService],
})
export class TasksModule {}
