'use client';

import { FileDown, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/errors';
import { tasksApi } from '../api/tasks.api';
import { useGenerateReport } from '../hooks/useTaskActions';
import type { TaskDetail } from '../types';

/** V3 — rapport d'intervention PDF (généré à la clôture) : téléchargement, empreinte, régénération. */
export function ReportSection({ task, canRegenerate }: { task: TaskDetail; canRegenerate: boolean }) {
  const [opening, setOpening] = useState(false);
  const regen = useGenerateReport(task.id);
  const closed = ['COMPLETED', 'EVALUATED'].includes(task.status);
  if (!task.hasReport && !closed) return null;

  const open = async () => {
    setOpening(true);
    try {
      const link = await tasksApi.report(task.id);
      window.open(link.url, '_blank', 'noopener');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Rapport indisponible.');
    } finally {
      setOpening(false);
    }
  };
  const regenerate = async () => {
    try {
      await regen.mutateAsync();
      toast.success('Rapport régénéré.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Régénération impossible.');
    }
  };

  return (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-1 text-sm font-semibold text-foreground">Rapport d&apos;intervention</p>
      {task.hasReport ? (
        <p className="mb-2 break-all text-xs text-muted-foreground">
          Généré le {task.reportGeneratedAt ? new Date(task.reportGeneratedAt).toLocaleString('fr-FR') : '—'} · SHA-256{' '}
          <span className="font-mono">{task.reportSha256?.slice(0, 16)}…</span>
        </p>
      ) : (
        <p className="mb-2 text-xs text-muted-foreground">Génération en cours après la clôture…</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={open} disabled={!task.hasReport || opening}>
          {opening ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
          Télécharger le PDF
        </Button>
        {canRegenerate && (
          <Button size="sm" variant="outline" onClick={regenerate} disabled={regen.isPending}>
            {regen.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Régénérer
          </Button>
        )}
      </div>
    </div>
  );
}
