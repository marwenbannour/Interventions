import { useQuery } from '@tanstack/react-query';
import { organizationApi } from '../api/organization.api';

export function useZones() {
  return useQuery({ queryKey: ['zones'], queryFn: organizationApi.zones, staleTime: 5 * 60_000 });
}

export function useTeams() {
  return useQuery({ queryKey: ['teams'], queryFn: organizationApi.teams, staleTime: 5 * 60_000 });
}
