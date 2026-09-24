'use client';

import { useConnectionStore } from '@/lib/realtime/connection.store';

const LABEL: Record<string, string> = {
  connected: 'Temps réel actif',
  connecting: 'Connexion…',
  disconnected: 'Hors ligne',
};

const DOT: Record<string, string> = {
  connected: 'bg-emerald-500',
  connecting: 'bg-amber-500 animate-pulse',
  disconnected: 'bg-muted-foreground/40',
};

export function ConnectionIndicator() {
  const status = useConnectionStore((s) => s.status);

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`size-1.5 rounded-full ${DOT[status]}`} />
      {LABEL[status]}
    </div>
  );
}
