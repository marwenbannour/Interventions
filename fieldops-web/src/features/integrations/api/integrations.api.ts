import { apiFetch } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import type { ApiKey, IntegrationsCatalog, WebhookDelivery, WebhookEndpoint } from '../types';

export const integrationsApi = {
  catalog: () => apiFetch<IntegrationsCatalog>('/integrations/catalog'),
  webhooks: () => apiFetch<WebhookEndpoint[]>('/integrations/webhooks'),
  createWebhook: (input: { name: string; url: string; events: string[] }) =>
    apiFetch<WebhookEndpoint & { secret: string }>('/integrations/webhooks', { method: 'POST', body: input }),
  updateWebhook: (id: string, input: Partial<{ name: string; url: string; events: string[]; isActive: boolean }>) =>
    apiFetch<WebhookEndpoint>(`/integrations/webhooks/${id}`, { method: 'PATCH', body: input }),
  deleteWebhook: (id: string) => apiFetch<void>(`/integrations/webhooks/${id}`, { method: 'DELETE' }),
  rotateSecret: (id: string) => apiFetch<{ id: string; secret: string }>(`/integrations/webhooks/${id}/rotate-secret`, { method: 'POST' }),
  test: (id: string) => apiFetch<{ deliveryId: string }>(`/integrations/webhooks/${id}/test`, { method: 'POST' }),
  deliveries: (id: string) => apiFetch<Paginated<WebhookDelivery>>(`/integrations/webhooks/${id}/deliveries?limit=50`),
  redeliver: (deliveryId: string) => apiFetch<unknown>(`/integrations/deliveries/${deliveryId}/redeliver`, { method: 'POST' }),
  apiKeys: () => apiFetch<ApiKey[]>('/integrations/api-keys'),
  createApiKey: (input: { name: string; role: ApiKey['role']; scopes: string[]; expiresAt?: string }) =>
    apiFetch<ApiKey & { key: string }>('/integrations/api-keys', { method: 'POST', body: input }),
  revokeApiKey: (id: string) => apiFetch<ApiKey>(`/integrations/api-keys/${id}`, { method: 'DELETE' }),
};
