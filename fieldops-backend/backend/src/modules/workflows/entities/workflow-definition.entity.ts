import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { WorkflowState, WorkflowTransition } from '../workflow.types';

/**
 * Workflow configurable (§8) : états, transitions, conditions, actions et rôles
 * autorisés, sans modifier la logique centrale. Versionné : une tâche garde la
 * version avec laquelle elle a été créée.
 */
@Entity('workflow_definitions')
@Index(['organizationId', 'code', 'version'], { unique: true })
export class WorkflowDefinition extends TenantBaseEntity {
  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  /** Types d'intervention couverts (ex. LINEN_DELIVERY, MAINTENANCE). Vide = défaut. */
  @Column('text', { array: true, default: '{}' })
  taskTypes: string[];

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  initialState: string;

  @Column({ type: 'jsonb' })
  states: WorkflowState[];

  @Column({ type: 'jsonb' })
  transitions: WorkflowTransition[];
}
