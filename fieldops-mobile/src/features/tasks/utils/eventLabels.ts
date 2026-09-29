import { photoTypeLabel, statusLabel } from './statusLabels';
import type { TaskEvent } from '../../../lib/api/types';

/** Résumé lisible d'un TaskEvent (historique complet, GET /tasks/:id/history). */
export function eventSummary(event: TaskEvent): string {
  switch (event.type) {
    case 'CREATED':
      return 'Intervention créée';
    case 'TRANSITION':
      if (event.data?.assetScanned) {
        return `${statusLabel(event.fromStatus ?? '')} → ${statusLabel(event.toStatus ?? '')} (équipement ${String(event.data.assetScanned)} vérifié)`;
      }
      return event.fromStatus && event.toStatus
        ? `${statusLabel(event.fromStatus)} → ${statusLabel(event.toStatus)}`
        : event.toStatus
          ? `Passage à « ${statusLabel(event.toStatus)} »`
          : 'Changement de statut';
    case 'ASSIGNED':
      return event.data?.auto ? 'Affectée automatiquement' : 'Affectée à un agent';
    case 'UNASSIGNED':
      return 'Désaffectée';
    case 'CHECKLIST':
      return 'Checklist mise à jour';
    case 'NOTE':
      return event.comment ?? 'Note ajoutée';
    case 'PHOTO': {
      // Le backend écrit `photoType` (photos.service.ts) ; `type` conservé pour compatibilité.
      const type = event.data?.photoType ?? event.data?.type;
      return typeof type === 'string' ? `Photo « ${photoTypeLabel(type)} » ajoutée` : 'Photo ajoutée';
    }
    case 'PHOTO_VALIDATED':
      return 'Photo validée';
    case 'PHOTO_REJECTED':
      return 'Photo rejetée';
    case 'SLA_BREACH':
      return 'Dépassement de délai SLA';
    case 'REPORT_GENERATED':
      return "Rapport d'intervention généré";
    default:
      return event.type;
  }
}
