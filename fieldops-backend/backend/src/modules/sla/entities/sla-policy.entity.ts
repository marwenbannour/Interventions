import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { TaskPriority } from '../../../common/enums/task.enums';

/**
 * Politique SLA (§9) définie par client, site, type d'intervention et/ou priorité.
 * La politique la plus spécifique correspondant à la tâche s'applique.
 */
@Entity('sla_policies')
export class SlaPolicy extends TenantBaseEntity {
  @Column()
  name: string;

  @Column('uuid', { nullable: true }) clientId?: string | null;
  @Column('uuid', { nullable: true }) siteId?: string | null;
  @Column({ type: 'varchar', nullable: true }) taskType?: string | null;
  @Column({ type: 'enum', enum: TaskPriority, nullable: true }) priority?: TaskPriority | null;

  /** Prise en charge (acceptation) — ex. 15 min. */
  @Column({ type: 'int', nullable: true }) acknowledgeMinutes?: number | null;
  /** Arrivée sur site — ex. 45 min. */
  @Column({ type: 'int', nullable: true }) arrivalMinutes?: number | null;
  /** Durée d'intervention (début → fin) — ex. 120 min. */
  @Column({ type: 'int', nullable: true }) interventionMinutes?: number | null;
  /** Clôture — ex. 180 min. */
  @Column({ type: 'int', nullable: true }) closureMinutes?: number | null;

  /** Alerte préventive X minutes avant échéance (ex. T-15). */
  @Column({ type: 'int', default: 15 })
  warningMinutesBefore: number;

  @Column({ default: true })
  isActive: boolean;
}
