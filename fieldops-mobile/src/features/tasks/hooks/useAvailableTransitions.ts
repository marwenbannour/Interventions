import { useEffect, useState } from 'react';
import { getWorkflow } from '../../sync/db/workflowRepository';
import { computeAvailableTransitions } from '../../sync/engine/workflowEngine';
import { useSessionStore } from '../../auth/store/session.store';
import { observePhotosForTask } from '../../photos/db/photoQueueRepository';
import type { Task as TaskModel } from '../db/models/Task';
import type { PhotoQueueItem } from '../../photos/db/models/PhotoQueueItem';
import type { AvailableTransition, PhotoCounts, WorkflowDefinitionData } from '../../../lib/api/types';

/**
 * Recalcule les transitions possibles localement (workflowEngine.ts) à chaque changement
 * de tâche ou de photo en file. Le workflow change rarement après le pull initial — chargé
 * une fois par workflowId plutôt que ré-observé en continu (simplification acceptée pour ce jalon).
 */
export function useAvailableTransitions(task: TaskModel | undefined): AvailableTransition[] {
  const agentUserId = useSessionStore((s) => s.user?.id);
  const [definition, setDefinition] = useState<WorkflowDefinitionData | null>(null);
  const [localPhotos, setLocalPhotos] = useState<PhotoQueueItem[]>([]);
  const workflowId = task?.workflowId;
  const taskServerId = task?.serverId;

  useEffect(() => {
    if (!workflowId) return;
    let cancelled = false;
    getWorkflow(workflowId).then((w) => {
      if (!cancelled) setDefinition(w?.definition ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [workflowId]);

  useEffect(() => {
    if (!taskServerId) return;
    const subscription = observePhotosForTask(taskServerId).subscribe(setLocalPhotos);
    return () => subscription.unsubscribe();
  }, [taskServerId]);

  if (!task || !definition || !agentUserId) return [];

  // Fusion avec les photos/signature en file locale (pas encore reflétées dans task.photoCounts
  // tant qu'un pull ne les a pas confirmées) — MAX plutôt que somme pour éviter un double
  // comptage une fois que le serveur les a effectivement prises en compte.
  const localCountByType = new Map<string, number>();
  let hasLocalSignature = false;
  for (const photo of localPhotos) {
    if (photo.type === 'SIGNATURE') {
      hasLocalSignature = true;
      continue;
    }
    localCountByType.set(photo.type, (localCountByType.get(photo.type) ?? 0) + 1);
  }
  const mergedPhotoCounts: PhotoCounts = { ...task.photoCounts };
  for (const [type, count] of localCountByType) {
    const key = type as keyof PhotoCounts;
    const existing = mergedPhotoCounts[key] ?? { total: 0, validated: 0 };
    mergedPhotoCounts[key] = { total: Math.max(existing.total, count), validated: existing.validated };
  }

  return computeAvailableTransitions(
    definition,
    {
      status: task.status,
      agentId: task.agentId,
      checklist: task.checklist,
      signatureKey: task.signatureKey ?? (hasLocalSignature ? 'local-pending' : null),
    },
    agentUserId,
    mergedPhotoCounts,
  );
}
