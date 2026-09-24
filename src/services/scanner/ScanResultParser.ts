import type { CodeFormat } from '@/types/domain';

import { analyzeUrl } from './urlSafety';

export type ParsedType =
  | 'url'
  | 'wifi'
  | 'email'
  | 'phone'
  | 'sms'
  | 'vcard'
  | 'location'
  | 'event'
  | 'text'
  | 'barcode';

export type ScanAction =
  | 'open'
  | 'copy'
  | 'share'
  | 'save'
  | 'copyPassword'
  | 'wifiSettings'
  | 'saveContact'
  | 'call'
  | 'email'
  | 'sms'
  | 'maps'
  | 'searchWeb'
  | 'addEvent';

export interface ParsedScan {
  type: ParsedType;
  rawValue: string;
  format: CodeFormat;
  title: string;
  metadata: Record<string, string>;
  actions: ScanAction[];
}

/** Split on unescaped `;` and unescape `\x` sequences (MECARD/WIFI syntax). */
function splitMecard(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let key = '';
  let value = '';
  let readingKey = true;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '\\' && i + 1 < body.length) {
      if (readingKey) key += body[++i];
      else value += body[++i];
      continue;
    }
    if (readingKey) {
      if (ch === ':') readingKey = false;
      else key += ch;
    } else if (ch === ';') {
      if (key && !(key.toUpperCase() in out)) out[key.toUpperCase()] = value;
      key = '';
      value = '';
      readingKey = true;
    } else {
      value += ch;
    }
  }
  if (!readingKey && key && !(key.toUpperCase() in out)) out[key.toUpperCase()] = value;
  return out;
}

function unescapeVText(v: string): string {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

/** Parse vCard/iCal-style "KEY;PARAMS:VALUE" lines (with line unfolding). */
function parseLines(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const unfolded = raw.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  for (const line of unfolded.split('\n')) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).split(';')[0].toUpperCase();
    if (!(key in out)) out[key] = line.slice(idx + 1);
  }
  return out;
}

