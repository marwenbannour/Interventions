'use client';

import { useState } from 'react';
import { dayLabel } from '../utils/visuals';

const W = 400;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 30, left: 28 };

/** Pas d'axe « rond » : 1, 2, 5, 10… pour 4 à 5 graduations entières. */
function niceMax(max: number): { top: number; step: number } {
  if (max <= 4) return { top: 4, step: 1 };
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  return { top: Math.ceil(max / step) * step, step };
}

/**
 * Courbe unique « interventions créées par jour » : trait 2 px, marqueurs 8 px, un seul axe,
 * grille discrète, réticule + info-bulle au survol, et tableau équivalent pour les lecteurs d'écran.
 */
export function TrendChart({ points }: { points: { day: number; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const { top, step } = niceMax(Math.max(0, ...points.map((p) => p.count)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.count)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const active = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Interventions créées par jour sur 7 jours">
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[12px]">
              {t}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <text key={p.day} x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[12px]">
            {dayLabel(p.day)}
          </text>
        ))}
        <path d={area} fill="url(#trend-fill)" />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null ? (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} stroke="var(--muted-foreground)" strokeDasharray="3 3" strokeWidth={1} />
        ) : null}
        {points.map((p, i) => (
          <circle
            key={p.day}
            cx={x(i)}
            cy={y(p.count)}
            r={hover === i ? 5.5 : 4}
            fill="var(--primary)"
            stroke="var(--card)"
            strokeWidth={2}
          />
        ))}
        {/* Zones de survol plus larges que les marques. */}
        {points.map((p, i) => (
          <rect
            key={p.day}
            x={x(i) - innerW / (points.length - 1 || 1) / 2}
            y={PAD.top}
            width={innerW / (points.length - 1 || 1)}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {active && hover !== null ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-1.5 text-xs shadow-md"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(active.count) / H) * 100 - 22}%` }}
        >
          <p className="font-semibold text-foreground">{dayLabel(active.day)}</p>
          <p className="text-muted-foreground">
            {active.count} intervention{active.count > 1 ? 's' : ''} créée{active.count > 1 ? 's' : ''}
          </p>
        </div>
      ) : null}
      <table className="sr-only">
        <caption>Interventions créées par jour</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.day}>
              <th scope="row">{dayLabel(p.day)}</th>
              <td>{p.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
