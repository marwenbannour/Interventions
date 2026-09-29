'use client';

import { Star } from 'lucide-react';

export function StarInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => {
          const n = i + 1;
          return (
            <button key={n} type="button" onClick={() => onChange(n)} className="p-0.5">
              <Star className={`size-6 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
