import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { actionLabel, conditionLabel } from '../utils/workflowLabels';
import type { WorkflowDefinition } from '../types';

export function WorkflowDetailSheet({
  workflow,
  onClose,
}: {
  workflow: WorkflowDefinition | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!workflow} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{workflow?.name}</SheetTitle>
        </SheetHeader>
        {workflow && (
          <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-6">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{workflow.code}</Badge>
              <Badge variant="outline">v{workflow.version}</Badge>
              {workflow.isDefault && <Badge variant="outline">Par défaut</Badge>}
              <Badge variant={workflow.isActive ? 'default' : 'outline'}>{workflow.isActive ? 'Actif' : 'Inactif'}</Badge>
              {workflow.taskTypes.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">États ({workflow.states.length})</p>
              <div className="flex flex-col gap-1.5">
                {workflow.states.map((s) => (
                  <div key={s.code} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                    <span className="size-2.5 flex-none rounded-full" style={{ backgroundColor: s.color ?? '#94a3b8' }} />
                    <span className="font-medium text-foreground">{s.label}</span>
                    <span className="text-xs text-muted-foreground">{s.code}</span>
                    <div className="ml-auto flex gap-1">
                      {s.code === workflow.initialState && (
                        <Badge variant="outline" className="text-[10px]">
                          Initial
                        </Badge>
                      )}
                      {s.final && (
                        <Badge variant="outline" className="text-[10px]">
                          Final
                        </Badge>
                      )}
                      {s.agentVisible && (
                        <Badge variant="secondary" className="text-[10px]">
                          Agent
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Transitions ({workflow.transitions.length})</p>
              <div className="flex flex-col gap-2">
                {workflow.transitions.map((t, i) => (
                  <div key={i} className="rounded-lg border border-border p-2 text-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        {Array.isArray(t.from) ? t.from.join(', ') : t.from}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium text-foreground">{t.to}</span>
                      <span className="text-xs text-muted-foreground">({t.label})</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {t.roles.map((r) => (
                        <Badge key={r} variant="secondary" className="text-[10px]">
                          {r}
                        </Badge>
                      ))}
                    </div>
                    {t.conditions && t.conditions.length > 0 && (
                      <ul className="mt-1.5 flex flex-col gap-0.5">
                        {t.conditions.map((c, j) => (
                          <li key={j} className="text-xs text-muted-foreground">
                            • {conditionLabel(c)}
                          </li>
                        ))}
                      </ul>
                    )}
                    {t.actions && t.actions.length > 0 && (
                      <ul className="mt-1.5 flex flex-col gap-0.5">
                        {t.actions.map((a, j) => (
                          <li key={j} className="text-xs text-primary">
                            ↳ {actionLabel(a)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
