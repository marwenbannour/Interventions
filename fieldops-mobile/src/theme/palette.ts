/**
 * Design system « Interventions Agent » : couleurs de la maquette, déclinées en clair et sombre.
 * Les variantes *Soft servent de fond aux badges et pastilles d'icônes.
 */
export interface Palette {
  primary: string;
  primarySoft: string;
  secondary: string;
  secondarySoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  onPrimary: string;
  overlay: string;
}

export const lightPalette: Palette = {
  primary: '#2563EB',
  primarySoft: '#DBEAFE',
  secondary: '#4F46E5',
  secondarySoft: '#E0E7FF',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  onPrimary: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.45)',
};

export const darkPalette: Palette = {
  primary: '#3B82F6',
  primarySoft: 'rgba(59, 130, 246, 0.18)',
  secondary: '#6366F1',
  secondarySoft: 'rgba(99, 102, 241, 0.2)',
  success: '#22C55E',
  successSoft: 'rgba(34, 197, 94, 0.18)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.18)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.18)',
  background: '#0B1220',
  surface: '#131C2E',
  surfaceAlt: '#1A2438',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  border: '#1E293B',
  onPrimary: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export type Tone = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'muted';

/** Couleur pleine et fond doux d'un ton sémantique. */
export function toneColors(p: Palette, tone: Tone): { fg: string; bg: string } {
  switch (tone) {
    case 'primary':
      return { fg: p.primary, bg: p.primarySoft };
    case 'secondary':
      return { fg: p.secondary, bg: p.secondarySoft };
    case 'success':
      return { fg: p.success, bg: p.successSoft };
    case 'warning':
      return { fg: p.warning, bg: p.warningSoft };
    case 'danger':
      return { fg: p.danger, bg: p.dangerSoft };
    default:
      return { fg: p.textMuted, bg: p.surfaceAlt };
  }
}

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
