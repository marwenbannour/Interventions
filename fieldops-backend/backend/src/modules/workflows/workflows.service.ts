import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWorkflowDto } from './dto/workflow.dto';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowEngineService } from './workflow-engine.service';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(WorkflowDefinition) private readonly repo: Repository<WorkflowDefinition>,
    private readonly engine: WorkflowEngineService,
  ) {}

  list(orgId: string) {
    return this.repo.find({ where: { organizationId: orgId }, order: { code: 'ASC', version: 'DESC' } });
  }

  async get(orgId: string, id: string) {
    const w = await this.repo.findOne({ where: { id, organizationId: orgId } });
    if (!w) throw new NotFoundException('Workflow introuvable');
    return w;
  }

  /**
   * Crée une nouvelle version : les tâches existantes conservent leur version,
   * les nouvelles utilisent la dernière version active.
   */
  async createVersion(orgId: string, dto: CreateWorkflowDto) {
    this.engine.validateDefinition(dto);
    return this.repo.manager.transaction(async (m) => {
      const last = await m.findOne(WorkflowDefinition, {
        where: { organizationId: orgId, code: dto.code },
        order: { version: 'DESC' },
      });
      if (dto.isDefault) {
        await m.update(WorkflowDefinition, { organizationId: orgId, isDefault: true }, { isDefault: false });
      }
      if (last) await m.update(WorkflowDefinition, { organizationId: orgId, code: dto.code }, { isActive: false });
      return m.save(
        m.create(WorkflowDefinition, {
          ...dto,
          taskTypes: dto.taskTypes ?? [],
          organizationId: orgId,
          version: (last?.version ?? 0) + 1,
          isActive: true,
        }),
      );
    });
  }

  async setActive(orgId: string, id: string, isActive: boolean) {
    const w = await this.get(orgId, id);
    w.isActive = isActive;
    return this.repo.save(w);
  }
}
