'use client';

import { ArrowLeft, Loader2, Star } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTaskDetail, useTaskPhotos } from '@/features/dispatch/hooks/useTaskDetail';
import { photoTypeLabel, priorityBadgeVariant, priorityLabel, statusLabel } from '@/features/dispatch/utils/labels';
import { useEvaluations } from '@/features/quality/hooks/useEvaluations';
import { EvaluateDialog } from './EvaluateDialog';

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export function ClientTaskDetail({ taskId }: { taskId: string }) {
  const { data: task, isLoading } = useTaskDetail(taskId);
  const { data: photos } = useTaskPhotos(taskId);
  const { data: evaluationsPage } = useEvaluations({ taskId });
  const [evaluateOpen, setEvaluateOpen] = useState(false);

  const evaluation = evaluationsPage?.data[0];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (!task) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Intervention introuvable.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/client" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Mes interventions
      </Link>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">{task.reference}</span>
          <Badge variant={priorityBadgeVariant(task.priority)} className="text-[10px]">
            {priorityLabel(task.priority)}
          </Badge>
        </div>
        <h1 className="mt-1 text-lg font-bold text-foreground">{task.title}</h1>
        {task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}

        <div className="mt-3 border-t border-border pt-3">
          <InfoRow label="Statut" value={statusLabel(task.status)} />
          <InfoRow label="Site" value={task.site?.name ?? '—'} />
          <InfoRow label="Adresse" value={task.site?.address ?? '—'} />
          <InfoRow label="Planifiée" value={formatDateTime(task.scheduledStart)} />
          {task.completionNotes && <InfoRow label="Notes de clôture" value={task.completionNotes} />}
        </div>
      </div>

      {photos && photos.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Photos</p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <a key={photo.id} href={photo.url ?? undefined} target="_blank" rel="noreferrer" className="group relative">
                {photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.url} alt={photoTypeLabel(photo.type)} className="aspect-square w-full rounded-lg object-cover" />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                    Indisponible
                  </div>
                )}
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {photoTypeLabel(photo.type)}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {task.status === 'COMPLETED' && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
          <p className="mb-3 text-sm text-foreground">Votre intervention est terminée. Donnez-nous votre avis !</p>
          <Button onClick={() => setEvaluateOpen(true)}>Évaluer l&apos;intervention</Button>
        </div>
      )}

      {evaluation && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">Votre évaluation</p>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className={`size-4 ${i < evaluation.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
            ))}
          </div>
          {evaluation.comment && <p className="mt-2 text-sm text-muted-foreground">{evaluation.comment}</p>}
        </div>
      )}

      <EvaluateDialog taskId={task.id} open={evaluateOpen} onOpenChange={setEvaluateOpen} />
    </div>
  );
}
