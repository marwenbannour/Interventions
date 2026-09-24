import { Column, Entity, Index, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { GeoJsonPoint } from '../../../common/utils/geo';

/** Historique GPS (§10) — archivé dans PostGIS, position courante dans Redis. */
@Entity('location_pings')
@Index(['agentId', 'recordedAt'])
@Index(['organizationId', 'recordedAt'])
export class LocationPing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @Column('uuid')
  agentId: string;

  @Index({ spatial: true })
  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326 })
  location: GeoJsonPoint;

  @Column({ type: 'real', nullable: true }) accuracy?: number | null;
  @Column({ type: 'real', nullable: true }) speed?: number | null;
  @Column({ type: 'real', nullable: true }) heading?: number | null;
  @Column({ type: 'real', nullable: true }) battery?: number | null;

  @Column('uuid', { nullable: true })
  taskId?: string | null;

  /** Horodatage appareil. */
  @Column({ type: 'timestamptz' })
  recordedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  receivedAt: Date;
}
