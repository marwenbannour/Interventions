import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { HistoryQueryDto, LocationBatchDto, NearbyQueryDto } from './dto/location.dto';
import { LocationService } from './location.service';

@ApiTags('Géolocalisation')
@ApiBearerAuth()
@Controller({ path: 'agents', version: '1' })
export class LocationController {
  constructor(private readonly service: LocationService) {}

  /** L'agent transmet ses positions (lot possible après une période offline). */
  @Post('me/location')
  @RequirePermissions(Permission.LOCATION_SEND)
  sendMine(@CurrentUser() u: AuthUser, @Body() dto: LocationBatchDto) {
    return this.service.record(u.organizationId, u.id, dto.pings);
  }

  /** Alias conforme au cahier des charges : /agents/{id}/location. */
  @Post(':id/location')
  @RequirePermissions(Permission.LOCATION_SEND)
  send(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: LocationBatchDto) {
    if (id !== u.id) throw new ForbiddenException('Un agent ne peut transmettre que sa propre position');
    return this.service.record(u.organizationId, u.id, dto.pings);
  }

  @Get('locations/live')
  @RequirePermissions(Permission.LOCATION_READ)
  live(@CurrentUser() u: AuthUser) {
    return this.service.live(u.organizationId);
  }

  @Get('locations/nearby')
  @RequirePermissions(Permission.LOCATION_READ)
  nearby(@CurrentUser() u: AuthUser, @Query() q: NearbyQueryDto) {
    return this.service.nearby(u.organizationId, q.lat, q.lng, q.radiusKm);
  }

  @Get(':id/location')
  @RequirePermissions(Permission.LOCATION_READ)
  current(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.liveForAgent(u.organizationId, id);
  }

  @Get(':id/location/history')
  @RequirePermissions(Permission.LOCATION_READ)
  history(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query() q: HistoryQueryDto) {
    return this.service.history(u.organizationId, id, new Date(q.from), new Date(q.to));
  }
}
