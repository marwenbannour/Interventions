'use client';

import { KeyRound, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api/errors';
import { integrationsApi } from '../api/integrations.api';
import { useApiKeys, useCatalog, useIntegrationMutation } from '../hooks/useIntegrations';
import type { ApiKey } from '../types';
import { SecretRevealDialog } from './SecretRevealDialog';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR') : '—');

function CreateKeyDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (k: string) => void }) {
  const { data: catalog } = useCatalog();
  const create = useIntegrationMutation(integrationsApi.createApiKey, 'keys');
  const [name, setName] = useState('');
  const [role, setRole] = useState<ApiKey['role']>('SUPERVISOR');
  const [scopes, setScopes] = useState<string[]>(['task:read', 'task:read_all']);
  const [expiresAt, setExpiresAt] = useState('');
  const available = catalog?.scopes[role] ?? [];
  const toggle = (s: string) => setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const submit = async () => {
    const valid = scopes.filter((s) => available.includes(s));
    if (!name.trim() || valid.length === 0) return toast.error('Nom et au moins un scope requis.');
    try {
      const r = await create.mutateAsync({
        name: name.trim(),
        role,
        scopes: valid,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : undefined,
      });
      onOpenChange(false);
      setName('');
      onCreated(r.key);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Création impossible.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nouvelle clé d&apos;API</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="k-name">Nom</Label>
              <Input id="k-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ERP Sage, Power BI…" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="k-exp">Expiration</Label>
              <Input id="k-exp" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">Rôle plafond :</span>
            {(['SUPERVISOR', 'DIRECTION'] as const).map((r) => (
              <label key={r} className="flex items-center gap-1.5">
                <input type="radio" name="k-role" checked={role === r} onChange={() => setRole(r)} />
                {r === 'SUPERVISOR' ? 'Opérations (lecture/écriture)' : 'Direction (lecture/reporting)'}
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Scopes accordés</Label>
            <div className="grid max-h-56 grid-cols-3 gap-1.5 overflow-y-auto rounded-lg border border-border p-2">
              {available.map((s) => (
                <label key={s} className="flex items-center gap-1.5 font-mono text-xs">
                  <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggle(s)} className="size-3.5" />
                  {s}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Principe du moindre privilège : la gestion des comptes, de l&apos;organisation et des intégrations n&apos;est jamais
              délégable à une clé.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            Créer la clé
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ApiKeysSection() {
  const { data: keys, isLoading } = useApiKeys();
  const revoke = useIntegrationMutation(integrationsApi.revokeApiKey, 'keys');
  const [createOpen, setCreateOpen] = useState(false);
  const [plain, setPlain] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Clés d&apos;API</p>
          <p className="text-xs text-muted-foreground">
            Accès machine-à-machine : en-tête <code>X-API-Key</code> ou <code>Authorization: ApiKey …</code>.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Clé
        </Button>
      </div>
      {isLoading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
      <div className="flex flex-col divide-y divide-border">
        {(keys ?? []).map((k) => {
          const expired = !!k.expiresAt && new Date(k.expiresAt) < new Date();
          return (
            <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-3.5 text-muted-foreground" />
                  <span className="font-medium text-foreground">{k.name}</span>
                  <code className="text-xs text-muted-foreground">fo_{k.prefix}_…</code>
                  {k.revokedAt ? (
                    <Badge variant="outline" className="text-[10px]">Révoquée</Badge>
                  ) : expired ? (
                    <Badge variant="outline" className="text-[10px]">Expirée</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Active</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {k.scopes.length} scope(s) · dernière utilisation {fmt(k.lastUsedAt)}
                  {k.lastUsedIp ? ` (${k.lastUsedIp})` : ''} · expire {k.expiresAt ? fmt(k.expiresAt) : 'jamais'}
                </p>
              </div>
              {!k.revokedAt && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs text-destructive"
                  onClick={() => confirm(`Révoquer « ${k.name} » ? Les appels utilisant cette clé seront refusés immédiatement.`) && revoke.mutate(k.id)}
                >
                  Révoquer
                </Button>
              )}
            </div>
          );
        })}
        {!isLoading && (keys ?? []).length === 0 && <p className="py-2 text-sm text-muted-foreground">Aucune clé.</p>}
      </div>
      <CreateKeyDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={setPlain} />
      <SecretRevealDialog
        secret={plain}
        onClose={() => setPlain(null)}
        title="Clé d'API créée"
        hint="Seule son empreinte est conservée par FieldOps."
      />
    </div>
  );
}
