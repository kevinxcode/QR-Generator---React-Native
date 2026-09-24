import type { QRDesign } from '@/types/domain';
import { uuid } from '@/utils/id';

import type { Db } from '../types';

export interface UserTemplate {
  id: string;
  name: string;
  design: QRDesign;
  createdAt: number;
}

export class TemplateRepository {
  constructor(private db: Db, private now: () => number = Date.now) {}

  async list(): Promise<UserTemplate[]> {
    const rows = await this.db.getAllAsync<{ id: string; name: string; design: string; created_at: number }>(
      'SELECT * FROM templates ORDER BY created_at DESC',
    );
    const out: UserTemplate[] = [];
    for (const r of rows) {
      try {
        out.push({ id: r.id, name: r.name, design: JSON.parse(r.design) as QRDesign, createdAt: r.created_at });
      } catch {
        // skip corrupt row
      }
    }
    return out;
  }

  async save(name: string, design: QRDesign): Promise<UserTemplate> {
    const t: UserTemplate = { id: uuid(), name: name.trim() || 'My template', design: { ...design, logoUri: null }, createdAt: this.now() };
    await this.db.runAsync('INSERT INTO templates (id, name, design, created_at) VALUES (?,?,?,?)', [t.id, t.name, JSON.stringify(t.design), t.createdAt]);
    return t;
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM templates WHERE id = ?', [id]);
  }
}