function fromICalDate(v: string | undefined): string {
  if (!v) return '';
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(v);
  if (!m) return v;
  const [, y, mo, d, h = '00', mi = '00', , z] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:00${z ? 'Z' : ''}`;
  return iso;
}

const BARCODE_FORMATS: CodeFormat[] = [
  'ean13', 'ean8', 'upc_a', 'upc_e', 'code39', 'code93', 'code128', 'itf14', 'codabar',
];

export function parseScan(rawValue: string, format: CodeFormat = 'qr'): ParsedScan {
  const raw = rawValue ?? '';
  const trimmed = raw.trim();
  const base = { rawValue: raw, format };

  if (BARCODE_FORMATS.includes(format)) {
    const isProduct = ['ean13', 'ean8', 'upc_a', 'upc_e'].includes(format);
    return {
      ...base,
      type: 'barcode',
      title: isProduct ? 'Product barcode' : 'Barcode',
      metadata: { format: format.toUpperCase().replace('_', '-'), value: raw },
      actions: ['copy', 'searchWeb', 'share', 'save'],
    };
  }

  // WiFi
  if (/^WIFI:/i.test(trimmed)) {
    const f = splitMecard(trimmed.slice(5));
    const security = (f.T || 'nopass').toUpperCase();
    return {
      ...base,
      type: 'wifi',
      title: f.S || 'Wi-Fi network',
      metadata: {
        ssid: f.S ?? '',
        password: f.P ?? '',
        security: security === 'NOPASS' ? 'None' : security,
        hidden: String(f.H?.toLowerCase() === 'true'),
      },
      actions: f.P ? ['copyPassword', 'wifiSettings', 'share', 'save'] : ['wifiSettings', 'share', 'save'],
    };
  }

  // vCard
  if (/^BEGIN:VCARD/i.test(trimmed)) {
    const f = parseLines(trimmed);
    const n = (f.N ?? '').split(';');
    const name = unescapeVText(f.FN || `${n[1] ?? ''} ${n[0] ?? ''}`.trim());
    return {
      ...base,
      type: 'vcard',
      title: name || 'Contact',
      metadata: {
        name,
        organization: unescapeVText(f.ORG ?? '').replace(/;+$/, ''),
        title: unescapeVText(f.TITLE ?? ''),
        phone: f.TEL ?? '',
        email: f.EMAIL ?? '',
        website: f.URL ?? '',
        address: unescapeVText((f.ADR ?? '').split(';').filter(Boolean).join(', ')),
      },
      actions: ['saveContact', ...(f.TEL ? (['call'] as const) : []), ...(f.EMAIL ? (['email'] as const) : []), 'copy', 'share', 'save'],
    };
  }

  // MECARD contact
  if (/^MECARD:/i.test(trimmed)) {
    const f = splitMecard(trimmed.slice(7));
    const name = (f.N ?? '').split(',').reverse().join(' ').trim();
    return {
      ...base,
      type: 'vcard',
      title: name || 'Contact',
      metadata: { name, organization: f.ORG ?? '', title: '', phone: f.TEL ?? '', email: f.EMAIL ?? '', website: f.URL ?? '', address: f.ADR ?? '' },
      actions: ['saveContact', ...(f.TEL ? (['call'] as const) : []), 'copy', 'share', 'save'],
    };
  }

  // Calendar
  if (/^BEGIN:(VEVENT|VCALENDAR)/i.test(trimmed)) {
    const f = parseLines(trimmed);
    return {
      ...base,
      type: 'event',
      title: unescapeVText(f.SUMMARY ?? 'Event'),
      metadata: {
        summary: unescapeVText(f.SUMMARY ?? ''),
        location: unescapeVText(f.LOCATION ?? ''),
        start: fromICalDate(f.DTSTART),
        end: fromICalDate(f.DTEND),
        description: unescapeVText(f.DESCRIPTION ?? ''),
      },
      actions: ['addEvent', 'copy', 'share', 'save'],
    };
  }

  // Email
  if (/^mailto:/i.test(trimmed)) {
    const [addr, query = ''] = trimmed.slice(7).split('?');
    const q = new URLSearchParams(query);
    return {
      ...base,
      type: 'email',
      title: decodeURIComponent(addr),
      metadata: { to: decodeURIComponent(addr), subject: q.get('subject') ?? '', body: q.get('body') ?? '' },
      actions: ['email', 'copy', 'share', 'save'],
    };
  }
  if (/^MATMSG:/i.test(trimmed)) {
    const f = splitMecard(trimmed.slice(7));
    return {
      ...base,
      type: 'email',
      title: f.TO ?? 'Email',
      metadata: { to: f.TO ?? '', subject: f.SUB ?? '', body: f.BODY ?? '' },
      actions: ['email', 'copy', 'share', 'save'],
    };
  }

  // Phone
  if (/^tel:/i.test(trimmed)) {
    const phone = decodeURIComponent(trimmed.slice(4));
    return { ...base, type: 'phone', title: phone, metadata: { phone }, actions: ['call', 'sms', 'copy', 'share', 'save'] };
  }

  // SMS
  const smsto = /^SMSTO:([^:]*):?([\s\S]*)$/i.exec(trimmed);
  if (smsto) {
    return {
      ...base, type: 'sms', title: smsto[1], metadata: { phone: smsto[1], message: smsto[2] ?? '' },
      actions: ['sms', 'call', 'copy', 'share', 'save'],
    };
  }
  if (/^sms:/i.test(trimmed)) {
    const [phone, query = ''] = trimmed.slice(4).split('?');
    const body = new URLSearchParams(query).get('body') ?? '';
    return { ...base, type: 'sms', title: phone, metadata: { phone, message: body }, actions: ['sms', 'call', 'copy', 'share', 'save'] };
  }

  // Location
  const geo = /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:[,;][^?]*)?(?:\?(.*))?$/i.exec(trimmed);
  if (geo) {
    const q = new URLSearchParams(geo[3] ?? '').get('q') ?? '';
    const label = /\(([^)]*)\)/.exec(q)?.[1] ?? '';
    return {
      ...base, type: 'location', title: label || `${geo[1]}, ${geo[2]}`,
      metadata: { latitude: geo[1], longitude: geo[2], label },
      actions: ['maps', 'copy', 'share', 'save'],
    };
  }

  // URL
  const report = analyzeUrl(trimmed);
  if (report && !/\s/.test(trimmed)) {
    return {
      ...base,
      type: 'url',
      title: report.domain,
      metadata: {
        url: report.url,
        domain: report.domain,
        protocol: report.protocol,
        unusual: String(report.unusual),
        warnings: report.warnings.join('\n'),
      },
      actions: ['open', 'copy', 'share', 'save'],
    };
  }
  // Bare domain such as "www.example.com"
  if (/^www\.[^\s]+\.[a-z]{2,}(\/\S*)?$/i.test(trimmed)) {
    return parseScan(`https://${trimmed}`, format);
  }

  const firstLine = trimmed.split('\n')[0] ?? '';
  return {
    ...base,
    type: 'text',
    title: firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine || 'Text',
    metadata: { length: String(raw.length) },
    actions: ['copy', 'share', 'searchWeb', 'save'],
  };
}
