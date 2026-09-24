import type { QRDesign } from '@/types/domain';

import { DEFAULT_DESIGN } from './QRGeneratorService';

export interface Palette {
  id: string;
  name: string;
  fg: string;
  bg: string;
  eye: string;
  gradient?: [string, string];
}

export const PALETTES: Palette[] = [
  { id: 'classic', name: 'Classic', fg: '#000000', bg: '#FFFFFF', eye: '#000000' },
  { id: 'midnight', name: 'Midnight', fg: '#0F172A', bg: '#F8FAFC', eye: '#1E3A8A', gradient: ['#0F172A', '#1E3A8A'] },
  { id: 'ocean', name: 'Ocean', fg: '#0B4F6C', bg: '#F0FAFF', eye: '#01579B', gradient: ['#01579B', '#0B6E99'] },
  { id: 'forest', name: 'Forest', fg: '#14532D', bg: '#F3FAF4', eye: '#166534', gradient: ['#14532D', '#1F6F3D'] },
  { id: 'sunset', name: 'Sunset', fg: '#9A3412', bg: '#FFF7ED', eye: '#7C2D12', gradient: ['#9D174D', '#B45309'] },
  { id: 'neon', name: 'Neon', fg: '#5B21B6', bg: '#FFFFFF', eye: '#BE185D', gradient: ['#6D28D9', '#BE185D'] },
  { id: 'corporate', name: 'Corporate', fg: '#1F2937', bg: '#FFFFFF', eye: '#2563EB' },
  { id: 'luxury', name: 'Luxury', fg: '#1C1917', bg: '#FAF7F0', eye: '#8A6A1F', gradient: ['#1C1917', '#44403C'] },
  { id: 'pastel', name: 'Pastel', fg: '#5B4B8A', bg: '#FDF4FF', eye: '#7E5AA2' },
  { id: 'mono', name: 'Monochrome', fg: '#262626', bg: '#F5F5F5', eye: '#000000' },
];

export function applyPalette(d: QRDesign, p: Palette, useGradient: boolean): QRDesign {
  return {
    ...d,
    foregroundColor: p.fg,
    backgroundColor: p.bg,
    cornerColor: p.eye,
    eyeColor: p.eye,
    gradientType: useGradient && p.gradient ? (d.gradientType === 'none' ? 'linear' : d.gradientType) : 'none',
    gradientStart: p.gradient?.[0] ?? d.gradientStart,
    gradientEnd: p.gradient?.[1] ?? d.gradientEnd,
  };
}

export interface Template {
  id: string;
  name: string;
  design: QRDesign;
  /** user-created templates can be deleted */
  custom?: boolean;
}

const t = (id: string, name: string, patch: Partial<QRDesign>): Template => ({ id, name, design: { ...DEFAULT_DESIGN, ...patch } });

export const BUILTIN_TEMPLATES: Template[] = [
  t('classic', 'Minimal Black', { foregroundColor: '#000000', cornerColor: '#000000', eyeColor: '#000000' }),
  t('modern-blue', 'Modern Blue', { bodyStyle: 'rounded', eyeFrameStyle: 'rounded', eyeStyle: 'rounded', foregroundColor: '#1D4ED8', cornerColor: '#1E3A8A', eyeColor: '#2563EB' }),
  t('gradient-purple', 'Gradient Purple', { bodyStyle: 'dots', eyeFrameStyle: 'extraRounded', eyeStyle: 'circle', gradientType: 'linear', gradientStart: '#5B21B6', gradientEnd: '#9D174D', gradientAngle: 45, cornerColor: '#4C1D95', eyeColor: '#9D174D' }),
  t('business', 'Business', { bodyStyle: 'softSquare', eyeFrameStyle: 'rounded', eyeStyle: 'square', foregroundColor: '#111827', cornerColor: '#111827', eyeColor: '#2563EB', frameType: 'scanMe', frameLayout: 'minimal', frameColor: '#111827' }),
  t('restaurant', 'Restaurant', { bodyStyle: 'extraRounded', eyeFrameStyle: 'leaf', eyeStyle: 'rounded', foregroundColor: '#7C2D12', backgroundColor: '#FFFBF5', cornerColor: '#9A3412', eyeColor: '#B45309', frameType: 'menu', frameLayout: 'bottom', frameColor: '#7C2D12', frameTextColor: '#FFFBF5' }),
  t('wifi', 'Wi-Fi Card', { bodyStyle: 'rounded', eyeFrameStyle: 'extraRounded', eyeStyle: 'circle', foregroundColor: '#0F172A', cornerColor: '#0369A1', eyeColor: '#0369A1', frameType: 'connect', frameLayout: 'card', frameColor: '#0369A1' }),
  t('social', 'Social Media', { bodyStyle: 'circle', eyeFrameStyle: 'circle', eyeStyle: 'circle', gradientType: 'linear', gradientStart: '#BE185D', gradientEnd: '#7C3AED', gradientAngle: 135, cornerColor: '#BE185D', eyeColor: '#7C3AED', frameType: 'follow', frameLayout: 'bubble', frameColor: '#BE185D' }),
  t('event', 'Event', { bodyStyle: 'classy', eyeFrameStyle: 'leaf', eyeStyle: 'diamond', foregroundColor: '#1E1B4B', cornerColor: '#4338CA', eyeColor: '#4338CA', frameType: 'scanMe', frameLayout: 'badge', frameColor: '#4338CA' }),
  t('dark', 'Dark', { foregroundColor: '#E5E7EB', backgroundColor: '#0B0D12', cornerColor: '#FFFFFF', eyeColor: '#A5B4FC', bodyStyle: 'rounded', eyeFrameStyle: 'rounded', eyeStyle: 'rounded' }),
  t('luxury', 'Luxury', { bodyStyle: 'classy', eyeFrameStyle: 'leaf', eyeStyle: 'rounded', foregroundColor: '#1C1917', backgroundColor: '#FAF7F0', cornerColor: '#8A6A1F', eyeColor: '#8A6A1F', frameType: 'scanMe', frameLayout: 'minimal', frameColor: '#8A6A1F' }),
];

/** Apply a template's styling while keeping the user's logo and error-correction choice. */
export function applyTemplate(current: QRDesign, tpl: QRDesign): QRDesign {
  return { ...tpl, logoUri: current.logoUri, logoSize: current.logoSize, logoPadding: current.logoPadding, errorCorrection: current.logoUri ? 'H' : tpl.errorCorrection };
}
