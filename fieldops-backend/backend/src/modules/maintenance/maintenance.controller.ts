import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { CreateMaintenancePlanDto, MaintenanceQueryDto, PreviewQueryDto, UpdateMaintenancePlanDto } from './dto/maintenance.dto';
import { MaintenanceService } from './maintenance.service';

@ApiTags('Maintenance préventive (V3)')
@ApiBearerAuth()
@Controller({ path: 'maintenance-plans', version: '1' })
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  @Post()
  @RequirePermissions(Permission.MAINTENANCE_MANAGE)
  @Audit('maintenance.create', 'maintenance_plan')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateMaintenancePlanDto) {
    return this.service.create(u, dto);
  }

  @Get()
  @RequirePermissions(Permission.MAINTENANCE_READ)
  list(@CurrentUser() u: AuthUser, @Query() q: MaintenanceQueryDto) {
    return this.service.list(u, q);
  }

  @Get(':id')
  @RequirePermissions(Permission.MAINTENANCE_READ)
  get(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(u.organizationId, id);
  }

  @Get(':id/preview')
  @RequirePermissions(Permission.MAINTENANCE_READ)
  @ApiOperation({ summary: 'Prochaines échéances calculées' })
  preview(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query() q: PreviewQueryDto) {
    return this.service.preview(u.organizationId, id, q.count);
  }

  @Get(':id/tasks')
  @RequirePermissions(Permission.MAINTENANCE_READ)
  tasks(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.generatedTasks(u.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.MAINTENANCE_MANAGE)
  @Audit('maintenance.update', 'maintenance_plan')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMaintenancePlanDto) {
    return this.service.update(u, id, dto);
  }

  @Post(':id/generate')
  @HttpCode(200)
  @RequirePermissions(Permission.MAINTENANCE_MANAGE)
  @Audit('maintenance.generate', 'maintenance_plan')
  @ApiOperation({ summary: 'Génère immédiatement l’intervention de la prochaine échéance' })
  generate(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.generateNow(u.organizationId, id);
  }
}
