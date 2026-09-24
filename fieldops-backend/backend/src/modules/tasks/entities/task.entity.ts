import { Column, Entity, Index, JoinColumn, ManyToOne, VersionColumn } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { TaskPriority } from '../../../common/enums/task.enums';
import { Client } from '../../clients/entities/client.entity';
import { Site } from '../../clients/entities/site.entity';
import { User } from '../../users/entities/user.entity';
import { WorkflowDefinition } from '../../workflows/entities/workflow-definition.entity';

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  done: boolean;
  doneAt?: string | null;
  value?: string | null;
}

/** Intervention (Task §16). */
@Entity('tasks')
@Index(['organizationId', 'reference'], { unique: true })
@Index(['organizationId', 'status'])
@Index(['organizationId', 'agentId', 'status'])
export class Task extends TenantBaseEntity {
  @Column()
  reference: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  /** Type de prestation : LINEN_DELIVERY, LINEN_PICKUP, MAINTENANCE… */
  @Index()
  @Column()
  type: string;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.NORMAL })
  priority: TaskPriority;

  @Column()
  status: string;

  @Column('uuid')
  workflowId: string;

  @ManyToOne(() => WorkflowDefinition)
  @JoinColumn({ name: 'workflowId' })
  workflow: WorkflowDefinition;

  @Index()
  @Column('uuid')
  clientId: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Index()
  @Column('uuid')
  siteId: string;

  @ManyToOne(() => Site)
  @JoinColumn({ name: 'siteId' })
  site: Site;

  /** Agent assigné (users.id d'un utilisateur de rôle AGENT). */
  @Column('uuid', { nullable: true })
  agentId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'agentId' })
  agent?: User | null;

  @Column('uuid')
  createdById: string;

  /** Compétences requises pour l'affectation. */
  @Column('text', { array: true, default: '{}' })
  requiredSkills: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  checklist: ChecklistItem[];

  /** Réintervention : tâche d'origine (§9 indicateur réintervention). */
  @Column('uuid', { nullable: true })
  parentTaskId?: string | null;

  // ---------- Planification ----------
  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  scheduledStart?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledEnd?: Date | null;

  @Column({ type: 'int', nullable: true })
  estimatedDurationMin?: number | null;

  // ---------- Jalons d'exécution ----------
  @Column({ type: 'timestamptz', nullable: true }) plannedAt?: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) assignedAt?: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) acceptedAt?: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) enRouteAt?: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) arrivedAt?: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) startedAt?: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) completedAt?: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) evaluatedAt?: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) cancelledAt?: Date | null;

  // ---------- SLA (§9) ----------
  @Column('uuid', { nullable: true })
  slaPolicyId?: string | null;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  ackDueAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  arrivalDueAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  interventionDueAt?: Date | null;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  closeDueAt?: Date | null;

  @Column({ default: false }) ackBreached: boolean;
  @Column({ default: false }) arrivalBreached: boolean;
  @Column({ default: false }) interventionBreached: boolean;
  @Column({ default: false }) closeBreached: boolean;

  /** Alertes SLA déjà émises (dé-duplication), ex. "ack:warning". */
  @Column('text', { array: true, default: '{}' })
  slaAlertsSent: string[];

  @Column({ type: 'text', nullable: true })
  completionNotes?: string | null;

  /** Signature client (clé stockage objet). */
  @Column({ type: 'varchar', nullable: true })
  signatureKey?: string | null;

  @Column({ type: 'varchar', nullable: true })
  signedByName?: string | null;

  /** Verrouillage optimiste pour les conflits offline / concurrence. */
  @VersionColumn()
  version: number;
}
