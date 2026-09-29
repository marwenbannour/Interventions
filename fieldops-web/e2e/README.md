# Tests end-to-end de la console (Playwright)

Parcours réels dans un navigateur Chromium, contre l'API et la base de démonstration.

## Prérequis

```bash
# API + dépendances, avec une limite de connexions relevée : pendant les tests, toutes les
# connexions et rafraîchissements de session viennent de la même adresse IP.
cd fieldops-backend/backend
AUTH_THROTTLE_LIMIT=1000 docker compose up -d        # PowerShell : $env:AUTH_THROTTLE_LIMIT=1000; docker compose up -d
docker compose exec api npm run seed:prod -- --reset # jeu de démonstration

# Navigateur (une fois)
cd ../../fieldops-web && npx playwright install chromium
```

## Lancer

```bash
npm run test:e2e              # toute la suite (démarre `npm run dev` si la console ne tourne pas déjà)
npm run test:e2e -- dispatch  # un fichier
npm run test:e2e:ui           # mode interactif
npm run test:e2e:report       # rapport HTML (traces, captures et vidéos des échecs)
```

Variables : `E2E_BASE_URL` (défaut `http://localhost:3001`), `E2E_API_URL` (`http://localhost:3000/api/v1`),
`E2E_MAILPIT_URL` (`http://localhost:8025`, lecture des codes OTP).

## Couverture

| Fichier | Scénarios |
|---|---|
| `auth.spec.ts` | redirections, validation, mauvais mot de passe, session au rechargement, déconnexion, double authentification (code lu dans Mailpit) |
| `navigation-rbac.spec.ts` | menu et pages de chaque rôle, actions masquées (direction), accès admin refusé, onglets admin |
| `dispatch.spec.ts` | création (validation, cascade client → site), affectation par suggestions, note, désaffectation, annulation motivée, kanban, tableau et filtres, lien direct |
| `field-workflow.spec.ts` | cycle complet : travail terrain (via l'API, comme l'app mobile) → validation/rejet des photos → clôture → rapport PDF → évaluation client → Qualité ; contrôle non conforme |
| `clients.spec.ts` | client + site (création, modification, (dés)activation), code en doublon |
| `assets-maintenance.spec.ts` | équipement (code auto, QR, hors service, filtres, doublon), plan préventif (validation, aperçu, génération, suspension, modification) |
| `supervision.spec.ts` | SLA (admin / superviseur), notifications (envoi → réception → lu), reporting et exports CSV, agents (trajet, validation, suspension) |
| `admin.spec.ts` | comptes, zones, workflows, clés d'API et webhooks, journal d'audit |

Les tests créent leurs propres données (noms suffixés d'un identifiant unique) : ils peuvent être relancés
sans réinitialiser la base, et ne modifient pas les données de démonstration utilisées par les autres.
