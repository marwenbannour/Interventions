import type {
  AvailableTransition,
  ChecklistItem,
  PhotoCounts,
  SiteSnapshot,
  WorkflowCondition,
  WorkflowDefinitionData,
  WorkflowTransition,
} from '../../../lib/api/types';

/**
 * Portage direct de WorkflowEngineService (backend, workflow-engine.service.ts).
 * Cette app est réservée au rôle AGENT : le rôle et le cas 'SYSTEM' du serveur
 * n'ont pas d'équivalent côté mobile.
 */

export interface LocalTaskForEngine {
  status: string;
  agentId: string | null;
  checklist: ChecklistItem[];
  signatureKey: string | null;
}

const DEFERRED_CONDITIONS = new Set<WorkflowCondition['type']>(['COMMENT_REQUIRED', 'GEOFENCE']);

function isFinal(def: WorkflowDefinitionData, code: string): boolean {
  return !!def.states.find((s) => s.code === code)?.final;
}

function matchesFrom(def: WorkflowDefinitionData, t: WorkflowTransition, current: string): boolean {
  if (t.from === '*') return !isFinal(def, current) && current !== t.to;
  return Array.isArray(t.from) ? t.from.includes(current) : t.from === current;
}

interface CheckContext {
  task: LocalTaskForEngine;
  agentUserId: string;
  comment?: string;
  photoCounts: PhotoCounts;
}

function check(c: WorkflowCondition, ctx: CheckContext): boolean {
  const { task } = ctx;
  switch (c.type) {
    case 'AGENT_ASSIGNED':
      return !!task.agentId;
    case 'IS_ASSIGNED_AGENT':
      return task.agentId === ctx.agentUserId;
    case 'COMMENT_REQUIRED':
      return !!ctx.comment && ctx.comment.trim().length >= 3;
    case 'CHECKLIST_COMPLETE':
      return (task.checklist ?? []).every((i) => !i.required || i.done);
    case 'SIGNATURE_REQUIRED':
      return !!task.signatureKey;
    case 'PHOTO_REQUIRED': {
      const counts = c.photoType ? ctx.photoCounts[c.photoType] : undefined;
      const n = c.validatedOnly ? (counts?.validated ?? 0) : (counts?.total ?? 0);
      return n >= (c.minCount ?? 1);
    }
    case 'GEOFENCE':
      // Différée : jamais évaluée ici (voir checkGeofence, utilisée séparément au moment de l'action).
      return true;
    default:
      return false;
  }
}

function defaultMessage(c: WorkflowCondition): string {
  switch (c.type) {
    case 'PHOTO_REQUIRED':
      return `Photo ${c.photoType} requise`;
    case 'AGENT_ASSIGNED':
      return 'Agent requis';
    case 'IS_ASSIGNED_AGENT':
      return "Réservé à l'agent affecté";
    case 'CHECKLIST_COMPLETE':
      return 'Checklist incomplète';
    case 'COMMENT_REQUIRED':
      return 'Commentaire requis';
    case 'GEOFENCE':
      return 'Position hors du périmètre du site';
    case 'SIGNATURE_REQUIRED':
      return 'Signature requise';
    default:
      return 'Condition non remplie';
  }
}

function unmet(conditions: WorkflowCondition[], ctx: CheckContext): string[] {
  const missing: string[] = [];
  for (const c of conditions) {
    if (!check(c, ctx)) missing.push(c.message ?? defaultMessage(c));
  }
  return missing;
}

/** Équivalent de WorkflowEngineService.available() — calculable hors-ligne. */
export function computeAvailableTransitions(
  def: WorkflowDefinitionData,
  task: LocalTaskForEngine,
  agentUserId: string,
  photoCounts: PhotoCounts,
): AvailableTransition[] {
  const ctx: CheckContext = { task, agentUserId, photoCounts };
  return def.transitions
    .filter((t) => matchesFrom(def, t, task.status) && t.roles.includes('AGENT'))
    .filter((t) => {
      const needsOwner = t.conditions?.some((c) => c.type === 'IS_ASSIGNED_AGENT');
      return !needsOwner || task.agentId === agentUserId;
    })
    .map((t) => {
      const conds = t.conditions ?? [];
      return {
        to: t.to,
        label: t.label,
        missing: unmet(
          conds.filter((c) => !DEFERRED_CONDITIONS.has(c.type)),
          ctx,
        ),
        requiresComment: conds.some((c) => c.type === 'COMMENT_REQUIRED'),
        requiresLocation: conds.some((c) => c.type === 'GEOFENCE'),
        requiredPhotos: conds.filter((c) => c.type === 'PHOTO_REQUIRED' && c.photoType).map((c) => c.photoType!),
        requiresSignature: conds.some((c) => c.type === 'SIGNATURE_REQUIRED'),
      };
    });
}

/** Portage de distanceMeters (workflow-engine.service.ts) — haversine, mètres. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Vérification géofence côté client (feedback immédiat avant envoi) — le serveur
 * reste seul juge au moment du /sync/push ou /tasks/:id/transition.
 */
export function checkGeofence(
  site: SiteSnapshot | null | undefined,
  lat: number | null,
  lng: number | null,
  defaultGeofenceMeters: number,
  radiusMeters?: number,
): boolean {
  const coords = site?.location?.coordinates;
  if (!coords) return true; // site non géolocalisé : pas de contrôle possible
  const sitePos = { lat: coords[1], lng: coords[0] };
  if (lat == null || lng == null) return false;
  const radius = radiusMeters ?? site?.geofenceMeters ?? defaultGeofenceMeters;
  return distanceMeters(sitePos, { lat, lng }) <= radius;
}
