import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assetsApi } from '../api/assets.api';
import type { AssetQuery, CreateAssetInput, UpdateAssetInput } from '../types';

export function useAssets(query: AssetQuery, enabled = true) {
  return useQuery({ queryKey: ['assets', query], queryFn: () => assetsApi.list(query), enabled });
}

export function useAssetHistory(id: string | null) {
  return useQuery({ queryKey: ['asset-history', id], queryFn: () => assetsApi.history(id as string), enabled: !!id });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssetInput) => assetsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

export function useUpdateAsset(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAssetInput) => assetsApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['asset-history', id] });
    },
  });
}
