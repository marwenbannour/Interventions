import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeysService } from '../../modules/integrations/api-keys.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Authentification : JWT Bearer (utilisateurs) ou, depuis la V3, clé d'API d'intégration
 * via l'en-tête `X-API-Key` ou `Authorization: ApiKey <clé>`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector, private readonly apiKeys: ApiKeysService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest();
      const header = req.headers?.authorization as string | undefined;
      const key = (req.headers?.['x-api-key'] as string | undefined) ?? (header?.startsWith('ApiKey ') ? header.slice(7) : undefined);
      if (key) {
        const user = await this.apiKeys.authenticate(key, req.ip);
        if (!user) throw new UnauthorizedException('Clé API invalide, expirée ou révoquée');
        req.user = user;
        return true;
      }
    }
    return (await super.canActivate(context)) as boolean;
  }
}
