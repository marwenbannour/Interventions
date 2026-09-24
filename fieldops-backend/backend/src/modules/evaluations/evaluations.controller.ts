import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { CreateEvaluationDto, EvaluationQueryDto } from './dto/evaluation.dto';
import { EvaluationsService } from './evaluations.service';

@ApiTags('Évaluations')
@ApiBearerAuth()
@Controller({ path: 'evaluations', version: '1' })
export class EvaluationsController {
  constructor(private readonly service: EvaluationsService) {}

  @Post()
  @RequirePermissions(Permission.EVALUATION_CREATE)
  @Audit('evaluation.create', 'evaluation')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateEvaluationDto) {
    return this.service.create(u, dto);
  }

  @Get()
  @RequirePermissions(Permission.EVALUATION_READ)
  list(@CurrentUser() u: AuthUser, @Query() q: EvaluationQueryDto) {
    return this.service.list(u, q);
  }
}
