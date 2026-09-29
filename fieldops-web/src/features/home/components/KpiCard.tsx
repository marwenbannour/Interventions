import { ChevronRight, TrendingUp, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  iconClass,
  href,
}: {
  label: string;
  value: number;
  delta: number;
  deltaLabel: string;
  icon: LucideIcon;
  iconClass: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:p-5"
    >
      <div className={`flex size-11 flex-none items-center justify-center rounded-xl sm:size-14 ${iconClass}`}>
        <Icon className="size-5 sm:size-7" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">{value}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <TrendingUp className="size-3.5 flex-none text-success" />
          <span className="font-semibold text-foreground">+{delta}</span>
          <span className="hidden sm:inline">{deltaLabel}</span>
        </p>
      </div>
      <ChevronRight className="hidden size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}
