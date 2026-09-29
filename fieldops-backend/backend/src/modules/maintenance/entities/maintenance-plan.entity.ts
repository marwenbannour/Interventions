import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { TaskPriority } from '../../../common/enums/task.enums';
import { Asset } from '../../assets/entities/asset.entity';
import { Site } from '../../clients/entities/site.entity';
import { MaintenanceFrequency } from '../recurrence';

export interface ChecklistTemplateItem {
  label: string;
  required?: boolean;
}

/**
 * Plan de maintenance préventive (V3) : génère automatiquement des interventions
 * à intervalle régulier, `leadTimeDays` avant chaque échéance.
 */
@Entity('maintenance_plans')
@Index(['organizationId', 'isActive', 'nextDueAt'])
export class MaintenancePlan extends TenantBaseEntity {
  @Column()
  name: string;

  @Column('uuid')
  clientId: string;

  @Column('uuid')
  siteId: string;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siteId' })
  site: Site;

  @Column('uuid', { nullable: true })
  assetId?: string | null;

  @ManyToOne(() => Asset, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assetId' })
  asset?: Asset | null;

  // ---- Modèle de l'intervention générée
  @Column() taskType: string;
  @Column() title: string;
  @Column({ type: 'text', nullable: true }) description?: string | null;
  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.NORMAL }) priority: TaskPriority;
  @Column('text', { array: true, default: '{}' }) requiredSkills: string[];
  @Column({ type: 'jsonb', default: () => "'[]'" }) checklist: ChecklistTemplateItem[];
  @Column({ type: 'int', nullable: true }) estimatedDurationMin?: number | null;
  /** Agent affecté d'office (optionnel ; sinon dispatch manuel ou auto-dispatch). */
  @Column('uuid', { nullable: true }) defaultAgentId?: string | null;

  // ---- Récurrence
  @Column({ type: 'enum', enum: MaintenanceFrequency }) frequency: MaintenanceFrequency;
  @Column({ type: 'int', default: 1 }) interval: number;
  @Column({ type: 'timestamptz' }) startAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) endAt?: Date | null;
  /** Création de l'intervention N jours avant l'échéance (planification, préparation). */
  @Column({ type: 'int', default: 7 }) leadTimeDays: number;

  /** Indice de la prochaine occurrence à générer et sa date (dénormalisée pour l'index). */
  @Column({ type: 'int', default: 0 }) occurrenceIndex: number;
  @Column({ type: 'timestamptz', nullable: true }) nextDueAt?: Date | null;

  @Column({ default: true }) isActive: boolean;
  @Column({ type: 'int', default: 0 }) generatedCount: number;
  @Column({ type: 'timestamptz', nullable: true }) lastGeneratedAt?: Date | null;
  @Column('uuid', { nullable: true }) lastTaskId?: string | null;
  @Column('uuid') createdById: string;
}
