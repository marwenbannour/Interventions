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
import { useCreateClient, useUpdateClient } from '../hooks/useClients';
import type { Client } from '../types';

const schema = z.object({
  name: z.string().min(1, 'Nom requis').max(200),
  code: z.string().min(1, 'Code requis').max(40),
  email: z.string().email('E-mail invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  billingAddress: z.string().optional(),
  contractReference: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ClientFormDialog({
  client,
  open,
  onOpenChange,
}: {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!client;
  const create = useCreateClient();
  const update = useUpdateClient(client?.id ?? '');
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
        name: client?.name ?? '',
        code: client?.code ?? '',
        email: client?.email ?? '',
        phone: client?.phone ?? '',
        billingAddress: client?.billingAddress ?? '',
        contractReference: client?.contractReference ?? '',
        notes: client?.notes ?? '',
      });
    }
  }, [open, client, reset]);

  const onSubmit = async (values: FormValues) => {
    const input = { ...values, email: values.email || undefined };
    try {
      if (isEdit) {
        await update.mutateAsync(input);
        toast.success('Client mis à jour.');
      } else {
        await create.mutateAsync(input);
        toast.success('Client créé.');
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
          <DialogTitle>{isEdit ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" disabled={pending} {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" disabled={pending} {...register('code')} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" disabled={pending} {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" disabled={pending} {...register('phone')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contractReference">Référence contrat</Label>
            <Input id="contractReference" disabled={pending} {...register('contractReference')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billingAddress">Adresse de facturation</Label>
            <Textarea id="billingAddress" rows={2} disabled={pending} {...register('billingAddress')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} disabled={pending} {...register('notes')} />
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
