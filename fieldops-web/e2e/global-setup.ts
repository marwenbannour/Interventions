import { API_URL } from './support/api';

/** Échoue tôt, avec un message clair, si l'API ou le jeu de démonstration manquent. */
export default async function globalSetup() {
  const health = await fetch(`${API_URL}/health`).catch(() => null);
  if (!health?.ok) {
    throw new Error(`API injoignable sur ${API_URL} — démarrez-la (docker compose up -d) avant les tests E2E.`);
  }
  const login = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@demo.fieldops.io', password: 'Admin123!demo' }),
  });
  if (login.status === 429) {
    throw new Error('Limite de connexions atteinte (429) : relancez l’API avec AUTH_THROTTLE_LIMIT=1000 (cf. e2e/README.md).');
  }
  if (!login.ok) {
    throw new Error('Compte admin de démonstration introuvable — exécutez le seed (npm run seed:prod -- --reset).');
  }
}
