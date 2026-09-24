# FieldOps — Backend API

API de la plateforme Enterprise de gestion des interventions terrain (transport de linge, maintenance, services), conforme au cahier des charges technique V2.0 du 22 septembre 2026.

Stack : NestJS 11 et TypeScript, PostgreSQL 16 + PostGIS, Redis (positions live, files BullMQ, pub/sub Socket.IO), stockage objet compatible S3, JWT et RBAC.

L'API REST est versionnée sous `/api/v1`. La documentation OpenAPI interactive est sur `/api/docs`, et une copie statique se trouve dans `docs/openapi.json` (84 opérations), utilisable pour générer les clients web et mobile.

---

## 1. Démarrage rapide

### Avec Docker (recommandé)

```bash
docker compose up -d --build           # PostgreSQL/PostGIS, Redis, MinIO, Mailpit, API
docker compose exec api npm run seed:prod
```

| Service | URL |
|---|---|
| API | http://localhost:3000/api/v1 |
| Swagger | http://localhost:3000/api/docs |
| Console MinIO (preuves) | http://localhost:9001 — `minioadmin` / `minioadmin` |
| Mailpit (e-mails, codes OTP) | http://localhost:8025 |

Les migrations sont appliquées automatiquement au démarrage de l'API (`DB_RUN_MIGRATIONS=true`).

### En local (sans Docker pour l'API)

Prérequis : Node.js 20 ou plus, PostgreSQL avec PostGIS, Redis, et un stockage S3 (MinIO par exemple).

```bash
cp .env.example .env         # adapter les accès
npm ci
npm run migration:run
npm run seed                 # "npm run seed -- --reset" pour recréer la démo
npm run start:dev
```

### Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur | admin@demo.fieldops.io | `Admin123!demo` |
| Superviseur / dispatcher | superviseur@demo.fieldops.io | `Superviseur123!` |
| Direction | direction@demo.fieldops.io | `Direction123!` |
| Agent (×3) | agent1@ / agent2@ / agent3@demo.fieldops.io | `Agent123!demo` |
| Client (Clinique Saint-Martin) | client@clinique-sm.fr | `Client123!demo` |

Le jeu de démonstration contient :

- deux clients et quatre sites géolocalisés à Paris ;
- deux zones ;
- les workflows *Standard* (maintenance) et *Linge* (livraison / collecte) ;
- deux politiques SLA : par défaut et urgence ;
- cinq interventions à différents stades.

---

## 2. Architecture

```
src/
├── common/          guards (JWT, permissions), décorateurs, filtre d'erreurs, événements, utilitaires géo
├── config/          configuration typée + validation Joi des variables d'environnement
├── database/        DataSource CLI, migrations, seed
├── infra/           Redis, stockage S3
└── modules/
    ├── auth             login, MFA/OTP, refresh tokens rotatifs, verrouillage de compte
    ├── users            utilisateurs et profils
    ├── organizations    tenant, réglages, zones, équipes
    ├── agents           profils agents, validation, prise de service, charge
    ├── clients          clients et sites (PostGIS, géofence)
    ├── workflows        moteur de workflow configurable et versionné
    ├── tasks            interventions, affectation, transitions, checklist, historique
    ├── photos           preuves numériques (S3, SHA-256, géoloc, validation)
    ├── sla              politiques, échéances, alertes et dépassements (planificateur BullMQ)
    ├── location         GPS live (Redis GEO) et historique (PostGIS)
    ├── planning         planning par agent, suggestion d'affectation
    ├── evaluations      évaluation client, score qualité agent
    ├── sync             synchronisation offline-first (push / pull)
    ├── notifications    in-app, push (Expo), e-mail (SMTP), SMS — file BullMQ avec reprises
    ├── reports          KPI, SLA, performance agents / sites, export CSV
    ├── realtime         passerelle Socket.IO (adaptateur Redis multi-instances)
    ├── audit            journal des opérations sensibles
    └── health           sondes liveness / readiness
```

Les modules communiquent par événements métier internes (`task.transitioned`, `sla.breached`, `location.updated`…). Ces événements alimentent à la fois les notifications et le temps réel, sans couplage direct entre modules.

La multi-location repose sur une isolation logique : chaque entité métier porte un `organizationId`, extrait du JWT et appliqué à toutes les requêtes. Les tâches périodiques (scan SLA toutes les 60 s, purge de rétention quotidienne) passent par des jobs BullMQ répétables. Il n'y a donc qu'une seule exécution, même avec plusieurs instances de l'API.

---

## 3. Sécurité et rôles

