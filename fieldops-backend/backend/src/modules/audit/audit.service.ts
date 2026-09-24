import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { PaginationQueryDto, paginate } from '../../common/dto/pagination.dto';

export interface AuditEntry {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  success?: boolean;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  /** N'échoue jamais : l'audit ne doit pas bloquer l'opération métier. */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.repo.insert({ ...entry, success: entry.success ?? true } as any);
    } catch (e) {
      this.logger.error(`Échec écriture audit ${entry.action}: ${(e as Error).message}`);
    }
  }

  async search(
    organizationId: string,
    q: PaginationQueryDto & { resource?: string; resourceId?: string; userId?: string; action?: string },
  ) {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.organizationId = :organizationId', { organizationId })
      .orderBy('a.createdAt', 'DESC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit);
    if (q.resource) qb.andWhere('a.resource = :resource', { resource: q.resource });
    if (q.resourceId) qb.andWhere('a.resourceId = :resourceId', { resourceId: q.resourceId });
    if (q.userId) qb.andWhere('a.userId = :userId', { userId: q.userId });
    if (q.action) qb.andWhere('a.action ILIKE :action', { action: `%${q.action}%` });
    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, q);
  }
}
