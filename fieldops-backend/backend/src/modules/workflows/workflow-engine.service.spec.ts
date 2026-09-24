import { UnprocessableEntityException } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { PhotoType } from '../../common/enums/task.enums';
import { AuthUser } from '../../common/types/auth-user';
import { toPoint } from '../../common/utils/geo';
import { Site } from '../clients/entities/site.entity';
import { Task } from '../tasks/entities/task.entity';
import { LINEN_WORKFLOW, STANDARD_WORKFLOW } from './default-workflow';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { distanceMeters, TransitionContext, WorkflowEngineService } from './workflow-engine.service';

const engine = new WorkflowEngineService({} as any);
const def = { id: 'wf', ...STANDARD_WORKFLOW } as unknown as WorkflowDefinition;
const linen = { id: 'wf2', ...LINEN_WORKFLOW } as unknown as WorkflowDefinition;

const agent: AuthUser = { id: 'agent-1', organizationId: 'o', role: Role.AGENT, email: 'a@x' };
const otherAgent: AuthUser = { ...agent, id: 'agent-2' };
const supervisor: AuthUser = { id: 'sup', organizationId: 'o', role: Role.SUPERVISOR, email: 's@x' };
const site = { location: toPoint(48.8338, 2.3417), geofenceMeters: 250 } as Site;

function task(status: string, extra: Partial<Task> = {}): Task {
  return { status, agentId: 'agent-1', checklist: [], ...extra } as Task;
}
function ctx(t: Task, to: string, over: Partial<TransitionContext> = {}): TransitionContext {
  return { task: t, to, user: agent, site, photoCounts: {}, defaultGeofenceMeters: 300, ...over };
}
function blocked(fn: () => unknown): any {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(UnprocessableEntityException);
    return (e as UnprocessableEntityException).getResponse();
  }
  throw new Error('exception attendue');
}

describe('WorkflowEngineService', () => {
  it('distance haversine cohérente (~1,1 km par 0,01° de latitude)', () => {
    expect(Math.round(distanceMeters({ lat: 48.0, lng: 2.0 }, { lat: 48.01, lng: 2.0 }))).toBeGreaterThan(1100);
    expect(Math.round(distanceMeters({ lat: 48.0, lng: 2.0 }, { lat: 48.01, lng: 2.0 }))).toBeLessThan(1115);
  });

  it('refuse une transition hors séquence', () => {
    const r = blocked(() => engine.assertTransition(def, ctx(task('ASSIGNED'), 'COMPLETED')));
    expect(r.code).toBe('TRANSITION_NOT_ALLOWED');
  });

  it("refuse un état inconnu", () => {
    blocked(() => engine.assertTransition(def, ctx(task('ASSIGNED'), 'FOO')));
  });

  it("l'agent affecté peut accepter, pas un autre agent", () => {
    expect(engine.assertTransition(def, ctx(task('ASSIGNED'), 'ACCEPTED')).to).toBe('ACCEPTED');
    const r = blocked(() => engine.assertTransition(def, ctx(task('ASSIGNED'), 'ACCEPTED', { user: otherAgent })));
    expect(r.code).toBe('TRANSITION_BLOCKED');
  });

  it('un agent ne peut pas planifier (rôle)', () => {
    const r = blocked(() => engine.assertTransition(def, ctx(task('CREATED'), 'PLANNED')));
    expect(r.code).toBe('TRANSITION_NOT_ALLOWED');
    expect(engine.assertTransition(def, ctx(task('CREATED'), 'PLANNED', { user: supervisor })).to).toBe('PLANNED');
  });

  it('géofence : bloque hors périmètre, accepte sur site, bloque sans position', () => {
    const t = task('EN_ROUTE');
    blocked(() => engine.assertTransition(def, ctx(t, 'ON_SITE', { lat: 48.9, lng: 2.4 })));
    blocked(() => engine.assertTransition(def, ctx(t, 'ON_SITE')));
    expect(engine.assertTransition(def, ctx(t, 'ON_SITE', { lat: 48.8339, lng: 2.3418 })).to).toBe('ON_SITE');
  });

  it('photo « avant » obligatoire pour démarrer', () => {
    const t = task('ON_SITE');
    const r = blocked(() => engine.assertTransition(def, ctx(t, 'IN_PROGRESS')));
    expect(r.missing).toContain('Photo « avant » obligatoire');
    const ok = engine.assertTransition(def, ctx(t, 'IN_PROGRESS', { photoCounts: { [PhotoType.BEFORE]: { total: 1, validated: 0 } } }));
    expect(ok.to).toBe('IN_PROGRESS');
  });

  it('checklist et photo « après » obligatoires pour terminer', () => {
    const t = task('IN_PROGRESS', { checklist: [{ id: 'c1', label: 'x', required: true, done: false }] as any });
    const r = blocked(() => engine.assertTransition(def, ctx(t, 'CONTROL')));
    expect(r.missing).toEqual(expect.arrayContaining(['Checklist incomplète', 'Photo « après » obligatoire']));
  });

  it('annulation : superviseur uniquement, motif obligatoire', () => {
    blocked(() => engine.assertTransition(def, ctx(task('IN_PROGRESS'), 'CANCELLED', { user: supervisor })));
    expect(
      engine.assertTransition(def, ctx(task('IN_PROGRESS'), 'CANCELLED', { user: supervisor, comment: 'Client absent' })).to,
    ).toBe('CANCELLED');
    blocked(() => engine.assertTransition(def, ctx(task('IN_PROGRESS'), 'CANCELLED', { comment: 'Client absent' })));
  });

  it('SYSTEM contourne rôles et géofence (évaluation automatique)', () => {
    expect(engine.assertTransition(def, ctx(task('COMPLETED'), 'EVALUATED', { user: 'SYSTEM' })).to).toBe('EVALUATED');
  });

  it('available() expose les prérequis manquants pour le mobile', () => {
    const list = engine.available(def, { task: task('ON_SITE'), user: agent, site, photoCounts: {}, defaultGeofenceMeters: 300 });
    const start = list.find((t) => t.to === 'IN_PROGRESS')!;
    expect(start.requiredPhotos).toContain(PhotoType.BEFORE);
    expect(start.missing.length).toBeGreaterThan(0);
    expect(list.map((t) => t.to)).toContain('DIAGNOSIS');
  });

  it('workflow linge : pas de diagnostic, signature + preuve exigées', () => {
    const t = task('IN_PROGRESS');
    const r = blocked(() => engine.assertTransition(linen, ctx(t, 'CONTROL')));
    expect(r.missing).toEqual(expect.arrayContaining(['Signature du réceptionnaire obligatoire']));
    expect(linen.states.some((s) => s.code === 'DIAGNOSIS')).toBe(false);
    const ok = engine.assertTransition(
      linen,
      ctx(task('IN_PROGRESS', { signatureKey: 'k' }), 'CONTROL', { photoCounts: { [PhotoType.PROOF]: { total: 1, validated: 0 } } }),
    );
    expect(ok.to).toBe('CONTROL');
  });

  it('les définitions par défaut sont structurellement valides', () => {
    expect(() => engine.validateDefinition(STANDARD_WORKFLOW)).not.toThrow();
    expect(() => engine.validateDefinition(LINEN_WORKFLOW)).not.toThrow();
  });
});
