import { getRepos } from '@/db/database';
import { parseScan } from '@/services/scanner/ScanResultParser';
import { notifyDataChanged } from '@/store/data.store';
import type { CodeFormat } from '@/types/domain';

/** Persist a scan to history and return its id. */
export async function saveScan(data: string, format: CodeFormat): Promise<string> {
  const parsed = parseScan(data, format);
  const rec = await getRepos().codes.create({
    kind: format === 'qr' ? 'qr' : 'barcode',
    format,
    contentType: parsed.type,
    payload: data,
    source: 'scanned',
  });
  notifyDataChanged();
  return rec.id;
}
