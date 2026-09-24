import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastState {
  toast: Toast | null;
  show(message: string, kind?: ToastKind): void;
  hide(): void;
}

let seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (message, kind = 'success') => set({ toast: { id: ++seq, message, kind } }),
  hide: () => set({ toast: null }),
}));

export const toast = {
  success: (m: string) => useToastStore.getState().show(m, 'success'),
  error: (m: string) => useToastStore.getState().show(m, 'error'),
  info: (m: string) => useToastStore.getState().show(m, 'info'),
};
