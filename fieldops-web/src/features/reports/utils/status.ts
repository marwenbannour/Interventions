/** Palette de statut fixe (jamais réutilisée pour une série catégorielle) — cf. skill dataviz. */
export const STATUS_COLORS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;

export type StatusLevel = keyof typeof STATUS_COLORS;

export function complianceStatus(rate: number | null): StatusLevel {
  if (rate == null) return 'serious';
  if (rate >= 90) return 'good';
  if (rate >= 70) return 'warning';
  if (rate >= 50) return 'serious';
  return 'critical';
}

export const STATUS_LABEL: Record<StatusLevel, string> = {
  good: 'Conforme',
  warning: 'À surveiller',
  serious: 'Dégradé',
  critical: 'Critique',
};
