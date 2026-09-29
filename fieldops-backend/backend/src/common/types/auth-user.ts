import { Permission } from '../enums/permission.enum';
import { Role } from '../enums/role.enum';

/** Utilisateur authentifié injecté dans req.user par la stratégie JWT. */
export interface AuthUser {
  id: string;
  organizationId: string;
  role: Role;
  email: string;
  /** Pour un utilisateur CLIENT : client rattaché (portail client). */
  clientId?: string | null;
  /** V3 — appel authentifié par clé API d'intégration (id de la clé). */
  apiKeyId?: string | null;
  /** V3 — périmètre restreint de la clé API ; absent pour un utilisateur. */
  scopes?: Permission[] | null;
}

/** Identifiant technique des actions automatiques (planificateur, auto-dispatch). */
export const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export function systemUser(organizationId: string, role: Role = Role.ADMIN): AuthUser {
  return { id: SYSTEM_ACTOR_ID, organizationId, role, email: 'system@fieldops' };
}

export interface JwtPayload {
  sub: string;
  org: string;
  role: Role;
  email: string;
  cid?: string | null;
}
