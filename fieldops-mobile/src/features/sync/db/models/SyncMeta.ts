import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

/** Table clé/valeur : `serverTime` (jamais l'horloge du téléphone) et `deviceId`. */
export class SyncMeta extends Model {
  static table = 'sync_meta';

  @field('key') key: string;
  @field('value') value: string;
}
