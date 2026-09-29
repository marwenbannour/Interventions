export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  consecutiveFailures: number;
  lastDeliveryAt: string | null;
  lastStatusCode: number | null;
  disabledReason: string | null;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  event: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  attempts: number;
  responseStatus: number | null;
  responseBody: string | null;
  error: string | null;
  durationMs: number | null;
  createdAt: string;
  deliveredAt: string | null;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  role: 'SUPERVISOR' | 'DIRECTION';
  scopes: string[];
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  createdAt: string;
}

export interface IntegrationsCatalog {
  events: string[];
  scopes: Record<'SUPERVISOR' | 'DIRECTION', string[]>;
  signature: { header: string; format: string; toleranceSec: number };
}
