export type Role = 'ADMIN' | 'SUPERVISOR' | 'AGENT' | 'CLIENT' | 'DIRECTION';
export type UserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';
export type MfaChannel = 'EMAIL' | 'SMS';

export interface User {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: Role;
  status: UserStatus;
  mfaEnabled: boolean;
  mfaChannel: MfaChannel;
  clientId?: string | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; pages: number };
}
