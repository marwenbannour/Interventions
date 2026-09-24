import { ApiError } from '@/lib/api/errors';
import type { MfaChannel, User } from '@/lib/api/types';

export interface LoginSuccess {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export interface MfaChallenge {
  mfaRequired: true;
  mfaToken: string;
  channel: MfaChannel;
}

export type LoginResult = LoginSuccess | MfaChallenge;

async function postBff<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/auth${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.message ?? 'Une erreur est survenue.', res.status, data);
  }
  return data as T;
}

export const authApi = {
  login: (email: string, password: string) => postBff<LoginResult>('/login', { email, password }),
  verifyOtp: (mfaToken: string, code: string) => postBff<LoginSuccess>('/otp/verify', { mfaToken, code }),
  refresh: () => postBff<{ accessToken: string; expiresIn: number }>('/refresh'),
  logout: () => postBff<{ ok: true }>('/logout'),
};