L'authentification repose sur trois mécanismes :

- **Access token** : JWT de 15 minutes (`aud=fieldops-api`, `iss=fieldops`).
- **Refresh token** : opaque, 30 jours, stocké haché. Il change à chaque usage. S'il est réutilisé, toute sa famille est révoquée, ce qui neutralise un vol de jeton.
- **MFA par OTP** (e-mail ou SMS) : activable par utilisateur ou imposée par rôle via les réglages de l'organisation. Le code est stocké haché dans Redis pendant 5 minutes, avec 5 essais maximum.

Protections en place :

- verrouillage du compte 15 minutes après 5 échecs de connexion ;
- limitation de débit globale et renforcée sur `/auth` ;
- en-têtes Helmet et CORS configurable ;
- validation stricte des entrées (whitelist).

Les fichiers de preuve sont privés et ne sont servis que par des URL signées temporaires (10 minutes par défaut). Les opérations sensibles (affectation, transitions, validations, gestion des utilisateurs…) sont journalisées dans `audit_logs`, avec l'utilisateur, l'IP, l'agent utilisateur et le résultat.

| Rôle | Périmètre |
|---|---|
| ADMIN | Toutes les permissions |
| SUPERVISOR | Clients, sites, agents, interventions, affectation, validation des preuves, reporting |
| AGENT | Ses interventions, exécution, photos, envoi de position |
| CLIENT | Interventions, preuves, SLA et reporting de son seul compte ; évaluation |
| DIRECTION | Lecture globale et reporting |

La matrice détaillée est dans `src/common/enums/permission.enum.ts`.

---

## 4. Workflow d'intervention

Le workflow standard (§7) enchaîne les états suivants :

```
CREATED → PLANNED → ASSIGNED → ACCEPTED → EN_ROUTE → ON_SITE → DIAGNOSIS → IN_PROGRESS → CONTROL → COMPLETED → EVALUATED
                                                                                                  (+ CANCELLED depuis tout état)
```

Les règles bloquantes sont appliquées côté serveur, quel que soit le client (web, mobile ou synchronisation) :

| Transition | Conditions |
|---|---|
| → ACCEPTED / EN_ROUTE | Agent affecté uniquement |
| → ON_SITE | Position transmise **dans la géofence du site** (rayon du site, sinon 300 m par défaut) |
| → IN_PROGRESS | Au moins une photo **avant** |
| → CONTROL | Photo **après** + checklist obligatoire complète |
| Refus agent, reprise, annulation | Commentaire obligatoire |
| → EVALUATED | Automatique à la réception de l'évaluation client |

Le workflow **Linge** supprime le diagnostic et exige une photo de **preuve de livraison** ainsi que la **signature** du réceptionnaire. Les workflows sont des données versionnées (`/workflows`) : on peut en créer de nouveaux par type d'intervention sans modifier le code, et les tâches en cours conservent leur version.

`GET /tasks/:id` renvoie `availableTransitions`, c'est-à-dire les actions possibles pour l'utilisateur courant avec leurs prérequis manquants. Le mobile n'affiche que ce que le serveur autorise.

Un refus renvoie une erreur `422` :

```json
{ "statusCode": 422, "code": "TRANSITION_BLOCKED", "message": "Conditions de transition non remplies",
  "missing": ["Photo « après » obligatoire", "Checklist incomplète"], "currentStatus": "IN_PROGRESS" }
```

---

## 5. SLA (§9)

La politique appliquée est la plus spécifique qui correspond, dans cet ordre : site, puis client, puis type d'intervention, puis priorité, puis politique par défaut. Chaque politique définit quatre délais, mesurés par rapport à la création de l'intervention :

- prise en charge (par défaut 15 min) ;
- arrivée sur site (45 min) ;
- durée d'intervention (120 min) ;
- clôture (180 min).

Les échéances sont calculées à la création et recalculées si la priorité ou la planification change. Un scan toutes les 60 secondes émet une **alerte** à T−15 min, puis un **dépassement**. Chaque alerte n'est envoyée qu'une fois, et elle est notifiée aux superviseurs, à l'agent et à la direction. `GET /sla/at-risk` liste les interventions dont une échéance tombe dans l'horizon choisi.

---

## 6. Endpoints principaux (`/api/v1`)

