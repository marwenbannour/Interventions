import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationAdminApi } from '../api/organization.api';
import type { CreateTeamInput, CreateZoneInput, Organization, UpdateTeamInput, UpdateZoneInput } from '../types';

export function useOrganization() {
  return useQuery({ queryKey: ['admin-organization'], queryFn: organizationAdminApi.get });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; settings?: Organization['settings'] }) => organizationAdminApi.update(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-organization'] }),
  });
}

export function useZonesAdmin() {
  return useQuery({ queryKey: ['admin-zones'], queryFn: organizationAdminApi.zones });
}

export function useTeamsAdmin() {
  return useQuery({ queryKey: ['admin-teams'], queryFn: organizationAdminApi.teams });
}

export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateZoneInput) => organizationAdminApi.createZone(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-zones'] });
      qc.invalidateQueries({ queryKey: ['zones'] });
    },
  });
}

export function useUpdateZone(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateZoneInput) => organizationAdminApi.updateZone(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-zones'] });
      qc.invalidateQueries({ queryKey: ['zones'] });
    },
  });
}

export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organizationAdminApi.deleteZone(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-zones'] });
      qc.invalidateQueries({ queryKey: ['zones'] });
    },
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTeamInput) => organizationAdminApi.createTeam(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-teams'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useUpdateTeam(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTeamInput) => organizationAdminApi.updateTeam(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-teams'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organizationAdminApi.deleteTeam(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-teams'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}
