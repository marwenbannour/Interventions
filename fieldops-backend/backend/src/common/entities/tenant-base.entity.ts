import { Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Toute entité métier appartient à un tenant (Organization) — §14 Multi-tenant.
 * L'isolation est appliquée systématiquement dans les services via organizationId.
 */
export abstract class TenantBaseEntity extends BaseEntity {
  @Index()
  @Column('uuid')
  organizationId: string;
}
