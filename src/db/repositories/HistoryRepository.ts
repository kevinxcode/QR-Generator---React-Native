import type { Db } from '../types';

export class HistoryRepository {
  constructor(private db: Db) {}

  async clearScanned(): Promise<number> {
    const r = await this.db.runAsync("DELETE FROM codes WHERE source = 'scanned'");
    await this.db.runAsync('DELETE FROM scan_sessions WHERE id NOT IN (SELECT session_id FROM scan_session_items)');
    await this.cleanupTags();
    return r.changes;
  }

  async clearCreated(): Promise<number> {
    const r = await this.db.runAsync("DELETE FROM codes WHERE source = 'generated'");
    await this.cleanupTags();
    return r.changes;
  }

  async deleteAll(): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      for (const t of ['scan_session_items', 'scan_sessions', 'code_tags', 'tags', 'qr_designs', 'barcode_options', 'codes', 'folders', 'templates']) {
        await this.db.runAsync(`DELETE FROM ${t}`);
      }
    });
  }

  private async cleanupTags(): Promise<void> {
    await this.db.runAsync('DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM code_tags)');
  }
}
