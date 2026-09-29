import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { httpDuration } from '../../common/observability/metrics';

const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Corrélation (V3 §20) : X-Request-Id propagé ou généré, renvoyé au client, inclus dans les erreurs
 * et les logs ; mesure de la durée par route (gabarit de route, pas l'URL : cardinalité bornée).
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request & { requestId?: string }, res: Response, next: NextFunction) {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-Id', id);
    const end = httpDuration.startTimer();
    res.on('finish', () => {
      const route = req.route?.path ? `${req.baseUrl ?? ''}${req.route.path}` : 'unmatched';
      end({ method: req.method, route, status: String(res.statusCode) });
    });
    next();
  }
}
