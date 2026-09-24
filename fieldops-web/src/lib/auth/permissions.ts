import type { Role } from '../api/types';

/**
 * Sous-ensemble minimal de la table ROLE_PERMISSIONS du backend
 * (src/common/enums/permission.enum.ts), limité à ce que l'UI dispatch a besoin
 * de masquer/afficher. Le backend reste la seule source de vérité (403 réelle) ;
 * ceci ne sert qu'à éviter d'afficher une action qui échouerait systématiquement.
 */
const TASK_ASSIGN_ROLES: Role[] = ['ADMIN', 'SUPERVISOR'];
const CLIENT_MANAGE_ROLES: Role[] = ['ADMIN', 'SUPERVISOR'];
const PHOTO_VALIDATE_ROLES: Role[] = ['ADMIN', 'SUPERVISOR'];
const AGENT_MANAGE_ROLES: Role[] = ['ADMIN', 'SUPERVISOR'];
const NOTIFICATION_SEND_ROLES: Role[] = ['ADMIN', 'SUPERVISOR'];
const SLA_READ_ROLES: Role[] = ['ADMIN', 'SUPERVISOR', 'DIRECTION'];

export function canAssignTasks(role: Role): boolean {
  return TASK_ASSIGN_ROLES.includes(role);
}

export function canManageClients(role: Role): boolean {
  return CLIENT_MANAGE_ROLES.includes(role);
}

export function canValidatePhotos(role: Role): boolean {
  return PHOTO_VALIDATE_ROLES.includes(role);
}

export function canManageAgents(role: Role): boolean {
  return AGENT_MANAGE_ROLES.includes(role);
}

/** Écrans admin (organisation, workflows, audit) — réservés ADMIN, cf. ROLE_PERMISSIONS backend. */
export function isAdmin(role: Role): boolean {
  return role === 'ADMIN';
}

/** NOTIFICATION_SEND — ADMIN + SUPERVISOR seulement, pas DIRECTION (cf. ROLE_PERMISSIONS backend). */
export function canSendNotifications(role: Role): boolean {
  return NOTIFICATION_SEND_ROLES.includes(role);
}

/** SLA_READ — ADMIN, SUPERVISOR et DIRECTION (pas AGENT/CLIENT), cf. ROLE_PERMISSIONS backend. */
export function canReadSla(role: Role): boolean {
  return SLA_READ_ROLES.includes(role);
}

/** SLA_MANAGE — ADMIN seul peut créer/modifier une politique SLA. */
export function canManageSla(role: Role): boolean {
  return role === 'ADMIN';
}
