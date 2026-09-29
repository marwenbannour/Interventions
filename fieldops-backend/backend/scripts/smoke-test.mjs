/**
 * Test de fumée de bout en bout (API démarrée + seed appliqué).
 *   node scripts/smoke-test.mjs [baseUrl]
 * Parcours : auth → géoloc → workflow terrain complet avec preuves → SLA → évaluation → sync offline → reporting → temps réel.
 */
import { createHash, createHmac } from 'crypto';
import { createServer } from 'http';
import { io } from 'socket.io-client';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const API = `${BASE}/api/v1`;
// Hôte du récepteur de webhooks vu depuis l'API (API en Docker : SMOKE_WEBHOOK_HOST=host.docker.internal).
const HOOK_HOST = process.env.SMOKE_WEBHOOK_HOST ?? '127.0.0.1';
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, timeoutMs = 20_000, everyMs = 500) {
  const end = Date.now() + timeoutMs;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (last) return last;
    await sleep(everyMs);
  }
  return last;
}

// Récepteur de webhooks local : vérifie chaque signature comme le ferait un ERP.
const hooks = [];
let hookSecret = null;
const receiver = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const sig = req.headers['x-fieldops-signature'] ?? '';
    const [, t, v1] = /^t=(\d+),v1=([0-9a-f]+)$/.exec(sig) ?? [];
    const expected = hookSecret && t ? createHmac('sha256', hookSecret).update(`${t}.${body}`).digest('hex') : null;
    hooks.push({ event: req.headers['x-fieldops-event'], valid: !!expected && expected === v1, body: JSON.parse(body) });
    res.writeHead(200).end('ok');
  });
});
await new Promise((r) => receiver.listen(4555, HOOK_HOST === '127.0.0.1' ? '127.0.0.1' : '0.0.0.0', r));
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

