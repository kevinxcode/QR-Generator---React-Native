import type { Tag } from '@/types/domain';
import { uuid } from '@/utils/id';

import type { Db } from '../types';

export function normalizeTag(name: string): string {
  return name.trim().replace(/^#+/, '').replace(/\s+/g, '-').toLowerCase().slice(0, 32);
}

export class TagRepository {
  constructor(private db: Db) {}

  async list(): Promise<(Tag & { count: number })[]> {
    const rows = await this.db.getAllAsync<{ id: string; name: string; count: number }>(
      'SELECT t.id, t.name, (SELECT COUNT(*) FROM code_tags ct WHERE ct.tag_id = t.id) AS count FROM tags t ORDER BY t.name',
    );
    return rows.map((r) => ({ ...r, count: Number(r.count) }));
  }

  async ensure(name: string): Promise<Tag> {
    const clean = normalizeTag(name);
    if (!clean) throw new Error('Tag name is required.');
    const existing = await this.db.getFirstAsync<Tag>('SELECT id, name FROM tags WHERE name = ? COLLATE NOCASE', [clean]);
    if (existing) return existing;
    const tag = { id: uuid(), name: clean };
    await this.db.runAsync('INSERT INTO tags (id, name) VALUES (?, ?)', [tag.id, tag.name]);
    return tag;
  }

  async forCode(codeId: string): Promise<Tag[]> {
    return this.db.getAllAsync<Tag>(
      'SELECT t.id, t.name FROM tags t JOIN code_tags ct ON ct.tag_id = t.id WHERE ct.code_id = ? ORDER BY t.name',
      [codeId],
    );
  }

  /** Replace the full tag set of a code. Unused tags are cleaned up. */
  async setForCode(codeId: string, names: string[]): Promise<Tag[]> {
    const unique = [...new Set(names.map(normalizeTag).filter(Boolean))];
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM code_tags WHERE code_id = ?', [codeId]);
      for (const n of unique) {
        const t = await this.ensure(n);
        await this.db.runAsync('INSERT OR IGNORE INTO code_tags (code_id, tag_id) VALUES (?, ?)', [codeId, t.id]);
      }
      await this.db.runAsync('DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM code_tags)');
    });
    return this.forCode(codeId);
  }
}
