import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/types/auth-user';
import { toPoint } from '../../common/utils/geo';
import { ClientQueryDto, CreateClientDto, CreateSiteDto, SiteQueryDto, UpdateClientDto, UpdateSiteDto } from './dto/client.dto';
import { Client } from './entities/client.entity';
import { Site } from './entities/site.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Site) private readonly sites: Repository<Site>,
  ) {}

  // ---------- Clients ----------
  createClient(orgId: string, dto: CreateClientDto) {
    return this.clients.save(this.clients.create({ ...dto, organizationId: orgId }));
  }

  async listClients(user: AuthUser, q: ClientQueryDto) {
    const qb = this.clients
      .createQueryBuilder('c')
      .where('c.organizationId = :org', { org: user.organizationId })
      .orderBy('c.name', 'ASC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit);
    if (user.role === Role.CLIENT) qb.andWhere('c.id = :cid', { cid: user.clientId });
    if (q.search) qb.andWhere('(c.name ILIKE :s OR c.code ILIKE :s)', { s: `%${q.search}%` });
    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, q);
  }

  async getClient(user: AuthUser, id: string) {
    this.assertClientScope(user, id);
    const c = await this.clients.findOne({ where: { id, organizationId: user.organizationId }, relations: { sites: true } });
    if (!c) throw new NotFoundException('Client introuvable');
    return c;
  }

  async updateClient(orgId: string, id: string, dto: UpdateClientDto) {
    const c = await this.clients.findOne({ where: { id, organizationId: orgId } });
    if (!c) throw new NotFoundException('Client introuvable');
    return this.clients.save(Object.assign(c, dto));
  }

  // ---------- Sites ----------
  async createSite(orgId: string, dto: CreateSiteDto) {
    const exists = await this.clients.exist({ where: { id: dto.clientId, organizationId: orgId } });
    if (!exists) throw new NotFoundException('Client introuvable');
    const { lat, lng, ...rest } = dto;
    return this.sites.save(this.sites.create({ ...rest, organizationId: orgId, location: toPoint(lat, lng) }));
  }

  async listSites(user: AuthUser, q: SiteQueryDto) {
    const qb = this.sites
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.client', 'client')
      .where('s.organizationId = :org', { org: user.organizationId })
      .orderBy('s.name', 'ASC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit);
    if (user.role === Role.CLIENT) qb.andWhere('s.clientId = :cid', { cid: user.clientId });
    else if (q.clientId) qb.andWhere('s.clientId = :cid', { cid: q.clientId });
    if (q.search) qb.andWhere('(s.name ILIKE :s OR s.address ILIKE :s OR s.city ILIKE :s)', { s: `%${q.search}%` });
    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, q);
  }

  async getSite(user: AuthUser, id: string) {
    const s = await this.sites.findOne({ where: { id, organizationId: user.organizationId }, relations: { client: true } });
    if (!s) throw new NotFoundException('Site introuvable');
    this.assertClientScope(user, s.clientId);
    return s;
  }

  async findSiteOrFail(orgId: string, id: string) {
    const s = await this.sites.findOne({ where: { id, organizationId: orgId } });
    if (!s) throw new NotFoundException('Site introuvable');
    return s;
  }

  async updateSite(orgId: string, id: string, dto: UpdateSiteDto) {
    const s = await this.findSiteOrFail(orgId, id);
    const { lat, lng, ...rest } = dto;
    Object.assign(s, rest);
    if (lat !== undefined && lng !== undefined) s.location = toPoint(lat, lng);
    return this.sites.save(s);
  }

  private assertClientScope(user: AuthUser, clientId: string) {
    if (user.role === Role.CLIENT && user.clientId !== clientId) throw new ForbiddenException();
  }
}
