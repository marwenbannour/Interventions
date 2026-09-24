'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSessionStore } from '@/features/auth/store/session.store';
import { ApiError } from '@/lib/api/errors';
import { canAssignTasks } from '@/lib/auth/permissions';
import { useTaskDetail, useTaskHistory } from '../hooks/useTaskDetail';
import { useUnassignTask } from '../hooks/useTaskActions';
import { eventSummary, priorityBadgeVariant, priorityLabel, statusLabel } from '../utils/labels';
import { AssignAgentDialog } from './AssignAgentDialog';
import { NoteForm } from './NoteForm';
import { PhotosReviewSection } from './PhotosReviewSection';
import { TransitionButtons } from './TransitionButtons';

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

export function TaskDetailPanel({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const { data: task, isLoading } = useTaskDetail(taskId);
  const { data: events } = useTaskHistory(taskId);
  const role = useSessionStore((s) => s.user?.role);
  const unassign = useUnassignTask(taskId ?? '');
  const [assignOpen, setAssignOpen] = useState(false);

  const sortedEvents = [...(events ?? [])].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  const handleUnassign = async () => {
    try {
      await unassign.mutateAsync();
      toast.success('Intervention désaffectée.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Désaffectation impossible.');
    }
  };

  return (
    <>
    <Sheet open={!!taskId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{task ? task.reference : 'Intervention'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {task && (
            <div className="flex flex-col gap-6">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">{task.title}</h3>
                  <Badge variant={priorityBadgeVariant(task.priority)}>{priorityLabel(task.priority)}</Badge>
                </div>
                {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
              </div>

              <div>
                <InfoRow label="Statut" value={statusLabel(task.status)} />
                <InfoRow label="Type" value={task.type} />
                <InfoRow label="Site" value={task.site?.name ?? '—'} />
                <InfoRow label="Adresse" value={task.site?.address ?? '—'} />
                <InfoRow label="Client" value={task.client?.name ?? '—'} />
                <InfoRow
                  label="Agent"
                  value={task.agent ? `${task.agent.firstName} ${task.agent.lastName}` : 'Non affectée'}
                />
                <InfoRow label="Planifiée" value={formatDateTime(task.scheduledStart)} />
              </div>

              {role && canAssignTasks(role) && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)} className="flex-1">
                    {task.agent ? 'Réaffecter' : 'Affecter'}
                  </Button>
                  {task.agent && (
                    <Button variant="outline" size="sm" onClick={handleUnassign} disabled={unassign.isPending}>
                      {unassign.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Désaffecter'}
                    </Button>
                  )}
                </div>
              )}

              {task.availableTransitions.length > 0 && (
                <TransitionButtons taskId={task.id} transitions={task.availableTransitions} />
              )}

              {task.site?.contactName || task.site?.contactPhone ? (
                <div>
                  <p className="mb-1 text-sm font-semibold text-foreground">Contact sur site</p>
                  {task.site.contactName && <InfoRow label="Nom" value={task.site.contactName} />}
                  {task.site.contactPhone && <InfoRow label="Téléphone" value={task.site.contactPhone} />}
                </div>
              ) : null}

              {task.checklist.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">Checklist</p>
                  <ul className="flex flex-col gap-1.5">
                    {task.checklist.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-sm">
                        <span
                          className={`flex size-4 flex-none items-center justify-center rounded-full text-[10px] ${
                            item.done ? 'bg-primary text-primary-foreground' : 'border border-border'
                          }`}
                        >
                          {item.done && '✓'}
                        </span>
                        <span className={item.done ? 'text-muted-foreground line-through' : 'text-foreground'}>
                          {item.label}
                          {item.required && ' *'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <PhotosReviewSection taskId={task.id} />

              <Separator />

              <NoteForm taskId={task.id} />

              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">Historique</p>
                <ul className="flex flex-col gap-3">
                  {sortedEvents.map((event) => (
                    <li key={event.id} className="border-b border-border pb-2 last:border-0">
                      <p className="text-sm text-foreground">{eventSummary(event)}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.actorName ? `${event.actorName} · ` : ''}
                        {formatDateTime(event.occurredAt)}
                      </p>
                    </li>
                  ))}
                  {sortedEvents.length === 0 && <p className="text-sm text-muted-foreground">Aucun historique</p>}
                </ul>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
    {task && <AssignAgentDialog taskId={task.id} open={assignOpen} onOpenChange={setAssignOpen} />}
    </>
  );
}
