import { Role } from '../../common/enums/role.enum';
import { PhotoType } from '../../common/enums/task.enums';
import { WorkflowDefinitionData } from './workflow.types';

const SUP = [Role.ADMIN, Role.SUPERVISOR];
const AGENT = [Role.AGENT];

/**
 * Workflow standard (§7) :
 * Créée → Planifiée → Assignée → Acceptée → En déplacement → Arrivée sur site →
 * Diagnostic → En intervention → Contrôle → Terminée → Évaluation client.
 */
export const STANDARD_WORKFLOW: WorkflowDefinitionData = {
  initialState: 'CREATED',
  states: [
    { code: 'CREATED', label: 'Créée', color: '#94a3b8' },
    { code: 'PLANNED', label: 'Planifiée', milestone: 'PLANNED', color: '#64748b' },
    { code: 'ASSIGNED', label: 'Assignée', milestone: 'ASSIGNED', agentVisible: true, color: '#3b82f6' },
    { code: 'ACCEPTED', label: 'Acceptée', milestone: 'ACCEPTED', agentVisible: true, color: '#6366f1' },
    { code: 'EN_ROUTE', label: 'En déplacement', milestone: 'EN_ROUTE', agentVisible: true, color: '#8b5cf6' },
    { code: 'ON_SITE', label: 'Arrivée sur site', milestone: 'ARRIVED', agentVisible: true, color: '#a855f7' },
    { code: 'DIAGNOSIS', label: 'Diagnostic', agentVisible: true, color: '#d946ef' },
    { code: 'IN_PROGRESS', label: 'En intervention', milestone: 'STARTED', agentVisible: true, color: '#f59e0b' },
    { code: 'CONTROL', label: 'Contrôle', agentVisible: true, color: '#14b8a6' },
    { code: 'COMPLETED', label: 'Terminée', milestone: 'COMPLETED', agentVisible: true, color: '#22c55e' },
    { code: 'EVALUATED', label: 'Évaluée', milestone: 'EVALUATED', final: true, color: '#16a34a' },
    { code: 'CANCELLED', label: 'Annulée', milestone: 'CANCELLED', final: true, color: '#ef4444' },
  ],
  transitions: [
    { from: 'CREATED', to: 'PLANNED', label: 'Planifier', roles: SUP },
    {
      from: ['CREATED', 'PLANNED'], to: 'ASSIGNED', label: 'Assigner', roles: SUP,
      conditions: [{ type: 'AGENT_ASSIGNED', message: 'Aucun agent affecté' }],
    },
    {
      from: 'ASSIGNED', to: 'ACCEPTED', label: 'Accepter', roles: AGENT,
      conditions: [{ type: 'IS_ASSIGNED_AGENT' }],
      actions: [{ type: 'NOTIFY', targets: ['CLIENT'], title: 'Intervention prise en charge', body: '{reference} — {title} a été prise en charge.', channels: ['IN_APP'] }],
    },
    {
      from: ['ASSIGNED', 'ACCEPTED'], to: 'PLANNED', label: 'Refuser', roles: AGENT,
      conditions: [{ type: 'IS_ASSIGNED_AGENT' }, { type: 'COMMENT_REQUIRED', message: 'Motif du refus obligatoire' }],
      actions: [
        { type: 'UNASSIGN_AGENT' },
        { type: 'NOTIFY', targets: ['SUPERVISORS'], title: 'Intervention refusée', body: "{reference} a été refusée par l'agent — réaffectation nécessaire." },
      ],
    },
    {
      from: 'ACCEPTED', to: 'EN_ROUTE', label: 'Démarrer le déplacement', roles: AGENT,
      conditions: [{ type: 'IS_ASSIGNED_AGENT' }],
      actions: [{ type: 'NOTIFY', targets: ['CLIENT'], title: 'Agent en route', body: "L'agent est en route pour {reference}." }],
    },
    {
      from: 'EN_ROUTE', to: 'ON_SITE', label: 'Arrivé sur site', roles: AGENT,
      conditions: [{ type: 'IS_ASSIGNED_AGENT' }, { type: 'GEOFENCE', message: "Vous n'êtes pas sur le site d'intervention" }],
    },
    { from: 'ON_SITE', to: 'DIAGNOSIS', label: 'Commencer le diagnostic', roles: AGENT, conditions: [{ type: 'IS_ASSIGNED_AGENT' }] },
    {
      from: ['ON_SITE', 'DIAGNOSIS'], to: 'IN_PROGRESS', label: "Démarrer l'intervention", roles: AGENT,
      conditions: [
        { type: 'IS_ASSIGNED_AGENT' },
        { type: 'PHOTO_REQUIRED', photoType: PhotoType.BEFORE, minCount: 1, message: 'Photo « avant » obligatoire' },
      ],
    },
    {
      from: 'IN_PROGRESS', to: 'CONTROL', label: 'Terminer — passer au contrôle', roles: AGENT,
      conditions: [
        { type: 'IS_ASSIGNED_AGENT' },
        { type: 'PHOTO_REQUIRED', photoType: PhotoType.AFTER, minCount: 1, message: 'Photo « après » obligatoire' },
        { type: 'CHECKLIST_COMPLETE', message: 'Checklist incomplète' },
      ],
    },
    {
      from: 'CONTROL', to: 'IN_PROGRESS', label: 'Reprendre (non conforme)', roles: [...SUP, Role.AGENT],
      conditions: [{ type: 'COMMENT_REQUIRED', message: 'Préciser la non-conformité' }],
    },
    {
      from: 'CONTROL', to: 'COMPLETED', label: 'Clôturer', roles: [...SUP, Role.AGENT],
      actions: [
        { type: 'NOTIFY', targets: ['CLIENT'], title: 'Intervention terminée', body: "{reference} est terminée. Donnez-nous votre avis !", channels: ['IN_APP', 'PUSH', 'EMAIL'] },
        { type: 'NOTIFY', targets: ['SUPERVISORS'], title: 'Intervention clôturée', body: '{reference} — {title}', channels: ['IN_APP'] },
        { type: 'REQUEST_EVALUATION' },
      ],
    },
    { from: 'COMPLETED', to: 'EVALUATED', label: 'Évaluer', roles: [Role.CLIENT, ...SUP] },
    {
      from: '*', to: 'CANCELLED', label: 'Annuler', roles: SUP,
      conditions: [{ type: 'COMMENT_REQUIRED', message: "Motif d'annulation obligatoire" }],
      actions: [{ type: 'NOTIFY', targets: ['AGENT', 'CLIENT'], title: 'Intervention annulée', body: '{reference} a été annulée.' }],
    },
  ],
};

