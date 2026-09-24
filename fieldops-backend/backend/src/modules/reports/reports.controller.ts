import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { ReportQueryDto } from './dto/report.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reporting')
@ApiBearerAuth()
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions(Permission.SLA_READ)
  @ApiOperation({ summary: 'KPI synthétiques (périmètre client automatiquement appliqué)' })
  dashboard(@CurrentUser() u: AuthUser, @Query() q: ReportQueryDto) {
    return this.reports.dashboard(u, q);
  }

  @Get('sla')
  @RequirePermissions(Permission.SLA_READ)
  async sla(@CurrentUser() u: AuthUser, @Query() q: ReportQueryDto, @Res({ passthrough: true }) res: Response) {
    const r = await this.reports.sla(u, q);
    return this.maybeCsv(res, q, 'sla', r.byClient, r);
  }

  @Get('agents')
  @RequirePermissions(Permission.REPORT_READ)
  async agents(@CurrentUser() u: AuthUser, @Query() q: ReportQueryDto, @Res({ passthrough: true }) res: Response) {
    const r = await this.reports.agents(u, q);
    return this.maybeCsv(res, q, 'agents', r.agents, r);
  }

  @Get('sites')
  @RequirePermissions(Permission.SLA_READ)
  async sites(@CurrentUser() u: AuthUser, @Query() q: ReportQueryDto, @Res({ passthrough: true }) res: Response) {
    const r = await this.reports.sites(u, q);
    return this.maybeCsv(res, q, 'sites', r.sites, r);
  }

  private maybeCsv(res: Response, q: ReportQueryDto, name: string, rows: any[], json: unknown) {
    if (q.format !== 'csv') return json;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-${name}-${new Date().toISOString().slice(0, 10)}.csv"`);
    return this.reports.toCsv(rows);
  }
}
