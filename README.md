# FieldOps — Plateforme Enterprise de Gestion des Interventions Terrain

Monorepo de la plateforme (transport de linge, maintenance, services opérationnels) — **version 3.0**.
Spécification de référence : *Cahier des charges technique V3.0* (27/09/2026).

| Application | Dossier | Technologies |
|---|---|---|
| API | [`fieldops-backend/backend`](fieldops-backend/backend/README.md) | NestJS 11, PostgreSQL 16 + PostGIS, Redis/BullMQ, S3 |
| Console web | [`fieldops-web`](fieldops-web) | Next.js 16, React 19, TanStack Query |
| Application agent | [`fieldops-mobile`](fieldops-mobile) | Expo SDK 57, React Native, WatermelonDB (offline-first) |

## Démarrage rapide

```bash
# 1. API + dépendances (PostGIS, Redis, MinIO, Mailpit)
cd fieldops-backend/backend
docker compose up -d --build
docker compose exec api npm run seed:prod
 v
# 2. Console web (http://localhost:3001)
cd ../../fieldops-web && npm ci && npm run dev -- -p 3001

# 3. Application mobile
cd ../fieldops-mobile && npm ci && npx expo start
```

Comptes de démonstration : voir le README de l'API (`admin@demo.fieldops.io` / `Admin123!demo`…).
Le jeu de démonstration contient 4 équipements étiquetés `EQ-000001` à `EQ-000004` (QR `FIELDOPS:ASSET:<code>`) et 2 plans de maintenance préventive.

## Nouveautés V3

- **Parc d'équipements** : codes uniques, étiquettes QR imprimables, historique, MTBF.
- **Scan QR obligatoire** avant de démarrer une intervention sur un équipement (vérifié hors connexion puis par le serveur ; mode de saisie tracé).
- **Maintenance préventive** : plans récurrents, génération automatique sans doublon.
- **Demandes client** (`POST /service-requests`) et **origine** de chaque intervention.
- **Détection des réinterventions** et KPI associés (tableau de bord, agents, équipements).
- **Rapport d'intervention PDF** à la clôture, avec empreinte SHA-256 vérifiable.
- **Webhooks signés (HMAC)** et **clés d'API** à scopes, protection SSRF.
- **Auto-dispatch** paramétrable par organisation.
- **Observabilité** : `/api/metrics` (Prometheus), `X-Request-Id`, Sentry, logs JSON.
- Console web : **création d'intervention**, pages Équipements, Maintenance, Intégrations.

Détail complet : [CHANGELOG.md](CHANGELOG.md).

## ⚠️ Ordre de déploiement V2 → V3

1. API (migration additive, appliquée au démarrage) ; 2. console web ;
3. **application mobile V3, adoptée par les agents** ;
4. seulement ensuite, activer le scan QR en créant une nouvelle version de workflow incluant `ASSET_SCAN`.

Une application mobile V2 considère `ASSET_SCAN` comme non remplie et bloquerait les agents.

## Qualité

La CI (`.github/workflows/ci.yml`) vérifie les trois applications : types, lint, 42 tests unitaires et un test de bout en bout de 44 étapes pour l'API (base, Redis et S3 réels), détection de dérive entre entités et migrations, build de production de la console web.
