'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api/errors';
import { useOrganization, useUpdateOrganization } from '../hooks/useOrganizationAdmin';
import type { Organization } from '../types';

/** Valeurs par défaut du serveur (DEFAULT_ORG_SETTINGS) pour les organisations créées avant la V3. */
const DEFAULTS = { reworkWindowDays: 30, minScore: 0.5, onlyOnDuty: true, clientRequestTaskType: 'MAINTENANCE' };

function OperationsForm({ org }: { org: Organization }) {
  const update = useUpdateOrganization();
  const s = org.settings;
  const [autoEnabled, setAutoEnabled] = useState(() => s.autoDispatch?.enabled ?? false);
  const [minScore, setMinScore] = useState(() => String(s.autoDispatch?.minScore ?? DEFAULTS.minScore));
  const [onlyOnDuty, setOnlyOnDuty] = useState(() => s.autoDispatch?.onlyOnDuty ?? DEFAULTS.onlyOnDuty);
  const [reworkDays, setReworkDays] = useState(() => String(s.reworkWindowDays ?? DEFAULTS.reworkWindowDays));
  const [requestType, setRequestType] = useState(() => s.clientRequestTaskType ?? DEFAULTS.clientRequestTaskType);

  const save = async () => {
    const score = Number(minScore);
    const days = Number(reworkDays);
    if (!(score >= 0 && score <= 1)) return toast.error('Le score minimal doit être compris entre 0 et 1.');
    if (!Number.isInteger(days) || days < 0 || days > 365) return toast.error('Fenêtre de réintervention : 0 à 365 jours.');
    if (!requestType.trim()) return toast.error('Type des demandes client requis.');
    try {
      await update.mutateAsync({
        settings: {
          autoDispatch: { enabled: autoEnabled, minScore: score, onlyOnDuty },
          reworkWindowDays: days,
          clientRequestTaskType: requestType.trim().toUpperCase(),
        },
      });
      toast.success('Paramètres opérationnels enregistrés.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Enregistrement impossible.');
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">Opérations (V3)</p>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input type="checkbox" checked={autoEnabled} onChange={(e) => setAutoEnabled(e.target.checked)} className="size-3.5" />
          Affectation automatique (auto-dispatch)
        </label>
        <p className="text-xs text-muted-foreground">
          À la création, l&apos;intervention est confiée au meilleur agent suggéré (compétences, distance, charge, qualité) si son
          score atteint le seuil. Sinon elle reste dans la file de dispatch.
        </p>
        <div className="flex flex-wrap items-end gap-4 pl-5">
          <div className="flex w-40 flex-col gap-1.5">
            <Label htmlFor="ad-score">Score minimal (0–1)</Label>
            <Input id="ad-score" type="number" step="0.05" min={0} max={1} value={minScore} disabled={!autoEnabled} onChange={(e) => setMinScore(e.target.value)} />
          </div>
          <label className="flex items-center gap-1.5 pb-2 text-sm text-foreground">
            <input type="checkbox" checked={onlyOnDuty} disabled={!autoEnabled} onChange={(e) => setOnlyOnDuty(e.target.checked)} className="size-3.5" />
            Uniquement les agents en service
          </label>
        </div>
      </div>

      <div className="grid max-w-xl grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rw-days">Fenêtre de réintervention (jours)</Label>
          <Input id="rw-days" type="number" min={0} max={365} value={reworkDays} onChange={(e) => setReworkDays(e.target.value)} />
          <p className="text-xs text-muted-foreground">0 désactive la détection.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cr-type">Type des demandes client</Label>
          <Input id="cr-type" value={requestType} onChange={(e) => setRequestType(e.target.value)} />
          <p className="text-xs text-muted-foreground">Détermine le workflow appliqué aux demandes du portail.</p>
        </div>
      </div>

      <Button size="sm" onClick={save} disabled={update.isPending} className="w-fit">
        {update.isPending ? <Loader2 className="size-3.5 animate-spin" /> : 'Enregistrer'}
      </Button>
    </div>
  );
}

export function OperationsSettingsCard() {
  const { data: org, isLoading } = useOrganization();
  if (isLoading || !org) return <Loader2 className="size-5 animate-spin text-muted-foreground" />;
  return <OperationsForm org={org} />;
}
