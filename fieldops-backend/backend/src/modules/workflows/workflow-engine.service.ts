import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { PhotoType } from '../../common/enums/task.enums';
import { AuthUser } from '../../common/types/auth-user';
import { fromPoint } from '../../common/utils/geo';
import { Site } from '../clients/entities/site.entity';
import { Task } from '../tasks/entities/task.entity';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowCondition, WorkflowState, WorkflowTransition } from './workflow.types';

export interface TransitionContext {
  task: Task;
  user: AuthUser | 'SYSTEM';
  to: string;
  comment?: string | null;
  lat?: number | null;
  lng?: number | null;
  site?: Site | null;
  photoCounts: Partial<Record<PhotoType, { total: number; validated: number }>>;
  defaultGeofenceMeters: number;
}

export interface AvailableTransition {
  to: string;
  label: string;
  /** Conditions non satisfaites à ce stade (affichées sur le mobile). */
  missing: string[];
  requiresComment: boolean;
  requiresLocation: boolean;
  requiredPhotos: PhotoType[];
  requiresSignature: boolean;
}

/** Distance haversine en mètres. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Moteur de workflow (§8) : évalue les transitions autorisées selon l'état courant,
 * le rôle, et les conditions bloquantes appliquées côté backend (§7).
 */
@Injectable()
export class WorkflowEngineService {
  constructor(@InjectRepository(WorkflowDefinition) private readonly defs: Repository<WorkflowDefinition>) {}

  /** Workflow actif le plus récent pour ce type, sinon le workflow par défaut du tenant. */
  async resolveForType(orgId: string, taskType: string): Promise<WorkflowDefinition> {
    const candidates = await this.defs
      .createQueryBuilder('w')
      .where('w.organizationId = :orgId AND w.isActive = true', { orgId })
      .andWhere('(:type = ANY(w.taskTypes) OR w.isDefault = true)', { type: taskType })
      .orderBy('w.version', 'DESC')
      .getMany();
    const specific = candidates.find((w) => w.taskTypes.includes(taskType));
    const def = specific ?? candidates.find((w) => w.isDefault);
    if (!def) throw new NotFoundException(`Aucun workflow actif pour le type "${taskType}"`);
    return def;
  }

  async getById(id: string) {
    const def = await this.defs.findOne({ where: { id } });
    if (!def) throw new NotFoundException('Workflow introuvable');
    return def;
  }

  async getMany(ids: string[]) {
    return ids.length ? this.defs.find({ where: { id: In(ids) } }) : [];
  }

  state(def: WorkflowDefinition, code: string): WorkflowState | undefined {
    return def.states.find((s) => s.code === code);
  }

  isFinal(def: WorkflowDefinition, code: string) {
    return !!this.state(def, code)?.final;
  }

  private matchesFrom(def: WorkflowDefinition, t: WorkflowTransition, current: string) {
    if (t.from === '*') return !this.isFinal(def, current) && current !== t.to;
    return Array.isArray(t.from) ? t.from.includes(current) : t.from === current;
  }

  private roleAllowed(t: WorkflowTransition, user: AuthUser | 'SYSTEM') {
    return user === 'SYSTEM' || t.roles.includes(user.role);
  }

  findTransition(def: WorkflowDefinition, current: string, to: string, user: AuthUser | 'SYSTEM') {
    return def.transitions.find((t) => t.to === to && this.matchesFrom(def, t, current) && this.roleAllowed(t, user));
  }

  /** Liste des transitions possibles pour cet utilisateur, avec les prérequis manquants. */
  available(def: WorkflowDefinition, ctx: Omit<TransitionContext, 'to'>): AvailableTransition[] {
    return def.transitions
      .filter((t) => this.matchesFrom(def, t, ctx.task.status) && this.roleAllowed(t, ctx.user))
      .filter((t) => {
        // Un agent ne voit pas les transitions d'une tâche qui ne lui est pas affectée.
        const needsOwner = t.conditions?.some((c) => c.type === 'IS_ASSIGNED_AGENT');
        return !needsOwner || ctx.user === 'SYSTEM' || ctx.task.agentId === ctx.user.id;
      })
      .map((t) => {
        const conds = t.conditions ?? [];
        // Les conditions "saisies au moment de l'action" ne sont pas considérées manquantes.
        const deferred = new Set(['COMMENT_REQUIRED', 'GEOFENCE']);
        return {
          to: t.to,
          label: t.label,
          missing: this.unmet(conds.filter((c) => !deferred.has(c.type)), { ...ctx, to: t.to }),
          requiresComment: conds.some((c) => c.type === 'COMMENT_REQUIRED'),
          requiresLocation: conds.some((c) => c.type === 'GEOFENCE'),
          requiredPhotos: conds.filter((c) => c.type === 'PHOTO_REQUIRED').map((c: any) => c.photoType),
          requiresSignature: conds.some((c) => c.type === 'SIGNATURE_REQUIRED'),
        };
      });
  }

