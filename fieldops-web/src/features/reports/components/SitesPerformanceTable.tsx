import type { SiteReportRow } from '../types';

export function SitesPerformanceTable({ rows }: { rows: SiteReportRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-2 font-medium">Site</th>
            <th className="px-4 py-2 font-medium">Client</th>
            <th className="px-4 py-2 font-medium text-right">Total</th>
            <th className="px-4 py-2 font-medium text-right">Terminées</th>
            <th className="px-4 py-2 font-medium text-right">SLA dépassés</th>
            <th className="px-4 py-2 font-medium text-right">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.siteId} className="border-b border-border last:border-0">
              <td className="px-4 py-2 font-medium text-foreground">{r.siteName}</td>
              <td className="px-4 py-2 text-muted-foreground">{r.clientName}</td>
              <td className="px-4 py-2 text-right tabular-nums">{r.total}</td>
              <td className="px-4 py-2 text-right tabular-nums">{r.completed}</td>
              <td className="px-4 py-2 text-right tabular-nums text-destructive">{r.slaBreached || '—'}</td>
              <td className="px-4 py-2 text-right tabular-nums">{r.avgRating != null ? `${r.avgRating} ★` : '—'}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                Aucune donnée sur la période.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
