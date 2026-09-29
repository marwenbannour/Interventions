import type { AssetSnapshot, TaskOrigin, TaskStatus } from '../dispatch/types';
import type { Client, Site } from '../clients/types';

export type AssetStatus = AssetSnapshot['status'];

export interface Asset extends AssetSnapshot {
  organizationId: string;
  clientId: string;
  siteId: string;
  client?: Client;
  site?: Site;
  installedAt?: string | null;
  warrantyUntil?: string | null;
  notes?: string | null;
  attributes: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface AssetQuery {
  clientId?: string;
  siteId?: string;
  category?: string;
  status?: AssetStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateAssetInput {
  siteId: string;
  name: string;
  code?: string;
  category?: string;
  location?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  installedAt?: string;
  warrantyUntil?: string;
  notes?: string;
}

export type UpdateAssetInput = Partial<Omit<CreateAssetInput, 'siteId' | 'code'>> & { status?: AssetStatus };

export interface AssetHistory {
  asset: Asset;
  stats: {
    total: number;
    completed: number;
    corrective: number;
    preventive: number;
    reworks: number;
    lastInterventionAt: string | null;
    mtbfDays: number | null;
  };
  tasks: {
    id: string;
    reference: string;
    title: string;
    type: string;
    status: TaskStatus;
    origin: TaskOrigin;
    priority: string;
    isRework: boolean;
    createdAt: string;
    completedAt: string | null;
    agent: { id: string; firstName: string; lastName: string } | null;
  }[];
}
