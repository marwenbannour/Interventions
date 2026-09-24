import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import {
  ActionDto, AssignTaskDto, ChecklistUpdateDto, CreateTaskDto, NoteDto, TaskQueryDto, TransitionDto, UpdateTaskDto,
} from './dto/task.dto';
import { TasksService } from './tasks.service';

@ApiTags('Interventions')
@ApiBearerAuth()
@Controller({ path: 'tasks', version: '1' })
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @RequirePermissions(Permission.TASK_CREATE)
  @Audit('task.create', 'task')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasks.create(u, dto);
  }

  @Get()
  @RequirePermissions(Permission.TASK_READ)
  @ApiOperation({ summary: 'Liste filtrée — le périmètre dépend du rôle (agent : ses tâches, client : les siennes)' })
  findAll(@CurrentUser() u: AuthUser, @Query() q: TaskQueryDto) {
    return this.tasks.findAll(u, q);
  }

  @Get(':id')
  @RequirePermissions(Permission.TASK_READ)
  @ApiOperation({ summary: 'Détail + transitions disponibles pour l’utilisateur courant' })
  findOne(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.findOne(u, id);
  }

  @Get(':id/history')
  @RequirePermissions(Permission.TASK_READ)
  history(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.history(u, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.TASK_UPDATE)
  @Audit('task.update', 'task')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(u, id, dto);
  }

  @Post(':id/assign')
  @RequirePermissions(Permission.TASK_ASSIGN)
  @Audit('task.assign', 'task')
  assign(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignTaskDto) {
    return this.tasks.assign(u, id, dto.agentId);
  }

  @Post(':id/unassign')
  @RequirePermissions(Permission.TASK_ASSIGN)
  @Audit('task.unassign', 'task')
  unassign(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.unassign(u, id);
  }

  @Post(':id/transition')
  @RequirePermissions(Permission.TASK_READ)
  @Audit('task.transition', 'task')
  @ApiOperation({ summary: 'Changement d’état contrôlé par le workflow (rôles + conditions bloquantes)' })
  transition(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TransitionDto) {
    return this.tasks.transition(u, u.organizationId, id, dto);
  }

  @Post(':id/start')
  @RequirePermissions(Permission.TASK_EXECUTE)
  @Audit('task.start', 'task')
  start(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ActionDto) {
    return this.tasks.transitionToFirst(u, id, ['IN_PROGRESS'], dto);
  }

  @Post(':id/complete')
  @RequirePermissions(Permission.TASK_EXECUTE)
  @Audit('task.complete', 'task')
  complete(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ActionDto) {
    return this.tasks.transitionToFirst(u, id, ['COMPLETED', 'CONTROL'], dto);
  }

  @Patch(':id/checklist')
  @RequirePermissions(Permission.TASK_EXECUTE)
  checklist(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChecklistUpdateDto) {
    return this.tasks.updateChecklist(u, id, dto);
  }

  @Post(':id/notes')
  @RequirePermissions(Permission.TASK_READ)
  note(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: NoteDto) {
    return this.tasks.addNote(u, id, dto);
  }
}
