'use client';

import { Loader2, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSessionStore } from '@/features/auth/store/session.store';
import { canManageClients } from '@/lib/auth/permissions';
import { useClients } from '../hooks/useClients';
import { ClientDetailSheet } from './ClientDetailSheet';
import { ClientFormDialog } from './ClientFormDialog';

export function ClientsView() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useClients(search);
  const role = useSessionStore((s) => s.user?.role);
  const canManage = !!role && canManageClients(role);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const clients = data?.data ?? [];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients.length} client{clients.length > 1 ? 's' : ''}</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nouveau client
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {clients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => setSelectedClientId(client.id)}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/50"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{client.name}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {client.code}
                  </Badge>
                  {!client.isActive && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Inactif
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{client.email ?? client.contractReference ?? '—'}</p>
              </div>
            </button>
          ))}
          {clients.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucun client.</p>}
        </div>
      )}

      <ClientDetailSheet clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />
      <ClientFormDialog client={null} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
