import type { AssetStatus } from '../types';

export const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
  ACTIVE: 'En service',
  OUT_OF_SERVICE: 'Hors service',
  RETIRED: 'Retiré du parc',
};

export const assetStatusVariant = (s: AssetStatus): 'secondary' | 'destructive' | 'outline' =>
  s === 'ACTIVE' ? 'secondary' : s === 'OUT_OF_SERVICE' ? 'destructive' : 'outline';
