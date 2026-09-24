'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TaskPriority, TaskQuery, TaskStatus } from '../types';
import { priorityLabel, statusLabel } from '../utils/labels';

const ALL = '__all__';
const STATUSES: TaskStatus[] = [
  'CREATED',
  'PLANNED',
  'ASSIGNED',
  'ACCEPTED',
  'EN_ROUTE',
  'ON_SITE',
  'DIAGNOSIS',
  'IN_PROGRESS',
  'CONTROL',
  'COMPLETED',
  'EVALUATED',
  'CANCELLED',
];
const PRIORITIES: TaskPriority[] = ['URGENT', 'HIGH', 'NORMAL', 'LOW'];

export function TasksTableFilters({ query, onChange }: { query: TaskQuery; onChange: (q: TaskQuery) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="relative max-w-xs flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Référence, titre, site…"
          className="pl-9"
          value={query.search ?? ''}
          onChange={(e) => onChange({ ...query, search: e.target.value || undefined })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Statut</Label>
        <Select
          value={query.status ?? ALL}
          onValueChange={(v) => onChange({ ...query, status: v && v !== ALL ? (v as TaskStatus) : undefined })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Priorité</Label>
        <Select
          value={query.priority ?? ALL}
          onValueChange={(v) => onChange({ ...query, priority: v && v !== ALL ? (v as TaskPriority) : undefined })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Toutes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {priorityLabel(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="flex items-center gap-1.5 pb-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="size-3.5"
          checked={query.active ?? false}
          onChange={(e) => onChange({ ...query, active: e.target.checked || undefined })}
        />
        Actives uniquement
      </label>

      <label className="flex items-center gap-1.5 pb-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="size-3.5"
          checked={query.slaBreached ?? false}
          onChange={(e) => onChange({ ...query, slaBreached: e.target.checked || undefined })}
        />
        SLA en dépassement
      </label>
    </div>
  );
}
