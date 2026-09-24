import { Body, Controller, Get, Param, ParseBoolPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { CreateWorkflowDto } from './dto/workflow.dto';
import { WorkflowsService } from './workflows.service';

@ApiTags('Workflows')
@ApiBearerAuth()
@Controller({ path: 'workflows', version: '1' })
export class WorkflowsController {
  constructor(private readonly service: WorkflowsService) {}

  /** Lecture ouverte aux utilisateurs connectés : le mobile en a besoin pour afficher libellés/couleurs. */
  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.service.list(u.organizationId);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(u.organizationId, id);
  }

  @Post()
  @RequirePermissions(Permission.WORKFLOW_MANAGE)
  @Audit('workflow.create_version', 'workflow')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateWorkflowDto) {
    return this.service.createVersion(u.organizationId, dto);
  }

  @Patch(':id/active')
  @RequirePermissions(Permission.WORKFLOW_MANAGE)
  @Audit('workflow.set_active', 'workflow')
  setActive(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('value', ParseBoolPipe) value: boolean) {
    return this.service.setActive(u.organizationId, id, value);
  }
}
