import { toCsv } from '@/services/export/csv';
import { normalizeScannedType } from '@/services/scanner/capabilities';
import { BatchSession, ScanCooldown } from '@/services/scanner/dedupe';

describe('ScanCooldown', () => {
  it('fires once while the same code stays in view', () => {
    const c = new ScanCooldown(2000, 300);
    const t = 1000;
    expect(c.accept('A', t)).toBe(true);
    // 30 fps for 3 seconds of continuous view
    for (let i = 1; i < 90; i++) expect(c.accept('A', t + i * 33)).toBe(false);
  });

  it('accepts the same code after it leaves view for the cooldown', () => {
    const c = new ScanCooldown(2000, 300);
    expect(c.accept('A', 0)).toBe(true);
    expect(c.accept('A', 2500)).toBe(true);
  });

  it('enforces a minimum gap between different codes', () => {
    const c = new ScanCooldown(2000, 300);
    expect(c.accept('A', 0)).toBe(true);
    expect(c.accept('B', 100)).toBe(false);
    expect(c.accept('B', 5000)).toBe(true);
  });
});

describe('BatchSession', () => {
  it('counts duplicates without adding them', () => {
    const b = new BatchSession(false);
    expect(b.add('1', 'ean13')).toBe('added');
    expect(b.add('2', 'ean13')).toBe('added');
    expect(b.add('1', 'ean13')).toBe('duplicate');
    expect(b.add('1', 'code128')).toBe('added'); // same value, different symbology
    expect(b.items.length).toBe(3);
    expect(b.stats()).toEqual({ total: 4, unique: 3, duplicates: 1 });
  });

  it('appends duplicates when allowed', () => {
    const b = new BatchSession(true);
    b.add('1', 'qr');
    b.add('1', 'qr');
    expect(b.items.length).toBe(2);
    expect(b.stats()).toEqual({ total: 2, unique: 1, duplicates: 1 });
  });

  it('removes items and updates stats', () => {
    const b = new BatchSession();
    b.add('1', 'qr');
    b.add('1', 'qr');
    b.remove(b.items[0].key);
    expect(b.stats()).toEqual({ total: 0, unique: 0, duplicates: 0 });
  });
});

describe('csv', () => {
  it('quotes and neutralises formulas', () => {
    expect(toCsv(['a', 'b'], [['x,y', '=SUM(A1)'], ['say "hi"', 3]])).toBe('a,b\r\n"x,y",\'=SUM(A1)\r\n"say ""hi""",3');
  });
});

describe('normalizeScannedType', () => {
  it.each([
    ['qr', 'qr'], ['org.iso.QRCode', 'qr'], ['org.gs1.EAN-13', 'ean13'], ['upc_e', 'upc_e'],
    ['org.iso.Code128', 'code128'], ['itf14', 'itf14'], [256, 'qr'], [32, 'ean13'], ['weird', 'unknown'],
  ] as const)('%s → %s', (input, out) => {
    expect(normalizeScannedType(input)).toBe(out);
  });
});
