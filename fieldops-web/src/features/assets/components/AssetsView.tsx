'use client';

import { Loader2, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSessionStore } from '@/features/auth/store/session.store';
import { useClients } from '@/features/clients/hooks/useClients';
import { canManageAssets } from '@/lib/auth/permissions';
import { useAssets } from '../hooks/useAssets';
import type { Asset, AssetStatus } from '../types';
import { AssetDetailSheet } from './AssetDetailSheet';
import { AssetFormDialog } from './AssetFormDialog';
import { ASSET_STATUS_LABEL, assetStatusVariant } from './labels';

const ALL = '__all__';

export function AssetsView() {
  const role = useSessionStore((s) => s.user?.role);
  const manage = role ? canManageAssets(role) : false;
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState<string | undefined>();
  const [status, setStatus] = useState<AssetStatus | undefined>();
  const { data: clientsPage } = useClients();
  const { data, isLoading } = useAssets({ search: search.trim() || undefined, clientId, status });
  const [selected, setSelected] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const clients = clientsPage?.data ?? [];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Équipements</h1>
          <p className="text-sm text-muted-foreground">Parc suivi par site, étiquettes QR et historique d&apos;interventions.</p>
        </div>
        {manage && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Nouvel équipement
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Code, nom, n° de série…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={clientId ?? ALL} onValueChange={(v) => setClientId(v && v !== ALL ? v : undefined)}>
          <SelectTrigger className="w-56">
            <SelectValue>{clients.find((c) => c.id === clientId)?.name ?? 'Tous les clients'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status ?? ALL} onValueChange={(v) => setStatus(v && v !== ALL ? (v as AssetStatus) : undefined)}>
          <SelectTrigger className="w-44">
            <SelectValue>{status ? ASSET_STATUS_LABEL[status] : 'Tous statuts'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous statuts</SelectItem>
            {(Object.keys(ASSET_STATUS_LABEL) as AssetStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {ASSET_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Équipement</th>
              <th className="px-4 py-2 font-medium">Catégorie</th>
              <th className="px-4 py-2 font-medium">Client / site</th>
              <th className="px-4 py-2 font-medium">Emplacement</th>
              <th className="px-4 py-2 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </td>
              </tr>
            )}
            {(data?.data ?? []).map((a) => (
              <tr
                key={a.id}
                onClick={() => setSelected(a.id)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
              >
                <td className="px-4 py-2 font-mono text-xs font-medium text-foreground">{a.code}</td>
                <td className="px-4 py-2 text-foreground">
                  {a.name}
                  {(a.brand || a.model) && (
                    <span className="block text-xs text-muted-foreground">{[a.brand, a.model].filter(Boolean).join(' · ')}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{a.category ?? '—'}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {a.client?.name}
                  <span className="block text-xs">{a.site?.name}</span>
                </td>
                <td className="max-w-56 truncate px-4 py-2 text-muted-foreground">{a.location ?? '—'}</td>
                <td className="px-4 py-2">
                  <Badge variant={assetStatusVariant(a.status)} className="text-[10px]">
                    {ASSET_STATUS_LABEL[a.status]}
                  </Badge>
                </td>
              </tr>
            ))}
            {!isLoading && (data?.data ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Aucun équipement.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AssetDetailSheet
        assetId={selected}
        onClose={() => setSelected(null)}
        canEdit={manage}
        onEdit={(a) => {
          setEditing(a);
          setFormOpen(true);
        }}
      />
      <AssetFormDialog asset={editing} open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
