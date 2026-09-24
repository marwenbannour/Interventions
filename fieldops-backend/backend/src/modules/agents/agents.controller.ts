import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { AgentsService } from './agents.service';
import { AgentQueryDto, DutyDto, SetAgentStatusDto, UpdateAgentDto } from './dto/agent.dto';

@ApiTags('Agents')
@ApiBearerAuth()
@Controller({ path: 'agents', version: '1' })
export class AgentsController {
  constructor(private readonly service: AgentsService) {}

  @Get('me')
  @RequirePermissions(Permission.TASK_EXECUTE)
  me(@CurrentUser() u: AuthUser) {
    return this.service.getByUserId(u.organizationId, u.id);
  }

  @Post('me/duty')
  @RequirePermissions(Permission.LOCATION_SEND)
  @Audit('agent.duty', 'agent')
  duty(@CurrentUser() u: AuthUser, @Body() dto: DutyDto) {
    return this.service.setDuty(u.organizationId, u.id, dto.onDuty);
  }

  @Get()
  @RequirePermissions(Permission.AGENT_READ)
  list(@CurrentUser() u: AuthUser, @Query() q: AgentQueryDto) {
    return this.service.list(u.organizationId, q);
  }

  /** Accepte l'id du profil agent ou l'id utilisateur. */
  @Get(':id')
  @RequirePermissions(Permission.AGENT_READ)
  get(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(u.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.AGENT_MANAGE)
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAgentDto) {
    return this.service.update(u.organizationId, id, dto);
  }

  @Post(':id/status')
  @RequirePermissions(Permission.AGENT_MANAGE)
  @Audit('agent.status', 'agent')
  setStatus(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SetAgentStatusDto) {
    return this.service.setStatus(u.organizationId, id, dto.status, u.id);
  }
}
