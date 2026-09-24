export type Role = 'ADMIN' | 'SUPERVISOR' | 'AGENT' | 'CLIENT' | 'DIRECTION';
export type UserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';
export type MfaChannel = 'EMAIL' | 'SMS';

export interface User {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  status: UserStatus;
  mfaEnabled: boolean;
  mfaChannel: MfaChannel;
  clientId?: string | null;
  lastLoginAt?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MfaChallengeResponse {
  mfaRequired: true;
  mfaToken: string;
  channel: MfaChannel;
}

export interface AuthSuccessResponse {
  mfaRequired: false;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: User;
}

export type LoginResponse = MfaChallengeResponse | AuthSuccessResponse;

export interface VerifyOtpRequest {
  mfaToken: string;
  code: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateMeRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
}
