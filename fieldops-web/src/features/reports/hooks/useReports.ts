import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/reports.api';
import type { ReportQuery } from '../types';

export function useDashboardReport(query: ReportQuery) {
  return useQuery({ queryKey: ['reports', 'dashboard', query], queryFn: () => reportsApi.dashboard(query) });
}

export function useSlaReport(query: ReportQuery) {
  return useQuery({ queryKey: ['reports', 'sla', query], queryFn: () => reportsApi.sla(query) });
}

export function useAgentsReport(query: ReportQuery) {
  return useQuery({ queryKey: ['reports', 'agents', query], queryFn: () => reportsApi.agents(query) });
}

export function useSitesReport(query: ReportQuery) {
  return useQuery({ queryKey: ['reports', 'sites', query], queryFn: () => reportsApi.sites(query) });
}
