import { create } from 'zustand';

/** Global "data changed" counter so lists and stats refresh after any mutation. */
interface DataState {
  version: number;
  bump(): void;
}

export const useDataVersion = create<DataState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));

export const notifyDataChanged = () => useDataVersion.getState().bump();
