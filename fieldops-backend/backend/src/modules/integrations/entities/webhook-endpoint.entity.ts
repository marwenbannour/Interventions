import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';

/** Abonnement d'un système tiers (ERP, GMAO, BI…) aux événements métier (V3 §17). */
@Entity('webhook_endpoints')
@Index(['organizationId', 'isActive'])
export class WebhookEndpoint extends TenantBaseEntity {
  @Column() name: string;
  @Column() url: string;
  /** Événements souscrits ; '*' = tous. */
  @Column('text', { array: true }) events: string[];
  /** Secret HMAC — jamais renvoyé par l'API après la création. */
  @Column({ select: false }) secret: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ type: 'int', default: 0 }) consecutiveFailures: number;
  @Column({ type: 'timestamptz', nullable: true }) lastDeliveryAt?: Date | null;
  @Column({ type: 'int', nullable: true }) lastStatusCode?: number | null;
  @Column({ type: 'varchar', nullable: true }) disabledReason?: string | null;
  @Column('uuid') createdById: string;
}
