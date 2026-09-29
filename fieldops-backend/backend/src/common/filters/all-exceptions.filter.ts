import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { QueryFailedError, EntityNotFoundError, OptimisticLockVersionMismatchError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = { message: 'Erreur interne' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      body = typeof r === 'string' ? { message: r } : (r as Record<string, unknown>);
    } else if (exception instanceof EntityNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      body = { message: 'Ressource introuvable' };
    } else if (exception instanceof OptimisticLockVersionMismatchError) {
      status = HttpStatus.CONFLICT;
      body = { message: 'La ressource a été modifiée entre-temps' };
    } else if (exception instanceof QueryFailedError && (exception as any).code === '23505') {
      status = HttpStatus.CONFLICT;
      body = { message: 'Conflit : valeur déjà existante', detail: (exception as any).detail };
    } else {
      this.logger.error(`[${req?.requestId ?? '-'}] ${exception instanceof Error ? exception.stack : String(exception)}`);
    }
    // V3 — remontée Sentry des erreurs serveur (no-op si SENTRY_DSN absent).
    if (status >= 500 && process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setTag('requestId', req?.requestId ?? '');
        if (req?.user) scope.setUser({ id: req.user.id, segment: req.user.role });
        Sentry.captureException(exception);
      });
    }

    res.status(status).json({
      statusCode: status,
      ...body,
      path: req.url,
      requestId: req?.requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
