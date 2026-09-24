import { buildPayload, escapeWifi } from '@/services/qr/payload';
import { parseScan } from '@/services/scanner/ScanResultParser';

const ok = (r: ReturnType<typeof buildPayload>) => {
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.payload;
};

describe('buildPayload', () => {
  it('normalises URLs without protocol', () => {
    expect(ok(buildPayload('url', { url: 'example.com/path' }))).toBe('https://example.com/path');
  });

  it('rejects invalid URLs', () => {
    const r = buildPayload('url', { url: 'not a url' });
    expect(r.ok).toBe(false);
  });

  it('builds WPA WiFi payload with escaping', () => {
    const p = ok(buildPayload('wifi', { ssid: 'My;Net', password: 'p:a,s"s\\', security: 'WPA', hidden: true }));
    expect(p).toBe('WIFI:T:WPA;S:My\\;Net;P:p\\:a\\,s\\"s\\\\;H:true;;');
  });

  it('WiFi special characters round-trip through the parser', () => {
    const ssid = 'Café;,:"\\ 🚀';
    const password = 'a;b,c:d"e\\f';
    const p = ok(buildPayload('wifi', { ssid, password, security: 'WPA', hidden: false }));
    const parsed = parseScan(p, 'qr');
    expect(parsed.type).toBe('wifi');
    expect(parsed.metadata.ssid).toBe(ssid);
    expect(parsed.metadata.password).toBe(password);
  });

  it('omits password for open networks', () => {
    expect(ok(buildPayload('wifi', { ssid: 'Open', password: 'x', security: 'nopass', hidden: false }))).toBe('WIFI:T:nopass;S:Open;;');
  });

  it('requires password for secured WiFi', () => {
    const r = buildPayload('wifi', { ssid: 'N', password: '', security: 'WPA', hidden: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.password).toBeDefined();
  });

  it('builds a vCard', () => {
    const p = ok(buildPayload('vcard', {
      firstName: 'Ada', lastName: 'Lovelace', organization: 'Analytical, Ltd', title: '',
      phone: '+44 123', email: 'ada@example.com', website: 'ada.dev', address: '',
    }));
    expect(p).toContain('BEGIN:VCARD');
    expect(p).toContain('FN:Ada Lovelace');
    expect(p).toContain('ORG:Analytical\\, Ltd');
    expect(p).toContain('URL:https://ada.dev');
    expect(p.endsWith('END:VCARD')).toBe(true);
  });

  it('builds mailto with encoded subject', () => {
    expect(ok(buildPayload('email', { to: 'a@b.co', subject: 'Hi there', body: '' }))).toBe('mailto:a@b.co?subject=Hi%20there');
  });

  it('builds WhatsApp link', () => {
    expect(ok(buildPayload('whatsapp', { phone: '+62 812-3456', message: 'halo 👋' }))).toBe(`https://wa.me/628123456?text=${encodeURIComponent('halo 👋')}`);
  });

  it('builds geo URI and validates range', () => {
    expect(ok(buildPayload('location', { latitude: '-6.2', longitude: '106.8', label: '' }))).toBe('geo:-6.2,106.8');
    expect(buildPayload('location', { latitude: '91', longitude: '0', label: '' }).ok).toBe(false);
  });

  it('builds calendar events and rejects end before start', () => {
    const p = ok(buildPayload('event', { title: 'Launch', location: '', start: '2026-10-01T10:00:00Z', end: '2026-10-01T11:00:00Z', description: '' }));
    expect(p).toContain('DTSTART:20261001T100000Z');
    expect(buildPayload('event', { title: 'x', location: '', start: '2026-10-02T10:00:00Z', end: '2026-10-01T10:00:00Z', description: '' }).ok).toBe(false);
  });

  it('accepts local "YYYY-MM-DD HH:MM" event times', () => {
    const r = buildPayload('event', { title: 'Party', location: '', start: '2026-10-01 18:00', end: '2026-10-01 20:30', description: '' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  });

  it('keeps unicode and emoji text as-is', () => {
    expect(ok(buildPayload('text', { text: 'こんにちは 🌸 Ünïcødé' }))).toBe('こんにちは 🌸 Ünïcødé');
  });

  it('builds social and telegram links', () => {
    expect(ok(buildPayload('social', { network: 'github', handle: '@octocat' }))).toBe('https://github.com/octocat');
    expect(ok(buildPayload('telegram', { username: '@durov' }))).toBe('https://t.me/durov');
  });

  it('builds bitcoin URI', () => {
    expect(ok(buildPayload('bitcoin', { address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: '0.01', label: 'Tip' })))
      .toBe('bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.01&label=Tip');
  });

  it('escapeWifi escapes backslash first-class', () => {
    expect(escapeWifi('a\\b')).toBe('a\\\\b');
  });
});
