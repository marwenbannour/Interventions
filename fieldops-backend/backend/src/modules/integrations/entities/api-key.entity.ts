import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { Role } from '../../../common/enums/role.enum';

/**
 * Clé d'API d'intégration (V3) : accès machine-à-machine sans compte utilisateur.
 * Seul le hachage SHA-256 est conservé ; la clé complète n'est affichée qu'une fois.
 */
@Entity('api_keys')
export class ApiKey extends TenantBaseEntity {
  @Column() name: string;
  /** Partie publique (fo_<prefix>_…) : identifie la clé sans révéler le secret. */
  @Index({ unique: true })
  @Column() prefix: string;
  @Column({ select: false }) keyHash: string;
  /** Rôle plafond : les scopes ne peuvent excéder ses permissions. */
  @Column({ type: 'enum', enum: Role, default: Role.SUPERVISOR }) role: Role;
  @Column('text', { array: true }) scopes: string[];
  @Column({ type: 'timestamptz', nullable: true }) expiresAt?: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) revokedAt?: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) lastUsedAt?: Date | null;
  @Column({ type: 'varchar', nullable: true }) lastUsedIp?: string | null;
  @Column('uuid') createdById: string;
}
