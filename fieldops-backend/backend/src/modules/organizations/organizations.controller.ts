import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { CreateTeamDto, CreateZoneDto, UpdateOrganizationDto, UpdateTeamDto, UpdateZoneDto } from './dto/organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organisation')
@ApiBearerAuth()
@Controller({ path: 'organization', version: '1' })
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Get()
  @RequirePermissions(Permission.ORG_READ)
  get(@CurrentUser() u: AuthUser) {
    return this.service.get(u.organizationId);
  }

  /** Paramètres utiles aux clients (fréquence GPS, géofence…) — accessibles à tout utilisateur connecté. */
  @Get('settings')
  settings(@CurrentUser() u: AuthUser) {
    return this.service.getSettings(u.organizationId);
  }

  @Patch()
  @RequirePermissions(Permission.ORG_MANAGE)
  @Audit('organization.update', 'organization')
  update(@CurrentUser() u: AuthUser, @Body() dto: UpdateOrganizationDto) {
    return this.service.update(u.organizationId, dto);
  }

  @Get('zones')
  @RequirePermissions(Permission.ORG_READ)
  zones(@CurrentUser() u: AuthUser) {
    return this.service.listZones(u.organizationId);
  }

  @Post('zones')
  @RequirePermissions(Permission.ORG_MANAGE)
  createZone(@CurrentUser() u: AuthUser, @Body() dto: CreateZoneDto) {
    return this.service.createZone(u.organizationId, dto);
  }

  @Patch('zones/:id')
  @RequirePermissions(Permission.ORG_MANAGE)
  updateZone(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateZoneDto) {
    return this.service.updateZone(u.organizationId, id, dto);
  }

  @Delete('zones/:id')
  @HttpCode(204)
  @RequirePermissions(Permission.ORG_MANAGE)
  deleteZone(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteZone(u.organizationId, id);
  }

  @Get('teams')
  @RequirePermissions(Permission.ORG_READ)
  teams(@CurrentUser() u: AuthUser) {
    return this.service.listTeams(u.organizationId);
  }

  @Post('teams')
  @RequirePermissions(Permission.ORG_MANAGE)
  createTeam(@CurrentUser() u: AuthUser, @Body() dto: CreateTeamDto) {
    return this.service.createTeam(u.organizationId, dto);
  }

  @Patch('teams/:id')
  @RequirePermissions(Permission.ORG_MANAGE)
  updateTeam(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTeamDto) {
    return this.service.updateTeam(u.organizationId, id, dto);
  }

  @Delete('teams/:id')
  @HttpCode(204)
  @RequirePermissions(Permission.ORG_MANAGE)
  deleteTeam(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteTeam(u.organizationId, id);
  }
}
