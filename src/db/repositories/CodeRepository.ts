import type { CodeFormat, CodeKind, CodeRecord, CodeSource, ContentType } from '@/types/domain';
import { uuid } from '@/utils/id';

import type { Db, SQLValue } from '../types';

interface CodeRow {
  id: string;
  kind: CodeKind;
  format: CodeFormat;
  content_type: ContentType;
  payload: string;
  title: string | null;
  note: string | null;
  is_favorite: number;
  folder_id: string | null;
  source: CodeSource;
  form_data: string | null;
  created_at: number;
  updated_at: number;
}

export const mapCode = (r: CodeRow): CodeRecord => ({
  id: r.id,
  kind: r.kind,
  format: r.format,
  contentType: r.content_type,
  payload: r.payload,
  title: r.title,
  note: r.note,
  isFavorite: r.is_favorite === 1,
  folderId: r.folder_id,
  source: r.source,
  formData: r.form_data,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export interface NewCode {
  kind: CodeKind;
  format: CodeFormat;
  contentType: ContentType;
  payload: string;
  source: CodeSource;
  title?: string | null;
  note?: string | null;
  folderId?: string | null;
  isFavorite?: boolean;
  formData?: string | null;
  createdAt?: number;
  id?: string;
}

export type CodeFilter = 'all' | 'scanned' | 'created' | 'favorites';
export type CodeSort = 'newest' | 'oldest' | 'type';

export interface CodeQuery {
  filter?: CodeFilter;
  search?: string;
  from?: number;
  to?: number;
  sort?: CodeSort;
  folderId?: string;
  tagId?: string;
  kind?: CodeKind;
  limit?: number;
  offset?: number;
}

export interface CodeStats {
  total: number;
  scanned: number;
  created: number;
  favorites: number;
  scannedToday: number;
  createdToday: number;
}

export type CodePatch = Partial<Pick<CodeRecord, 'title' | 'note' | 'folderId' | 'isFavorite' | 'payload' | 'formData' | 'contentType' | 'format'>>;

const PATCH_COLUMNS: Record<keyof CodePatch, string> = {
  title: 'title',
  note: 'note',
  folderId: 'folder_id',
  isFavorite: 'is_favorite',
  payload: 'payload',
  formData: 'form_data',
  contentType: 'content_type',
  format: 'format',
};

export class CodeRepository {
  constructor(private db: Db, private now: () => number = Date.now) {}

  async create(input: NewCode): Promise<CodeRecord> {
    const ts = input.createdAt ?? this.now();
    const id = input.id ?? uuid();
    await this.db.runAsync(
      `INSERT INTO codes (id, kind, format, content_type, payload, title, note, is_favorite, folder_id, source, form_data, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, input.kind, input.format, input.contentType, input.payload, input.title ?? null, input.note ?? null,
        input.isFavorite ? 1 : 0, input.folderId ?? null, input.source, input.formData ?? null, ts, ts],
    );
    return (await this.get(id))!;
  }

  async get(id: string): Promise<CodeRecord | null> {
    const row = await this.db.getFirstAsync<CodeRow>('SELECT * FROM codes WHERE id = ?', [id]);
    return row ? mapCode(row) : null;
  }

  async update(id: string, patch: CodePatch): Promise<CodeRecord | null> {
    const sets: string[] = [];
    const params: SQLValue[] = [];
    for (const [key, value] of Object.entries(patch) as [keyof CodePatch, unknown][]) {
      if (value === undefined) continue;
      sets.push(`${PATCH_COLUMNS[key]} = ?`);
      params.push(typeof value === 'boolean' ? (value ? 1 : 0) : (value as SQLValue));
    }
    if (sets.length) {
      sets.push('updated_at = ?');
      params.push(this.now(), id);
      await this.db.runAsync(`UPDATE codes SET ${sets.join(', ')} WHERE id = ?`, params);
    }
    return this.get(id);
  }

  async toggleFavorite(id: string): Promise<boolean> {
    await this.db.runAsync('UPDATE codes SET is_favorite = 1 - is_favorite, updated_at = ? WHERE id = ?', [this.now(), id]);
    const row = await this.db.getFirstAsync<{ is_favorite: number }>('SELECT is_favorite FROM codes WHERE id = ?', [id]);
    return row?.is_favorite === 1;
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM codes WHERE id = ?', [id]);
  }

  async list(q: CodeQuery = {}): Promise<CodeRecord[]> {
    const where: string[] = [];
    const params: SQLValue[] = [];
    switch (q.filter ?? 'all') {
      case 'scanned':
        where.push("c.source = 'scanned'");
        break;
      case 'created':
        where.push("c.source = 'generated'");
        break;
      case 'favorites':
        where.push('c.is_favorite = 1');
        break;
    }
    if (q.kind) {
      where.push('c.kind = ?');
      params.push(q.kind);
    }
    if (q.from != null) {
      where.push('c.created_at >= ?');
      params.push(q.from);
    }
    if (q.to != null) {
      where.push('c.created_at <= ?');
      params.push(q.to);
    }
    if (q.folderId) {
      where.push('c.folder_id = ?');
      params.push(q.folderId);
    }
    if (q.tagId) {
      where.push('EXISTS (SELECT 1 FROM code_tags ct WHERE ct.code_id = c.id AND ct.tag_id = ?)');
      params.push(q.tagId);
    }
    const s = q.search?.trim().replace(/^#/, '');
    if (s) {
      const like = `%${s.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      where.push(`(c.payload LIKE ? ESCAPE '\\' OR c.title LIKE ? ESCAPE '\\' OR c.note LIKE ? ESCAPE '\\'
        OR c.content_type LIKE ? ESCAPE '\\' OR c.format LIKE ? ESCAPE '\\'
        OR EXISTS (SELECT 1 FROM code_tags ct JOIN tags t ON t.id = ct.tag_id WHERE ct.code_id = c.id AND t.name LIKE ? ESCAPE '\\'))`);
      params.push(like, like, like, like, like, like);
    }
    const order =
      q.sort === 'oldest' ? 'c.created_at ASC' : q.sort === 'type' ? 'c.content_type ASC, c.created_at DESC' : 'c.created_at DESC';
    const sql = `SELECT c.* FROM codes c ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${order} LIMIT ? OFFSET ?`;
    params.push(q.limit ?? 50, q.offset ?? 0);
    const rows = await this.db.getAllAsync<CodeRow>(sql, params);
    return rows.map(mapCode);
  }

  async stats(): Promise<CodeStats> {
    const start = new Date(this.now());
    start.setHours(0, 0, 0, 0);
    const row = await this.db.getFirstAsync<{ total: number; scanned: number; created: number; favorites: number; scannedToday: number; createdToday: number }>(
      `SELECT COUNT(*) AS total,
        COALESCE(SUM(source = 'scanned'), 0) AS scanned,
        COALESCE(SUM(source = 'generated'), 0) AS created,
        COALESCE(SUM(is_favorite = 1), 0) AS favorites,
        COALESCE(SUM(source = 'scanned' AND created_at >= ?), 0) AS scannedToday,
        COALESCE(SUM(source = 'generated' AND created_at >= ?), 0) AS createdToday
       FROM codes`,
      [start.getTime(), start.getTime()],
    );
    return {
      total: Number(row?.total ?? 0),
      scanned: Number(row?.scanned ?? 0),
      created: Number(row?.created ?? 0),
      favorites: Number(row?.favorites ?? 0),
      scannedToday: Number(row?.scannedToday ?? 0),
      createdToday: Number(row?.createdToday ?? 0),
    };
  }
}
