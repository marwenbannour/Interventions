import type { AgentReportRow } from '../types';

function fmtPct(n: number | null): string {
  return n == null ? '—' : `${n}%`;
}
function fmtMin(n: number | null): string {
  return n == null ? '—' : `${n} min`;
}

export function AgentsPerformanceTable({ rows }: { rows: AgentReportRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-2 font-medium">Agent</th>
            <th className="px-4 py-2 font-medium text-right">Affectées</th>
            <th className="px-4 py-2 font-medium text-right">Terminées</th>
            <th className="px-4 py-2 font-medium text-right">Ponctualité</th>
            <th className="px-4 py-2 font-medium text-right">Intervention moy.</th>
            <th className="px-4 py-2 font-medium text-right">Trajet moy.</th>
            <th className="px-4 py-2 font-medium text-right">Note</th>
            <th className="px-4 py-2 font-medium text-right">SLA dépassés</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.agentId} className="border-b border-border last:border-0">
              <td className="px-4 py-2 font-medium text-foreground">{r.name}</td>
              <td className="px-4 py-2 text-right tabular-nums">{r.assigned}</td>
              <td className="px-4 py-2 text-right tabular-nums">{r.completed}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtPct(r.punctualityRate)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtMin(r.avgInterventionMin)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtMin(r.avgTravelMin)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{r.avgRating != null ? `${r.avgRating} ★` : '—'}</td>
              <td className="px-4 py-2 text-right tabular-nums text-destructive">{r.slaBreached || '—'}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                Aucune donnée sur la période.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
