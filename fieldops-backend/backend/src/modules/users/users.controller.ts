import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { ChangePasswordDto, CreateUserDto, UpdateMeDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() u: AuthUser) {
    return this.users.findOne(u.organizationId, u.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() u: AuthUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(u.organizationId, u.id, dto);
  }

  @Post('me/password')
  @HttpCode(204)
  @Audit('user.password_change', 'user')
  changePassword(@CurrentUser() u: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(u.id, dto);
  }

  @Post()
  @RequirePermissions(Permission.USER_MANAGE)
  @Audit('user.create', 'user')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(u.organizationId, dto);
  }

  @Get()
  @RequirePermissions(Permission.USER_READ)
  findAll(@CurrentUser() u: AuthUser, @Query() q: UserQueryDto) {
    return this.users.findAll(u.organizationId, q);
  }

  @Get(':id')
  @RequirePermissions(Permission.USER_READ)
  findOne(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(u.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.USER_MANAGE)
  @Audit('user.update', 'user')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(u.organizationId, id, dto);
  }
}
