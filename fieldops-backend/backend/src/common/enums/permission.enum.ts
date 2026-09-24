import { Role } from './role.enum';

/** Permissions granulaires "ressource:action" (RBAC §12). */
export enum Permission {
  ORG_READ = 'org:read',
  ORG_MANAGE = 'org:manage',
  USER_READ = 'user:read',
  USER_MANAGE = 'user:manage',
  AGENT_READ = 'agent:read',
  AGENT_MANAGE = 'agent:manage',
  CLIENT_READ = 'client:read',
  CLIENT_MANAGE = 'client:manage',
  TASK_READ = 'task:read',
  TASK_READ_ALL = 'task:read_all',
  TASK_CREATE = 'task:create',
  TASK_UPDATE = 'task:update',
  TASK_ASSIGN = 'task:assign',
  TASK_EXECUTE = 'task:execute',
  WORKFLOW_MANAGE = 'workflow:manage',
  PHOTO_UPLOAD = 'photo:upload',
  PHOTO_READ = 'photo:read',
  PHOTO_VALIDATE = 'photo:validate',
  LOCATION_SEND = 'location:send',
  LOCATION_READ = 'location:read',
  SLA_READ = 'sla:read',
  SLA_MANAGE = 'sla:manage',
  EVALUATION_CREATE = 'evaluation:create',
  EVALUATION_READ = 'evaluation:read',
  REPORT_READ = 'report:read',
  AUDIT_READ = 'audit:read',
  NOTIFICATION_SEND = 'notification:send',
}

const P = Permission;

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission),
  [Role.SUPERVISOR]: [
    P.ORG_READ, P.USER_READ, P.AGENT_READ, P.AGENT_MANAGE, P.CLIENT_READ, P.CLIENT_MANAGE,
    P.TASK_READ, P.TASK_READ_ALL, P.TASK_CREATE, P.TASK_UPDATE, P.TASK_ASSIGN, P.TASK_EXECUTE,
    P.PHOTO_READ, P.PHOTO_VALIDATE, P.LOCATION_READ, P.SLA_READ, P.EVALUATION_READ,
    P.REPORT_READ, P.NOTIFICATION_SEND,
  ],
  [Role.AGENT]: [
    P.TASK_READ, P.TASK_EXECUTE, P.PHOTO_UPLOAD, P.PHOTO_READ, P.LOCATION_SEND, P.CLIENT_READ,
  ],
  [Role.CLIENT]: [P.TASK_READ, P.PHOTO_READ, P.EVALUATION_CREATE, P.EVALUATION_READ, P.SLA_READ],
  [Role.DIRECTION]: [
    P.ORG_READ, P.AGENT_READ, P.CLIENT_READ, P.TASK_READ, P.TASK_READ_ALL, P.SLA_READ,
    P.EVALUATION_READ, P.REPORT_READ, P.LOCATION_READ, P.PHOTO_READ,
  ],
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
