import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AUDIT_KEY, AuditMeta } from '../../common/decorators/audit.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { AuditService } from './audit.service';

/** Journalise automatiquement les handlers annotés @Audit (succès et échecs). */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector, private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta>(AUDIT_KEY, context.getHandler());
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;
    const base = {
      organizationId: user?.organizationId ?? null,
      userId: user?.id ?? null,
      action: meta.action,
      resource: meta.resource,
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    };

    return next.handle().pipe(
      tap({
        next: (result: any) =>
          void this.audit.log({
            ...base,
            resourceId: req.params?.id ?? result?.id ?? null,
            details: { method: req.method, path: req.route?.path, params: req.params },
          }),
        error: (err: Error) =>
          void this.audit.log({
            ...base,
            resourceId: req.params?.id ?? null,
            success: false,
            details: { method: req.method, path: req.route?.path, error: err.message },
          }),
      }),
    );
  }
}
