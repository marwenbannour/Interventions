import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { TasksService } from '../tasks/tasks.service';
import { DocumentsService } from './documents.service';

@ApiTags('Rapports d’intervention (V3)')
@ApiBearerAuth()
@Controller({ path: 'tasks', version: '1' })
export class DocumentsController {
  constructor(private readonly docs: DocumentsService, private readonly tasks: TasksService) {}

  @Get(':id/report')
  @RequirePermissions(Permission.TASK_REPORT_READ)
  @ApiOperation({ summary: 'Lien signé (10 min) vers le rapport PDF + empreinte SHA-256' })
  report(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.docs.reportLink(u, id);
  }

  @Get(':id/report/verify')
  @RequirePermissions(Permission.TASK_REPORT_READ)
  @ApiOperation({ summary: 'Vérifie qu’une empreinte SHA-256 correspond au rapport officiel' })
  verify(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('sha256') sha256: string) {
    return this.docs.verify(u, id, sha256 ?? '');
  }

  @Post(':id/report')
  @HttpCode(200)
  @RequirePermissions(Permission.TASK_UPDATE)
  @Audit('task.report.generate', 'task')
  @ApiOperation({ summary: '(Re)génère le rapport immédiatement' })
  async generate(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.tasks.getForUser(u, id);
    await this.docs.generateTaskReport(u.organizationId, id);
    return this.docs.reportLink(u, id);
  }
}
