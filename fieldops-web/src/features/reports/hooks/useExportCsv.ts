import { useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/errors';
import { reportsApi } from '../api/reports.api';
import type { ReportQuery } from '../types';

/** Déclenche un téléchargement client-side (blob) — l'export CSV exige le Bearer token, pas un simple <a href>. */
export function useExportCsv() {
  const [pending, setPending] = useState<string | null>(null);

  const exportCsv = async (report: 'sla' | 'agents' | 'sites', query: ReportQuery) => {
    setPending(report);
    try {
      const blob = await reportsApi.exportCsv(report, query);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-${report}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Export impossible.');
    } finally {
      setPending(null);
    }
  };

  return { exportCsv, pending };
}
