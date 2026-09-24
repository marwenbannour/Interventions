import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

// Schéma version 1 : aucune migration encore nécessaire. Ajouter les étapes ici
// à chaque incrément de `schema.ts`'s `version`, jamais en modifiant une table existante en place.
export const migrations = schemaMigrations({ migrations: [] });
