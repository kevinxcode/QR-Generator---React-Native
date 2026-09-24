import type { Folder } from '@/types/domain';
import { uuid } from '@/utils/id';

import type { Db } from '../types';

export const DEFAULT_FOLDERS = ['Personal', 'Work', 'WiFi', 'Inventory', 'Products', 'Events'];

export class FolderRepository {
  constructor(private db: Db, private now: () => number = Date.now) {}

  async list(): Promise<Folder[]> {
    const rows = await this.db.getAllAsync<{ id: string; name: string; created_at: number; count: number }>(
      `SELECT f.id, f.name, f.created_at, (SELECT COUNT(*) FROM codes c WHERE c.folder_id = f.id) AS count
       FROM folders f ORDER BY f.created_at ASC, f.name ASC`,
    );
    return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at, count: Number(r.count) }));
  }

  async get(id: string): Promise<Folder | null> {
    const r = await this.db.getFirstAsync<{ id: string; name: string; created_at: number }>('SELECT * FROM folders WHERE id = ?', [id]);
    return r ? { id: r.id, name: r.name, createdAt: r.created_at } : null;
  }

  async create(name: string): Promise<Folder> {
    const clean = name.trim();
    if (!clean) throw new Error('Folder name is required.');
    if (clean.length > 40) throw new Error('Folder name is too long.');
    const existing = await this.db.getFirstAsync<{ id: string }>('SELECT id FROM folders WHERE name = ? COLLATE NOCASE', [clean]);
    if (existing) throw new Error(`A folder named "${clean}" already exists.`);
    const f: Folder = { id: uuid(), name: clean, createdAt: this.now() };
    await this.db.runAsync('INSERT INTO folders (id, name, created_at) VALUES (?,?,?)', [f.id, f.name, f.createdAt]);
    return f;
  }

  async rename(id: string, name: string): Promise<void> {
    const clean = name.trim();
    if (!clean) throw new Error('Folder name is required.');
    const existing = await this.db.getFirstAsync<{ id: string }>('SELECT id FROM folders WHERE name = ? COLLATE NOCASE AND id != ?', [clean, id]);
    if (existing) throw new Error(`A folder named "${clean}" already exists.`);
    await this.db.runAsync('UPDATE folders SET name = ? WHERE id = ?', [clean, id]);
  }

  /** Deletes the folder; codes inside are kept and become unfiled. */
  async delete(id: string): Promise<void> {
    await this.db.runAsync('UPDATE codes SET folder_id = NULL WHERE folder_id = ?', [id]);
    await this.db.runAsync('DELETE FROM folders WHERE id = ?', [id]);
  }

  async seedDefaults(): Promise<void> {
    const row = await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM folders');
    if (Number(row?.n ?? 0) > 0) return;
    let t = this.now();
    for (const name of DEFAULT_FOLDERS) {
      await this.db.runAsync('INSERT OR IGNORE INTO folders (id, name, created_at) VALUES (?,?,?)', [uuid(), name, t++]);
    }
  }
}
