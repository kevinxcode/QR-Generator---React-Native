/** @jest-environment node */
import { migrate } from '@/db/migrations';
import { BackupRepository } from '@/db/repositories/BackupRepository';
import { CodeRepository } from '@/db/repositories/CodeRepository';
import { DesignRepository } from '@/db/repositories/DesignRepository';
import { FolderRepository } from '@/db/repositories/FolderRepository';
import { ScanSessionRepository } from '@/db/repositories/ScanSessionRepository';
import { TagRepository } from '@/db/repositories/TagRepository';
import { parseBackup } from '@/services/export/backupSchema';
import { DEFAULT_DESIGN } from '@/services/qr/QRGeneratorService';

import { createNodeDb } from '../helpers/nodeDb';

async function seeded() {
  const db = createNodeDb();
  await migrate(db);
  const codes = new CodeRepository(db);
  const folder = await new FolderRepository(db).create('Work');
  const c = await codes.create({ kind: 'qr', format: 'qr', contentType: 'wifi', payload: 'WIFI:S:x;;', source: 'generated', folderId: folder.id, isFavorite: true });
  await new DesignRepository(db).saveQrDesign(c.id, { ...DEFAULT_DESIGN, bodyStyle: 'dots' });
  await new TagRepository(db).setForCode(c.id, ['office']);
  await new ScanSessionRepository(db).save('Batch', [{ payload: '123', format: 'code128', contentType: 'barcode', scannedAt: 1 }]);
  return db;
}

describe('backup', () => {
  it('exports, validates and restores into an empty database', async () => {
    const src = await seeded();
    const json = JSON.stringify(await new BackupRepository(src).export());

    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const dst = createNodeDb();
    await migrate(dst);
    const summary = await new BackupRepository(dst).restore(parsed.backup, 'replace');
    expect(summary).toEqual({ codes: 2, folders: 1, tags: 1, sessions: 1 });

    const codes = new CodeRepository(dst);
    const fav = (await codes.list({ filter: 'favorites' }))[0];
    expect(fav.payload).toBe('WIFI:S:x;;');
    expect((await new DesignRepository(dst).getQrDesign(fav.id))?.bodyStyle).toBe('dots');
    expect((await new TagRepository(dst).forCode(fav.id)).map((t) => t.name)).toEqual(['office']);
  });

  it('merge is idempotent and maps folders by name', async () => {
    const db = await seeded();
    const backup = await new BackupRepository(db).export();
    const summary = await new BackupRepository(db).restore(backup, 'merge');
    expect(summary.codes).toBe(0);
    expect((await new FolderRepository(db).list()).length).toBe(1);
  });

  it('rejects invalid files before touching the database', () => {
    expect(parseBackup('not json')).toMatchObject({ ok: false, error: expect.stringMatching(/JSON/) });
    expect(parseBackup('{"app":"other"}')).toMatchObject({ ok: false, error: expect.stringMatching(/not a Qraft/) });
    expect(parseBackup('{"app":"qraft","version":99}')).toMatchObject({ ok: false, error: expect.stringMatching(/unsupported/) });
    const bad = { app: 'qraft', version: 1, exportedAt: 1, folders: [], tags: [], codes: [{ id: 1 }], code_tags: [], qr_designs: [], barcode_options: [], templates: [], scan_sessions: [], scan_session_items: [] };
    expect(parseBackup(JSON.stringify(bad))).toMatchObject({ ok: false, error: expect.stringMatching(/damaged/) });
  });
});
