import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi } from '../api/maintenance.api';
import type { MaintenancePlanInput, UpdateMaintenancePlanInput } from '../types';

const KEY = ['maintenance-plans'] as const;

export function useMaintenancePlans() {
  return useQuery({ queryKey: KEY, queryFn: maintenanceApi.list });
}

export function usePlanPreview(id: string | null) {
  return useQuery({ queryKey: ['maintenance-preview', id], queryFn: () => maintenanceApi.preview(id as string), enabled: !!id });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MaintenancePlanInput) => maintenanceApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdatePlan(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMaintenancePlanInput) => maintenanceApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['maintenance-preview', id] });
    },
  });
}

export function useGeneratePlan(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => maintenanceApi.generate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['maintenance-preview', id] });
      qc.invalidateQueries({ queryKey: ['planning'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
