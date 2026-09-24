'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSessionStore } from '@/features/auth/store/session.store';
import { ApiError } from '@/lib/api/errors';
import { canValidatePhotos } from '@/lib/auth/permissions';
import { useTaskPhotos } from '../hooks/useTaskDetail';
import { useValidatePhoto } from '../hooks/useTaskActions';
import { photoTypeLabel } from '../utils/labels';
import type { Photo } from '../types';

const VALIDATION_BADGE: Record<Photo['validation'], { label: string; variant: 'secondary' | 'default' | 'destructive' }> = {
  PENDING: { label: 'À valider', variant: 'secondary' },
  VALIDATED: { label: 'Validée', variant: 'default' },
  REJECTED: { label: 'Rejetée', variant: 'destructive' },
};

function PhotoCard({ photo, taskId, canValidate }: { photo: Photo; taskId: string; canValidate: boolean }) {
  const validate = useValidatePhoto(taskId);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const badge = VALIDATION_BADGE[photo.validation];

  const approve = async () => {
    try {
      await validate.mutateAsync({ photoId: photo.id, valid: true });
      toast.success('Photo validée.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Validation impossible.');
    }
  };

  const reject = async () => {
    if (!reason.trim()) return;
    try {
      await validate.mutateAsync({ photoId: photo.id, valid: false, reason: reason.trim() });
      toast.success('Photo rejetée.');
      setRejecting(false);
      setReason('');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Rejet impossible.');
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-2">
      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
        {photo.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt={photoTypeLabel(photo.type)} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Indisponible</div>
        )}
      </div>
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-medium text-foreground">{photoTypeLabel(photo.type)}</span>
        <Badge variant={badge.variant} className="text-[10px]">
          {badge.label}
        </Badge>
      </div>
      {photo.validation === 'REJECTED' && photo.rejectionReason && (
        <p className="text-xs text-destructive">{photo.rejectionReason}</p>
      )}

      {canValidate && photo.validation === 'PENDING' && (
        <div className="flex flex-col gap-1.5">
          {!rejecting ? (
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="flex-1" onClick={approve} disabled={validate.isPending}>
                {validate.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setRejecting(true)} disabled={validate.isPending}>
                <XCircle className="size-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Textarea
                placeholder="Motif du rejet (requis)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="text-xs"
              />
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" className="flex-1" onClick={() => setRejecting(false)}>
                  Annuler
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" onClick={reject} disabled={!reason.trim() || validate.isPending}>
                  Rejeter
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PhotosReviewSection({ taskId }: { taskId: string }) {
  const { data: photos, isLoading } = useTaskPhotos(taskId);
  const role = useSessionStore((s) => s.user?.role);
  const canValidate = !!role && canValidatePhotos(role);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!photos || photos.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-foreground">Photos ({photos.length})</p>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((photo) => (
          <PhotoCard key={photo.id} photo={photo} taskId={taskId} canValidate={canValidate} />
        ))}
      </div>
    </div>
  );
}
