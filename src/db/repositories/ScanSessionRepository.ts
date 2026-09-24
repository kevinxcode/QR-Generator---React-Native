import type { CodeFormat, CodeRecord, ContentType, ScanSession } from '@/types/domain';
import { uuid } from '@/utils/id';

import type { Db } from '../types';

import { mapCode } from './CodeRepository';

export interface SessionItemInput {
  payload: string;
  format: CodeFormat;
  contentType: ContentType;
  scannedAt: number;
}

export class ScanSessionRepository {
  constructor(private db: Db, private now: () => number = Date.now) {}

  /** Persist a batch session; each item becomes a scanned code linked to the session. */
  async save(name: string, items: SessionItemInput[]): Promise<ScanSession> {
    const session: ScanSession = { id: uuid(), name: name.trim() || 'Batch session', createdAt: this.now() };
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('INSERT INTO scan_sessions (id, name, created_at) VALUES (?,?,?)', [session.id, session.name, session.createdAt]);
      for (const it of items) {
        const codeId = uuid();
        const kind = it.format === 'qr' ? 'qr' : 'barcode';
        await this.db.runAsync(
          `INSERT INTO codes (id, kind, format, content_type, payload, title, note, is_favorite, folder_id, source, form_data, created_at, updated_at)
           VALUES (?,?,?,?,?,NULL,?,0,NULL,'scanned',NULL,?,?)`,
          [codeId, kind, it.format, it.contentType, it.payload, `Batch: ${session.name}`, it.scannedAt, it.scannedAt],
        );
        await this.db.runAsync('INSERT INTO scan_session_items (id, session_id, code_id, scanned_at) VALUES (?,?,?,?)', [uuid(), session.id, codeId, it.scannedAt]);
      }
    });
    return { ...session, itemCount: items.length };
  }

  async list(): Promise<ScanSession[]> {
    const rows = await this.db.getAllAsync<{ id: string; name: string; created_at: number; n: number }>(
      'SELECT s.id, s.name, s.created_at, (SELECT COUNT(*) FROM scan_session_items i WHERE i.session_id = s.id) AS n FROM scan_sessions s ORDER BY s.created_at DESC',
    );
    return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at, itemCount: Number(r.n) }));
  }

  async items(sessionId: string): Promise<CodeRecord[]> {
    const rows = await this.db.getAllAsync<Parameters<typeof mapCode>[0]>(
      'SELECT c.* FROM scan_session_items i JOIN codes c ON c.id = i.code_id WHERE i.session_id = ? ORDER BY i.scanned_at ASC',
      [sessionId],
    );
    return rows.map(mapCode);
  }

  /** Deletes the session record; the scanned codes stay in history. */
  async delete(sessionId: string): Promise<void> {
    await this.db.runAsync('DELETE FROM scan_sessions WHERE id = ?', [sessionId]);
  }

  async count(): Promise<number> {
    const r = await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM scan_sessions');
    return Number(r?.n ?? 0);
  }
}
