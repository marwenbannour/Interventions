import { headers } from 'next/headers';

export const REFRESH_COOKIE = 'fo_refresh';

/** URL de l'API NestJS, côté serveur (route handlers Next.js uniquement). */
export function backendUrl(path: string): string {
  const base = process.env.BACKEND_API_URL ?? 'http://localhost:3000/api/v1';
  return `${base}${path}`;
}

export async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  // Transmet l'IP du visiteur : sans elle, l'API voit tous les utilisateurs de la console derrière
  // l'IP de ce serveur et leur applique une seule limite de débit commune (login / refresh).
  const forwardedFor = (await headers()).get('x-forwarded-for');
  return fetch(backendUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
}
