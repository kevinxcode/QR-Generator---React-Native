/** @jest-environment node */
import { LATEST_VERSION, migrate } from '@/db/migrations';
import { CodeRepository } from '@/db/repositories/CodeRepository';
import { DesignRepository } from '@/db/repositories/DesignRepository';
import { FolderRepository } from '@/db/repositories/FolderRepository';
import { HistoryRepository } from '@/db/repositories/HistoryRepository';
import { ScanSessionRepository } from '@/db/repositories/ScanSessionRepository';
import { TagRepository } from '@/db/repositories/TagRepository';
import type { Db } from '@/db/types';
import { DEFAULT_DESIGN } from '@/services/qr/QRGeneratorService';

import { createNodeDb } from '../helpers/nodeDb';

let db: Db;
let clock = 1_700_000_000_000;
const now = () => clock;

beforeEach(async () => {
  db = createNodeDb();
  clock = new Date(2026, 8, 24, 12).getTime();
  await migrate(db);
});

const scanned = (payload: string, extra: object = {}) => ({
  kind: 'qr' as const, format: 'qr' as const, contentType: 'text' as const, payload, source: 'scanned' as const, ...extra,
});

describe('migrations', () => {
  it('sets user_version and is idempotent', async () => {
    expect(await migrate(db)).toBe(LATEST_VERSION);
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(LATEST_VERSION);
  });
});

describe('CodeRepository', () => {
  it('inserts, reads, updates and deletes', async () => {
    const repo = new CodeRepository(db, now);
    const c = await repo.create(scanned('hello 👋'));
    expect(c.payload).toBe('hello 👋');
    expect(c.isFavorite).toBe(false);

    clock += 1000;
    const u = await repo.update(c.id, { note: 'desk', title: 'Greeting' });
    expect(u?.note).toBe('desk');
    expect(u?.updatedAt).toBeGreaterThan(c.updatedAt);

    await repo.delete(c.id);
    expect(await repo.get(c.id)).toBeNull();
  });

  it('toggles favorite', async () => {
    const repo = new CodeRepository(db, now);
    const c = await repo.create(scanned('x'));
    expect(await repo.toggleFavorite(c.id)).toBe(true);
    expect(await repo.toggleFavorite(c.id)).toBe(false);
  });

  it('filters, searches, sorts and paginates', async () => {
    const repo = new CodeRepository(db, now);
    const tags = new TagRepository(db);
    const a = await repo.create({ ...scanned('https://example.com'), contentType: 'url', createdAt: clock - 10 * 86400000 });
    const b = await repo.create({ kind: 'barcode', format: 'ean13', contentType: 'barcode', payload: '4006381333931', source: 'generated', note: 'warehouse shelf' });
    await repo.create({ ...scanned('100%_literal'), isFavorite: true });
    await tags.setForCode(a.id, ['#Office']);

    expect((await repo.list({ filter: 'scanned' })).length).toBe(2);
    expect((await repo.list({ filter: 'created' })).map((c) => c.id)).toEqual([b.id]);
    expect((await repo.list({ filter: 'favorites' })).length).toBe(1);
    expect((await repo.list({ search: 'warehouse' }))[0].id).toBe(b.id);
    expect((await repo.list({ search: 'ean13' }))[0].id).toBe(b.id);
    expect((await repo.list({ search: '#office' }))[0].id).toBe(a.id);
    expect((await repo.list({ search: '%' })).length).toBe(1); // LIKE wildcards are escaped
    expect((await repo.list({ from: clock - 7 * 86400000 })).length).toBe(2);
    expect((await repo.list({ sort: 'oldest' }))[0].id).toBe(a.id);
    expect((await repo.list({ limit: 1, offset: 1 })).length).toBe(1);
  });

  it('computes stats', async () => {
    const repo = new CodeRepository(db, now);
    await repo.create(scanned('a'));
    await repo.create({ ...scanned('b'), createdAt: clock - 2 * 86400000 });
    await repo.create({ kind: 'qr', format: 'qr', contentType: 'url', payload: 'c', source: 'generated', isFavorite: true });
    expect(await repo.stats()).toEqual({ total: 3, scanned: 2, created: 1, favorites: 1, scannedToday: 1, createdToday: 1 });
  });
});

