import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { User } from '../../users/entities/user.entity';

export enum AgentStatus {
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface WeeklyAvailability {
  /** 0 = dimanche … 6 = samedi ; créneaux "HH:mm-HH:mm". */
  [day: string]: string[];
}

@Entity('agent_profiles')
export class AgentProfile extends TenantBaseEntity {
  @Index({ unique: true })
  @Column('uuid')
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Type d'activité : LINEN_TRANSPORT, MAINTENANCE, CLEANING… */
  @Column({ default: 'MAINTENANCE' })
  activityType: string;

  @Column('text', { array: true, default: '{}' })
  skills: string[];

  @Index()
  @Column('uuid', { nullable: true })
  zoneId?: string | null;

  @Column('uuid', { nullable: true })
  teamId?: string | null;

  @Column({ type: 'enum', enum: AgentStatus, default: AgentStatus.PENDING_VALIDATION })
  status: AgentStatus;

  @Column('uuid', { nullable: true })
  validatedById?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  validatedAt?: Date | null;

  /** En service : autorise le suivi GPS (§10). */
  @Column({ default: false })
  isOnDuty: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  dutyStartedAt?: Date | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  availability: WeeklyAvailability;

  @Column({ type: 'int', default: 5 })
  maxConcurrentTasks: number;

  /** Score qualité agrégé (0-100), recalculé par le module qualité. */
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  qualityScore?: string | null;

  @Column({ nullable: true })
  vehicle?: string;
}
