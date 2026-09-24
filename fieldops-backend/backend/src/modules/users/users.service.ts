import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';
import { AgentProfile, AgentStatus } from '../agents/entities/agent-profile.entity';
import { Client } from '../clients/entities/client.entity';
import { ChangePasswordDto, CreateUserDto, UpdateMeDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { User } from './entities/user.entity';

export const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async create(orgId: string, dto: CreateUserDto): Promise<User> {
    const email = dto.email.toLowerCase().trim();
    if (await this.users.exist({ where: { email } })) throw new ConflictException('Email déjà utilisé');

    if (dto.role === Role.CLIENT) {
      if (!dto.clientId) throw new BadRequestException('clientId obligatoire pour un utilisateur CLIENT');
      const ok = await this.dataSource.getRepository(Client).exist({ where: { id: dto.clientId, organizationId: orgId } });
      if (!ok) throw new BadRequestException('Client introuvable');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    return this.dataSource.transaction(async (m) => {
      const user = await m.save(
        m.create(User, {
          organizationId: orgId,
          email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role: dto.role,
          clientId: dto.role === Role.CLIENT ? dto.clientId : null,
          mfaEnabled: dto.mfaEnabled ?? false,
          mfaChannel: dto.mfaChannel,
        }),
      );
      if (dto.role === Role.AGENT) {
        await m.save(
          m.create(AgentProfile, {
            organizationId: orgId,
            userId: user.id,
            status: AgentStatus.PENDING_VALIDATION,
            ...dto.agentProfile,
          }),
        );
      }
      delete (user as any).passwordHash;
      return user;
    });
  }

  async findAll(orgId: string, q: UserQueryDto) {
    const qb = this.users
      .createQueryBuilder('u')
      .where('u.organizationId = :orgId', { orgId })
      .orderBy('u.lastName', 'ASC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit);
    if (q.role) qb.andWhere('u.role = :role', { role: q.role });
    if (q.status) qb.andWhere('u.status = :status', { status: q.status });
    if (q.search) {
      qb.andWhere('(u.email ILIKE :s OR u.firstName ILIKE :s OR u.lastName ILIKE :s)', { s: `%${q.search}%` });
    }
    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, q);
  }

  async findOne(orgId: string, id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id, organizationId: orgId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async update(orgId: string, id: string, dto: UpdateUserDto) {
    const user = await this.findOne(orgId, id);
    Object.assign(user, dto);
    return this.users.save(user);
  }

  async updateMe(orgId: string, id: string, dto: UpdateMeDto) {
    const user = await this.findOne(orgId, id);
    return this.users.save(Object.assign(user, dto));
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.findWithPassword({ id });
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    await this.users.update(id, { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS) });
  }

  findWithPassword(where: { email?: string; id?: string }) {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where(where.email ? 'u.email = :email' : 'u.id = :id', where.email ? { email: where.email } : { id: where.id })
      .getOne();
  }

  findById(id: string) {
    return this.users.findOne({ where: { id } });
  }

  /** Destinataires de notifications par rôle au sein d'un tenant. */
  findByRoles(orgId: string, roles: Role[]) {
    return this.users
      .createQueryBuilder('u')
      .where('u.organizationId = :orgId', { orgId })
      .andWhere('u.role IN (:...roles)', { roles })
      .andWhere(`u.status = 'ACTIVE'`)
      .getMany();
  }

  findClientUsers(orgId: string, clientId: string) {
    return this.users.find({ where: { organizationId: orgId, clientId, role: Role.CLIENT } });
  }
}
