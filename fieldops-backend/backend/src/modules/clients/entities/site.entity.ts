import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { GeoJsonPoint } from '../../../common/utils/geo';
import { Client } from './client.entity';

/** Établissement / bien du client (Property / Site §16). */
@Entity('sites')
export class Site extends TenantBaseEntity {
  @Index()
  @Column('uuid')
  clientId: string;

  @ManyToOne(() => Client, (c) => c.sites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  postalCode?: string;

  @Column({ nullable: true })
  city?: string;

  @Index({ spatial: true })
  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  location?: GeoJsonPoint | null;

  @Column({ type: 'int', nullable: true })
  geofenceMeters?: number | null;

  @Column('uuid', { nullable: true })
  zoneId?: string | null;

  @Column({ nullable: true })
  contactName?: string;

  @Column({ nullable: true })
  contactPhone?: string;

  @Column({ type: 'text', nullable: true })
  accessInstructions?: string;

  @Column({ default: true })
  isActive: boolean;
}
