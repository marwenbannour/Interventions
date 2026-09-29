'use client';

import { Loader2, Pencil, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { originLabel, statusLabel } from '@/features/dispatch/utils/labels';
import { assetsApi } from '../api/assets.api';
import { useAssetHistory } from '../hooks/useAssets';
import type { Asset } from '../types';
import { ASSET_STATUS_LABEL, assetStatusVariant } from './labels';

const fmtDate = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(iso)) : '—';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value || '—'}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-2 text-center">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

/** Étiquette QR : image authentifiée → URL objet, libérée au démontage. */
function QrLabel({ asset }: { asset: Asset }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    assetsApi
      .qrPng(asset.id)
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => setUrl(null));
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset.id]);

  const print = () => {
    if (!url) return;
    const w = window.open('', '_blank', 'width=420,height=560');
    if (!w) return;
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
    w.document.write(`<!doctype html><title>${esc(asset.code)}</title>
      <body style="font-family:system-ui;text-align:center;margin:24px">
      <img src="${url}" style="width:260px;height:260px" onload="setTimeout(()=>window.print(),100)"/>
      <h2 style="margin:8px 0 2px">${esc(asset.code)}</h2><div>${esc(asset.name)}</div>
      <div style="color:#666;font-size:12px">${esc(asset.site?.name ?? '')}</div></body>`);
    w.document.close();
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border p-3">
      <div className="flex size-28 flex-none items-center justify-center rounded-lg bg-white">
        {/* URL objet (blob authentifié) : next/image n'apporte rien ici. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt={`QR ${asset.code}`} className="size-28" /> : <Loader2 className="size-5 animate-spin" />}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          À coller sur l&apos;équipement. L&apos;agent le scanne depuis l&apos;application pour prouver sa présence avant de démarrer.
        </p>
        <Button size="sm" variant="outline" onClick={print} disabled={!url} className="w-fit">
          <Printer className="size-4" /> Imprimer l&apos;étiquette
        </Button>
      </div>
    </div>
  );
}

export function AssetDetailSheet({
  assetId,
  onClose,
  onEdit,
  canEdit,
}: {
  assetId: string | null;
  onClose: () => void;
  onEdit: (a: Asset) => void;
  canEdit: boolean;
}) {
  const { data, isLoading } = useAssetHistory(assetId);
  const asset = data?.asset;

  return (
    <Sheet open={!!assetId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{asset ? `${asset.code} — ${asset.name}` : 'Équipement'}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {isLoading && <Loader2 className="mx-auto mt-10 size-5 animate-spin text-muted-foreground" />}
          {asset && data && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <Badge variant={assetStatusVariant(asset.status)}>{ASSET_STATUS_LABEL[asset.status]}</Badge>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => onEdit(asset)}>
                    <Pencil className="size-4" /> Modifier
                  </Button>
                )}
              </div>
              <QrLabel asset={asset} />
              <div>
                <Row label="Client" value={asset.client?.name} />
                <Row label="Site" value={asset.site?.name} />
                <Row label="Emplacement" value={asset.location} />
                <Row label="Catégorie" value={asset.category} />
                <Row label="Marque / modèle" value={[asset.brand, asset.model].filter(Boolean).join(' · ')} />
                <Row label="N° de série" value={asset.serialNumber} />
                <Row label="Mise en service" value={fmtDate(asset.installedAt)} />
                <Row label="Fin de garantie" value={fmtDate(asset.warrantyUntil)} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Stat label="Interventions" value={data.stats.total} />
                <Stat label="Correctives" value={data.stats.corrective} />
                <Stat label="Réinterventions" value={data.stats.reworks} />
                <Stat label="MTBF (jours)" value={data.stats.mtbfDays ?? '—'} />
              </div>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">Historique</p>
                <ul className="flex flex-col gap-2">
                  {data.tasks.map((t) => (
                    <li key={t.id} className="rounded-lg border border-border p-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{t.reference}</span>
                        <span className="text-xs text-muted-foreground">{statusLabel(t.status)}</span>
                      </div>
                      <p className="text-foreground">{t.title}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">{originLabel(t.origin)}</Badge>
                        {t.isRework && <Badge variant="destructive" className="text-[10px]">Réintervention</Badge>}
                        <span className="text-[11px] text-muted-foreground">
                          {fmtDate(t.completedAt ?? t.createdAt)}
                          {t.agent ? ` · ${t.agent.firstName} ${t.agent.lastName}` : ''}
                        </span>
                      </div>
                    </li>
                  ))}
                  {data.tasks.length === 0 && <p className="text-sm text-muted-foreground">Aucune intervention.</p>}
                </ul>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
