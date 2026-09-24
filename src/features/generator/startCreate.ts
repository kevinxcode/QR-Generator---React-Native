import { router } from 'expo-router';

import { getRepos } from '@/db/database';
import { BUILTIN_TEMPLATES } from '@/services/qr/templates';
import { useGenerator } from '@/store/generator.store';
import { useSettings } from '@/store/settings.store';
import type { BarcodeFormat, QRContentType, QRDesign } from '@/types/domain';

/** Resolve the user's default design from settings (built-in or saved template). */
export async function defaultDesign(): Promise<QRDesign> {
  const { defaultTemplateId, defaultErrorCorrection } = useSettings.getState().settings;
  let design = BUILTIN_TEMPLATES.find((t) => t.id === defaultTemplateId)?.design;
  if (!design) {
    try {
      design = (await getRepos().templates.list()).find((t) => t.id === defaultTemplateId)?.design;
    } catch {
      design = undefined;
    }
  }
  return { ...(design ?? BUILTIN_TEMPLATES[0].design), errorCorrection: defaultErrorCorrection };
}

export async function startQr(type: QRContentType, design?: QRDesign): Promise<void> {
  useGenerator.getState().reset(type, design ?? (await defaultDesign()));
  router.push({ pathname: '/create/qr', params: { fromDraft: '1' } });
}

export function startBarcode(format: BarcodeFormat = 'ean13'): void {
  router.push({ pathname: '/create/barcode', params: { format } });
}
