'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateEvaluation } from '@/features/quality/hooks/useEvaluations';
import { ApiError } from '@/lib/api/errors';
import { StarInput } from './StarInput';

export function EvaluateDialog({
  taskId,
  open,
  onOpenChange,
}: {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [rating, setRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [comment, setComment] = useState('');
  const create = useCreateEvaluation();

  const close = () => {
    onOpenChange(false);
    setRating(0);
    setPunctualityRating(0);
    setQualityRating(0);
    setComment('');
  };

  const submit = async () => {
    if (rating === 0) {
      toast.error('Merci de donner une note globale.');
      return;
    }
    try {
      await create.mutateAsync({
        taskId,
        rating,
        punctualityRating: punctualityRating || undefined,
        qualityRating: qualityRating || undefined,
        comment: comment.trim() || undefined,
      });
      toast.success('Merci pour votre évaluation !');
      close();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Envoi impossible.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Évaluer l&apos;intervention</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <StarInput value={rating} onChange={setRating} label="Note globale" />
          <StarInput value={punctualityRating} onChange={setPunctualityRating} label="Ponctualité" />
          <StarInput value={qualityRating} onChange={setQualityRating} label="Qualité du travail" />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comment">Commentaire (optionnel)</Label>
            <Textarea id="comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={close} disabled={create.isPending}>
            Annuler
          </Button>
          <Button type="button" onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Envoyer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
