import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { PhotoType } from '../../../common/enums/task.enums';
import { GeoJsonPoint } from '../../../common/utils/geo';

export enum PhotoValidation {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  REJECTED = 'REJECTED',
}

/** Preuve numérique (§6.9) avec métadonnées de traçabilité. */
@Entity('photos')
@Index(['uploadedById', 'clientPhotoId'], { unique: true, where: '"clientPhotoId" IS NOT NULL' })
export class Photo extends TenantBaseEntity {
  @Index()
  @Column('uuid')
  taskId: string;

  @Column({ type: 'enum', enum: PhotoType })
  type: PhotoType;

  @Column()
  storageKey: string;

  @Column()
  contentType: string;

  @Column({ type: 'int' })
  sizeBytes: number;

  /** Empreinte SHA-256 : intégrité de la preuve. */
  @Column()
  sha256: string;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  location?: GeoJsonPoint | null;

  @Column({ type: 'real', nullable: true })
  accuracyMeters?: number | null;

  /** Horodatage de prise de vue (appareil). */
  @Column({ type: 'timestamptz' })
  takenAt: Date;

  @Column('uuid')
  uploadedById: string;

  /** Identifiant généré par le mobile : idempotence des envois offline. */
  @Column({ type: 'varchar', nullable: true })
  clientPhotoId?: string | null;

  @Column({ type: 'text', nullable: true })
  caption?: string | null;

  @Column({ type: 'enum', enum: PhotoValidation, default: PhotoValidation.PENDING })
  validation: PhotoValidation;

  @Column('uuid', { nullable: true })
  validatedById?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  validatedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string | null;
}
