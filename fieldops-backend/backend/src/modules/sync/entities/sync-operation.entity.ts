import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum SyncOpStatus {
  APPLIED = 'APPLIED',
  REJECTED = 'REJECTED',
}

/** Journal d'idempotence de la synchronisation offline (§11). */
@Entity('sync_operations')
@Index(['userId', 'clientOpId'], { unique: true })
export class SyncOperation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @Column('uuid')
  userId: string;

  @Column()
  clientOpId: string;

  @Column()
  type: string;

  @Column({ type: 'enum', enum: SyncOpStatus })
  status: SyncOpStatus;

  @Column({ type: 'jsonb', nullable: true })
  result?: Record<string, unknown> | null;

  @Column({ type: 'timestamptz' })
  clientTimestamp: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  processedAt: Date;
}
