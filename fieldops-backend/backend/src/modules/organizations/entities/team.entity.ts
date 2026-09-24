import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';

@Entity('teams')
export class Team extends TenantBaseEntity {
  @Column()
  name: string;

  @Column('uuid', { nullable: true })
  supervisorId?: string | null;

  @Column('uuid', { nullable: true })
  zoneId?: string | null;
}
