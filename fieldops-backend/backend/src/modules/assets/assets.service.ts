import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as QRCode from 'qrcode';
import { Brackets, Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/types/auth-user';
import { Site } from '../clients/entities/site.entity';
import { Task } from '../tasks/entities/task.entity';
import { AssetQueryDto, CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';
import { Asset } from './entities/asset.entity';

/** Préfixe du contenu des QR codes : distingue un code FieldOps d'un QR quelconque scanné par erreur. */
export const ASSET_QR_PREFIX = 'FIELDOPS:ASSET:';

/** Normalise une valeur scannée (QR complet ou code saisi à la main). */
export function normalizeAssetCode(raw: string): string {
  const v = raw.trim();
  return (v.toUpperCase().startsWith(ASSET_QR_PREFIX) ? v.slice(ASSET_QR_PREFIX.length) : v).toUpperCase();
}

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset) private readonly assets: Repository<Asset>,
    @InjectRepository(Site) private readonly sites: Repository<Site>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
  ) {}

  async create(orgId: string, dto: CreateAssetDto) {
    const site = await this.sites.findOne({ where: { id: dto.siteId, organizationId: orgId } });
    if (!site) throw new NotFoundException('Site introuvable');
    const code = dto.code ? normalizeAssetCode(dto.code) : await this.nextCode(orgId);
    if (await this.assets.exist({ where: { organizationId: orgId, code } })) {
      throw new ConflictException(`Le code ${code} est déjà utilisé`);
    }
    return this.assets.save(
      this.assets.create({ ...dto, code, organizationId: orgId, clientId: site.clientId, attributes: dto.attributes ?? {} }),
    );
  }

  async list(user: AuthUser, q: AssetQueryDto) {
    const qb = this.assets
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.site', 'site')
      .leftJoinAndSelect('a.client', 'client')
      .where('a.organizationId = :org', { org: user.organizationId })
      .orderBy('client.name', 'ASC')
      .addOrderBy('site.name', 'ASC')
      .addOrderBy('a.name', 'ASC')
      .offset((q.page - 1) * q.limit)
      .limit(q.limit);
    if (user.role === Role.CLIENT) qb.andWhere('a.clientId = :cid', { cid: user.clientId });
    else if (q.clientId) qb.andWhere('a.clientId = :cid', { cid: q.clientId });
    if (q.siteId) qb.andWhere('a.siteId = :sid', { sid: q.siteId });
    if (q.category) qb.andWhere('a.category = :cat', { cat: q.category });
    if (q.status) qb.andWhere('a.status = :st', { st: q.status });
    if (q.search) {
      qb.andWhere(
        new Brackets((w) =>
          w.where('a.code ILIKE :s', { s: `%${q.search}%` })
            .orWhere('a.name ILIKE :s')
            .orWhere('a.serialNumber ILIKE :s'),
        ),
      );
    }
    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, q);
  }

  async get(user: AuthUser, id: string) {
    const a = await this.assets.findOne({
      where: { id, organizationId: user.organizationId },
      relations: { site: true, client: true },
    });
    if (!a) throw new NotFoundException('Équipement introuvable');
    this.assertScope(user, a);
    return a;
  }

  /** Résolution d'un code scanné (QR ou saisie manuelle). */
  async lookup(user: AuthUser, rawCode: string) {
    const code = normalizeAssetCode(rawCode);
    const a = await this.assets.findOne({
      where: { organizationId: user.organizationId, code },
      relations: { site: true, client: true },
    });
    if (!a) throw new NotFoundException(`Aucun équipement pour le code ${code}`);
    this.assertScope(user, a);
    return a;
  }

  async update(user: AuthUser, id: string, dto: UpdateAssetDto) {
    const a = await this.get(user, id);
    Object.assign(a, dto);
    return this.assets.save(a);
  }

  /** Historique d'interventions de l'équipement + indicateurs de fiabilité. */
  async history(user: AuthUser, id: string) {
    const a = await this.get(user, id);
    const tasks = await this.tasks.find({
      where: { organizationId: user.organizationId, assetId: a.id },
      relations: { agent: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const done = tasks.filter((t) => t.completedAt);
    const corrective = done.filter((t) => t.origin !== 'PREVENTIVE');
    // MTBF approximatif : écart moyen entre deux interventions correctives terminées.
    let mtbfDays: number | null = null;
    if (corrective.length >= 2) {
      const times = corrective.map((t) => t.completedAt!.getTime()).sort((x, y) => x - y);
      const gaps = times.slice(1).map((t, i) => t - times[i]);
      mtbfDays = Math.round((gaps.reduce((s, g) => s + g, 0) / gaps.length / 86_400_000) * 10) / 10;
    }
    return {
      asset: a,
      stats: {
        total: tasks.length,
        completed: done.length,
        corrective: corrective.length,
        preventive: done.length - corrective.length,
        reworks: tasks.filter((t) => t.isRework).length,
        lastInterventionAt: done[0]?.completedAt ?? null,
        mtbfDays,
      },
      tasks: tasks.map((t) => ({
        id: t.id, reference: t.reference, title: t.title, type: t.type, status: t.status, origin: t.origin,
        priority: t.priority, isRework: t.isRework, createdAt: t.createdAt, completedAt: t.completedAt,
        agent: t.agent ? { id: t.agent.id, firstName: t.agent.firstName, lastName: t.agent.lastName } : null,
      })),
    };
  }

  /** Étiquette QR (PNG) à imprimer et coller sur l'équipement. */
  async qrPng(user: AuthUser, id: string): Promise<{ png: Buffer; code: string }> {
    const a = await this.get(user, id);
    const png = await QRCode.toBuffer(`${ASSET_QR_PREFIX}${a.code}`, { errorCorrectionLevel: 'M', margin: 2, width: 512 });
    return { png, code: a.code };
  }

  private async nextCode(orgId: string): Promise<string> {
    const r: { n: number }[] = await this.assets.query(
      `SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '^EQ-', ''), code)::int), 0) + 1 AS n
         FROM assets WHERE "organizationId" = $1 AND code ~ '^EQ-[0-9]+$'`,
      [orgId],
    );
    return `EQ-${String(r[0]?.n ?? 1).padStart(6, '0')}`;
  }

  private assertScope(user: AuthUser, a: Asset) {
    if (user.role === Role.CLIENT && a.clientId !== user.clientId) throw new ForbiddenException();
  }
}
