'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/features/clients/hooks/useClients';
import { useSites } from '@/features/clients/hooks/useSites';
import { useAssets } from '../hooks/useAssets';

const NONE = '__none__';

export interface Scope {
  clientId?: string;
  siteId?: string;
  assetId?: string;
}

/**
 * Sélection en cascade client → site → équipement (V3), partagée par les formulaires
 * d'intervention, d'équipement et de plan de maintenance.
 */
export function ScopePicker({
  value,
  onChange,
  withAsset = true,
  disabled,
  lockSite,
  errors,
}: {
  value: Scope;
  onChange: (next: Scope) => void;
  withAsset?: boolean;
  disabled?: boolean;
  /** Édition : le site ne peut plus changer (ex. plan de maintenance existant). */
  lockSite?: boolean;
  errors?: { siteId?: string };
}) {
  const { data: clientsPage } = useClients();
  const { data: sitesPage } = useSites(value.clientId ?? null);
  const { data: assetsPage } = useAssets({ siteId: value.siteId }, withAsset && !!value.siteId);
  const clients = clientsPage?.data ?? [];
  const sites = sitesPage?.data ?? [];
  const assets = (assetsPage?.data ?? []).filter((a) => a.status !== 'RETIRED');
  const name = <T extends { id: string; name: string }>(list: T[], id?: string) => list.find((x) => x.id === id)?.name;

  return (
    <div className={`grid gap-3 ${withAsset ? 'grid-cols-3' : 'grid-cols-2'}`}>
      <div className="flex flex-col gap-1.5">
        <Label>Client</Label>
        <Select
          value={value.clientId ?? NONE}
          disabled={disabled || lockSite}
          onValueChange={(v) => onChange({ clientId: v && v !== NONE ? v : undefined })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choisir">{name(clients, value.clientId) ?? 'Choisir'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Site *</Label>
        <Select
          value={value.siteId ?? NONE}
          disabled={disabled || lockSite || !value.clientId}
          onValueChange={(v) => onChange({ clientId: value.clientId, siteId: v && v !== NONE ? v : undefined })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choisir">{name(sites, value.siteId) ?? 'Choisir'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sites.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.siteId && <p className="text-xs text-destructive">{errors.siteId}</p>}
      </div>
      {withAsset && (
        <div className="flex flex-col gap-1.5">
          <Label>Équipement</Label>
          <Select
            value={value.assetId ?? NONE}
            disabled={disabled || !value.siteId}
            onValueChange={(v) => onChange({ ...value, assetId: v && v !== NONE ? v : undefined })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Aucun">
                {value.assetId ? (() => {
                  const a = assets.find((x) => x.id === value.assetId);
                  return a ? `${a.code} — ${a.name}` : 'Aucun';
                })() : 'Aucun'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Aucun</SelectItem>
              {assets.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
