import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { ClientsService } from './clients.service';
import { ClientQueryDto, CreateClientDto, CreateSiteDto, SiteQueryDto, UpdateClientDto, UpdateSiteDto } from './dto/client.dto';

@ApiTags('Clients & Sites')
@ApiBearerAuth()
@Controller({ version: '1' })
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Post('clients')
  @RequirePermissions(Permission.CLIENT_MANAGE)
  createClient(@CurrentUser() u: AuthUser, @Body() dto: CreateClientDto) {
    return this.service.createClient(u.organizationId, dto);
  }

  @Get('clients')
  @RequirePermissions(Permission.CLIENT_READ)
  listClients(@CurrentUser() u: AuthUser, @Query() q: ClientQueryDto) {
    return this.service.listClients(u, q);
  }

  @Get('clients/:id')
  @RequirePermissions(Permission.CLIENT_READ)
  getClient(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getClient(u, id);
  }

  @Patch('clients/:id')
  @RequirePermissions(Permission.CLIENT_MANAGE)
  updateClient(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
    return this.service.updateClient(u.organizationId, id, dto);
  }

  @Post('sites')
  @RequirePermissions(Permission.CLIENT_MANAGE)
  createSite(@CurrentUser() u: AuthUser, @Body() dto: CreateSiteDto) {
    return this.service.createSite(u.organizationId, dto);
  }

  @Get('sites')
  @RequirePermissions(Permission.CLIENT_READ)
  listSites(@CurrentUser() u: AuthUser, @Query() q: SiteQueryDto) {
    return this.service.listSites(u, q);
  }

  @Get('sites/:id')
  @RequirePermissions(Permission.CLIENT_READ)
  getSite(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getSite(u, id);
  }

  @Patch('sites/:id')
  @RequirePermissions(Permission.CLIENT_MANAGE)
  updateSite(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSiteDto) {
    return this.service.updateSite(u.organizationId, id, dto);
  }
}
