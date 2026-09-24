import { apiFetch, apiFetchBlob } from '@/lib/api/client';
import type { AgentsReport, DashboardReport, ReportQuery, SitesReport, SlaReport } from '../types';

function toQueryString(query: ReportQuery, format?: 'csv'): string {
  const search = new URLSearchParams();
  if (query.from) search.set('from', query.from);
  if (query.to) search.set('to', query.to);
  if (query.clientId) search.set('clientId', query.clientId);
  if (query.siteId) search.set('siteId', query.siteId);
  if (format) search.set('format', format);
  return search.toString();
}

export const reportsApi = {
  dashboard: (query: ReportQuery) => apiFetch<DashboardReport>(`/reports/dashboard?${toQueryString(query)}`),
  sla: (query: ReportQuery) => apiFetch<SlaReport>(`/reports/sla?${toQueryString(query)}`),
  agents: (query: ReportQuery) => apiFetch<AgentsReport>(`/reports/agents?${toQueryString(query)}`),
  sites: (query: ReportQuery) => apiFetch<SitesReport>(`/reports/sites?${toQueryString(query)}`),
  exportCsv: (report: 'sla' | 'agents' | 'sites', query: ReportQuery) =>
    apiFetchBlob(`/reports/${report}?${toQueryString(query, 'csv')}`),
};
