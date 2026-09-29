'use client';

import { Loader2, Plus, RotateCw, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ApiError } from '@/lib/api/errors';
import { integrationsApi } from '../api/integrations.api';
import { useCatalog, useDeliveries, useIntegrationMutation, useWebhooks } from '../hooks/useIntegrations';
import type { WebhookEndpoint } from '../types';
import { SecretRevealDialog } from './SecretRevealDialog';

const EVENT_LABEL: Record<string, string> = {
  'task.created': 'Intervention créée',
  'task.assigned': 'Intervention affectée',
  'task.transitioned': 'Changement de statut',
  'sla.warning': 'Alerte SLA',
  'sla.breached': 'SLA dépassé',
  'evaluation.created': 'Évaluation client',
  'task.rework_detected': 'Réintervention détectée',
  'report.generated': 'Rapport PDF disponible',
};
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR') : '—');
const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Opération impossible.');

function CreateWebhookDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (secret: string) => void }) {
  const { data: catalog } = useCatalog();
  const create = useIntegrationMutation(integrationsApi.createWebhook);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('https://');
  const [events, setEvents] = useState<string[]>(['task.transitioned']);
  const toggle = (e: string) => setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));

  const submit = async () => {
    if (!name.trim() || !url.trim() || events.length === 0) return toast.error('Nom, URL et au moins un événement requis.');
    try {
      const r = await create.mutateAsync({ name: name.trim(), url: url.trim(), events });
      onOpenChange(false);
      setName('');
      setUrl('https://');
      onCreated(r.secret);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvel abonnement webhook</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wh-name">Nom</Label>
            <Input id="wh-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ERP, GMAO, entrepôt de données…" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wh-url">URL de réception</Label>
            <Input id="wh-url" value={url} onChange={(e) => setUrl(e.target.value)} />
            <p className="text-xs text-muted-foreground">HTTPS obligatoire en production ; adresses réseau internes refusées.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Événements</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {(catalog?.events ?? []).map((e) => (
                <label key={e} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={events.includes(e)} onChange={() => toggle(e)} className="size-3.5" />
                  {EVENT_LABEL[e] ?? e}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeliveriesSheet({ webhook, onClose }: { webhook: WebhookEndpoint | null; onClose: () => void }) {
  const { data, isLoading } = useDeliveries(webhook?.id ?? null);
  const redeliver = useIntegrationMutation(integrationsApi.redeliver);
  return (
    <Sheet open={!!webhook} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Livraisons — {webhook?.name}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {isLoading && <Loader2 className="mx-auto mt-8 size-5 animate-spin" />}
          <ul className="flex flex-col gap-2">
            {(data?.data ?? []).map((d) => (
              <li key={d.id} className="rounded-lg border border-border p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{EVENT_LABEL[d.event] ?? d.event}</span>
                  <Badge variant={d.status === 'SUCCESS' ? 'secondary' : d.status === 'FAILED' ? 'destructive' : 'outline'} className="text-[10px]">
                    {d.status === 'SUCCESS' ? 'Livré' : d.status === 'FAILED' ? 'Échec' : 'En attente'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fmt(d.createdAt)} · {d.attempts} tentative(s)
                  {d.responseStatus ? ` · HTTP ${d.responseStatus}` : ''}
                  {d.durationMs != null ? ` · ${d.durationMs} ms` : ''}
                </p>
                {d.error && <p className="mt-1 text-xs text-destructive">{d.error}</p>}
                {d.status === 'FAILED' && (
                  <Button size="sm" variant="outline" className="mt-1 h-6 px-2 text-xs" onClick={() => redeliver.mutate(d.id)}>
                    <RotateCw className="size-3" /> Relivrer
                  </Button>
                )}
              </li>
            ))}
            {!isLoading && (data?.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucune livraison.</p>}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function WebhooksSection() {
  const { data: webhooks, isLoading } = useWebhooks();
  const { data: catalog } = useCatalog();
  const update = useIntegrationMutation(({ id, isActive }: { id: string; isActive: boolean }) => integrationsApi.updateWebhook(id, { isActive }));
  const remove = useIntegrationMutation(integrationsApi.deleteWebhook);
  const rotate = useIntegrationMutation(integrationsApi.rotateSecret);
  const [createOpen, setCreateOpen] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [deliveriesFor, setDeliveriesFor] = useState<WebhookEndpoint | null>(null);

  const test = async (w: WebhookEndpoint) => {
    try {
      await integrationsApi.test(w.id);
      toast.success('Événement « ping » envoyé.');
      setDeliveriesFor(w);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Webhooks</p>
          <p className="text-xs text-muted-foreground">
            Notifient vos systèmes tiers en temps réel. Signature : en-tête <code>{catalog?.signature.header}</code> au format{' '}
            <code>{catalog?.signature.format}</code>.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Abonnement
        </Button>
      </div>
      {isLoading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
      <div className="flex flex-col divide-y divide-border">
        {(webhooks ?? []).map((w) => (
          <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{w.name}</span>
                <Badge variant={w.isActive ? 'secondary' : 'outline'} className="text-[10px]">
                  {w.isActive ? 'Actif' : 'Suspendu'}
                </Badge>
                {w.consecutiveFailures > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {w.consecutiveFailures} échec(s)
                  </Badge>
                )}
              </div>
              <p className="truncate font-mono text-xs text-muted-foreground">{w.url}</p>
              <p className="text-xs text-muted-foreground">
                {w.events.map((e) => EVENT_LABEL[e] ?? e).join(', ')} · dernière livraison {fmt(w.lastDeliveryAt)}
                {w.disabledReason ? ` · ${w.disabledReason}` : ''}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => test(w)}>
                <Send className="size-3" /> Tester
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setDeliveriesFor(w)}>
                Livraisons
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => update.mutate({ id: w.id, isActive: !w.isActive })}>
                {w.isActive ? 'Suspendre' : 'Réactiver'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={async () => {
                  if (!confirm('Générer un nouveau secret ? L’ancien cessera immédiatement de signer les livraisons.')) return;
                  try {
                    setSecret((await rotate.mutateAsync(w.id)).secret);
                  } catch (e) {
                    toast.error(errMsg(e));
                  }
                }}
              >
                Nouveau secret
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-destructive"
                onClick={() => confirm(`Supprimer l’abonnement « ${w.name} » et son historique ?`) && remove.mutate(w.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && (webhooks ?? []).length === 0 && <p className="py-2 text-sm text-muted-foreground">Aucun abonnement.</p>}
      </div>
      <CreateWebhookDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={setSecret} />
      <SecretRevealDialog
        secret={secret}
        onClose={() => setSecret(null)}
        title="Secret de signature"
        hint="Votre système l’utilise pour vérifier l’en-tête X-FieldOps-Signature (HMAC-SHA256)."
      />
      <DeliveriesSheet webhook={deliveriesFor} onClose={() => setDeliveriesFor(null)} />
    </div>
  );
}
