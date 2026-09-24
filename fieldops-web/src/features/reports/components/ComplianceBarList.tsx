import { AlertCircle, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { complianceStatus, STATUS_COLORS, STATUS_LABEL, type StatusLevel } from '../utils/status';

const STATUS_ICON: Record<StatusLevel, typeof CheckCircle2> = {
  good: CheckCircle2,
  warning: AlertTriangle,
  serious: AlertCircle,
  critical: XCircle,
};

export interface ComplianceRow {
  key: string;
  label: string;
  rate: number | null;
  total: number;
}

export function ComplianceBarList({ title, rows }: { title: string; rows: ComplianceRow[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const status = complianceStatus(row.rate);
          const Icon = STATUS_ICON[status];
          const color = STATUS_COLORS[status];
          const width = row.rate ?? 0;
          return (
            <div key={row.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <Icon className="size-3.5" style={{ color }} aria-hidden />
                  {row.label}
                  <span className="text-muted-foreground">({row.total})</span>
                </span>
                <span className="tabular-nums font-semibold" style={{ color }}>
                  {row.rate != null ? `${row.rate}%` : '—'}
                  <span className="ml-1 font-normal text-muted-foreground">{STATUS_LABEL[status]}</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${Math.max(width, 2)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée sur la période.</p>}
      </div>
    </div>
  );
}
