import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export interface OrganizationSettings {
  timezone: string;
  /** Fréquence d'envoi GPS en secondes (§10, configurable). */
  locationIntervalSec: number;
  /** Suivi GPS uniquement pendant le service (§10 "périodes autorisées"). */
  trackingOnlyOnDuty: boolean;
  /** Durées de conservation (§13) — à valider juridiquement. */
  photoRetentionDays: number;
  locationRetentionDays: number;
  /** Rayon par défaut du géofencing "arrivée sur site". */
  defaultGeofenceMeters: number;
  /** Rôles pour lesquels la MFA est obligatoire. */
  mfaRequiredRoles: string[];
}

export const DEFAULT_ORG_SETTINGS: OrganizationSettings = {
  timezone: 'Europe/Paris',
  locationIntervalSec: 30,
  trackingOnlyOnDuty: true,
  photoRetentionDays: 365,
  locationRetentionDays: 90,
  defaultGeofenceMeters: 300,
  mfaRequiredRoles: [],
};

/** Tenant (§14). */
@Entity('organizations')
export class Organization extends BaseEntity {
  @Column()
  name: string;

  @Index({ unique: true })
  @Column()
  slug: string;

  @Column({ default: true })
  isActive: boolean;

  /** Réglages partiels : fusionnés avec DEFAULT_ORG_SETTINGS à la lecture (OrganizationsService.getSettings). */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  settings: OrganizationSettings;

  /** Compteur atomique pour les références d'intervention (INT-000123). */
  @Column({ type: 'int', default: 0, select: false })
  taskSeq: number;
}
