/**
 * Test de fumée de bout en bout (API démarrée + seed appliqué).
 *   node scripts/smoke-test.mjs [baseUrl]
 * Parcours : auth → géoloc → workflow terrain complet avec preuves → SLA → évaluation → sync offline → reporting → temps réel.
 */
import { io } from 'socket.io-client';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const API = `${BASE}/api/v1`;
let passed = 0;
let failed = 0;

async function call(token, method, path, body, { expect, form } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(API + path, { method, headers, body: payload });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (expect && res.status !== expect) {
    throw new Error(`${method} ${path} → ${res.status} (attendu ${expect}) ${text.slice(0, 400)}`);
  }
  return { status: res.status, body: json };
}

async function step(name, fn) {
  try {
    const r = await fn();
    passed++;
    console.log(`  ✔ ${name}${r ? ` — ${r}` : ''}`);
  } catch (e) {
    failed++;
    console.log(`  ✘ ${name}\n      ${e.message}`);
  }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const login = async (email, password) => (await call(null, 'POST', '/auth/login', { email, password }, { expect: 200 })).body;

// Image JPEG minimale (1x1) pour les preuves.
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);
const photoForm = (type, extra = {}) => {
  const f = new FormData();
  f.append('file', new Blob([JPEG], { type: 'image/jpeg' }), 'photo.jpg');
  f.append('type', type);
  f.append('lat', '48.8338');
  f.append('lng', '2.3417');
  f.append('takenAt', new Date().toISOString());
  for (const [k, v] of Object.entries(extra)) f.append(k, v);
  return f;
};

const ctx = {};
console.log(`\nFieldOps — smoke test sur ${API}\n`);

await step('Santé (DB + Redis)', async () => {
  const r = await call(null, 'GET', '/health', undefined, { expect: 200 });
  return `db ${r.body.database.status}, redis ${r.body.redis.status}`;
});

await step('Accès refusé sans jeton', async () => { await call(null, 'GET', '/tasks', undefined, { expect: 401 }); });

await step('Connexion des 4 profils', async () => {
  ctx.sup = (await login('superviseur@demo.fieldops.io', 'Superviseur123!')).accessToken;
  const ag = await login('agent1@demo.fieldops.io', 'Agent123!demo');
  ctx.agent = ag.accessToken;
  ctx.agentId = ag.user.id;
  ctx.agentRefresh = ag.refreshToken;
  ctx.client = (await login('client@clinique-sm.fr', 'Client123!demo')).accessToken;
  ctx.dir = (await login('direction@demo.fieldops.io', 'Direction123!')).accessToken;
  assert(ctx.sup && ctx.agent && ctx.client && ctx.dir, 'jetons manquants');
});

await step('Mauvais mot de passe → 401', async () => {
  await call(null, 'POST', '/auth/login', { email: 'agent2@demo.fieldops.io', password: 'nope' }, { expect: 401 });
});

await step('Rotation du refresh token + détection de réutilisation', async () => {
  const r1 = await call(null, 'POST', '/auth/refresh', { refreshToken: ctx.agentRefresh }, { expect: 200 });
  await call(null, 'POST', '/auth/refresh', { refreshToken: ctx.agentRefresh }, { expect: 401 });
  // la famille est révoquée : le nouveau jeton ne marche plus non plus
  await call(null, 'POST', '/auth/refresh', { refreshToken: r1.body.refreshToken }, { expect: 401 });
  const ag = await login('agent1@demo.fieldops.io', 'Agent123!demo');
  ctx.agent = ag.accessToken;
});

await step('RBAC : un agent ne peut pas créer d’intervention', async () => {
  await call(ctx.agent, 'POST', '/tasks', { title: 'x', type: 'MAINTENANCE', siteId: '00000000-0000-0000-0000-000000000000' }, { expect: 403 });
});

await step('Temps réel : connexion superviseur au namespace /realtime', async () => {
  ctx.events = [];
  ctx.socket = io(`${BASE}/realtime`, { auth: { token: ctx.sup }, transports: ['websocket'] });
  await new Promise((res, rej) => {
    ctx.socket.on('ready', res);
    ctx.socket.on('connect_error', rej);
    setTimeout(() => rej(new Error('timeout ws')), 5000);
  });
  for (const ev of ['task.event', 'agent.location', 'photo.added', 'evaluation.created']) {
    ctx.socket.on(ev, (p) => ctx.events.push({ ev, p }));
  }
});

