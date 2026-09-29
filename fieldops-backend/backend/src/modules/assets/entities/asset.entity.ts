import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { Client } from '../../clients/entities/client.entity';
import { Site } from '../../clients/entities/site.entity';

export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  RETIRED = 'RETIRED',
}

/**
 * Équipement / bien suivi (V3 §6.3 « biens ») : chaudière, CTA, armoire électrique, chariot de linge…
 * Chaque équipement porte un code unique par organisation, imprimé en QR code sur site
 * et scanné par l'agent pour prouver sa présence devant l'équipement (condition ASSET_SCAN).
 */
@Entity('assets')
@Index(['organizationId', 'code'], { unique: true })
@Index(['organizationId', 'siteId'])
export class Asset extends TenantBaseEntity {
  @Column()
  code: string;

  @Column()
  name: string;

  /** Famille libre : CVC, ELECTRICITE, PLOMBERIE, LINGE… */
  @Column({ type: 'varchar', nullable: true })
  category?: string | null;

  @Column('uuid')
  clientId: string;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column('uuid')
  siteId: string;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siteId' })
  site: Site;

  /** Emplacement précis sur le site (bâtiment, étage, local). */
  @Column({ type: 'varchar', nullable: true })
  location?: string | null;

  @Column({ type: 'varchar', nullable: true }) brand?: string | null;
  @Column({ type: 'varchar', nullable: true }) model?: string | null;
  @Column({ type: 'varchar', nullable: true }) serialNumber?: string | null;

  @Column({ type: 'date', nullable: true }) installedAt?: string | null;
  @Column({ type: 'date', nullable: true }) warrantyUntil?: string | null;

  @Column({ type: 'enum', enum: AssetStatus, default: AssetStatus.ACTIVE })
  status: AssetStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  /** Caractéristiques techniques libres (puissance, fluide, capacité…). */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  attributes: Record<string, string | number | boolean>;
}
