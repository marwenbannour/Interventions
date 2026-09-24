import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { CreateSlaPolicyDto, UpdateSlaPolicyDto } from './dto/sla.dto';
import { SlaService } from './sla.service';

@ApiTags('SLA')
@ApiBearerAuth()
@Controller({ path: 'sla', version: '1' })
export class SlaController {
  constructor(private readonly service: SlaService) {}

  @Get('policies')
  @RequirePermissions(Permission.SLA_READ)
  list(@CurrentUser() u: AuthUser) {
    return this.service.list(u.organizationId);
  }

  @Post('policies')
  @RequirePermissions(Permission.SLA_MANAGE)
  @Audit('sla.create', 'sla_policy')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateSlaPolicyDto) {
    return this.service.create(u.organizationId, dto);
  }

  @Patch('policies/:id')
  @RequirePermissions(Permission.SLA_MANAGE)
  @Audit('sla.update', 'sla_policy')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSlaPolicyDto) {
    return this.service.update(u.organizationId, id, dto);
  }

  @Get('at-risk')
  @RequirePermissions(Permission.TASK_READ_ALL)
  atRisk(@CurrentUser() u: AuthUser, @Query('horizonMinutes', new DefaultValuePipe(60), ParseIntPipe) h: number) {
    return this.service.atRisk(u.organizationId, h);
  }
}
