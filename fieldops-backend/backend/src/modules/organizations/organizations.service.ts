import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { DEFAULT_ORG_SETTINGS, Organization, OrganizationSettings } from './entities/organization.entity';
import { Zone } from './entities/zone.entity';
import { Team } from './entities/team.entity';
import { CreateTeamDto, CreateZoneDto, UpdateOrganizationDto, UpdateTeamDto, UpdateZoneDto } from './dto/organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization) private readonly orgs: Repository<Organization>,
    @InjectRepository(Zone) private readonly zones: Repository<Zone>,
    @InjectRepository(Team) private readonly teams: Repository<Team>,
  ) {}

  async get(id: string): Promise<Organization> {
    const org = await this.orgs.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organisation introuvable');
    return org;
  }

  async getSettings(id: string): Promise<OrganizationSettings> {
    const org = await this.get(id);
    return { ...DEFAULT_ORG_SETTINGS, ...org.settings };
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    const org = await this.get(id);
    if (dto.name) org.name = dto.name;
    if (dto.settings) org.settings = { ...DEFAULT_ORG_SETTINGS, ...org.settings, ...dto.settings };
    return this.orgs.save(org);
  }

  /** Référence séquentielle atomique par tenant : INT-2026-000123. */
  async nextTaskReference(orgId: string, manager?: EntityManager): Promise<string> {
    const m = manager ?? this.orgs.manager;
    const rows: { taskSeq: number }[] = await m.query(
      `UPDATE organizations SET "taskSeq" = "taskSeq" + 1 WHERE id = $1 RETURNING "taskSeq"`,
      [orgId],
    );
    const raw = Array.isArray(rows[0]) ? (rows[0] as any)[0] : rows[0];
    const seq = raw.taskSeq;
    return `INT-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`;
  }

  // ---------- Zones ----------
  listZones(orgId: string) {
    return this.zones.find({ where: { organizationId: orgId }, order: { name: 'ASC' } });
  }
  createZone(orgId: string, dto: CreateZoneDto) {
    return this.zones.save(this.zones.create({ ...dto, organizationId: orgId }));
  }
  async updateZone(orgId: string, id: string, dto: UpdateZoneDto) {
    const z = await this.zones.findOne({ where: { id, organizationId: orgId } });
    if (!z) throw new NotFoundException('Zone introuvable');
    return this.zones.save(Object.assign(z, dto));
  }
  async deleteZone(orgId: string, id: string) {
    const r = await this.zones.delete({ id, organizationId: orgId });
    if (!r.affected) throw new NotFoundException('Zone introuvable');
  }

  // ---------- Équipes ----------
  listTeams(orgId: string) {
    return this.teams.find({ where: { organizationId: orgId }, order: { name: 'ASC' } });
  }
  createTeam(orgId: string, dto: CreateTeamDto) {
    return this.teams.save(this.teams.create({ ...dto, organizationId: orgId }));
  }
  async updateTeam(orgId: string, id: string, dto: UpdateTeamDto) {
    const t = await this.teams.findOne({ where: { id, organizationId: orgId } });
    if (!t) throw new NotFoundException('Équipe introuvable');
    return this.teams.save(Object.assign(t, dto));
  }
  async deleteTeam(orgId: string, id: string) {
    const r = await this.teams.delete({ id, organizationId: orgId });
    if (!r.affected) throw new NotFoundException('Équipe introuvable');
  }
}
