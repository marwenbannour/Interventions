import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { SyncPullQueryDto, SyncPushDto } from './dto/sync.dto';
import { SyncService } from './sync.service';

@ApiTags('Synchronisation offline')
@ApiBearerAuth()
@Controller({ path: 'sync', version: '1' })
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('push')
  @HttpCode(200)
  @RequirePermissions(Permission.TASK_READ)
  @ApiOperation({ summary: 'Rejoue la file d’actions locale (idempotent, ordre chronologique local)' })
  push(@CurrentUser() u: AuthUser, @Body() dto: SyncPushDto) {
    return this.sync.push(u, dto);
  }

  @Get('pull')
  @RequirePermissions(Permission.TASK_READ)
  @ApiOperation({ summary: 'Delta des tâches depuis le dernier serverTime (+ workflows et réglages)' })
  pull(@CurrentUser() u: AuthUser, @Query() q: SyncPullQueryDto) {
    return this.sync.pull(u, q);
  }
}
