import { BACKUP_APP, BACKUP_VERSION, type Backup } from '@/services/export/backupSchema';

import type { Db, SQLValue } from '../types';

const TABLES = [
  'folders',
  'tags',
  'codes',
  'code_tags',
  'qr_designs',
  'barcode_options',
  'templates',
  'scan_sessions',
  'scan_session_items',
] as const;

type Table = (typeof TABLES)[number];

export interface RestoreSummary {
  codes: number;
  folders: number;
  tags: number;
  sessions: number;
}

export class BackupRepository {
  constructor(private db: Db, private now: () => number = Date.now) {}

  async export(): Promise<Backup> {
    const out: Record<string, unknown> = { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: this.now() };
    for (const t of TABLES) out[t] = await this.db.getAllAsync(`SELECT * FROM ${t}`);
    return out as Backup;
  }

  /**
   * Restore a validated backup. `merge` keeps existing data and skips rows whose id already exists;
   * `replace` wipes everything first. Runs in a single transaction.
   */
  async restore(b: Backup, mode: 'merge' | 'replace'): Promise<RestoreSummary> {
    const summary: RestoreSummary = { codes: 0, folders: 0, tags: 0, sessions: 0 };
    await this.db.withTransactionAsync(async () => {
      if (mode === 'replace') {
        for (const t of [...TABLES].reverse()) await this.db.runAsync(`DELETE FROM ${t}`);
      }
      // Folder and tag names are unique; map backup ids onto existing rows with the same name.
      const folderMap = new Map<string, string>();
      for (const f of b.folders) {
        const existing = await this.db.getFirstAsync<{ id: string }>('SELECT id FROM folders WHERE name = ? COLLATE NOCASE', [f.name]);
        if (existing) folderMap.set(f.id, existing.id);
        else {
          await this.insert('folders', f);
          folderMap.set(f.id, f.id);
          summary.folders++;
        }
      }
      const tagMap = new Map<string, string>();
      for (const t of b.tags) {
        const existing = await this.db.getFirstAsync<{ id: string }>('SELECT id FROM tags WHERE name = ? COLLATE NOCASE', [t.name]);
        if (existing) tagMap.set(t.id, existing.id);
        else {
          await this.insert('tags', t);
          tagMap.set(t.id, t.id);
          summary.tags++;
        }
      }
      const codeIds = new Set<string>();
      for (const c of b.codes) {
        const folder = c.folder_id ? folderMap.get(c.folder_id) ?? null : null;
        if (await this.insert('codes', { ...c, folder_id: folder })) summary.codes++;
        codeIds.add(c.id);
      }
      for (const ct of b.code_tags) {
        const tag = tagMap.get(ct.tag_id);
        if (tag && codeIds.has(ct.code_id)) await this.insert('code_tags', { code_id: ct.code_id, tag_id: tag });
      }
      for (const d of b.qr_designs) if (codeIds.has(d.code_id)) await this.insert('qr_designs', d);
      for (const o of b.barcode_options) if (codeIds.has(o.code_id)) await this.insert('barcode_options', o);
      for (const t of b.templates) await this.insert('templates', t);
      const sessionIds = new Set<string>();
      for (const s of b.scan_sessions) {
        if (await this.insert('scan_sessions', s)) summary.sessions++;
        sessionIds.add(s.id);
      }
      for (const i of b.scan_session_items) {
        if (sessionIds.has(i.session_id) && codeIds.has(i.code_id)) await this.insert('scan_session_items', i);
      }
    });
    return summary;
  }

  private async insert(table: Table, row: object): Promise<boolean> {
    const cols = Object.keys(row);
    const vals = Object.values(row) as SQLValue[];
    const r = await this.db.runAsync(
      `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      vals,
    );
    return r.changes > 0;
  }
}
