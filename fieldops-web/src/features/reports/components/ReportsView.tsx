'use client';

import { AlertTriangle, CalendarClock, CheckCircle2, Download, Loader2, Star, TimerReset, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAgentsReport, useDashboardReport, useSitesReport, useSlaReport } from '../hooks/useReports';
import { useExportCsv } from '../hooks/useExportCsv';
import type { ReportQuery } from '../types';
import { priorityLabel } from '@/features/dispatch/utils/labels';
import { AgentsPerformanceTable } from './AgentsPerformanceTable';
import { ComplianceBarList } from './ComplianceBarList';
import { ReportFilters } from './ReportFilters';
import { SitesPerformanceTable } from './SitesPerformanceTable';
import { StatTile } from './StatTile';

function defaultQuery(): ReportQuery {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function ReportsView() {
  const [query, setQuery] = useState<ReportQuery>(defaultQuery);
  const { data: dashboard, isLoading: dashboardLoading } = useDashboardReport(query);
  const { data: sla, isLoading: slaLoading } = useSlaReport(query);
  const { data: agentsReport, isLoading: agentsLoading } = useAgentsReport(query);
  const { data: sitesReport, isLoading: sitesLoading } = useSitesReport(query);
  const { exportCsv, pending } = useExportCsv();

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Reporting</h1>
        <p className="text-sm text-muted-foreground">KPI, conformité SLA et performance agents/sites.</p>
      </div>

      <ReportFilters query={query} onChange={setQuery} />

      {dashboardLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : dashboard ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <StatTile label="Interventions" value={dashboard.tasks.total} icon={CalendarClock} />
          <StatTile
            label="Taux de complétion"
            value={dashboard.tasks.completionRate ?? '—'}
            suffix={dashboard.tasks.completionRate != null ? '%' : undefined}
            icon={CheckCircle2}
          />
          <StatTile
            label="Conformité SLA"
            value={dashboard.tasks.slaComplianceRate ?? '—'}
            suffix={dashboard.tasks.slaComplianceRate != null ? '%' : undefined}
            icon={AlertTriangle}
          />
          <StatTile
            label="Intervention moy."
            value={dashboard.tasks.avgInterventionMin ?? '—'}
            suffix={dashboard.tasks.avgInterventionMin != null ? 'min' : undefined}
            icon={TimerReset}
          />
          <StatTile
            label="Arrivée moy."
            value={dashboard.tasks.avgArrivalMin ?? '—'}
            suffix={dashboard.tasks.avgArrivalMin != null ? 'min' : undefined}
            icon={TimerReset}
          />
          <StatTile
            label="Satisfaction"
            value={dashboard.satisfaction.avgRating ?? '—'}
            suffix={dashboard.satisfaction.avgRating != null ? `★ (${dashboard.satisfaction.evaluations})` : undefined}
            icon={Star}
          />
          {dashboard.agents && <StatTile label="Agents en service" value={`${dashboard.agents.onDuty}/${dashboard.agents.active}`} icon={Users} />}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Conformité SLA</p>
        <Button variant="outline" size="sm" onClick={() => exportCsv('sla', query)} disabled={pending === 'sla'}>
          {pending === 'sla' ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          Exporter CSV
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {slaLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground lg:col-span-2">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : sla ? (
          <>
            <ComplianceBarList
              title="Conformité SLA par client"
              rows={sla.byClient.map((c) => ({
                key: c.clientId,
                label: c.clientName,
                rate: c.arrival.complianceRate,
                total: c.total,
              }))}
            />
            <ComplianceBarList
              title="Conformité SLA par priorité"
              rows={sla.byPriority.map((p) => ({
                key: p.priority,
                label: priorityLabel(p.priority),
                rate: p.arrival.complianceRate,
                total: p.total,
              }))}
            />
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Performance agents</p>
          <Button variant="outline" size="sm" onClick={() => exportCsv('agents', query)} disabled={pending === 'agents'}>
            {pending === 'agents' ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Exporter CSV
          </Button>
        </div>
        {agentsLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <AgentsPerformanceTable rows={agentsReport?.agents ?? []} />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Performance sites</p>
          <Button variant="outline" size="sm" onClick={() => exportCsv('sites', query)} disabled={pending === 'sites'}>
            {pending === 'sites' ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Exporter CSV
          </Button>
        </div>
        {sitesLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <SitesPerformanceTable rows={sitesReport?.sites ?? []} />
        )}
      </div>
    </div>
  );
}
