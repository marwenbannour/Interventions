'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminUsers, useAuditLog } from '../hooks/useAudit';

const ALL = '__all__';

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso));
}

export function AuditLogView() {
  const [resource, setResource] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [action, setAction] = useState('');

  const { data: usersPage } = useAdminUsers();
  const { data, isLoading } = useAuditLog({ resource, userId, action: action || undefined });

  const users = usersPage?.data ?? [];
  const userLabel = (id: string | null | undefined) => {
    if (!id) return 'Système';
    const u = users.find((x) => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : id;
  };
  const resources = Array.from(new Set((data?.data ?? []).map((e) => e.resource)));

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Audit</h1>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.meta.total} entrée${data.meta.total > 1 ? 's' : ''}` : 'Chargement…'}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Utilisateur</Label>
          <Select value={userId ?? ALL} onValueChange={(v) => setUserId(v && v !== ALL ? v : undefined)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Ressource</Label>
          <Select value={resource ?? ALL} onValueChange={(v) => setResource(v && v !== ALL ? v : undefined)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes</SelectItem>
              {resources.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="action" className="text-xs text-muted-foreground">
            Action
          </Label>
          <Input id="action" placeholder="ex. task.transition" className="w-52" value={action} onChange={(e) => setAction(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Utilisateur</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Ressource</th>
                <th className="px-4 py-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 tabular-nums text-muted-foreground">{formatDateTime(entry.createdAt)}</td>
                  <td className="px-4 py-2 text-foreground">{userLabel(entry.userId)}</td>
                  <td className="px-4 py-2 font-mono text-xs text-foreground">{entry.action}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {entry.resource}
                    {entry.resourceId ? ` (${entry.resourceId.slice(0, 8)}…)` : ''}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={entry.success ? 'secondary' : 'destructive'} className="text-[10px]">
                      {entry.success ? 'OK' : 'Échec'}
                    </Badge>
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Aucune entrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
