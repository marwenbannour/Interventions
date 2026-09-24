import { apiFetch } from '../../../lib/api/client';
import type {
  AuthSuccessResponse,
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  TokenPair,
  UpdateMeRequest,
  User,
  VerifyOtpRequest,
} from '../../../lib/api/types';

export const authApi = {
  login: (body: LoginRequest) =>
    apiFetch<LoginResponse>('/auth/login', { method: 'POST', body, skipAuth: true }),

  verifyOtp: (body: VerifyOtpRequest) =>
    apiFetch<AuthSuccessResponse>('/auth/otp/verify', { method: 'POST', body, skipAuth: true }),

  refresh: (body: RefreshRequest) =>
    apiFetch<TokenPair>('/auth/refresh', { method: 'POST', body, skipAuth: true, skipRefresh: true }),

  logout: (body: RefreshRequest) =>
    apiFetch<void>('/auth/logout', { method: 'POST', body, skipAuth: true }),

  logoutAll: () => apiFetch<void>('/auth/logout-all', { method: 'POST' }),

  me: () => apiFetch<User>('/users/me'),

  updateMe: (body: UpdateMeRequest) => apiFetch<User>('/users/me', { method: 'PATCH', body }),

  changePassword: (body: ChangePasswordRequest) =>
    apiFetch<void>('/users/me/password', { method: 'POST', body }),
};
