import { ForbiddenException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import Redis from 'ioredis';
import { IsNull, Repository } from 'typeorm';
import { JwtPayload } from '../../common/types/auth-user';
import { REDIS } from '../../infra/redis/redis.module';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { MfaChannel, User, UserStatus } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const OTP_TTL_SEC = 300;
const OTP_MAX_ATTEMPTS = 5;

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly orgs: OrganizationsService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    @InjectRepository(RefreshToken) private readonly tokens: Repository<RefreshToken>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async login(email: string, password: string, meta: RequestMeta) {
    const user = await this.users.findWithPassword({ email: email.toLowerCase().trim() });
    const fail = async (reason: string) => {
      await this.audit.log({
        organizationId: user?.organizationId, userId: user?.id, action: 'auth.login', resource: 'auth',
        success: false, details: { email, reason }, ip: meta.ip, userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Identifiants invalides');
    };

    if (!user) {
      await bcrypt.compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva'); // anti timing
      return fail('unknown_email');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Compte temporairement verrouillé suite à des tentatives répétées');
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      const attempts = user.failedLoginAttempts + 1;
      await this.userRepo.update(user.id, {
        failedLoginAttempts: attempts >= MAX_FAILED_LOGINS ? 0 : attempts,
        lockedUntil: attempts >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      });
      return fail('bad_password');
    }
    if (user.status !== UserStatus.ACTIVE) return fail('inactive');

    const org = await this.orgs.get(user.organizationId);
    if (!org.isActive) return fail('org_inactive');

    await this.userRepo.update(user.id, { failedLoginAttempts: 0, lockedUntil: null });

    const mfaRequired = user.mfaEnabled || (org.settings?.mfaRequiredRoles ?? []).includes(user.role);
    if (mfaRequired) {
      await this.sendOtp(user);
      const mfaToken = await this.jwt.signAsync(
        { sub: user.id, typ: 'mfa' },
        { secret: this.cfg.get('jwt.mfaSecret'), expiresIn: OTP_TTL_SEC },
      );
      return { mfaRequired: true as const, mfaToken, channel: user.mfaChannel };
    }
    return this.completeLogin(user, meta);
  }

  async verifyOtp(mfaToken: string, code: string, meta: RequestMeta) {
    let payload: { sub: string; typ: string };
    try {
      payload = await this.jwt.verifyAsync(mfaToken, { secret: this.cfg.get('jwt.mfaSecret') });
    } catch {
      throw new UnauthorizedException('Session MFA expirée');
    }
    if (payload.typ !== 'mfa') throw new UnauthorizedException();

    const key = `otp:${payload.sub}`;
    const stored = await this.redis.hgetall(key);
    if (!stored?.hash) throw new UnauthorizedException('Code expiré');
    const attempts = await this.redis.hincrby(key, 'attempts', 1);
    if (attempts > OTP_MAX_ATTEMPTS) {
      await this.redis.del(key);
      throw new UnauthorizedException('Trop de tentatives');
    }
    if (sha256(code) !== stored.hash) throw new UnauthorizedException('Code invalide');
    await this.redis.del(key);

    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) throw new UnauthorizedException();
    return this.completeLogin(user, meta);
  }

  private async sendOtp(user: User) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.redis.multi().hset(`otp:${user.id}`, { hash: sha256(code), attempts: 0 }).expire(`otp:${user.id}`, OTP_TTL_SEC).exec();
    await this.notifications.sendTransient({
      organizationId: user.organizationId,
      userId: user.id,
      channel: user.mfaChannel === MfaChannel.SMS ? 'SMS' : 'EMAIL',
      title: 'Votre code de connexion',
      body: `Votre code de vérification FieldOps : ${code} (valable 5 minutes).`,
    });
  }

  private async completeLogin(user: User, meta: RequestMeta) {
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    await this.audit.log({
      organizationId: user.organizationId, userId: user.id, action: 'auth.login', resource: 'auth',
      ip: meta.ip, userAgent: meta.userAgent,
    });
    const tokens = await this.issueTokens(user, randomUUID(), meta);
    const { passwordHash, ...safeUser } = user as any;
    return { mfaRequired: false as const, ...tokens, user: safeUser };
  }

  async refresh(refreshToken: string, meta: RequestMeta) {
    const record = await this.tokens.findOne({ where: { tokenHash: sha256(refreshToken) } });
    if (!record) throw new UnauthorizedException('Refresh token invalide');

    if (record.revokedAt || record.usedAt) {
      // Réutilisation d'un token consommé → compromission probable : on révoque toute la famille.
      await this.revokeFamily(record.familyId);
      await this.audit.log({
        userId: record.userId, action: 'auth.refresh_reuse_detected', resource: 'auth',
        success: false, ip: meta.ip, userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Session révoquée');
    }
    if (record.expiresAt < new Date()) throw new UnauthorizedException('Session expirée');

    const user = await this.users.findById(record.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.revokeFamily(record.familyId);
      throw new UnauthorizedException();
    }
    // Consommation atomique (évite deux rafraîchissements concurrents avec le même token).
    const res = await this.tokens.update({ id: record.id, usedAt: IsNull() }, { usedAt: new Date() });
    if (!res.affected) throw new UnauthorizedException('Session révoquée');

    return this.issueTokens(user, record.familyId, meta);
  }

  async logout(refreshToken: string) {
    const record = await this.tokens.findOne({ where: { tokenHash: sha256(refreshToken) } });
    if (record) await this.revokeFamily(record.familyId);
  }

  async logoutAll(userId: string) {
    await this.tokens.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  private async revokeFamily(familyId: string) {
    await this.tokens.update({ familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  private async issueTokens(user: User, familyId: string, meta: RequestMeta) {
    const payload: JwtPayload = {
      sub: user.id,
      org: user.organizationId,
      role: user.role,
      email: user.email,
      cid: user.clientId ?? null,
    };
    const expiresIn = this.cfg.get<number>('jwt.accessTtl')!;
    const accessToken = await this.jwt.signAsync(payload, { expiresIn, audience: 'fieldops-api', issuer: 'fieldops' });

    const refreshToken = randomBytes(48).toString('base64url');
    const ttlDays = this.cfg.get<number>('jwt.refreshTtlDays')!;
    await this.tokens.insert({
      userId: user.id,
      tokenHash: sha256(refreshToken),
      familyId,
      expiresAt: new Date(Date.now() + ttlDays * 86_400_000),
      ip: meta.ip,
      userAgent: meta.userAgent?.slice(0, 255),
    });
    return { accessToken, refreshToken, expiresIn, tokenType: 'Bearer' as const };
  }
}
