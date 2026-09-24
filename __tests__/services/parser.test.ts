import { parseScan } from '@/services/scanner/ScanResultParser';
import { analyzeUrl } from '@/services/scanner/urlSafety';

describe('parseScan', () => {
  it('detects https URL with metadata and never auto-opens', () => {
    const r = parseScan('https://example.com/a?b=1');
    expect(r.type).toBe('url');
    expect(r.metadata.domain).toBe('example.com');
    expect(r.metadata.protocol).toBe('https');
    expect(r.metadata.unusual).toBe('false');
    expect(r.actions).toContain('open');
  });

  it('flags http, IP and punycode URLs as unusual', () => {
    expect(parseScan('http://example.com').metadata.unusual).toBe('true');
    expect(parseScan('https://192.168.1.10/login').metadata.warnings).toMatch(/IP address/);
    expect(parseScan('https://xn--pple-43d.com').metadata.warnings).toMatch(/punycode/);
  });

  it('flags very long URLs', () => {
    const long = `https://example.com/${'a'.repeat(250)}`;
    expect(analyzeUrl(long)?.warnings.join()).toMatch(/Very long/);
  });

  it('treats www.domain as URL', () => {
    expect(parseScan('www.example.org').type).toBe('url');
  });

  it('parses WiFi', () => {
    const r = parseScan('WIFI:S:Office;T:WPA;P:secret123;H:true;;');
    expect(r.type).toBe('wifi');
    expect(r.metadata).toMatchObject({ ssid: 'Office', password: 'secret123', security: 'WPA', hidden: 'true' });
    expect(r.actions).toContain('copyPassword');
  });

  it('parses open WiFi without password', () => {
    const r = parseScan('WIFI:T:nopass;S:Cafe;;');
    expect(r.metadata.security).toBe('None');
    expect(r.actions).not.toContain('copyPassword');
  });

  it('parses mailto and MATMSG', () => {
    expect(parseScan('mailto:a@b.co?subject=Hi%20you').metadata).toMatchObject({ to: 'a@b.co', subject: 'Hi you' });
    expect(parseScan('MATMSG:TO:x@y.z;SUB:S;BODY:B;;').metadata).toMatchObject({ to: 'x@y.z', subject: 'S', body: 'B' });
  });

  it('parses tel and sms', () => {
    expect(parseScan('tel:+628123').type).toBe('phone');
    expect(parseScan('SMSTO:+1555:hello there').metadata).toEqual({ phone: '+1555', message: 'hello there' });
    expect(parseScan('sms:+1555?body=yo').metadata.message).toBe('yo');
  });

  it('parses vCard', () => {
    const r = parseScan('BEGIN:VCARD\nVERSION:3.0\nN:Lovelace;Ada;;;\nFN:Ada Lovelace\nTEL;TYPE=CELL:+44\nEMAIL:ada@x.io\nEND:VCARD');
    expect(r.type).toBe('vcard');
    expect(r.metadata.name).toBe('Ada Lovelace');
    expect(r.actions).toEqual(expect.arrayContaining(['saveContact', 'call', 'email']));
  });

  it('parses geo with label', () => {
    const r = parseScan('geo:-6.2,106.8?q=-6.2,106.8(Monas)');
    expect(r.type).toBe('location');
    expect(r.metadata).toMatchObject({ latitude: '-6.2', longitude: '106.8', label: 'Monas' });
  });

  it('parses calendar event', () => {
    const r = parseScan('BEGIN:VEVENT\nSUMMARY:Launch\nDTSTART:20261001T100000Z\nDTEND:20261001T110000Z\nEND:VEVENT');
    expect(r.type).toBe('event');
    expect(r.metadata.start).toBe('2026-10-01T10:00:00Z');
  });

  it('falls back to text including unicode/emoji', () => {
    const r = parseScan('hello 世界 🎉');
    expect(r.type).toBe('text');
    expect(r.rawValue).toBe('hello 世界 🎉');
  });

  it('treats sentences containing URLs as text', () => {
    expect(parseScan('visit https://x.com now').type).toBe('text');
  });

  it('returns barcode type for 1D formats', () => {
    const r = parseScan('4006381333931', 'ean13');
    expect(r.type).toBe('barcode');
    expect(r.metadata.format).toBe('EAN13');
    expect(r.actions).toContain('searchWeb');
  });
});
