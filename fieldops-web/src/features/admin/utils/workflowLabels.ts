import type { WorkflowAction, WorkflowCondition } from '../types';

export function conditionLabel(c: WorkflowCondition): string {
  switch (c.type) {
    case 'PHOTO_REQUIRED':
      return `Photo requise (${c.photoType}${c.minCount ? ` ×${c.minCount}` : ''}${c.validatedOnly ? ', validée' : ''})`;
    case 'AGENT_ASSIGNED':
      return 'Agent affecté';
    case 'IS_ASSIGNED_AGENT':
      return "Doit être l'agent affecté";
    case 'CHECKLIST_COMPLETE':
      return 'Checklist complète';
    case 'COMMENT_REQUIRED':
      return 'Commentaire requis';
    case 'GEOFENCE':
      return `Dans la géofence${c.radiusMeters ? ` (${c.radiusMeters} m)` : ''}`;
    case 'SIGNATURE_REQUIRED':
      return 'Signature requise';
    default:
      return (c as { type: string }).type;
  }
}

export function actionLabel(a: WorkflowAction): string {
  switch (a.type) {
    case 'NOTIFY':
      return `Notifier : ${a.targets.join(', ')} — "${a.title}"`;
    case 'REQUEST_EVALUATION':
      return 'Demander une évaluation client';
    case 'UNASSIGN_AGENT':
      return "Désaffecter l'agent";
    default:
      return (a as { type: string }).type;
  }
}
