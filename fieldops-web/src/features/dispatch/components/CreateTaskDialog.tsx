'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScopePicker, type Scope } from '@/features/assets/components/ScopePicker';
import { ApiError } from '@/lib/api/errors';
import { useCreateTask } from '../hooks/useTaskActions';
import type { TaskPriority } from '../types';
import { priorityLabel } from '../utils/labels';

const PRIORITIES: TaskPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const TYPES = ['MAINTENANCE', 'REPAIR', 'LINEN_DELIVERY', 'LINEN_PICKUP'];

interface FormState {
  title: string;
  description: string;
  type: string;
  priority: TaskPriority;
  scheduledStart: string;
  duration: string;
  skills: string;
  checklist: string;
}
const EMPTY: FormState = {
  title: '', description: '', type: 'MAINTENANCE', priority: 'NORMAL', scheduledStart: '', duration: '60', skills: '', checklist: '',
};

/** V3 — création d'une intervention depuis la console (auparavant uniquement via l'API). */
function CreateTaskDialogInner({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (taskId: string) => void;
}) {
  const create = useCreateTask();
  const [scope, setScope] = useState<Scope>({});
  const [f, setF] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<{ title?: string; siteId?: string }>({});


  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!f.title.trim()) errs.title = 'Titre requis';
    if (!scope.siteId) errs.siteId = 'Site requis';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      const task = await create.mutateAsync({
        title: f.title.trim(),
        description: f.description.trim() || undefined,
        type: f.type,
        priority: f.priority,
        siteId: scope.siteId!,
        assetId: scope.assetId,
        scheduledStart: f.scheduledStart ? new Date(f.scheduledStart).toISOString() : undefined,
        estimatedDurationMin: Number(f.duration) > 0 ? Number(f.duration) : undefined,
        requiredSkills: f.skills.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
        checklist: f.checklist.split('\n').map((l) => l.trim()).filter(Boolean).map((label) => ({ label, required: true })),
      });
      toast.success(task.isRework ? `${task.reference} créée — réintervention détectée.` : `${task.reference} créée.`);
      onOpenChange(false);
      onCreated?.(task.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Création impossible.');
    }
  };

  const pending = create.isPending;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouvelle intervention</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex max-h-[72vh] flex-col gap-3 overflow-y-auto">
          <ScopePicker value={scope} onChange={setScope} disabled={pending} errors={errors} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-title">Titre *</Label>
            <Input id="t-title" value={f.title} onChange={set('title')} disabled={pending} placeholder="Fuite sous évier salle de soins 3" />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={f.type} onValueChange={(v) => v && setF({ ...f, type: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue>{f.type}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Priorité</Label>
              <Select value={f.priority} onValueChange={(v) => v && setF({ ...f, priority: v as TaskPriority })}>
                <SelectTrigger className="w-full">
                  <SelectValue>{priorityLabel(f.priority)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {priorityLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-dur">Durée estimée (min)</Label>
              <Input id="t-dur" type="number" min={1} value={f.duration} onChange={set('duration')} disabled={pending} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-start">Planifiée le</Label>
              <Input id="t-start" type="datetime-local" value={f.scheduledStart} onChange={set('scheduledStart')} disabled={pending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-skills">Compétences requises</Label>
              <Input id="t-skills" value={f.skills} onChange={set('skills')} disabled={pending} placeholder="ELECTRICITE, PLOMBERIE" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea id="t-desc" rows={2} value={f.description} onChange={set('description')} disabled={pending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-check">Checklist (un point par ligne)</Label>
            <Textarea id="t-check" rows={3} value={f.checklist} onChange={set('checklist')} disabled={pending} />
          </div>
          <p className="text-xs text-muted-foreground">
            Si l&apos;équipement ou le site a fait l&apos;objet d&apos;une intervention récente, elle sera automatiquement signalée
            comme réintervention. L&apos;affectation se fait ensuite depuis le dispatch (ou automatiquement si l&apos;auto-dispatch est activé).
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Le formulaire n'est monté qu'à l'ouverture et réinitialisé via `key` : l'état local
 * s'initialise par lazy initializer, sans setState dans un effet (règle React Compiler du projet).
 */
export function CreateTaskDialog(props: Parameters<typeof CreateTaskDialogInner>[0]) {
  if (!props.open) return null;
  return <CreateTaskDialogInner key={'new'} {...props} />;
}
