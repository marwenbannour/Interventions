'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeams, useZones } from '../hooks/useOrganization';

export interface DispatchFilters {
  from: string;
  to: string;
  zoneId?: string;
  teamId?: string;
}

const ALL = '__all__';

/** YYYY-MM-DD en heure locale (pas `.toISOString().slice(0,10)`, qui bascule sur le jour UTC précédent le soir en heure locale UTC+1/+2). */
function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function TaskFilters({
  filters,
  onChange,
}: {
  filters: DispatchFilters;
  onChange: (filters: DispatchFilters) => void;
}) {
  const { data: zones } = useZones();
  const { data: teams } = useTeams();

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
          value={toDateInputValue(filters.from)}
          onChange={(e) => onChange({ ...filters, from: new Date(e.target.value).toISOString() })}
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
          value={toDateInputValue(filters.to)}
          onChange={(e) => onChange({ ...filters, to: new Date(e.target.value).toISOString() })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Zone</Label>
        <Select
          value={filters.zoneId ?? ALL}
          onValueChange={(value) => onChange({ ...filters, zoneId: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Toutes les zones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes les zones</SelectItem>
            {zones?.map((zone) => (
              <SelectItem key={zone.id} value={zone.id}>
                {zone.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Équipe</Label>
        <Select
          value={filters.teamId ?? ALL}
          onValueChange={(value) => onChange({ ...filters, teamId: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Toutes les équipes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes les équipes</SelectItem>
            {teams?.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