describe('DesignRepository', () => {
  it('round-trips a QR design and upserts', async () => {
    const codes = new CodeRepository(db, now);
    const repo = new DesignRepository(db);
    const c = await codes.create({ kind: 'qr', format: 'qr', contentType: 'url', payload: 'x', source: 'generated' });
    const design = { ...DEFAULT_DESIGN, bodyStyle: 'dots' as const, gradientType: 'linear' as const, frameType: 'scanMe' as const, logoUri: 'file:///logo.png' };
    await repo.saveQrDesign(c.id, design);
    expect(await repo.getQrDesign(c.id)).toEqual(design);
    await repo.saveQrDesign(c.id, { ...design, bodyStyle: 'rounded' });
    expect((await repo.getQrDesign(c.id))?.bodyStyle).toBe('rounded');
  });

  it('cascades on code delete', async () => {
    const codes = new CodeRepository(db, now);
    const repo = new DesignRepository(db);
    const c = await codes.create({ kind: 'qr', format: 'qr', contentType: 'url', payload: 'x', source: 'generated' });
    await repo.saveQrDesign(c.id, DEFAULT_DESIGN);
    await codes.delete(c.id);
    expect(await repo.getQrDesign(c.id)).toBeNull();
  });
});

describe('FolderRepository', () => {
  it('creates, prevents duplicates, lists counts and unfiles on delete', async () => {
    const folders = new FolderRepository(db, now);
    const codes = new CodeRepository(db, now);
    const f = await folders.create('Work');
    await expect(folders.create('work')).rejects.toThrow(/already exists/);
    const c = await codes.create({ ...scanned('x'), folderId: f.id });
    expect((await folders.list())[0].count).toBe(1);
    await folders.delete(f.id);
    expect((await codes.get(c.id))?.folderId).toBeNull();
  });

  it('seeds defaults once', async () => {
    const folders = new FolderRepository(db, now);
    await folders.seedDefaults();
    await folders.seedDefaults();
    expect((await folders.list()).length).toBe(6);
  });
});

describe('TagRepository', () => {
  it('normalises, dedupes and cleans up tags', async () => {
    const codes = new CodeRepository(db, now);
    const tags = new TagRepository(db);
    const c = await codes.create(scanned('x'));
    const set = await tags.setForCode(c.id, ['#WiFi', 'wifi', ' office ', '']);
    expect(set.map((t) => t.name)).toEqual(['office', 'wifi']);
    await tags.setForCode(c.id, ['office']);
    expect((await tags.list()).map((t) => t.name)).toEqual(['office']);
  });
});

describe('ScanSessionRepository + HistoryRepository', () => {
  it('saves a batch session as scanned codes', async () => {
    const sessions = new ScanSessionRepository(db, now);
    const s = await sessions.save('Inventory A', [
      { payload: '4006381333931', format: 'ean13', contentType: 'barcode', scannedAt: clock },
      { payload: 'https://x.io', format: 'qr', contentType: 'url', scannedAt: clock + 1 },
    ]);
    expect(s.itemCount).toBe(2);
    const items = await sessions.items(s.id);
    expect(items.map((i) => i.kind)).toEqual(['barcode', 'qr']);
    expect((await sessions.list())[0].itemCount).toBe(2);
  });

  it('clears scanned history only, then everything', async () => {
    const codes = new CodeRepository(db, now);
    const history = new HistoryRepository(db);
    await codes.create(scanned('a'));
    await codes.create({ kind: 'qr', format: 'qr', contentType: 'url', payload: 'b', source: 'generated' });
    expect(await history.clearScanned()).toBe(1);
    expect((await codes.stats()).total).toBe(1);
    await history.deleteAll();
    expect((await codes.stats()).total).toBe(0);
  });
});
