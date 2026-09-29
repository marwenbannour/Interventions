/**
 * Accès direct à l'API pour préparer les scénarios (ce que feraient l'app mobile, un client ou l'ERP),
 * afin que chaque test UI parte d'un état connu sans dépendre des autres.
 */
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
export const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';

export const ACCOUNTS = {
  admin: { email: 'admin@demo.fieldops.io', password: 'Admin123!demo', name: 'Administrateur' },
  supervisor: { email: 'superviseur@demo.fieldops.io', password: 'Superviseur123!', name: 'Superviseur' },
  direction: { email: 'direction@demo.fieldops.io', password: 'Direction123!', name: 'Direction' },
  agent: { email: 'agent1@demo.fieldops.io', password: 'Agent123!demo', name: 'Agent' },
  client: { email: 'client@clinique-sm.fr', password: 'Client123!demo', name: 'Client' },
} as const;
export type AccountKey = keyof typeof ACCOUNTS;

/** Données du seed de démonstration utilisées par les scénarios. */
export const DEMO = {
  clinique: 'Clinique Saint-Martin',
  hotel: 'Hôtel Le Grand Parc',
  siteA: 'Clinique — Bâtiment A',
  siteA_position: { lat: 48.8339, lng: 2.3418 },
  agent1: 'Karim Benali',
  agent3: 'Thomas Leroy',
} as const;

/** Suffixe unique : les entités créées ne se télescopent pas d'une exécution à l'autre. */
export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();

export class ApiClient {
  constructor(readonly token: string, readonly user: { id: string; firstName: string; lastName: string }) {}

  static async login(account: AccountKey | { email: string; password: string }): Promise<ApiClient> {
    const creds = typeof account === 'string' ? ACCOUNTS[account] : account;
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: creds.email, password: creds.password }),
    });
    const body = await res.json();
    if (!res.ok || !body.accessToken) throw new Error(`Connexion API ${creds.email} : ${res.status} ${JSON.stringify(body)}`);
    return new ApiClient(body.accessToken, body.user);
  }

  async call<T = unknown>(method: string, path: string, body?: unknown | FormData): Promise<T> {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.token}` };
    let payload: BodyInit | undefined;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(`${API_URL}${path}`, { method, headers, body: payload });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
    return (text ? JSON.parse(text) : undefined) as T;
  }

  get = <T = unknown>(path: string) => this.call<T>('GET', path);
  post = <T = unknown>(path: string, body?: unknown) => this.call<T>('POST', path, body ?? {});
  patch = <T = unknown>(path: string, body: unknown) => this.call<T>('PATCH', path, body);

  async siteByName(name: string) {
    const sites = await this.get<{ data: { id: string; name: string }[] }>('/sites?limit=100');
    const site = sites.data.find((s) => s.name === name);
    if (!site) throw new Error(`Site « ${name} » absent du jeu de démonstration`);
    return site;
  }

  async agentUserId(fullName: string) {
    const agents = await this.get<{ data: { userId: string; user: { firstName: string; lastName: string } }[] }>('/agents');
    const a = agents.data.find((x) => `${x.user.firstName} ${x.user.lastName}` === fullName);
    if (!a) throw new Error(`Agent « ${fullName} » introuvable`);
    return a.userId;
  }

  /** Intervention sur le Bâtiment A, sans équipement (pas de scan QR), avec checklist. */
  async createTask(title: string, extra: Record<string, unknown> = {}) {
    const site = await this.siteByName(DEMO.siteA);
    return this.post<{ id: string; reference: string; status: string }>('/tasks', {
      title,
      type: 'REPAIR',
      priority: 'NORMAL',
      siteId: site.id,
      checklist: [{ label: 'Vérification finale', required: true }],
      ...extra,
    });
  }
}

const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);

function photoForm(type: 'BEFORE' | 'AFTER') {
  const f = new FormData();
  f.append('file', new Blob([JPEG], { type: 'image/jpeg' }), `${type.toLowerCase()}.jpg`);
  f.append('type', type);
  f.append('lat', String(DEMO.siteA_position.lat));
  f.append('lng', String(DEMO.siteA_position.lng));
  f.append('takenAt', new Date().toISOString());
  return f;
}

/**
 * Travail terrain de l'agent (ce que fait l'app mobile) : accepter → en route → sur site (géofence)
 * → photo avant → démarrer → checklist + photo après → contrôle.
 */
export async function agentDoesFieldWork(agent: ApiClient, taskId: string) {
  await agent.post(`/tasks/${taskId}/transition`, { to: 'ACCEPTED' });
  await agent.post(`/tasks/${taskId}/transition`, { to: 'EN_ROUTE' });
  await agent.post(`/tasks/${taskId}/transition`, { to: 'ON_SITE', ...DEMO.siteA_position });
  await agent.call('POST', `/tasks/${taskId}/photos`, photoForm('BEFORE'));
  await agent.post(`/tasks/${taskId}/start`, {});
  const task = await agent.get<{ checklist: { id: string }[] }>(`/tasks/${taskId}`);
  await agent.patch(`/tasks/${taskId}/checklist`, { items: task.checklist.map((i) => ({ id: i.id, done: true })) });
  await agent.call('POST', `/tasks/${taskId}/photos`, photoForm('AFTER'));
  const done = await agent.post<{ status: string }>(`/tasks/${taskId}/complete`, { comment: 'Travaux réalisés (E2E)' });
  if (done.status !== 'CONTROL') throw new Error(`Statut attendu CONTROL, reçu ${done.status}`);
}

/** Dernier code OTP envoyé par e-mail à `to` (Mailpit). */
export async function readOtpFromMailpit(to: string, since: Date, timeoutMs = 15_000): Promise<string> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}&limit=5`);
    const list = (await res.json()) as { messages: { ID: string; Created: string }[] };
    const recent = list.messages.find((m) => new Date(m.Created) >= since);
    if (recent) {
      const msg = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${recent.ID}`)).json()) as { Text: string; HTML: string };
      const code = /(\d{6})/.exec(`${msg.Text} ${msg.HTML}`)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Aucun code OTP reçu pour ${to}`);
}
