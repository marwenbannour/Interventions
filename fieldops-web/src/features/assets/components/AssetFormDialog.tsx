'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api/errors';
import { useCreateAsset, useUpdateAsset } from '../hooks/useAssets';
import type { Asset, AssetStatus } from '../types';
import { ASSET_STATUS_LABEL } from './labels';
import { ScopePicker, type Scope } from './ScopePicker';

interface FormState {
  name: string;
  code: string;
  category: string;
  location: string;
  brand: string;
  model: string;
  serialNumber: string;
  installedAt: string;
  warrantyUntil: string;
  notes: string;
  status: AssetStatus;
}

const EMPTY: FormState = {
  name: '', code: '', category: '', location: '', brand: '', model: '', serialNumber: '',
  installedAt: '', warrantyUntil: '', notes: '', status: 'ACTIVE',
};
const opt = (v: string) => (v.trim() ? v.trim() : undefined);

function AssetFormDialogInner({
  asset,
  open,
  onOpenChange,
}: {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!asset;
  const create = useCreateAsset();
  const update = useUpdateAsset(asset?.id ?? '');
  const pending = create.isPending || update.isPending;
  const [scope, setScope] = useState<Scope>(() => (asset ? { clientId: asset.clientId, siteId: asset.siteId } : {}));
  const [f, setF] = useState<FormState>(() =>
    asset
      ? {
          name: asset.name, code: asset.code, category: asset.category ?? '', location: asset.location ?? '',
          brand: asset.brand ?? '', model: asset.model ?? '', serialNumber: asset.serialNumber ?? '',
          installedAt: asset.installedAt ?? '', warrantyUntil: asset.warrantyUntil ?? '', notes: asset.notes ?? '',
          status: asset.status,
        }
      : EMPTY,
  );
  const [errors, setErrors] = useState<{ name?: string; siteId?: string; code?: string }>({});


  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!f.name.trim()) errs.name = 'Nom requis';
    if (!isEdit && !scope.siteId) errs.siteId = 'Site requis';
    if (f.code && !/^[A-Za-z0-9._-]+$/.test(f.code)) errs.code = 'Lettres, chiffres, . _ - uniquement';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const common = {
      name: f.name.trim(), category: opt(f.category), location: opt(f.location), brand: opt(f.brand), model: opt(f.model),
      serialNumber: opt(f.serialNumber), installedAt: opt(f.installedAt), warrantyUntil: opt(f.warrantyUntil), notes: opt(f.notes),
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ ...common, status: f.status });
        toast.success('Équipement mis à jour.');
      } else {
        const created = await create.mutateAsync({ ...common, siteId: scope.siteId!, code: opt(f.code) });
        toast.success(`Équipement ${created.code} créé.`);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Enregistrement impossible.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Modifier ${asset.code}` : 'Nouvel équipement'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
          <ScopePicker value={scope} onChange={setScope} withAsset={false} lockSite={isEdit} disabled={pending} errors={errors} />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="a-name">Nom *</Label>
              <Input id="a-name" value={f.name} onChange={set('name')} disabled={pending} placeholder="Chaudière gaz, CTA, TGBT…" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-code">Code</Label>
              <Input id="a-code" value={f.code} onChange={set('code')} disabled={pending || isEdit} placeholder="Auto (EQ-000123)" />
              {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-cat">Catégorie</Label>
              <Input id="a-cat" value={f.category} onChange={set('category')} disabled={pending} placeholder="CVC, ELECTRICITE…" />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="a-loc">Emplacement</Label>
              <Input id="a-loc" value={f.location} onChange={set('location')} disabled={pending} placeholder="Bâtiment, étage, local" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-brand">Marque</Label>
              <Input id="a-brand" value={f.brand} onChange={set('brand')} disabled={pending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-model">Modèle</Label>
              <Input id="a-model" value={f.model} onChange={set('model')} disabled={pending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-sn">N° de série</Label>
              <Input id="a-sn" value={f.serialNumber} onChange={set('serialNumber')} disabled={pending} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-inst">Mise en service</Label>
              <Input id="a-inst" type="date" value={f.installedAt} onChange={set('installedAt')} disabled={pending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-war">Fin de garantie</Label>
              <Input id="a-war" type="date" value={f.warrantyUntil} onChange={set('warrantyUntil')} disabled={pending} />
            </div>
            {isEdit && (
              <div className="flex flex-col gap-1.5">
                <Label>Statut</Label>
                <Select value={f.status} onValueChange={(v) => v && setF((p) => ({ ...p, status: v as AssetStatus }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{ASSET_STATUS_LABEL[f.status]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ASSET_STATUS_LABEL) as AssetStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {ASSET_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="a-notes">Notes</Label>
            <Textarea id="a-notes" value={f.notes} onChange={set('notes')} disabled={pending} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Le formulaire n'est monté qu'à l'ouverture et réinitialisé via `key` : l'état local
 * s'initialise par lazy initializer, sans setState dans un effet (règle React Compiler du projet).
 */
export function AssetFormDialog(props: Parameters<typeof AssetFormDialogInner>[0]) {
  if (!props.open) return null;
  return <AssetFormDialogInner key={props.asset?.id ?? 'new'} {...props} />;
}
