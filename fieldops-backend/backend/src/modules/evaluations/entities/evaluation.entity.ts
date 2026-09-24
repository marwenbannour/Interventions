import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';

@Entity('evaluations')
export class Evaluation extends TenantBaseEntity {
  @Index({ unique: true })
  @Column('uuid')
  taskId: string;

  @Index()
  @Column('uuid', { nullable: true })
  agentId?: string | null;

  @Column('uuid')
  authorId: string;

  /** Note globale 1-5. */
  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'int', nullable: true }) punctualityRating?: number | null;
  @Column({ type: 'int', nullable: true }) qualityRating?: number | null;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;
}