await step('Agent : liste de ses interventions (périmètre limité)', async () => {
  const r = await call(ctx.agent, 'GET', '/tasks?active=true', undefined, { expect: 200 });
  assert(r.body.data.length === 2, `2 tâches attendues, reçu ${r.body.data.length}`);
  ctx.task = r.body.data.find((t) => t.title.startsWith('Panne'));
  assert(ctx.task.priority === 'URGENT', 'tri par priorité');
  return `${ctx.task.reference} (${ctx.task.status})`;
});

await step('Client : ne voit que ses interventions', async () => {
  const r = await call(ctx.client, 'GET', '/tasks', undefined, { expect: 200 });
  assert(r.body.data.every((t) => t.client.name.startsWith('Clinique')), 'fuite de périmètre');
  return `${r.body.meta.total} interventions`;
});

await step('Géoloc refusée hors service puis acceptée en service', async () => {
  const ping = { pings: [{ lat: 48.84, lng: 2.33, recordedAt: new Date().toISOString(), battery: 80 }] };
  await call(ctx.agent, 'POST', '/agents/me/location', ping, { expect: 403 });
  await call(ctx.agent, 'POST', '/agents/me/duty', { onDuty: true }, { expect: 201 });
  await call(ctx.agent, 'POST', '/agents/me/location', ping, { expect: 201 });
});

await step('Superviseur : positions live + agents proches', async () => {
  const live = await call(ctx.sup, 'GET', '/agents/locations/live', undefined, { expect: 200 });
  assert(live.body.some((p) => p.agentId === ctx.agentId), 'agent absent du live');
  const near = await call(ctx.sup, 'GET', '/agents/locations/nearby?lat=48.8338&lng=2.3417&radiusKm=5', undefined, { expect: 200 });
  return `${live.body.length} live, ${near.body.length} à < 5 km`;
});

await step('Suggestions d’affectation (compétences / distance / charge)', async () => {
  const r = await call(ctx.sup, 'GET', `/tasks/${ctx.task.id}/suggested-agents`, undefined, { expect: 200 });
  assert(r.body.suggestions[0].agentId === ctx.agentId, 'agent1 devrait être premier (en service, proche)');
  return r.body.suggestions.map((s) => `${s.name}:${s.score}`).join(', ');
});

await step('Transition non autorisée → 422 TRANSITION_NOT_ALLOWED', async () => {
  const r = await call(ctx.agent, 'POST', `/tasks/${ctx.task.id}/transition`, { to: 'COMPLETED' }, { expect: 422 });
  assert(r.body.code === 'TRANSITION_NOT_ALLOWED', JSON.stringify(r.body));
});

await step('Accepter → En route', async () => {
  await call(ctx.agent, 'POST', `/tasks/${ctx.task.id}/transition`, { to: 'ACCEPTED' }, { expect: 201 });
  await call(ctx.agent, 'POST', `/tasks/${ctx.task.id}/transition`, { to: 'EN_ROUTE' }, { expect: 201 });
});

await step('Arrivée sur site bloquée hors géofence', async () => {
  const r = await call(ctx.agent, 'POST', `/tasks/${ctx.task.id}/transition`, { to: 'ON_SITE', lat: 48.90, lng: 2.40 }, { expect: 422 });
  return r.body.message;
});

await step('Arrivée sur site (dans la géofence)', async () => {
  await call(ctx.agent, 'POST', `/tasks/${ctx.task.id}/transition`, { to: 'ON_SITE', lat: 48.8339, lng: 2.3418 }, { expect: 201 });
});

await step('Démarrage bloqué sans photo « avant »', async () => {
  const r = await call(ctx.agent, 'POST', `/tasks/${ctx.task.id}/start`, {}, { expect: 422 });
  return r.body.message;
});

await step('Upload photo AVANT (idempotent via clientPhotoId)', async () => {
  const r1 = await call(ctx.agent, 'POST', `/tasks/${ctx.task.id}/photos`, undefined, { form: photoForm('BEFORE', { clientPhotoId: 'p-1' }), expect: 201 });
  const r2 = await call(ctx.agent, 'POST', `/tasks/${ctx.task.id}/photos`, undefined, { form: photoForm('BEFORE', { clientPhotoId: 'p-1' }), expect: 201 });
  assert(r1.body.id === r2.body.id && r2.body.duplicate === true, 'idempotence');
  assert(r1.body.url?.startsWith('http'), 'URL signée');
  return `sha256 ${r1.body.sha256.slice(0, 12)}…`;
});

await step('Démarrer l’intervention', async () => {
  const r = await call(ctx.agent, 'POST', `/tasks/${ctx.task.id}/start`, {}, { expect: 201 });
  assert(r.body.status === 'IN_PROGRESS', r.body.status);
});

await step('Terminer bloqué : checklist + photo après', async () => {
  const r = await call(ctx.agent, 'POST', `/tasks/${ctx.task.id}/complete`, {}, { expect: 422 });
  return JSON.stringify(r.body.missing ?? r.body.message);
});

