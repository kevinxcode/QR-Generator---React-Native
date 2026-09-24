import { create } from 'zustand';

import { defaults } from '@/services/qr/payload';
import { DEFAULT_DESIGN } from '@/services/qr/QRGeneratorService';
import type { QRContentType, QRDesign } from '@/types/domain';

/** In-progress QR draft shared across the Design Studio tabs. */
interface GeneratorState {
  editingId: string | null;
  type: QRContentType;
  values: Record<string, unknown>;
  design: QRDesign;
  logoHref: string | null;
  reset(type: QRContentType, design?: QRDesign): void;
  load(input: { id: string; type: QRContentType; values: Record<string, unknown>; design: QRDesign }): void;
  setType(type: QRContentType): void;
  setValue(key: string, value: unknown): void;
  setValues(values: Record<string, unknown>): void;
  patchDesign(patch: Partial<QRDesign>): void;
  setDesign(design: QRDesign): void;
  setLogoHref(href: string | null): void;
}

export const useGenerator = create<GeneratorState>((set) => ({
  editingId: null,
  type: 'url',
  values: { ...defaults.url },
  design: DEFAULT_DESIGN,
  logoHref: null,
  reset: (type, design = DEFAULT_DESIGN) =>
    set({ editingId: null, type, values: { ...(defaults[type] as Record<string, unknown>) }, design, logoHref: null }),
  load: ({ id, type, values, design }) =>
    set({ editingId: id, type, values: { ...(defaults[type] as Record<string, unknown>), ...values }, design, logoHref: null }),
  setType: (type) => set({ type, values: { ...(defaults[type] as Record<string, unknown>) } }),
  setValue: (key, value) => set((s) => ({ values: { ...s.values, [key]: value } })),
  setValues: (values) => set((s) => ({ values: { ...s.values, ...values } })),
  patchDesign: (patch) => set((s) => ({ design: { ...s.design, ...patch } })),
  setDesign: (design) => set({ design }),
  setLogoHref: (logoHref) => set({ logoHref }),
}));