| Domaine | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `/auth/otp/verify`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all` |
| Utilisateurs | `GET/PATCH /users/me`, `POST /users/me/password`, `GET/POST /users`, `GET/PATCH /users/:id` |
| Organisation | `GET/PATCH /organization`, `/organization/settings`, `/organization/zones`, `/organization/teams` |
| Agents | `GET /agents`, `GET /agents/me`, `POST /agents/me/duty`, `GET/PATCH /agents/:id`, `POST /agents/:id/status` |
| Géolocalisation | `POST /agents/me/location` (lot ≤ 500 points), `GET /agents/locations/live`, `GET /agents/locations/nearby`, `GET /agents/:id/location`, `GET /agents/:id/location/history` |
| Clients / sites | `GET/POST/PATCH /clients`, `GET/POST/PATCH /sites` |
| Interventions | `GET/POST /tasks`, `GET/PATCH /tasks/:id`, `GET /tasks/:id/history`, `POST /tasks/:id/assign`, `/unassign`, `/transition`, `/start`, `/complete`, `PATCH /tasks/:id/checklist`, `POST /tasks/:id/notes` |
| Preuves | `GET/POST /tasks/:id/photos` (multipart `file`), `POST /photos/:id/validate` |
| Planification | `GET /planning?from&to`, `GET /tasks/:id/suggested-agents` |
| Workflows | `GET/POST /workflows`, `GET/PATCH /workflows/:id` |
| SLA | `GET/POST/PATCH /sla/policies`, `GET /sla/at-risk` |
| Évaluations | `GET/POST /evaluations` |
| Sync offline | `POST /sync/push`, `GET /sync/pull?since` |
| Notifications | `GET /notifications`, `POST /notifications/read`, `POST/DELETE /notifications/devices`, `POST /notifications/send` |
| Reporting | `GET /reports/dashboard`, `/reports/sla`, `/reports/agents`, `/reports/sites` (`?format=csv`) |
| Audit | `GET /audit-logs` |
| Santé | `GET /health` (readiness DB + Redis), `GET /health/live` |

Les listes sont paginées (`?page=&limit=`) et renvoient `{ data, meta: { page, limit, total, pages } }`.

---

## 7. Contrat de synchronisation offline (pour l'application mobile)

Le mobile garde une copie locale de ses interventions (SQLite / WatermelonDB) et une **file d'actions**. Toute action terrain est d'abord enregistrée localement, puis rejouée dès que le réseau revient.

### Push — `POST /sync/push`

```json
{
  "deviceId": "iphone-karim",
  "operations": [
    { "clientOpId": "0c9e…", "type": "TASK_TRANSITION", "taskId": "…", "clientTimestamp": "2026-09-22T08:14:03Z",
      "payload": { "to": "ON_SITE", "lat": 48.8339, "lng": 2.3418 } },
    { "clientOpId": "5b1a…", "type": "CHECKLIST_UPDATE", "taskId": "…", "clientTimestamp": "…",
      "payload": { "items": [{ "id": "c1", "done": true }] } },
    { "clientOpId": "77fe…", "type": "TASK_NOTE", "taskId": "…", "clientTimestamp": "…",
      "payload": { "text": "Accès par le parking" } }
  ]
}
```

Règles appliquées par le serveur :

1. **Idempotence.** Chaque `clientOpId` (un UUID généré par le mobile) n'est appliqué qu'une fois. Renvoyer un lot déjà traité donne `DUPLICATE`, sans effet de bord.
2. **Ordre.** Les opérations sont triées par `clientTimestamp` avant application.
3. **Horodatage terrain conservé.** L'historique enregistre `occurredAt` (heure locale de l'action) avec `source = OFFLINE_SYNC`. Les SLA sont calculés sur cette heure si elle est plausible, c'est-à-dire ni dans le futur ni vieille de plus de 7 jours.
4. **Le serveur fait foi.** Une action invalide (transition interdite, intervention réaffectée ou annulée entre-temps) est `REJECTED` avec un code d'erreur. Chaque résultat contient l'**état serveur** de l'intervention (`status`, `agentId`, `checklist`, `version`), et le mobile remplace son état local par celui-ci.
5. **Convergence.** Une transition vers l'état déjà courant est considérée comme appliquée.

Réponse :

```json
{ "serverTime": "…", "results": [ { "clientOpId": "0c9e…", "status": "APPLIED | DUPLICATE | REJECTED",
  "error": { "code": "TRANSITION_BLOCKED", "message": "…", "details": [] }, "task": { "id": "…", "status": "ON_SITE", "version": 7 } } ] }
