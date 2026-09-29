import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { ServiceRequestDto } from './dto/task.dto';
import { TasksService } from './tasks.service';

@ApiTags('Portail client (V3)')
@ApiBearerAuth()
@Controller({ path: 'service-requests', version: '1' })
export class ServiceRequestsController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @RequirePermissions(Permission.TASK_REQUEST)
  @Audit('task.request', 'task')
  @ApiOperation({ summary: 'Demande d’intervention par un client sur l’un de ses sites (origine CLIENT_REQUEST)' })
  create(@CurrentUser() u: AuthUser, @Body() dto: ServiceRequestDto) {
    return this.tasks.createServiceRequest(u, dto);
  }
}
