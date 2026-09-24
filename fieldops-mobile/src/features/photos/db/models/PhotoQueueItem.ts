import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';
import type { PhotoType } from '../../../../lib/api/types';

export type PhotoQueueStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

/** File d'upload photo — séparée de pending_operations (les photos ne passent pas par /sync/push). */
export class PhotoQueueItem extends Model {
  static table = 'photos_queue';

  @field('local_uri') localUri: string;
  @field('client_photo_id') clientPhotoId: string;
  @field('task_server_id') taskServerId: string;
  @field('type') type: PhotoType;
  @field('lat') lat: number | null;
  @field('lng') lng: number | null;
  @field('accuracy') accuracy: number | null;
  @date('taken_at') takenAt: Date;
  @field('caption') caption: string | null;
  @field('signed_by_name') signedByName: string | null;
  @field('status') status: PhotoQueueStatus;
  @field('attempts') attempts: number;
  @field('error') error: string | null;
  @field('server_photo_id') serverPhotoId: string | null;
  @readonly @date('created_at') createdAt: Date;
}
