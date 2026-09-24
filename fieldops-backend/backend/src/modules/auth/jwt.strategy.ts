import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser, JwtPayload } from '../../common/types/auth-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>('jwt.accessSecret')!,
      audience: 'fieldops-api',
      issuer: 'fieldops',
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      id: payload.sub,
      organizationId: payload.org,
      role: payload.role,
      email: payload.email,
      clientId: payload.cid ?? null,
    };
  }
}
