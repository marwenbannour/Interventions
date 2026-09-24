import { Column, Entity, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { Role } from '../../../common/enums/role.enum';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  SUSPENDED = 'SUSPENDED',
}

export enum MfaChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

@Entity('users')
export class User extends TenantBaseEntity {
  @Index({ unique: true })
  @Column()
  email: string;

  @Exclude()
  @Column({ select: false })
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  phone?: string;

  @Index()
  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ type: 'enum', enum: MfaChannel, default: MfaChannel.EMAIL })
  mfaChannel: MfaChannel;

  /** Rattachement au compte client pour le rôle CLIENT (ClientProfile §16). */
  @Index()
  @Column('uuid', { nullable: true })
  clientId?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null;

  @Exclude()
  @Column({ type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Exclude()
  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil?: Date | null;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