await step('V3 Intégrations : abonnement webhook signé + ping', async () => {
  ctx.admin = (await login('admin@demo.fieldops.io', 'Admin123!demo')).accessToken;
  const w = await call(ctx.admin, 'POST', '/integrations/webhooks', {
    name: 'ERP test', url: `http://${HOOK_HOST}:4555/hook`, events: ['task.created', 'task.transitioned', 'report.generated', 'task.rework_detected'],
  }, { expect: 201 });
  assert(w.body.secret?.startsWith('whsec_'), 'secret absent à la création');
  hookSecret = w.body.secret;
  ctx.webhookId = w.body.id;
  const list = await call(ctx.admin, 'GET', '/integrations/webhooks', undefined, { expect: 200 });
  assert(list.body.every((x) => x.secret === undefined), 'le secret ne doit jamais être relu');
  await call(ctx.admin, 'POST', '/integrations/webhooks', { name: 'x', url: 'http://127.0.0.1/', events: ['foo.bar'] }, { expect: 422 });
  await call(ctx.sup, 'GET', '/integrations/webhooks', undefined, { expect: 403 });
  await call(ctx.admin, 'POST', `/integrations/webhooks/${ctx.webhookId}/test`, undefined, { expect: 202 });
  const ping = await waitFor(() => hooks.find((h) => h.event === 'ping'), 10_000);
  assert(ping?.valid, 'ping non reçu ou signature invalide');
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

await step('V3 Scan QR : exigé, mauvais équipement refusé', async () => {
  const d = await call(ctx.agent, 'GET', `/tasks/${ctx.task.id}`, undefined, { expect: 200 });
  const start = d.body.availableTransitions.find((t) => t.to === 'IN_PROGRESS');
  assert(start?.requiresAssetScan === true && d.body.asset?.code === 'EQ-000001', 'scan non annoncé');
  const r1 = await call(ctx.agent, 'POST', `/tasks/${ctx.task.id}/start`, {}, { expect: 422 });
  assert(JSON.stringify(r1.body.missing).includes('QR'), JSON.stringify(r1.body));
  await call(ctx.agent, 'POST', `/tasks/${ctx.task.id}/start`, { assetCode: 'FIELDOPS:ASSET:EQ-000002' }, { expect: 422 });
});

await step('Démarrer l’intervention (QR scanné)', async () => {
  const r = await call(ctx.agent, 'POST', `/tasks/${ctx.task.id}/start`, { assetCode: 'FIELDOPS:ASSET:EQ-000001' }, { expect: 201 });
  assert(r.body.status === 'IN_PROGRESS', r.body.status);
  const h = await call(ctx.agent, 'GET', `/tasks/${ctx.task.id}/history`, undefined, { expect: 200 });
  assert(h.body.some((e) => e.data?.assetScanned === 'EQ-000001' && e.data?.assetScanMethod === 'QR'), 'scan (mode QR) non tracé');
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

await step('V3 Rapport PDF : généré à la clôture, intègre, accessible au client', async () => {
  const link = await waitFor(async () => {
    const r = await call(ctx.client, 'GET', `/tasks/${ctx.task.id}/report`);
    return r.status === 200 ? r.body : null;
  }, 20_000);
  assert(link?.url, 'rapport non généré');
  const pdf = Buffer.from(await (await fetch(link.url)).arrayBuffer());
  assert(pdf.subarray(0, 5).toString() === '%PDF-', 'pas un PDF');
  const sha = createHash('sha256').update(pdf).digest('hex');
  assert(sha === link.sha256, 'empreinte incohérente');
  const v = await call(ctx.client, 'GET', `/tasks/${ctx.task.id}/report/verify?sha256=${sha}`, undefined, { expect: 200 });
  const bad = await call(ctx.client, 'GET', `/tasks/${ctx.task.id}/report/verify?sha256=${'0'.repeat(64)}`, undefined, { expect: 200 });
  assert(v.body.valid && !bad.body.valid, 'vérification');
  ctx.pdf = pdf;
  return `${Math.round(pdf.length / 1024)} Ko, sha256 ${sha.slice(0, 12)}…`;
});

await step('V3 Réintervention détectée (même site, même équipement)', async () => {
  const sites = await call(ctx.sup, 'GET', '/sites?limit=50', undefined, { expect: 200 });
  const siteA = sites.body.data.find((x) => x.name === 'Clinique — Bâtiment A');
  const assets = await call(ctx.sup, 'GET', `/assets?siteId=${siteA.id}`, undefined, { expect: 200 });
  ctx.tgbt = assets.body.data.find((a) => a.code === 'EQ-000001');
  ctx.siteA = siteA;
  const r = await call(ctx.sup, 'POST', '/tasks', {
    title: 'Disjonctions répétées TGBT', type: 'MAINTENANCE', priority: 'HIGH', siteId: siteA.id, assetId: ctx.tgbt.id,
  }, { expect: 201 });
  assert(r.body.isRework === true && r.body.reworkOfTaskId === ctx.task.id, 'réintervention non détectée');
  ctx.reworkTask = r.body;
  const d = await call(ctx.sup, 'GET', `/tasks/${r.body.id}`, undefined, { expect: 200 });
  assert(d.body.reworkOf?.reference === ctx.task.reference, 'reworkOf');
  const f = await call(ctx.sup, 'GET', '/tasks?rework=true', undefined, { expect: 200 });
  assert(f.body.data.length === 1, `filtre rework : ${f.body.data.length}`);
  const hook = await waitFor(() => hooks.find((h) => h.event === 'task.rework_detected'), 10_000);
  assert(hook?.valid, 'webhook rework');
  return `${r.body.reference} ← ${ctx.task.reference}`;
});

await step('V3 Demande client : sur son site oui, sur un autre client non', async () => {
  const r = await call(ctx.client, 'POST', '/service-requests', {
    siteId: ctx.siteA.id, title: 'Porte coupe-feu bloquée', description: 'Couloir urgences', priority: 'HIGH',
  }, { expect: 201 });
  assert(r.body.origin === 'CLIENT_REQUEST', r.body.origin);
  const other = (await call(ctx.sup, 'GET', '/sites?limit=50', undefined, { expect: 200 })).body.data.find((x) => x.name.startsWith('Hôtel'));
  await call(ctx.client, 'POST', '/service-requests', { siteId: other.id, title: 'x' }, { expect: 403 });
  await call(ctx.agent, 'POST', '/service-requests', { siteId: ctx.siteA.id, title: 'x' }, { expect: 403 });
  return r.body.reference;
});

await step('V3 Équipements : périmètre client, QR, historique, droits', async () => {
  const mine = await call(ctx.client, 'GET', '/assets', undefined, { expect: 200 });
  assert(mine.body.data.every((a) => a.client.name.startsWith('Clinique')) && mine.body.data.length === 2, 'périmètre client');
  const look = await call(ctx.agent, 'GET', '/assets/lookup?code=FIELDOPS:ASSET:eq-000001', undefined, { expect: 200 });
  assert(look.body.id === ctx.tgbt.id, 'lookup');
  const qr = await fetch(`${API}/assets/${ctx.tgbt.id}/qr.png`, { headers: { Authorization: `Bearer ${ctx.sup}` } });
  const png = Buffer.from(await qr.arrayBuffer());
  assert(png.subarray(1, 4).toString() === 'PNG', 'QR PNG');
  const h = await call(ctx.sup, 'GET', `/assets/${ctx.tgbt.id}/history`, undefined, { expect: 200 });
  assert(h.body.stats.total >= 2 && h.body.stats.reworks === 1, JSON.stringify(h.body.stats));
  const created = await call(ctx.sup, 'POST', '/assets', { siteId: ctx.siteA.id, name: 'Groupe froid', category: 'CVC' }, { expect: 201 });
  assert(/^EQ-\d{6}$/.test(created.body.code), created.body.code);
  await call(ctx.sup, 'POST', '/assets', { siteId: ctx.siteA.id, name: 'Doublon', code: 'eq-000001' }, { expect: 409 });
  await call(ctx.agent, 'POST', '/assets', { siteId: ctx.siteA.id, name: 'x' }, { expect: 403 });
  return `code auto ${created.body.code}, MTBF ${h.body.stats.mtbfDays ?? '—'}`;
});

await step('V3 Maintenance préventive : génération planifiée + manuelle, sans doublon', async () => {
  const plans = await call(ctx.sup, 'GET', '/maintenance-plans', undefined, { expect: 200 });
  const cta = plans.body.data.find((p) => p.name.startsWith('CTA'));
  const tgbt = plans.body.data.find((p) => p.name.startsWith('TGBT'));
  assert(cta.generatedCount === 1, `le scan au démarrage aurait dû générer la CTA (fenêtre 14 j) : ${cta.generatedCount}`);
  assert(tgbt.generatedCount === 0, 'TGBT hors fenêtre');
  const g1 = await call(ctx.sup, 'POST', `/maintenance-plans/${tgbt.id}/generate`, undefined, { expect: 200 });
  assert(g1.body.status === 'CREATED', JSON.stringify(g1.body));
  const t = await call(ctx.sup, 'GET', `/tasks/${g1.body.taskId}`, undefined, { expect: 200 });
  assert(t.body.origin === 'PREVENTIVE' && t.body.checklist.length === 2 && !t.body.isRework, 'tâche préventive');
  const prev = await call(ctx.sup, 'GET', `/maintenance-plans/${tgbt.id}/preview?count=3`, undefined, { expect: 200 });
  assert(prev.body.occurrences.length === 3 && prev.body.occurrences[0] !== g1.body.dueAt, 'échéance suivante');
  await call(ctx.agent, 'POST', `/maintenance-plans/${tgbt.id}/generate`, undefined, { expect: 403 });
  return `${g1.body.reference} (échéance ${g1.body.dueAt.slice(0, 10)}), suivante ${prev.body.occurrences[0].slice(0, 10)}`;
});

await step('V3 Clés API : scopes, origine API, révocation', async () => {
  await call(ctx.admin, 'POST', '/integrations/api-keys', { name: 'BI', role: 'DIRECTION', scopes: ['task:create'] }, { expect: 422 });
  const k = await call(ctx.admin, 'POST', '/integrations/api-keys', {
    name: 'ERP', scopes: ['task:read', 'task:read_all', 'task:create'],
  }, { expect: 201 });
  const key = k.body.key;
  const H = { 'X-API-Key': key };
  const list = await fetch(`${API}/tasks?limit=5`, { headers: H });
  assert(list.status === 200, `lecture ${list.status}`);
  const created = await fetch(`${API}/tasks`, {
    method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Créée par ERP', type: 'REPAIR', siteId: ctx.siteA.id }),
  });
  const cb = await created.json();
  assert(created.status === 201 && cb.origin === 'API', `création ${created.status} ${cb.origin}`);
  assert((await fetch(`${API}/users`, { headers: H })).status === 403, 'scope user:read non accordé');
  assert((await fetch(`${API}/tasks`, { headers: { Authorization: `ApiKey ${key}` } })).status === 200, 'Authorization: ApiKey');
  await call(ctx.admin, 'DELETE', `/integrations/api-keys/${k.body.id}`, undefined, { expect: 200 });
  assert((await fetch(`${API}/tasks`, { headers: H })).status === 401, 'clé révoquée encore active');
  assert((await fetch(`${API}/tasks`, { headers: { 'X-API-Key': 'fo_deadbeef_xxxxxxxxxxxxxxxxxxxxxxxx' } })).status === 401, 'clé inconnue');
});

await step('V3 Auto-dispatch : affectation au meilleur agent en service', async () => {
  await call(ctx.admin, 'PATCH', '/organization', { settings: { autoDispatch: { enabled: true, minScore: 0.3 } } }, { expect: 200 });
  const s = await call(ctx.admin, 'GET', '/organization/settings', undefined, { expect: 200 });
  assert(s.body.autoDispatch.enabled && s.body.autoDispatch.onlyOnDuty === true, 'fusion des réglages');
  const r = await call(ctx.sup, 'POST', '/tasks', {
    title: 'Prise électrique HS chambre 12', type: 'REPAIR', siteId: ctx.siteA.id, requiredSkills: ['ELECTRICITE'],
  }, { expect: 201 });
  const t = await waitFor(async () => {
    const d = await call(ctx.sup, 'GET', `/tasks/${r.body.id}`, undefined, { expect: 200 });
    return d.body.agentId ? d.body : null;
  }, 10_000);
  await call(ctx.admin, 'PATCH', '/organization', { settings: { autoDispatch: { enabled: false } } }, { expect: 200 });
  assert(t?.agentId === ctx.agentId && t.status === 'ASSIGNED', `non affectée (${t?.agentId})`);
  const h = await call(ctx.sup, 'GET', `/tasks/${r.body.id}/history`, undefined, { expect: 200 });
  assert(h.body.some((e) => e.type === 'ASSIGNED' && e.data?.auto === true), 'traçabilité auto');
  return `${r.body.reference} → ${t.agent.firstName} ${t.agent.lastName}`;
});

await step('V3 Webhooks reçus et tous correctement signés', async () => {
  const events = [...new Set(hooks.map((h) => h.event))];
  assert(hooks.every((h) => h.valid), 'signature invalide détectée');
  for (const e of ['task.created', 'task.transitioned', 'report.generated']) assert(events.includes(e), `${e} manquant`);
  const d = await call(ctx.admin, 'GET', `/integrations/webhooks/${ctx.webhookId}/deliveries?limit=100`, undefined, { expect: 200 });
  assert(d.body.data.every((x) => x.status === 'SUCCESS'), 'livraison non réussie');
  return `${hooks.length} livraisons (${events.join(', ')})`;
});

await step('V3 Observabilité : X-Request-Id et métriques Prometheus', async () => {
  const res = await fetch(`${API}/health`, { headers: { 'X-Request-Id': 'smoke-req-12345' } });
  assert(res.headers.get('x-request-id') === 'smoke-req-12345', 'propagation request id');
  const err = await call(ctx.sup, 'GET', '/tasks/00000000-0000-0000-0000-000000000001');
  assert(err.status === 404 && err.body.requestId, 'requestId dans les erreurs');
  const m = await (await fetch(`${BASE}/api/metrics`)).text();
  for (const k of ['fieldops_http_request_duration_seconds_bucket', 'fieldops_sync_operations_total', 'fieldops_webhook_deliveries_total', 'fieldops_business_events_total', 'fieldops_queue_jobs']) {
    assert(m.includes(k), `${k} absent`);
  }
  assert(m.includes('route="/api/v1/tasks/:id"'), 'routes non normalisées');
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

receiver.close();
console.log(`\n${passed} réussis, ${failed} échoués\n`);
process.exit(failed ? 1 : 0);
