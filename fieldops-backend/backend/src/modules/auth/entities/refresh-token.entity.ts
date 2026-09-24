import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Refresh token opaque (stocké haché). Rotation à chaque usage ; la réutilisation
 * d'un token déjà consommé révoque toute la famille (détection de vol).
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Index({ unique: true })
  @Column()
  tokenHash: string;

  @Index()
  @Column('uuid')
  familyId: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt?: Date | null;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  ip?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
