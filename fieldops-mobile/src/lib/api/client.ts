import { env } from '../env';
import { secureStorage } from '../secureStorage';
import { resetDatabase } from '../db/database';
import { useSessionStore } from '../../features/auth/store/session.store';
import { ApiError, NetworkError, isSessionRevoked } from './errors';
import type { TokenPair } from './types';

type OnForceLogout = () => void;

let onForceLogout: OnForceLogout | null = null;

/** Appelé une fois au démarrage de l'app pour brancher la déconnexion forcée sur la navigation/reset DB. */
export function registerForceLogoutHandler(handler: OnForceLogout): void {
  onForceLogout = handler;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Sauter l'attache automatique du token (endpoints publics : login, otp/verify, refresh, logout). */
  skipAuth?: boolean;
  /** Sauter le retry-on-401 (utilisé par l'appel de refresh lui-même, pour éviter une boucle). */
  skipRefresh?: boolean;
}

async function parseErrorBody(response: Response): Promise<Record<string, unknown>> {
  try {
    const json = await response.json();
    return typeof json === 'object' && json !== null ? json : {};
  } catch {
    return {};
  }
}

async function rawFetch<T>(path: string, opts: RequestOptions): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) };
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  if (!opts.skipAuth) {
    const token = useSessionStore.getState().accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, { ...opts, headers, body });
  } catch (cause) {
    throw new NetworkError(cause);
  }

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, (payload as Record<string, unknown>) ?? (await parseErrorBody(response)));
  }
  return payload as T;
}

let refreshInFlight: Promise<string> | null = null;

/** Rafraîchit l'access token via le refresh token stocké ; dédupliqué entre requêtes concurrentes. */
async function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = await secureStorage.getRefreshToken();
      if (!refreshToken) throw new ApiError(401, { message: 'Aucune session' });
      const pair = await rawFetch<TokenPair>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        skipAuth: true,
        skipRefresh: true,
      });
      await secureStorage.setRefreshToken(pair.refreshToken);
      useSessionStore.getState().setAccessToken(pair.accessToken);
      return pair.accessToken;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function forceLogout(): Promise<void> {
  await secureStorage.clearRefreshToken().catch(() => undefined);
  useSessionStore.getState().clearSession();
  await resetDatabase().catch(() => undefined);
  onForceLogout?.();
}

/** Requête JSON typée vers l'API FieldOps, avec attache de token et retry-on-401 automatiques. */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  try {
    return await rawFetch<T>(path, opts);
  } catch (error) {
    const isAuthFailure = error instanceof ApiError && error.statusCode === 401;
    if (!isAuthFailure || opts.skipAuth || opts.skipRefresh) throw error;

    try {
      await refreshAccessToken();
    } catch (refreshError) {
      await forceLogout();
      throw refreshError;
    }
    try {
      return await rawFetch<T>(path, opts);
    } catch (retryError) {
      if (isSessionRevoked(retryError)) await forceLogout();
      throw retryError;
    }
  }
}

/**
 * Upload multipart avec suivi de progression (XMLHttpRequest — fetch ne rapporte pas
 * la progression d'upload sur React Native). Utilisé par le module photos (M4).
 */
export function apiUpload<T>(
  path: string,
  formData: FormData,
  onProgress?: (fraction: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${env.apiBaseUrl}${path}`);
    const token = useSessionStore.getState().accessToken;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
    };
    xhr.onerror = () => reject(new NetworkError());
    xhr.onload = () => {
      let payload: unknown;
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : undefined;
      } catch {
        payload = undefined;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as T);
      } else {
        reject(new ApiError(xhr.status, (payload as Record<string, unknown>) ?? {}));
      }
    };
    xhr.send(formData);
  });
}
