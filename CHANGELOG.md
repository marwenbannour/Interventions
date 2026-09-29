# Changelog

## 3.0.0 — 27/09/2026

### Ajouts
- **Équipements** (`/assets`) : parc par site, code unique par organisation (auto `EQ-000001`), étiquette QR (`GET /assets/{id}/qr.png`, contenu `FIELDOPS:ASSET:<code>`), résolution d'un code scanné (`/assets/lookup`), historique et MTBF.
- **Condition de workflow `ASSET_SCAN`** : scan du QR de l'équipement exigé avant « En intervention » (workflow standard). Sans effet si l'intervention n'a pas d'équipement. Mode de saisie (QR / manuel) tracé dans l'historique.
- **Maintenance préventive** (`/maintenance-plans`) : récurrences quotidienne → annuelle × intervalle, calcul ancré (pas de dérive de fin de mois), délai de préparation, génération planifiée toutes les 15 min et manuelle, unicité garantie (SKIP LOCKED + index unique).
- **Demandes client** (`POST /service-requests`) limitées aux sites du client ; **origine** des interventions (`MANUAL`, `CLIENT_REQUEST`, `PREVENTIVE`, `API`).
- **Réinterventions** : détection automatique (même site + même équipement, sinon même type, fenêtre paramétrable), notification, filtre `?rework=true`, KPI tableau de bord (taux, répartition par origine) et agents (reprises imputées).
- **Rapport d'intervention PDF** généré à la clôture (file `documents`), empreinte SHA-256, vérification (`/tasks/{id}/report/verify`), régénération.
- **Intégrations** (`/integrations`) : webhooks signés HMAC-SHA256 horodatés, 8 tentatives, journal rejouable, suspension après 50 échecs ; clés d'API `fo_…` à rôle plafond et scopes (permissions sensibles non délégables), révocation immédiate.
- **Auto-dispatch** (réglage d'organisation `autoDispatch`).
- **Observabilité** : `/api/metrics` (HTTP par route, files BullMQ, sync, webhooks, événements métier), `X-Request-Id` dans réponses, erreurs et logs, Sentry (`SENTRY_DSN`), logs JSON (`LOG_FORMAT=json`).
- **Console web** : création d'intervention, pages Équipements (fiche, QR imprimable), Maintenance, Administration › Intégrations, réglages opérationnels, rapport PDF et badges dans le détail d'intervention, KPI de réintervention.
- **Mobile** : scan QR (caméra, saisie manuelle de secours), fiche équipement, badges origine/réintervention ; base locale en schéma v2 (migration additive).
- Variables d'environnement : `SCHEDULERS_ENABLED`, `WEBHOOKS_ALLOW_HTTP`, `WEBHOOKS_ALLOW_PRIVATE`, `METRICS_TOKEN`, `LOG_FORMAT`, `SENTRY_TRACES_SAMPLE_RATE`, `APP_VERSION`.

### Corrections (anomalies présentes en V2)
- Notifications : le gabarit `{title}` affichait le titre de la notification au lieu de celui de l'intervention (champ masqué par la fusion d'objets).
- API : `?active=false` / `?slaBreached=false` étaient interprétés comme `true`.
- Console web : les listes déroulantes affichaient la valeur technique (`__all__`, identifiants, `60`) au lieu du libellé — corrigé une fois pour toutes dans le composant `Select`.
- Mobile : le type des photos n'apparaissait pas dans l'historique (`photoType` attendu).
- CI : le workflow était placé dans un sous-dossier et n'était donc jamais exécuté par GitHub ; déplacé à la racine et étendu à la console web et au mobile.

### Migration
- Migration de base `V3Features` purement additive (réversible). Organisations existantes : réglages V3 par défaut, workflow V2 conservé.
- Voir l'ordre de déploiement dans le README (mobile avant activation de `ASSET_SCAN`).
