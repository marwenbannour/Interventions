export interface ReportPeriod {
  from: string;
  to: string;
}

export interface DashboardReport {
  period: ReportPeriod;
  tasks: {
    total: number;
    completed: number;
    cancelled: number;
    completionRate: number | null;
    slaBreached: number;
    slaComplianceRate: number | null;
    avgInterventionMin: number | null;
    avgArrivalMin: number | null;
    byStatus: { status: string; count: number }[];
  };
  today?: { scheduled: number; open: number; unassigned: number };
  agents?: { active: number; onDuty: number };
  satisfaction: { avgRating: number | null; evaluations: number };
}

export interface SlaMetric {
  measured: number;
  breached: number;
  complianceRate: number | null;
}

export interface SlaBreakdown {
  ack: SlaMetric;
  arrival: SlaMetric;
  intervention: SlaMetric;
  close: SlaMetric;
}

export interface SlaReport {
  period: ReportPeriod;
  global: { total: number } & SlaBreakdown;
  byClient: ({ clientId: string; clientName: string; total: number } & SlaBreakdown)[];
  byPriority: ({ priority: string; total: number } & SlaBreakdown)[];
}

export interface AgentReportRow {
  agentId: string;
  name: string;
  assigned: number;
  completed: number;
  punctualityRate: number | null;
  avgInterventionMin: number | null;
  avgTravelMin: number | null;
  avgRating: number | null;
  evaluations: number;
  slaBreached: number;
}

export interface AgentsReport {
  period: ReportPeriod;
  agents: AgentReportRow[];
}

export interface SiteReportRow {
  siteId: string;
  siteName: string;
  clientName: string;
  total: number;
  completed: number;
  slaBreached: number;
  avgRating: number | null;
}

export interface SitesReport {
  period: ReportPeriod;
  sites: SiteReportRow[];
}

export interface ReportQuery {
  from?: string;
  to?: string;
  clientId?: string;
  siteId?: string;
}
