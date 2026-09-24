'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api/errors';
import { useNotificationUsers, useSendNotification } from '../hooks/useNotifications';

const roleLabel: Record<string, string> = {
  ADMIN: 'Administrateur',
  SUPERVISOR: 'Superviseur',
  DIRECTION: 'Direction',
  AGENT: 'Agent',
  CLIENT: 'Client',
};

const schema = z.object({
  title: z.string().min(1, 'Titre requis').max(200),
  body: z.string().min(1, 'Message requis').max(1000),
});

type FormValues = z.infer<typeof schema>;

export function SendNotificationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: usersPage } = useNotificationUsers();
  const send = useSendNotification();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const filtered = useMemo(() => {
    const users = usersPage?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q) || roleLabel[u.role]?.toLowerCase().includes(q),
    );
  }, [usersPage, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const close = () => {
    onOpenChange(false);
    setSelected(new Set());
    setSearch('');
    reset({ title: '', body: '' });
  };

  const onSubmit = async (values: FormValues) => {
    if (selected.size === 0) {
      toast.error('Sélectionnez au moins un destinataire.');
      return;
    }
    try {
      await send.mutateAsync({ userIds: [...selected], title: values.title, body: values.body });
      toast.success('Notification envoyée.');
      close();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Envoi impossible.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle notification</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" disabled={send.isPending} {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" rows={3} disabled={send.isPending} {...register('body')} />
            {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Destinataires</Label>
              <span className="text-xs text-muted-foreground">{selected.size} sélectionné(s)</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-48 rounded-lg border border-border">
              <div className="flex flex-col p-1">
                {filtered.map((u) => (
                  <label
                    key={u.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u.id)} />
                    <span className="flex-1 truncate text-foreground">
                      {u.firstName} {u.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">{roleLabel[u.role] ?? u.role}</span>
                  </label>
                ))}
                {filtered.length === 0 && (
                  <p className="px-2 py-4 text-center text-sm text-muted-foreground">Aucun utilisateur.</p>
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close} disabled={send.isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={send.isPending}>
              {send.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Envoyer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
