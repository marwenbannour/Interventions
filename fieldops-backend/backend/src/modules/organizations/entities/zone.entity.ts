import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';

@Entity('zones')
@Index(['organizationId', 'code'], { unique: true })
export class Zone extends TenantBaseEntity {
  @Column()
  name: string;

  @Column()
  code: string;

  @Column({ nullable: true })
  description?: string;

  /** Périmètre géographique optionnel (GeoJSON Polygon). */
  @Column({ type: 'geography', spatialFeatureType: 'Polygon', srid: 4326, nullable: true })
  area?: any;
}
