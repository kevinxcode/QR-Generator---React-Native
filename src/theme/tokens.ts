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

export interface Palette {
  scheme: 'light' | 'dark';
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  surfaceGlass: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  shadow: string;
}

export const lightPalette: Palette = {
  scheme: 'light',
  bg: '#F4F5FA',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEEF5',
  surfaceGlass: 'rgba(255,255,255,0.78)',
  border: 'rgba(15,20,40,0.08)',
  text: '#0E1120',
  textMuted: '#555B70',
  textFaint: '#8C91A3',
  primary: '#5B4BF5',
  primarySoft: 'rgba(91,75,245,0.12)',
  onPrimary: '#FFFFFF',
  accent: '#00B8A9',
  success: '#12A150',
  successSoft: 'rgba(18,161,80,0.12)',
  warning: '#B26B00',
  warningSoft: 'rgba(245,158,11,0.16)',
  danger: '#D92D20',
  dangerSoft: 'rgba(217,45,32,0.12)',
  overlay: 'rgba(8,10,20,0.45)',
  shadow: '#1A1F3A',
};

export const darkPalette: Palette = {
  scheme: 'dark',
  bg: '#0A0C12',
  bgElevated: '#12151E',
  surface: '#151924',
  surfaceAlt: '#1D2230',
  surfaceGlass: 'rgba(21,25,36,0.82)',
  border: 'rgba(255,255,255,0.08)',
  text: '#F3F4F8',
  textMuted: '#A3A8BA',
  textFaint: '#6D7285',
  primary: '#8B7DFF',
  primarySoft: 'rgba(139,125,255,0.16)',
  onPrimary: '#0A0C12',
  accent: '#2DD4BF',
  success: '#3DD68C',
  successSoft: 'rgba(61,214,140,0.14)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251,191,36,0.14)',
  danger: '#FF6B5E',
  dangerSoft: 'rgba(255,107,94,0.14)',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
};

export const elevation = (p: Palette, level: 1 | 2 | 3 = 1) => ({
  shadowColor: p.shadow,
  shadowOpacity: p.scheme === 'dark' ? 0.4 : 0.08 * level,
  shadowRadius: 6 * level,
  shadowOffset: { width: 0, height: 2 * level },
  elevation: level * 2,
});