  /** Valide la transition ; lève 422 avec la liste des règles bloquantes. */
  assertTransition(def: WorkflowDefinition, ctx: TransitionContext): WorkflowTransition {
    const { task, to, user } = ctx;
    if (!this.state(def, to)) throw new UnprocessableEntityException(`État inconnu : ${to}`);
    const t = this.findTransition(def, task.status, to, user);
    if (!t) {
      throw new UnprocessableEntityException({
        message: `Transition ${task.status} → ${to} non autorisée`,
        code: 'TRANSITION_NOT_ALLOWED',
        currentStatus: task.status,
      });
    }
    const missing = this.unmet(t.conditions ?? [], ctx);
    if (missing.length) {
      throw new UnprocessableEntityException({
        message: 'Conditions de transition non remplies',
        code: 'TRANSITION_BLOCKED',
        missing,
        currentStatus: task.status,
      });
    }
    return t;
  }

  private unmet(conditions: WorkflowCondition[], ctx: TransitionContext): string[] {
    const missing: string[] = [];
    for (const c of conditions) {
      if (!this.check(c, ctx)) missing.push(c.message ?? this.defaultMessage(c));
    }
    return missing;
  }

  private check(c: WorkflowCondition, ctx: TransitionContext): boolean {
    const { task, user } = ctx;
    switch (c.type) {
      case 'AGENT_ASSIGNED':
        return !!task.agentId;
      case 'IS_ASSIGNED_AGENT':
        return user === 'SYSTEM' || user.role !== Role.AGENT || task.agentId === user.id;
      case 'COMMENT_REQUIRED':
        return !!ctx.comment && ctx.comment.trim().length >= 3;
      case 'CHECKLIST_COMPLETE':
        return (task.checklist ?? []).every((i) => !i.required || i.done);
      case 'SIGNATURE_REQUIRED':
        return !!task.signatureKey;
      case 'PHOTO_REQUIRED': {
        const counts = ctx.photoCounts[c.photoType];
        const n = c.validatedOnly ? counts?.validated ?? 0 : counts?.total ?? 0;
        return n >= (c.minCount ?? 1);
      }
      case 'GEOFENCE': {
        if (user === 'SYSTEM') return true;
        const sitePos = fromPoint(ctx.site?.location ?? null);
        if (!sitePos) return true; // site non géolocalisé : pas de contrôle possible
        if (ctx.lat == null || ctx.lng == null) return false;
        const radius = c.radiusMeters ?? ctx.site?.geofenceMeters ?? ctx.defaultGeofenceMeters;
        return distanceMeters(sitePos, { lat: ctx.lat, lng: ctx.lng }) <= radius;
      }
      default:
        return false;
    }
  }

  private defaultMessage(c: WorkflowCondition): string {
    switch (c.type) {
      case 'PHOTO_REQUIRED': return `Photo ${c.photoType} requise`;
      case 'AGENT_ASSIGNED': return 'Agent requis';
      case 'IS_ASSIGNED_AGENT': return "Réservé à l'agent affecté";
      case 'CHECKLIST_COMPLETE': return 'Checklist incomplète';
      case 'COMMENT_REQUIRED': return 'Commentaire requis';
      case 'GEOFENCE': return 'Position hors du périmètre du site';
      case 'SIGNATURE_REQUIRED': return 'Signature requise';
    }
  }

  /** Validation structurelle d'une définition (utilisée à la création/édition). */
  validateDefinition(data: { initialState: string; states: WorkflowState[]; transitions: WorkflowTransition[] }) {
    const codes = new Set(data.states.map((s) => s.code));
    const errors: string[] = [];
    if (codes.size !== data.states.length) errors.push('Codes d’état en double');
    if (!codes.has(data.initialState)) errors.push(`État initial inconnu : ${data.initialState}`);
    data.transitions.forEach((t, i) => {
      const froms = t.from === '*' ? [] : Array.isArray(t.from) ? t.from : [t.from];
      froms.forEach((f) => !codes.has(f) && errors.push(`Transition #${i} : état source inconnu ${f}`));
      if (!codes.has(t.to)) errors.push(`Transition #${i} : état cible inconnu ${t.to}`);
      if (!t.roles?.length) errors.push(`Transition #${i} : aucun rôle autorisé`);
    });
    if (errors.length) throw new UnprocessableEntityException({ message: 'Workflow invalide', errors });
  }
}
