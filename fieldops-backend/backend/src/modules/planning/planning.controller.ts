import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { PlanningQueryDto, SuggestQueryDto } from './dto/planning.dto';
import { PlanningService } from './planning.service';

@ApiTags('Planification')
@ApiBearerAuth()
@Controller({ version: '1' })
export class PlanningController {
  constructor(private readonly planning: PlanningService) {}

  @Get('planning')
  @RequirePermissions(Permission.TASK_READ_ALL)
  @ApiOperation({ summary: 'Planning par agent + interventions non affectées' })
  board(@CurrentUser() u: AuthUser, @Query() q: PlanningQueryDto) {
    return this.planning.board(u, q);
  }

  @Get('tasks/:id/suggested-agents')
  @RequirePermissions(Permission.TASK_ASSIGN)
  @ApiOperation({ summary: 'Agents recommandés (compétences, distance, charge, qualité)' })
  suggest(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query() q: SuggestQueryDto) {
    return this.planning.suggest(u, id, q.limit);
  }
}
