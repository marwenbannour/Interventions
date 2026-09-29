import { apiFetch, apiFetchBlob } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import type { Asset, AssetHistory, AssetQuery, CreateAssetInput, UpdateAssetInput } from '../types';

function qs(query: AssetQuery): string {
  const p = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => v !== undefined && v !== '' && p.set(k, String(v)));
  return p.toString();
}

export const assetsApi = {
  list: (query: AssetQuery = {}) => apiFetch<Paginated<Asset>>(`/assets?${qs({ limit: 200, ...query })}`),
  get: (id: string) => apiFetch<Asset>(`/assets/${id}`),
  history: (id: string) => apiFetch<AssetHistory>(`/assets/${id}/history`),
  create: (input: CreateAssetInput) => apiFetch<Asset>('/assets', { method: 'POST', body: input }),
  update: (id: string, input: UpdateAssetInput) => apiFetch<Asset>(`/assets/${id}`, { method: 'PATCH', body: input }),
  /** Étiquette QR (PNG) — requête authentifiée, convertie en blob. */
  qrPng: (id: string) => apiFetchBlob(`/assets/${id}/qr.png`),
};
