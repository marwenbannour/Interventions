'use client';

import { Loader2, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/errors';
import { useDeleteTeam, useDeleteZone, useTeamsAdmin, useZonesAdmin } from '../hooks/useOrganizationAdmin';
import { ConfirmDeleteButton } from './ConfirmDeleteButton';
import { OrgSettingsCard } from './OrgSettingsCard';
import { TeamFormDialog } from './TeamFormDialog';
import { ZoneFormDialog } from './ZoneFormDialog';
import type { Team, Zone } from '../types';

export function OrganizationAdminView() {
  const { data: zones, isLoading: zonesLoading } = useZonesAdmin();
  const { data: teams, isLoading: teamsLoading } = useTeamsAdmin();
  const deleteZone = useDeleteZone();
  const deleteTeam = useDeleteTeam();

  const [zoneDialog, setZoneDialog] = useState<{ open: boolean; zone: Zone | null }>({ open: false, zone: null });
  const [teamDialog, setTeamDialog] = useState<{ open: boolean; team: Team | null }>({ open: false, team: null });

  const removeZone = async (id: string) => {
    try {
      await deleteZone.mutateAsync(id);
      toast.success('Zone supprimée.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Suppression impossible.');
    }
  };

  const removeTeam = async (id: string) => {
    try {
      await deleteTeam.mutateAsync(id);
      toast.success('Équipe supprimée.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Suppression impossible.');
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Organisation</h1>
        <p className="text-sm text-muted-foreground">Paramètres, zones et équipes.</p>
      </div>

      <OrgSettingsCard />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Zones</p>
            <Button size="sm" variant="outline" onClick={() => setZoneDialog({ open: true, zone: null })}>
              <Plus className="size-3.5" />
              Zone
            </Button>
          </div>
          {zonesLoading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex flex-col gap-2">
              {zones?.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {zone.name} <span className="text-xs text-muted-foreground">({zone.code})</span>
                    </p>
                    {zone.description && <p className="text-xs text-muted-foreground">{zone.description}</p>}
                  </div>
                  <div className="flex flex-none gap-1">
                    <Button variant="outline" size="sm" onClick={() => setZoneDialog({ open: true, zone })}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <ConfirmDeleteButton itemLabel={zone.name} onConfirm={() => removeZone(zone.id)} pending={deleteZone.isPending} />
                  </div>
                </div>
              ))}
              {zones?.length === 0 && <p className="text-sm text-muted-foreground">Aucune zone.</p>}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Équipes</p>
            <Button size="sm" variant="outline" onClick={() => setTeamDialog({ open: true, team: null })}>
              <Plus className="size-3.5" />
              Équipe
            </Button>
          </div>
          {teamsLoading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex flex-col gap-2">
              {teams?.map((team) => (
                <div key={team.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
                  <p className="text-sm font-medium text-foreground">{team.name}</p>
                  <div className="flex flex-none gap-1">
                    <Button variant="outline" size="sm" onClick={() => setTeamDialog({ open: true, team })}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <ConfirmDeleteButton itemLabel={team.name} onConfirm={() => removeTeam(team.id)} pending={deleteTeam.isPending} />
                  </div>
                </div>
              ))}
              {teams?.length === 0 && <p className="text-sm text-muted-foreground">Aucune équipe.</p>}
            </div>
          )}
        </div>
      </div>

      <ZoneFormDialog zone={zoneDialog.zone} open={zoneDialog.open} onOpenChange={(open) => setZoneDialog((s) => ({ ...s, open }))} />
      <TeamFormDialog team={teamDialog.team} open={teamDialog.open} onOpenChange={(open) => setTeamDialog((s) => ({ ...s, open }))} />
    </div>
  );
}