await step('Checklist + photo APRÈS puis terminer → Contrôle', async () => {
  const t = await call(ctx.agent, 'GET', `/tasks/${ctx.task.id}`, undefined, { expect: 200 });
  await call(ctx.agent, 'PATCH', `/tasks/${ctx.task.id}/checklist`, { items: t.body.checklist.map((i) => ({ id: i.id, done: true })) }, { expect: 200 });
  await call(ctx.agent, 'POST', `/tasks/${ctx.task.id}/photos`, undefined, { form: photoForm('AFTER'), expect: 201 });
  const r = await call(ctx.agent, 'POST', `/tasks/${ctx.task.id}/complete`, { comment: 'Luminaires remplacés' }, { expect: 201 });
  assert(r.body.status === 'CONTROL', r.body.status);
});

await step('Superviseur : validation photo + clôture', async () => {
  const photos = await call(ctx.sup, 'GET', `/tasks/${ctx.task.id}/photos`, undefined, { expect: 200 });
  await call(ctx.sup, 'POST', `/photos/${photos.body[0].id}/validate`, { valid: true }, { expect: 201 });
  const r = await call(ctx.sup, 'POST', `/tasks/${ctx.task.id}/transition`, { to: 'COMPLETED', comment: 'Conforme' }, { expect: 201 });
  assert(r.body.status === 'COMPLETED', r.body.status);
});

await step('Client : évaluation → statut EVALUATED + double évaluation refusée', async () => {
  await call(ctx.client, 'POST', '/evaluations', { taskId: ctx.task.id, rating: 5, comment: 'Rapide et propre' }, { expect: 201 });
  await call(ctx.client, 'POST', '/evaluations', { taskId: ctx.task.id, rating: 4 }, { expect: 409 });
  const t = await call(ctx.client, 'GET', `/tasks/${ctx.task.id}`, undefined, { expect: 200 });
  assert(t.body.status === 'EVALUATED', t.body.status);
});

await step('Historique complet et horodaté', async () => {
  const h = await call(ctx.sup, 'GET', `/tasks/${ctx.task.id}/history`, undefined, { expect: 200 });
  return `${h.body.length} événements (${[...new Set(h.body.map((e) => e.type))].join(', ')})`;
});

await step('Sync offline : push d’un lot (ordre local, idempotence, rejet)', async () => {
  const list = await call(ctx.agent, 'GET', '/tasks?active=true', undefined, { expect: 200 });
  const t2 = list.body.data[0];
  const base = Date.now() - 10 * 60_000;
  const ops = [
    { clientOpId: 'op-2', type: 'TASK_TRANSITION', taskId: t2.id, clientTimestamp: new Date(base + 60_000).toISOString(), payload: { to: 'EN_ROUTE' } },
    { clientOpId: 'op-1', type: 'TASK_TRANSITION', taskId: t2.id, clientTimestamp: new Date(base).toISOString(), payload: { to: 'ACCEPTED' } },
    { clientOpId: 'op-3', type: 'TASK_NOTE', taskId: t2.id, clientTimestamp: new Date(base + 90_000).toISOString(), payload: { text: 'Accès par le parking' } },
    { clientOpId: 'op-4', type: 'TASK_TRANSITION', taskId: t2.id, clientTimestamp: new Date(base + 120_000).toISOString(), payload: { to: 'COMPLETED' } },
  ];
  const r1 = await call(ctx.agent, 'POST', '/sync/push', { operations: ops }, { expect: 200 });
  const st = Object.fromEntries(r1.body.results.map((x) => [x.clientOpId, x.status]));
  assert(st['op-1'] === 'APPLIED' && st['op-2'] === 'APPLIED' && st['op-3'] === 'APPLIED', JSON.stringify(st));
  assert(st['op-4'] === 'REJECTED', 'op-4 doit être rejetée');
  const r2 = await call(ctx.agent, 'POST', '/sync/push', { operations: ops.slice(0, 2) }, { expect: 200 });
  assert(r2.body.results.every((x) => x.status === 'DUPLICATE'), 'rejeu non idempotent');
  const h = await call(ctx.agent, 'GET', `/tasks/${t2.id}/history`, undefined, { expect: 200 });
  const acc = h.body.find((e) => e.toStatus === 'ACCEPTED');
  assert(acc.source === 'OFFLINE_SYNC' && Math.abs(Date.parse(acc.occurredAt) - base) < 1000, 'horodatage local non conservé');
  return JSON.stringify(st);
});

