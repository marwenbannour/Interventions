import type { LucideIcon } from 'lucide-react';

export function StatTile({
  label,
  value,
  suffix,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'muted';
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </div>
      <div className={`flex items-baseline gap-1 ${tone === 'muted' ? 'text-muted-foreground' : 'text-foreground'}`}>
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