/** Variante "Transport de linge" : pas de diagnostic, preuve de livraison + signature. */
export const LINEN_WORKFLOW: WorkflowDefinitionData = {
  initialState: 'CREATED',
  states: STANDARD_WORKFLOW.states.filter((s) => s.code !== 'DIAGNOSIS'),
  transitions: STANDARD_WORKFLOW.transitions
    .filter((t) => t.to !== 'DIAGNOSIS')
    .map((t) => {
      if (t.to === 'IN_PROGRESS' && t.from !== 'CONTROL') {
        return { ...t, from: 'ON_SITE', label: 'Démarrer la livraison / collecte', conditions: [{ type: 'IS_ASSIGNED_AGENT' as const }] };
      }
      if (t.to === 'CONTROL') {
        return {
          ...t,
          label: 'Valider la remise',
          conditions: [
            { type: 'IS_ASSIGNED_AGENT' as const },
            { type: 'PHOTO_REQUIRED' as const, photoType: 'PROOF' as any, minCount: 1, message: 'Photo de preuve de livraison obligatoire' },
            { type: 'SIGNATURE_REQUIRED' as const, message: 'Signature du réceptionnaire obligatoire' },
            { type: 'CHECKLIST_COMPLETE' as const },
          ],
        };
      }
      return t;
    }),
};
