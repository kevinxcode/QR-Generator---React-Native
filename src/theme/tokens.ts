import type { TextStyle } from 'react-native';

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40 } as const;
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;
export const MIN_TOUCH = 44;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  mono: { fontSize: 13, lineHeight: 18, fontFamily: 'monospace' },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export type FeatureKey = 'scan' | 'create' | 'barcode' | 'gallery' | 'wifi';

export interface FeatureColor {
  /** icon / accent colour */
  color: string;
  /** subtle tinted background */
  tint: string;
  /** readable text colour on the tint (WCAG AA) */
  ink: string;
}

export interface Palette {
  scheme: 'light' | 'dark';
  bg: string;
  /** app background gradient (top-left -> bottom-right) */
  bgGradient: [string, string];
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  surfaceGlass: string;
  border: string;
  divider: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  secondary: string;
  secondarySoft: string;
  accent: string;
  heroGradient: [string, string, string];
  ctaGradient: [string, string];
  feature: Record<FeatureKey, FeatureColor>;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  shadow: string;
}

// Indigo Mist — light
export const lightPalette: Palette = {
  scheme: 'light',
  bg: '#F2F1FF',
  bgGradient: ['#EEF0FF', '#F7F3FF'],
  bgElevated: '#FCFCFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F0FB',
  surfaceGlass: 'rgba(255,255,255,0.9)',
  border: '#E3E6FF',
  divider: '#ECECF4',
  text: '#17172B',
  textMuted: '#64647A',
  textFaint: '#7A7A92',
  primary: '#5B4BF5',
  primarySoft: '#EEECFF',
  onPrimary: '#FFFFFF',
  secondary: '#14B8A6',
  secondarySoft: '#E8FAF7',
  accent: '#14B8A6',
  heroGradient: ['#5B4BF5', '#8B5CF6', '#EC4899'],
  ctaGradient: ['#5B4BF5', '#7C4DF7'],
  feature: {
    scan: { color: '#14B8A6', tint: '#ECFDFB', ink: '#0F766E' },
    create: { color: '#5B4BF5', tint: '#E9E5FF', ink: '#4B3BD9' },
    barcode: { color: '#F59E0B', tint: '#FFF8E7', ink: '#B45309' },
    gallery: { color: '#EC4899', tint: '#FFF0F7', ink: '#BE185D' },
    wifi: { color: '#22C55E', tint: '#EDFCF2', ink: '#15803D' },
  },
  success: '#16A34A',
  successSoft: '#EDFCF2',
  warning: '#B45309',
  warningSoft: '#FFF8E7',
  danger: '#DC2626',
  dangerSoft: '#FEF1F1',
  overlay: 'rgba(23,23,43,0.45)',
  shadow: '#3B2F9E',
};

// Indigo Mist — dark (designed independently)
export const darkPalette: Palette = {
  scheme: 'dark',
  bg: '#0B0D17',
  bgGradient: ['#0B0D17', '#0F1122'],
  bgElevated: '#1B2038',
  surface: '#151A2E',
  surfaceAlt: '#1B2038',
  surfaceGlass: 'rgba(21,26,46,0.92)',
  border: '#292F4A',
  divider: '#232843',
  text: '#F7F7FC',
  textMuted: '#A8ACC4',
  textFaint: '#8A8FA8',
  primary: '#8B7DFF',
  primarySoft: 'rgba(139,125,255,0.16)',
  onPrimary: '#0B0D17',
  secondary: '#2DD4BF',
  secondarySoft: 'rgba(45,212,191,0.14)',
  accent: '#2DD4BF',
  heroGradient: ['#635BFF', '#8B5CF6', '#DB3D8D'],
  ctaGradient: ['#8B7DFF', '#A78BFA'],
  feature: {
    scan: { color: '#2DD4BF', tint: 'rgba(45,212,191,0.13)', ink: '#5EEAD4' },
    create: { color: '#8B7DFF', tint: 'rgba(139,125,255,0.15)', ink: '#B4AAFF' },
    barcode: { color: '#FBBF24', tint: 'rgba(251,191,36,0.13)', ink: '#FCD34D' },
    gallery: { color: '#F472B6', tint: 'rgba(244,114,182,0.13)', ink: '#F9A8D4' },
    wifi: { color: '#4ADE80', tint: 'rgba(74,222,128,0.13)', ink: '#86EFAC' },
  },
  success: '#4ADE80',
  successSoft: 'rgba(74,222,128,0.14)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251,191,36,0.14)',
  danger: '#F87171',
  dangerSoft: 'rgba(248,113,113,0.14)',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
};

export const elevation = (p: Palette, level: 1 | 2 | 3 = 1) => ({
  shadowColor: p.shadow,
  shadowOpacity: p.scheme === 'dark' ? 0.4 : 0.06 * level,
  shadowRadius: 6 * level,
  shadowOffset: { width: 0, height: 2 * level },
  elevation: level * 2,
});