```

Les **photos** ne passent pas par `/sync/push`. Elles utilisent `POST /tasks/:id/photos` avec un `clientPhotoId`, qui est idempotent : un renvoi retourne la photo existante avec `duplicate: true`. Le mobile doit donc envoyer les photos **avant** les transitions qui en dépendent. Les **positions GPS** sont mises en tampon et envoyées par lots via `POST /agents/me/location`.

### Pull — `GET /sync/pull?since=<serverTime précédent>`

- Sans `since`, le pull est complet : toutes les interventions actives du périmètre.
- Avec `since`, il ne renvoie que ce qui a été modifié depuis.
- `removedTaskIds` liste les interventions retirées à l'agent (réaffectation), à supprimer localement.
- La réponse inclut aussi les `workflows` utilisés, pour que le mobile évalue les actions possibles hors ligne, et les `settings` de suivi GPS (fréquence, suivi uniquement en service, géofence).

Il faut conserver le `serverTime` renvoyé et le passer au pull suivant, sans jamais utiliser l'horloge du téléphone.

---

## 8. Temps réel (Socket.IO)

```js
const socket = io('https://api.exemple.fr/realtime', { auth: { token: accessToken } });
```

| Événement | Destinataires | Contenu |
|---|---|---|
| `task.event` | Superviseurs, agent affecté (et l'ancien lors d'une réaffectation), client | `type` (`created`, `updated`, `assigned`, `transitioned`), référence, statut… |
| `agent.location` | Superviseurs / direction | Position, vitesse, batterie, tâche en cours |
| `sla.alert` | Superviseurs, agent | `level` : `warning` ou `breached`, indicateur, échéance |
| `notification` | Utilisateur | Notification in-app |
| `photo.added`, `evaluation.created` | Superviseurs | — |

L'agent peut aussi émettre `location:update` (un point ou un tableau de points, avec les mêmes champs que l'API REST) lorsqu'il est en ligne. Plusieurs instances de l'API partagent les salles grâce à l'adaptateur Redis.

---

## 9. Tests et qualité

```bash
npm run lint          # vérification des types TypeScript
npm test              # tests unitaires (moteur de workflow : rôles, géofence, preuves, checklist, workflow linge)
npm run test:smoke    # parcours de bout en bout sur une API démarrée et seedée (33 étapes)
```

Le test de bout en bout couvre :

- l'authentification, la rotation des jetons et la détection de réutilisation ;
- le RBAC et le cloisonnement du périmètre client ;
- le GPS live et les suggestions d'affectation ;
- le workflow complet avec géofence, photos, checklist, validation et évaluation ;
- la synchronisation offline (ordre, idempotence, rejet, horodatage conservé, réaffectation) ;
- le planning, le reporting, l'export CSV, les notifications, l'audit et les événements temps réel.

La CI GitHub Actions (`.github/workflows/ci.yml`) enchaîne types, tests unitaires, build, migrations et seed, vérifie que **les migrations sont à jour avec les entités**, lance le test de bout en bout, puis publie l'image Docker sur GHCR.

Mesure indicative en local sur le jeu de démonstration (150 requêtes par route) : P95 de `GET /tasks` ≈ 21 ms, positions live ≈ 6 ms, dashboard ≈ 9 ms, pour une cible de 300 ms. Un test de charge sur un volume réaliste reste à faire avant la mise en production.

---

## 10. Mise en production — points de contrôle

- Définir `JWT_ACCESS_SECRET` et `JWT_MFA_SECRET` (au moins 32 caractères, gestionnaire de secrets), `CORS_ORIGINS`, et laisser `DB_SYNCHRONIZE=false`.
- Choisir un stockage S3 hébergé dans l'UE (OVHcloud, Scaleway, AWS eu-west-3) avec chiffrement côté serveur et cycle de vie cohérent avec `photoRetentionDays`.
- Configurer `PUSH_PROVIDER=expo`, `EMAIL_PROVIDER=smtp`, et brancher un fournisseur SMS dans `SmsProvider` : le seul mode livré est `log`.
- Désactiver Swagger en production, sauf `SWAGGER_ENABLED=true`.
- Placer l'API derrière un reverse proxy TLS. Sur Kubernetes, utiliser les sondes `/api/v1/health/live` et `/api/v1/health`.
- Sauvegarder PostgreSQL (PITR) et activer la persistance AOF de Redis.

### Limites connues de cette version

- L'intégration **Sentry** n'est pas branchée : la variable `SENTRY_DSN` est prévue mais inutilisée.
- Pas de fournisseur SMS réel.
- Pas de rendu PDF des rapports ; l'export se fait en CSV.
- L'isolation multi-tenant est applicative ; la Row Level Security PostgreSQL est une évolution possible.
- Le verrouillage pessimiste sérialise les transitions concurrentes sur une même intervention, mais la résolution de conflits se limite aux règles du §7 ci-dessus.
