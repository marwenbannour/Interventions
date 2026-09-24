import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';

@Entity('device_tokens')
export class DeviceToken extends TenantBaseEntity {
  @Index()
  @Column('uuid')
  userId: string;

  @Index({ unique: true })
  @Column()
  token: string;

  /** ios | android | web */
  @Column()
  platform: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt?: Date | null;
}
