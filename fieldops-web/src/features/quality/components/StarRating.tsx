import { Star } from 'lucide-react';

export function StarRating({ value, label }: { value: number | null; label: string }) {
  if (value == null) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-sm text-muted-foreground">—</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`size-3 ${i < value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
