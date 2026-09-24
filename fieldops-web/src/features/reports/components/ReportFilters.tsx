'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/features/clients/hooks/useClients';
import type { ReportQuery } from '../types';

const ALL = '__all__';

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ReportFilters({ query, onChange }: { query: ReportQuery; onChange: (q: ReportQuery) => void }) {
  const { data: clientsPage } = useClients();
  const clients = clientsPage?.data ?? [];

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="from" className="text-xs text-muted-foreground">
          Du
        </Label>
        <Input
          id="from"
          type="date"
          className="w-40"
          value={query.from ? toDateInputValue(query.from) : ''}
          onChange={(e) => onChange({ ...query, from: new Date(e.target.value).toISOString() })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="to" className="text-xs text-muted-foreground">
          Au
        </Label>
        <Input
          id="to"
          type="date"
          className="w-40"
          value={query.to ? toDateInputValue(query.to) : ''}
          onChange={(e) => onChange({ ...query, to: new Date(e.target.value).toISOString() })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Client</Label>
        <Select
          value={query.clientId ?? ALL}
          onValueChange={(value) => onChange({ ...query, clientId: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tous les clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
