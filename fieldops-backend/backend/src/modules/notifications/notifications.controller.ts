import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { NotificationQueryDto, RegisterDeviceDto, SendNotificationDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query() q: NotificationQueryDto) {
    return this.service.listForUser(u.id, q);
  }

  @Post('read')
  @HttpCode(204)
  @ApiBody({ schema: { properties: { ids: { oneOf: [{ type: 'array', items: { type: 'string' } }, { enum: ['all'] }] } } } })
  markRead(@CurrentUser() u: AuthUser, @Body('ids') ids: string[] | 'all') {
    return this.service.markRead(u.id, ids ?? 'all');
  }

  @Post('devices')
  @HttpCode(204)
  registerDevice(@CurrentUser() u: AuthUser, @Body() dto: RegisterDeviceDto) {
    return this.service.registerDevice(u.organizationId, u.id, dto.token, dto.platform);
  }

  @Delete('devices/:token')
  @HttpCode(204)
  unregisterDevice(@CurrentUser() u: AuthUser, @Param('token') token: string) {
    return this.service.unregisterDevice(u.id, token);
  }

  @Post('send')
  @RequirePermissions(Permission.NOTIFICATION_SEND)
  send(@CurrentUser() u: AuthUser, @Body() dto: SendNotificationDto) {
    return this.service.notify({ organizationId: u.organizationId, type: 'MANUAL', ...dto });
  }
}
