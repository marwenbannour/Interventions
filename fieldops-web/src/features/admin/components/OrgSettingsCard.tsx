'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api/errors';
import { useOrganization, useUpdateOrganization } from '../hooks/useOrganizationAdmin';
import type { Organization, Role } from '../types';

const ALL_ROLES: Role[] = ['ADMIN', 'SUPERVISOR', 'AGENT', 'CLIENT', 'DIRECTION'];
const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrateur',
  SUPERVISOR: 'Superviseur',
  AGENT: 'Agent',
  CLIENT: 'Client',
  DIRECTION: 'Direction',
};

// Ne monte qu'une fois `org` chargé : l'état local s'initialise depuis les props
// via le lazy initializer de useState, sans effet ni setState post-montage.
function OrgSettingsForm({ org }: { org: Organization }) {
  const update = useUpdateOrganization();
  const [name, setName] = useState(() => org.name);
  const [mfaRoles, setMfaRoles] = useState<Role[]>(() => (org.settings.mfaRequiredRoles ?? []) as Role[]);

  const toggleRole = (role: Role) => {
    setMfaRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const save = async () => {
    try {
      await update.mutateAsync({ name, settings: { mfaRequiredRoles: mfaRoles } });
      toast.success('Paramètres enregistrés.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Enregistrement impossible.');
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">Organisation &amp; sécurité</p>

      <div className="flex max-w-sm flex-col gap-1.5">
        <Label htmlFor="org-name">Nom de l&apos;organisation</Label>
        <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>MFA obligatoire pour les rôles</Label>
        <div className="flex flex-wrap gap-3">
          {ALL_ROLES.map((role) => (
            <label key={role} className="flex items-center gap-1.5 text-sm text-foreground">
              <input type="checkbox" checked={mfaRoles.includes(role)} onChange={() => toggleRole(role)} className="size-3.5" />
              {ROLE_LABEL[role]}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Les utilisateurs des rôles cochés devront valider un code de vérification à chaque connexion.
        </p>
      </div>

      <Button size="sm" onClick={save} disabled={update.isPending} className="w-fit">
        {update.isPending ? <Loader2 className="size-3.5 animate-spin" /> : 'Enregistrer'}
      </Button>
    </div>
  );
}

export function OrgSettingsCard() {
  const { data: org, isLoading } = useOrganization();

  if (isLoading || !org) {
    return <Loader2 className="size-5 animate-spin text-muted-foreground" />;
  }

  return <OrgSettingsForm org={org} />;
}
