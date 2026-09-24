import { authApi } from '@/features/auth/api/auth.api';
import { getAccessToken, useSessionStore } from '@/features/auth/store/session.store';
import { ApiError } from './errors';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = authApi
      .refresh()
      .then(({ accessToken }) => {
        useSessionStore.getState().setAccessToken(accessToken);
        return accessToken;
      })
      .catch(() => {
        useSessionStore.getState().clearSession();
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Ne pas tenter de rafraîchir le token sur 401 (utilisé par le refresh lui-même). */
  skipAuthRetry?: boolean;
}

async function authedFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { body, skipAuthRetry, headers, ...rest } = options;
  const accessToken = getAccessToken();

  const doFetch = async (token: string | null) => {
    return fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch(accessToken);

  if (res.status === 401 && !skipAuthRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(newToken);
    }
  }

  return res;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const res = await authedFetch(path, options);

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => undefined);

  if (!res.ok) {
    throw new ApiError(data?.message ?? `Erreur ${res.status}`, res.status, data);
  }

  return data as T;
}

/** Pour les réponses non-JSON (ex. export CSV), authentifiées de la même façon. */
export async function apiFetchBlob(path: string, options: ApiFetchOptions = {}): Promise<Blob> {
  const res = await authedFetch(path, options);
  if (!res.ok) {
    const data = await res.json().catch(() => undefined);
    throw new ApiError(data?.message ?? `Erreur ${res.status}`, res.status, data);
  }
  return res.blob();
}
