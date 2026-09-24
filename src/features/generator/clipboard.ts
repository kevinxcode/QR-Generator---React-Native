import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';

import { parseScan } from '@/services/scanner/ScanResultParser';
import { useGenerator } from '@/store/generator.store';
import { toast } from '@/store/toast.store';

/** Read the clipboard ONLY on explicit user action and prefill the QR studio. */
export async function createFromClipboard(): Promise<void> {
  let text = '';
  try {
    text = (await Clipboard.getStringAsync()).trim();
  } catch {
    text = '';
  }
  if (!text) {
    toast.info('Clipboard is empty.');
    return;
  }
  const parsed = parseScan(text, 'qr');
  const g = useGenerator.getState();
  if (parsed.type === 'url') {
    g.reset('url');
    g.setValues({ url: parsed.metadata.url });
  } else {
    g.reset('text');
    g.setValues({ text: text.slice(0, 2000) });
  }
  router.push({ pathname: '/create/qr', params: { fromDraft: '1' } });
}
