import { Model } from '@nozbe/watermelondb';
import { date, field } from '@nozbe/watermelondb/decorators';

export type LocationPingStatus = 'pending' | 'sent';

/** File GPS locale avant flush batch vers POST /agents/me/location. */
export class LocationPing extends Model {
  static table = 'location_pings';

  @field('lat') lat: number;
  @field('lng') lng: number;
  @field('accuracy') accuracy: number | null;
  @field('speed') speed: number | null;
  @field('heading') heading: number | null;
  @field('battery') battery: number | null;
  @field('task_id') taskId: string | null;
  @date('recorded_at') recordedAt: Date;
  @field('status') status: LocationPingStatus;
}
