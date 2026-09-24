'use client';

import { Loader2, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSessionStore } from '@/features/auth/store/session.store';
import { ApiError } from '@/lib/api/errors';
import { canManageClients } from '@/lib/auth/permissions';
import { useClient, useUpdateClient } from '../hooks/useClients';
import { useSites, useUpdateSite } from '../hooks/useSites';
import { ClientFormDialog } from './ClientFormDialog';
import { SiteFormDialog } from './SiteFormDialog';
import type { Site } from '../types';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function SiteRow({ site, clientId, canManage }: { site: Site; clientId: string; canManage: boolean }) {
  const update = useUpdateSite(site.id, clientId);
  const [editOpen, setEditOpen] = useState(false);

  const toggleActive = async () => {
    try {
      await update.mutateAsync({ isActive: !site.isActive });
      toast.success(site.isActive ? 'Site désactivé.' : 'Site réactivé.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Action impossible.');
    }
  };

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{site.name}</p>
        {!site.isActive && (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            Inactif
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{site.address}</p>
      {site.contactName && (
        <p className="text-xs text-muted-foreground">
          {site.contactName}
          {site.contactPhone ? ` · ${site.contactPhone}` : ''}
        </p>
      )}
      {canManage && (
        <div className="mt-1 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" />
            Modifier
          </Button>
          <Button variant="outline" size="sm" onClick={toggleActive} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="size-3.5 animate-spin" /> : site.isActive ? 'Désactiver' : 'Réactiver'}
          </Button>
        </div>
      )}
      <SiteFormDialog clientId={clientId} site={site} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

export function ClientDetailSheet({ clientId, onClose }: { clientId: string | null; onClose: () => void }) {
  const { data: client, isLoading } = useClient(clientId);
  const { data: sitesPage } = useSites(clientId);
  const role = useSessionStore((s) => s.user?.role);
  const canManage = !!role && canManageClients(role);
  const update = useUpdateClient(clientId ?? '');

  const [editOpen, setEditOpen] = useState(false);
  const [newSiteOpen, setNewSiteOpen] = useState(false);

  const sites = sitesPage?.data ?? [];

  const toggleActive = async () => {
    if (!client) return;
    try {
      await update.mutateAsync({ isActive: !client.isActive });
      toast.success(client.isActive ? 'Client désactivé.' : 'Client réactivé.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Action impossible.');
    }
  };

  return (
    <>
      <Sheet open={!!clientId} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{client ? client.name : 'Client'}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {isLoading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )}

            {client && (
              <div className="flex flex-col gap-6">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="secondary">{client.code}</Badge>
                    {!client.isActive && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactif
                      </Badge>
                    )}
                  </div>
                  <InfoRow label="E-mail" value={client.email ?? '—'} />
                  <InfoRow label="Téléphone" value={client.phone ?? '—'} />
                  <InfoRow label="Référence contrat" value={client.contractReference ?? '—'} />
                  {client.billingAddress && <InfoRow label="Facturation" value={client.billingAddress} />}
                  {client.notes && <InfoRow label="Notes" value={client.notes} />}
                </div>

                {canManage && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="flex-1">
                      <Pencil className="size-3.5" />
                      Modifier
                    </Button>
                    <Button variant="outline" size="sm" onClick={toggleActive} disabled={update.isPending}>
                      {update.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : client.isActive ? (
                        'Désactiver'
                      ) : (
                        'Réactiver'
                      )}
                    </Button>
                  </div>
                )}

                <Separator />

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Sites ({sites.length})</p>
                    {canManage && (
                      <Button variant="outline" size="sm" onClick={() => setNewSiteOpen(true)}>
                        <Plus className="size-3.5" />
                        Site
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {sites.map((site) => (
                      <SiteRow key={site.id} site={site} clientId={client.id} canManage={canManage} />
                    ))}
                    {sites.length === 0 && <p className="text-sm text-muted-foreground">Aucun site.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {client && <ClientFormDialog client={client} open={editOpen} onOpenChange={setEditOpen} />}
      {client && <SiteFormDialog clientId={client.id} site={null} open={newSiteOpen} onOpenChange={setNewSiteOpen} />}
    </>
  );
}
