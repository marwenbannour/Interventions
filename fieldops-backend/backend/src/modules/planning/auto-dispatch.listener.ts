import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Events, TaskEventPayload } from '../../common/events';
import { systemUser } from '../../common/types/auth-user';
import { OrganizationsService } from '../organizations/organizations.service';
import { TasksService } from '../tasks/tasks.service';
import { PlanningService } from './planning.service';

/**
 * Auto-dispatch (V3) : à la création, affecte le meilleur agent suggéré si l'organisation l'a activé
 * et si le score dépasse le seuil. Sinon la tâche reste dans la file de dispatch manuel.
 */
@Injectable()
export class AutoDispatchListener {
  private readonly logger = new Logger(AutoDispatchListener.name);

  constructor(
    private readonly orgs: OrganizationsService,
    private readonly planning: PlanningService,
    private readonly tasks: TasksService,
  ) {}

  @OnEvent(Events.TASK_CREATED, { async: true, promisify: true })
  async onCreated(p: TaskEventPayload & { autoDispatchEligible?: boolean }) {
    if (!p.autoDispatchEligible || p.agentId) return;
    const { autoDispatch } = await this.orgs.getSettings(p.organizationId);
    if (!autoDispatch.enabled) return;
    const system = systemUser(p.organizationId);
    try {
      const { suggestions } = await this.planning.suggest(system, p.taskId, 10);
      const best = suggestions.find(
        (s) => !s.full && s.score >= autoDispatch.minScore && (!autoDispatch.onlyOnDuty || s.isOnDuty),
      );
      if (!best) {
        this.logger.log(`Auto-dispatch ${p.reference} : aucun agent au-dessus du seuil ${autoDispatch.minScore}`);
        return;
      }
      await this.tasks.assign(system, p.taskId, best.agentId, { auto: true, score: best.score });
      this.logger.log(`Auto-dispatch ${p.reference} → ${best.name} (score ${best.score})`);
    } catch (e) {
      this.logger.warn(`Auto-dispatch ${p.reference} impossible : ${(e as Error).message}`);
    }
  }
}
