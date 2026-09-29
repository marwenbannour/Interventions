import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { Permission, ROLE_PERMISSIONS } from '../../common/enums/permission.enum';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/types/auth-user';
import { CreateApiKeyDto } from './dto/integrations.dto';
import { ApiKey } from './entities/api-key.entity';

/** Permissions jamais délégables à une clé : pas d'escalade via une intégration. */
const NON_DELEGABLE: Permission[] = [Permission.USER_MANAGE, Permission.INTEGRATION_MANAGE, Permission.ORG_MANAGE, Permission.AUDIT_READ];
const hash = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class ApiKeysService {
  constructor(@InjectRepository(ApiKey) private readonly keys: Repository<ApiKey>) {}

  /** Scopes proposés pour un rôle plafond donné. */
  delegableScopes(role: Role = Role.SUPERVISOR): Permission[] {
    return ROLE_PERMISSIONS[role].filter((p) => !NON_DELEGABLE.includes(p));
  }

  async create(user: AuthUser, dto: CreateApiKeyDto) {
    const role = dto.role ?? Role.SUPERVISOR;
    const allowed = this.delegableScopes(role);
    const invalid = dto.scopes.filter((s) => !allowed.includes(s as Permission));
    if (invalid.length) throw new UnprocessableEntityException({ message: 'Scopes non autorisés pour ce rôle', invalid, allowed });
    if (dto.expiresAt && new Date(dto.expiresAt) <= new Date()) throw new UnprocessableEntityException('Expiration dans le passé');

    const prefix = randomBytes(4).toString('hex');
    const secret = randomBytes(24).toString('base64url');
    const plain = `fo_${prefix}_${secret}`;
    const saved = await this.keys.save(
      this.keys.create({
        organizationId: user.organizationId, name: dto.name, prefix, keyHash: hash(plain), role,
        scopes: [...new Set(dto.scopes)], expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null, createdById: user.id,
      }),
    );
    const { keyHash: _h, ...rest } = saved;
    return { ...rest, key: plain }; // affichée une seule fois
  }

  list(orgId: string) {
    return this.keys.find({ where: { organizationId: orgId }, order: { createdAt: 'DESC' } });
  }

  async revoke(orgId: string, id: string) {
    const k = await this.keys.findOne({ where: { id, organizationId: orgId, revokedAt: IsNull() } });
    if (!k) throw new NotFoundException('Clé introuvable ou déjà révoquée');
    k.revokedAt = new Date();
    return this.keys.save(k);
  }

  /** Authentifie une clé présentée par un appelant ; null si invalide, expirée ou révoquée. */
  async authenticate(plain: string, ip?: string): Promise<AuthUser | null> {
    const m = /^fo_([0-9a-f]{8})_[A-Za-z0-9_-]{20,}$/.exec(plain.trim());
    if (!m) return null;
    const k = await this.keys
      .createQueryBuilder('k')
      .addSelect('k.keyHash')
      .where('k.prefix = :p', { p: m[1] })
      .getOne();
    if (!k || k.revokedAt || (k.expiresAt && k.expiresAt <= new Date())) return null;
    const a = Buffer.from(hash(plain.trim()), 'hex');
    const b = Buffer.from(k.keyHash, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    // Horodatage d'usage au plus une fois par minute (évite une écriture par requête).
    if (!k.lastUsedAt || Date.now() - k.lastUsedAt.getTime() > 60_000) {
      await this.keys.update(k.id, { lastUsedAt: new Date(), lastUsedIp: ip ?? null });
    }
    return {
      id: k.id,
      organizationId: k.organizationId,
      role: k.role,
      email: `apikey:${k.name}`,
      apiKeyId: k.id,
      scopes: k.scopes as Permission[],
    };
  }
}
