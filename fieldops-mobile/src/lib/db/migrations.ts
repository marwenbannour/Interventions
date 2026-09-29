import { addColumns, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

// Une étape par incrément de `schema.ts` → `version` ; ne jamais modifier une table existante en place.
export const migrations = schemaMigrations({
  migrations: [
    {
      // V3 : équipement (scan QR hors-ligne), origine et réintervention de la tâche.
      // Colonnes optionnelles : les lignes existantes restent valides jusqu'au prochain pull.
      toVersion: 2,
      steps: [
        addColumns({
          table: 'tasks',
          columns: [
            { name: 'asset_json', type: 'string', isOptional: true },
            { name: 'origin', type: 'string', isOptional: true },
            { name: 'is_rework', type: 'boolean', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
