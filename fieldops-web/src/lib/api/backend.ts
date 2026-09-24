export const REFRESH_COOKIE = 'fo_refresh';

/** URL de l'API NestJS, côté serveur (route handlers Next.js uniquement). */
export function backendUrl(path: string): string {
  const base = process.env.BACKEND_API_URL ?? 'http://localhost:3000/api/v1';
  return `${base}${path}`;
}

export async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(backendUrl(path), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
}