await step('Sync offline : pull incrémental', async () => {
  const full = await call(ctx.agent, 'GET', '/sync/pull', undefined, { expect: 200 });
  const delta = await call(ctx.agent, 'GET', `/sync/pull?since=${encodeURIComponent(full.body.serverTime)}`, undefined, { expect: 200 });
  assert(full.body.workflows.length >= 1, 'workflows absents');
  return `full=${full.body.tasks.length} tâches, delta=${delta.body.tasks.length}`;
});

await step('Réaffectation : la tâche sort du périmètre de l’ancien agent au pull', async () => {
  const before = await call(ctx.agent, 'GET', '/sync/pull', undefined, { expect: 200 });
  const t = before.body.tasks.find((x) => x.status === 'EN_ROUTE');
  const agents = await call(ctx.sup, 'GET', '/agents', undefined, { expect: 200 });
  const t2 = await call(ctx.sup, 'GET', `/tasks/${t.id}`, undefined, { expect: 200 });
  const target = (agents.body.data ?? agents.body).find(
    (a) => a.userId !== ctx.agentId && t2.body.requiredSkills.every((s) => a.skills.includes(s)),
  );
  assert(target, 'aucun agent compatible');
  const skillFail = (agents.body.data ?? agents.body).find((a) => !t2.body.requiredSkills.every((s) => a.skills.includes(s)));
  if (skillFail) await call(ctx.sup, 'POST', `/tasks/${t.id}/assign`, { agentId: skillFail.userId }, { expect: 422 });
  const re = await call(ctx.sup, 'POST', `/tasks/${t.id}/assign`, { agentId: target.userId }, { expect: 201 });
  assert(re.body.status === 'ASSIGNED', `retour à ASSIGNED attendu, reçu ${re.body.status}`);
  const after = await call(ctx.agent, 'GET', `/sync/pull?since=${encodeURIComponent(before.body.serverTime)}`, undefined, { expect: 200 });
  assert(after.body.removedTaskIds.includes(t.id), 'removedTaskIds');
});

await step('Planning superviseur', async () => {
  const from = new Date(Date.now() - 86_400_000).toISOString();
  const to = new Date(Date.now() + 86_400_000).toISOString();
  const r = await call(ctx.sup, 'GET', `/planning?from=${from}&to=${to}`, undefined, { expect: 200 });
  return `${r.body.agents.length} agents, ${r.body.unassigned.length} non affectées`;
});

await step('Reporting direction : dashboard, SLA, agents, CSV', async () => {
  const d = await call(ctx.dir, 'GET', '/reports/dashboard', undefined, { expect: 200 });
  const s = await call(ctx.dir, 'GET', '/reports/sla', undefined, { expect: 200 });
  const a = await call(ctx.dir, 'GET', '/reports/agents', undefined, { expect: 200 });
  const csv = await call(ctx.dir, 'GET', '/reports/agents?format=csv', undefined, { expect: 200 });
  assert(typeof csv.body === 'string' && csv.body.includes(';'), 'CSV');
  const k = a.body.agents.find((x) => x.agentId === ctx.agentId);
  return `tâches=${d.body.tasks.total}, SLA arrivée=${s.body.global.arrival.complianceRate}%, note agent1=${k.avgRating}`;
});

await step('SLA à risque + client limité à son périmètre de reporting', async () => {
  await call(ctx.sup, 'GET', '/sla/at-risk', undefined, { expect: 200 });
  await call(ctx.client, 'GET', '/reports/agents', undefined, { expect: 403 });
  const d = await call(ctx.client, 'GET', '/reports/dashboard', undefined, { expect: 200 });
  assert(d.body.agents === undefined, 'infos internes exposées au client');
});

await step('Notifications in-app de l’agent', async () => {
  const r = await call(ctx.agent, 'GET', '/notifications', undefined, { expect: 200 });
  return `${r.body.meta?.total ?? r.body.length} notification(s)`;
});

await step('Journal d’audit', async () => {
  const admin = (await login('admin@demo.fieldops.io', 'Admin123!demo')).accessToken;
  const r = await call(admin, 'GET', '/audit-logs', undefined, { expect: 200 });
  return `${r.body.meta?.total ?? r.body.length} entrées`;
});

await step('Événements temps réel reçus', async () => {
  await new Promise((r) => setTimeout(r, 500));
  const kinds = [...new Set(ctx.events.map((e) => e.ev))];
  assert(kinds.includes('task.event') && kinds.includes('agent.location'), `reçus : ${kinds}`);
  ctx.socket.close();
  return `${ctx.events.length} (${kinds.join(', ')})`;
});

console.log(`\n${passed} réussis, ${failed} échoués\n`);
process.exit(failed ? 1 : 0);
