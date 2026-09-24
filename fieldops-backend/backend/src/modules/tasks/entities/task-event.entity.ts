import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EventSource } from '../../../common/enums/task.enums';
import { GeoJsonPoint } from '../../../common/utils/geo';

/** Historique immuable des changements d'une intervention. */
@Entity('task_events')
@Index(['taskId', 'recordedAt'])
export class TaskEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @Column('uuid')
  taskId: string;

  /** TRANSITION | ASSIGNED | UPDATED | NOTE | CHECKLIST | PHOTO | SLA_BREACH */
  @Column()
  type: string;

  @Column({ type: 'varchar', nullable: true })
  fromStatus?: string | null;

  @Column({ type: 'varchar', nullable: true })
  toStatus?: string | null;

  @Column('uuid', { nullable: true })
  actorId?: string | null;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, unknown> | null;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  location?: GeoJsonPoint | null;

  /** Horodatage terrain (conservé pour les actions offline §11). */
  @Column({ type: 'timestamptz' })
  occurredAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  recordedAt: Date;

  @Column({ type: 'enum', enum: EventSource, default: EventSource.ONLINE })
  source: EventSource;
}
