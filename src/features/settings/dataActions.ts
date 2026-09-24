import { File } from 'expo-file-system';

import { getRepos } from '@/db/database';
import type { RestoreSummary } from '@/db/repositories/BackupRepository';
import { parseBackup } from '@/services/export/backupSchema';
import { shareFile } from '@/services/export/ExportService';
import { LocalFileService } from '@/services/files/LocalFileService';
import { notifyDataChanged } from '@/store/data.store';
import { useSettings } from '@/store/settings.store';

export async function clearScanHistory(): Promise<number> {
  const n = await getRepos().history.clearScanned();
  notifyDataChanged();
  return n;
}

export async function clearCreatedHistory(): Promise<number> {
  const n = await getRepos().history.clearCreated();
  const logos = await getRepos().designs.listLogoUris();
  await LocalFileService.pruneLogos(logos);
  notifyDataChanged();
  return n;
}

export async function deleteAllData(): Promise<void> {
  await getRepos().history.deleteAll();
  await LocalFileService.wipeAll();
  await getRepos().folders.seedDefaults();
  await useSettings.getState().reset();
  notifyDataChanged();
}

/** Write a JSON backup (metadata + designs, logos referenced by path only) and open the share sheet. */
export async function exportBackup(): Promise<void> {
  const backup = await getRepos().backup.export();
  const stamp = new Date().toISOString().slice(0, 10);
  const uri = await LocalFileService.writeText('backups', `qraft-backup-${stamp}.json`, JSON.stringify(backup, null, 1));
  await shareFile(uri, 'json', 'Save backup');
}

export type ImportOutcome = { ok: true; summary: RestoreSummary } | { ok: false; error: string } | { ok: false; canceled: true };

/** Pick a backup file, validate it fully, then restore in a single transaction. */
export async function importBackup(mode: 'merge' | 'replace'): Promise<ImportOutcome> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (picked.canceled) return { ok: false, canceled: true };
  let text: string;
  try {
    text = await picked.result.text();
  } catch {
    return { ok: false, error: 'Could not read the selected file.' };
  }
  const parsed = parseBackup(text);
  if (!parsed.ok) return parsed;
  // Logo files are not part of the JSON backup; drop references that don't exist on this device.
  for (const d of parsed.backup.qr_designs) {
    if (d.logo_uri && !(await LocalFileService.exists(d.logo_uri))) d.logo_uri = null;
  }
  const summary = await getRepos().backup.restore(parsed.backup, mode);
  notifyDataChanged();
  return { ok: true, summary };
}
