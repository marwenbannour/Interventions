import { Column, Entity, Index, OneToMany } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { Site } from './site.entity';

@Entity('clients')
@Index(['organizationId', 'code'], { unique: true })
export class Client extends TenantBaseEntity {
  @Column()
  name: string;

  @Column()
  code: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  billingAddress?: string;

  @Column({ nullable: true })
  contractReference?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => Site, (s) => s.client)
  sites: Site[];
}
