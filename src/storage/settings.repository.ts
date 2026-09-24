import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

const KEY = 'qraft.settings.v1';

export const settingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).catch('system'),
  onboardingCompleted: z.boolean().catch(false),
  scannerSound: z.boolean().catch(false),
  scannerVibration: z.boolean().catch(true),
  autoOpenResult: z.boolean().catch(false),
  batchAllowDuplicates: z.boolean().catch(false),
  saveScansToHistory: z.boolean().catch(true),
  defaultErrorCorrection: z.enum(['L', 'M', 'Q', 'H']).catch('M'),
  defaultExportResolution: z.union([z.literal(256), z.literal(512), z.literal(1024), z.literal(2048), z.literal(4096)]).catch(1024),
  defaultExportFormat: z.enum(['png', 'svg', 'pdf']).catch('png'),
  defaultTemplateId: z.string().catch('classic'),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** The only module allowed to touch AsyncStorage. Holds lightweight preferences only. */
export class SettingsRepository {
  constructor(private store: KeyValueStore = AsyncStorage) {}

  async load(): Promise<Settings> {
    try {
      const raw = await this.store.getItem(KEY);
      if (!raw) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(raw) as unknown;
      return settingsSchema.parse(typeof parsed === 'object' && parsed ? parsed : {});
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async save(settings: Settings): Promise<void> {
    await this.store.setItem(KEY, JSON.stringify(settings));
  }

  async reset(): Promise<void> {
    await this.store.removeItem(KEY);
  }
}

export const settingsRepository = new SettingsRepository();
