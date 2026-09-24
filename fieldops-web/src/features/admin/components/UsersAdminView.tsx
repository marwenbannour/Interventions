'use client';

import { Loader2, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUsersAdmin } from '../hooks/useUsersAdmin';
import { UserFormDialog } from './UserFormDialog';
import type { AdminUser, Role, UserStatus } from '../types';

const ALL = '__all__';
const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrateur',
  SUPERVISOR: 'Superviseur',
  AGENT: 'Agent',
  CLIENT: 'Client',
  DIRECTION: 'Direction',
};
const STATUS_VARIANT: Record<UserStatus, 'secondary' | 'outline' | 'destructive'> = {
  ACTIVE: 'secondary',
  INVITED: 'outline',
  SUSPENDED: 'destructive',
};
const STATUS_LABEL: Record<UserStatus, string> = { ACTIVE: 'Actif', INVITED: 'Invité', SUSPENDED: 'Suspendu' };

export function UsersAdminView() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [status, setStatus] = useState<UserStatus | undefined>(undefined);
  const { data, isLoading } = useUsersAdmin({ search: search || undefined, role, status });

  const [dialog, setDialog] = useState<{ open: boolean; user: AdminUser | null }>({ open: false, user: null });
  const users = data?.data ?? [];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Comptes</h1>
          <p className="text-sm text-muted-foreground">{users.length} compte{users.length > 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setDialog({ open: true, user: null })}>
          <Plus className="size-4" />
          Nouveau compte
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={role ?? ALL} onValueChange={(v) => setRole(v && v !== ALL ? (v as Role) : undefined)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tous les rôles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les rôles</SelectItem>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status ?? ALL} onValueChange={(v) => setStatus(v && v !== ALL ? (v as UserStatus) : undefined)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les statuts</SelectItem>
            {(Object.keys(STATUS_LABEL) as UserStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setDialog({ open: true, user: u })}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/50"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {u.firstName} {u.lastName}
                  </p>
                  <Badge variant="secondary" className="text-[10px]">
                    {ROLE_LABEL[u.role]}
                  </Badge>
                  <Badge variant={STATUS_VARIANT[u.status]} className="text-[10px]">
                    {STATUS_LABEL[u.status]}
                  </Badge>
                  {u.mfaEnabled && (
                    <Badge variant="outline" className="text-[10px]">
                      MFA
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
            </button>
          ))}
          {users.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucun compte.</p>}
        </div>
      )}

      <UserFormDialog user={dialog.user} open={dialog.open} onOpenChange={(open) => setDialog((s) => ({ ...s, open }))} />
    </div>
  );
}
