import { Role } from '../enums/role.enum';

/** Utilisateur authentifié injecté dans req.user par la stratégie JWT. */
export interface AuthUser {
  id: string;
  organizationId: string;
  role: Role;
  email: string;
  /** Pour un utilisateur CLIENT : client rattaché (portail client). */
  clientId?: string | null;
}

export interface JwtPayload {
  sub: string;
  org: string;
  role: Role;
  email: string;
  cid?: string | null;
}
