import { create } from 'zustand';

import { DEFAULT_SETTINGS, settingsRepository, type Settings } from '@/storage/settings.repository';

interface SettingsState {
  settings: Settings;
  hydrated: boolean;
  hydrate(): Promise<void>;
  update(patch: Partial<Settings>): Promise<void>;
  reset(): Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hydrated: false,
  async hydrate() {
    const settings = await settingsRepository.load();
    set({ settings, hydrated: true });
  },
  async update(patch) {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    try {
      await settingsRepository.save(settings);
    } catch {
      // Preferences are best-effort; keep in-memory value.
    }
  },
  async reset() {
    await settingsRepository.reset();
    set({ settings: { ...DEFAULT_SETTINGS, onboardingCompleted: true } });
    await settingsRepository.save(get().settings);
  },
}));
