import { apiFetch, apiUpload } from '../../../lib/api/client';
import type { PhotoRecord, PhotoType } from '../../../lib/api/types';

export interface UploadPhotoParams {
  taskId: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
  type: PhotoType;
  clientPhotoId: string;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  takenAt: string;
  caption?: string | null;
  signedByName?: string | null;
}

export const photosApi = {
  upload: ({ taskId, fileUri, fileName, mimeType, ...fields }: UploadPhotoParams, onProgress?: (f: number) => void) => {
    const form = new FormData();
    // React Native FormData file shape — pas le DOM File standard.
    form.append('file', { uri: fileUri, name: fileName, type: mimeType } as unknown as Blob);
    form.append('type', fields.type);
    form.append('clientPhotoId', fields.clientPhotoId);
    if (fields.lat != null) form.append('lat', String(fields.lat));
    if (fields.lng != null) form.append('lng', String(fields.lng));
    if (fields.accuracy != null) form.append('accuracy', String(fields.accuracy));
    form.append('takenAt', fields.takenAt);
    if (fields.caption) form.append('caption', fields.caption);
    if (fields.signedByName) form.append('signedByName', fields.signedByName);
    return apiUpload<PhotoRecord>(`/tasks/${taskId}/photos`, form, onProgress);
  },

  list: (taskId: string, type?: PhotoType) =>
    apiFetch<PhotoRecord[]>(`/tasks/${taskId}/photos${type ? `?type=${type}` : ''}`),
};
