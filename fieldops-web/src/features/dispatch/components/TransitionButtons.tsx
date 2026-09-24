'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api/errors';
import type { AvailableTransition } from '../types';
import { useTransitionTask } from '../hooks/useTaskActions';

export function TransitionButtons({ taskId, transitions }: { taskId: string; transitions: AvailableTransition[] }) {
  const transition = useTransitionTask(taskId);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  if (transitions.length === 0) return null;

  const run = async (t: AvailableTransition) => {
    try {
      await transition.mutateAsync({ to: t.to, comment: comment.trim() || undefined });
      toast.success(`Intervention passée à « ${t.label} ».`);
      setExpanded(null);
      setComment('');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Transition impossible.');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {transitions.map((t) => {
        const hasMissing = t.missing.length > 0;
        const isExpanded = expanded === t.to;
        return (
          <div key={t.to} className="flex flex-col gap-2">
            <Button
              variant={hasMissing ? 'outline' : 'default'}
              disabled={hasMissing || transition.isPending}
              onClick={() => (t.requiresComment ? setExpanded(isExpanded ? null : t.to) : run(t))}
            >
              {transition.isPending && expanded === null ? <Loader2 className="size-4 animate-spin" /> : t.label}
            </Button>
            {hasMissing && (
              <p className="text-xs text-muted-foreground">Conditions manquantes : {t.missing.join(', ')}</p>
            )}
            {isExpanded && (
              <div className="flex flex-col gap-2 rounded-lg border border-border p-2">
                <Textarea
                  placeholder="Commentaire (requis)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setExpanded(null)}>
                    Annuler
                  </Button>
                  <Button size="sm" disabled={!comment.trim() || transition.isPending} onClick={() => run(t)}>
                    {transition.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Confirmer'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
