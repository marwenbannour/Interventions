import { apiFetch } from '../../../lib/api/client';
import type { LocationBatchRequest, LocationBatchResponse } from '../../../lib/api/types';

export const locationApi = {
  sendBatch: (body: LocationBatchRequest) =>
    apiFetch<LocationBatchResponse>('/agents/me/location', { method: 'POST', body }),
};
