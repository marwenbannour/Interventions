import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Journal d'audit append-only (§6.14). */
@Entity('audit_logs')
@Index(['organizationId', 'createdAt'])
@Index(['resource', 'resourceId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  organizationId?: string | null;

  @Column('uuid', { nullable: true })
  userId?: string | null;

  @Column()
  action: string;

  @Column()
  resource: string;

  @Column({ type: 'varchar', nullable: true })
  resourceId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  ip?: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent?: string | null;

  @Column({ default: true })
  success: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
