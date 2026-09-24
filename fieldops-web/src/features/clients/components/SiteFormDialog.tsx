'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api/errors';
import { useCreateSite, useUpdateSite } from '../hooks/useSites';
import type { Site } from '../types';

const schema = z.object({
  name: z.string().min(1, 'Nom requis').max(200),
  address: z.string().min(1, 'Adresse requise'),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  accessInstructions: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function SiteFormDialog({
  clientId,
  site,
  open,
  onOpenChange,
}: {
  clientId: string;
  site: Site | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!site;
  const create = useCreateSite();
  const update = useUpdateSite(site?.id ?? '', clientId);
  const pending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({
        name: site?.name ?? '',
        address: site?.address ?? '',
        postalCode: site?.postalCode ?? '',
        city: site?.city ?? '',
        contactName: site?.contactName ?? '',
        contactPhone: site?.contactPhone ?? '',
        accessInstructions: site?.accessInstructions ?? '',
      });
    }
  }, [open, site, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit) {
        await update.mutateAsync(values);
        toast.success('Site mis à jour.');
      } else {
        await create.mutateAsync({ ...values, clientId });
        toast.success('Site créé.');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Enregistrement impossible.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le site' : 'Nouveau site'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" disabled={pending} {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" disabled={pending} {...register('address')} />
            {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="postalCode">Code postal</Label>
              <Input id="postalCode" disabled={pending} {...register('postalCode')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" disabled={pending} {...register('city')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contactName">Contact sur site</Label>
              <Input id="contactName" disabled={pending} {...register('contactName')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contactPhone">Téléphone contact</Label>
              <Input id="contactPhone" disabled={pending} {...register('contactPhone')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accessInstructions">Instructions d&apos;accès</Label>
            <Textarea id="accessInstructions" rows={2} disabled={pending} {...register('accessInstructions')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
