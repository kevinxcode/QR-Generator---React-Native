import { z } from 'zod';

import type { QRContentType } from '@/types/domain';

/** Escape special characters for the MECARD-like WIFI: syntax. */
export function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

/** Escape text values in vCard / iCalendar. */
export function escapeVText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
}

const digits = (v: string) => v.replace(/[^\d+]/g, '');

export function normalizeUrl(input: string): string {
  const v = input.trim();
  if (!v) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
  return `https://${v}`;
}

const nonEmpty = (label: string) => z.string().trim().min(1, `${label} is required`);

const urlField = nonEmpty('URL').refine((v) => {
  try {
    const u = new URL(normalizeUrl(v));
    if (!/^https?:$/.test(u.protocol)) return u.protocol.length > 1;
    return u.hostname.includes('.') || u.hostname === 'localhost';
  } catch {
    return false;
  }
}, 'Enter a valid web address');

const phoneField = (label = 'Phone number') =>
  nonEmpty(label).refine((v) => /^\+?[\d\s().-]{3,20}$/.test(v), `Enter a valid ${label.toLowerCase()}`);

const emailField = nonEmpty('Email').pipe(z.email('Enter a valid email address'));

export const schemas = {
  url: z.object({ url: urlField }),
  text: z.object({ text: nonEmpty('Text').max(2000, 'Text is too long for a reliable QR code') }),
  wifi: z.object({
    ssid: nonEmpty('Network name'),
    password: z.string(),
    security: z.enum(['WPA', 'WEP', 'nopass']),
    hidden: z.boolean(),
  }).refine((v) => v.security === 'nopass' || v.password.length > 0, {
    message: 'Password is required for secured networks',
    path: ['password'],
  }),
  vcard: z.object({
    firstName: z.string(),
    lastName: z.string(),
    organization: z.string(),
    title: z.string(),
    phone: z.string(),
    email: z.string(),
    website: z.string(),
    address: z.string(),
  }).refine((v) => (v.firstName + v.lastName + v.organization).trim().length > 0, {
    message: 'Enter a name or organization',
    path: ['firstName'],
  }),
  email: z.object({ to: emailField, subject: z.string(), body: z.string() }),
  phone: z.object({ phone: phoneField() }),
  sms: z.object({ phone: phoneField(), message: z.string() }),
  whatsapp: z.object({ phone: phoneField('WhatsApp number'), message: z.string() }),
  telegram: z.object({
    username: nonEmpty('Username').refine((v) => /^@?[A-Za-z0-9_]{4,32}$/.test(v.trim()), 'Enter a valid Telegram username'),
  }),
  location: z.object({
    latitude: nonEmpty('Latitude').refine((v) => Math.abs(Number(v)) <= 90 && !Number.isNaN(Number(v)), 'Latitude must be between -90 and 90'),
    longitude: nonEmpty('Longitude').refine((v) => Math.abs(Number(v)) <= 180 && !Number.isNaN(Number(v)), 'Longitude must be between -180 and 180'),
    label: z.string(),
  }),
  event: z.object({
    title: nonEmpty('Title'),
    location: z.string(),
    start: nonEmpty('Start').refine((v) => !Number.isNaN(Date.parse(v)), 'Use format YYYY-MM-DD HH:MM'),
    end: nonEmpty('End').refine((v) => !Number.isNaN(Date.parse(v)), 'Use format YYYY-MM-DD HH:MM'),
    description: z.string(),
  }).refine((v) => Date.parse(v.end) >= Date.parse(v.start), { message: 'End must be after start', path: ['end'] }),
  social: z.object({
    network: z.enum(['instagram', 'x', 'facebook', 'tiktok', 'linkedin', 'github']),
    handle: nonEmpty('Username'),
  }),
  youtube: z.object({ url: urlField }),
  spotify: z.object({ url: urlField }),
  applink: z.object({ url: urlField }),
  bitcoin: z.object({
    address: nonEmpty('Address').refine((v) => /^[a-zA-HJ-NP-Z0-9]{25,62}$/.test(v.trim()), 'Enter a valid Bitcoin address'),
    amount: z.string().refine((v) => v === '' || (/^\d+(\.\d{1,8})?$/.test(v)), 'Invalid amount'),
    label: z.string(),
  }),
  payment: z.object({ uri: nonEmpty('Payment URI').refine((v) => /^[a-z][a-z0-9+.-]*:/i.test(v.trim()), 'Enter a URI such as paypal:… or upi://…') }),
} satisfies Record<QRContentType, z.ZodType>;

export type FormValues<T extends QRContentType> = z.infer<(typeof schemas)[T]>;

export const defaults: { [K in QRContentType]: FormValues<K> } = {
  url: { url: '' },
  text: { text: '' },
  wifi: { ssid: '', password: '', security: 'WPA', hidden: false },
  vcard: { firstName: '', lastName: '', organization: '', title: '', phone: '', email: '', website: '', address: '' },
  email: { to: '', subject: '', body: '' },
  phone: { phone: '' },
  sms: { phone: '', message: '' },
  whatsapp: { phone: '', message: '' },
  telegram: { username: '' },
  location: { latitude: '', longitude: '', label: '' },
  event: { title: '', location: '', start: '', end: '', description: '' },
  social: { network: 'instagram', handle: '' },
  youtube: { url: '' },
  spotify: { url: '' },
  applink: { url: '' },
  bitcoin: { address: '', amount: '', label: '' },
  payment: { uri: '' },
};

const SOCIAL_BASE: Record<FormValues<'social'>['network'], string> = {
  instagram: 'https://instagram.com/',
  x: 'https://x.com/',
  facebook: 'https://facebook.com/',
  tiktok: 'https://www.tiktok.com/@',
  linkedin: 'https://www.linkedin.com/in/',
  github: 'https://github.com/',
};

function toICalDate(v: string): string {
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}00Z`;
}

type Builders = { [K in QRContentType]: (v: FormValues<K>) => string };

const builders: Builders = {
  url: (v) => normalizeUrl(v.url),
  text: (v) => v.text,
  wifi: (v) =>
    `WIFI:T:${v.security};S:${escapeWifi(v.ssid)};` +
    (v.security === 'nopass' ? '' : `P:${escapeWifi(v.password)};`) +
    (v.hidden ? 'H:true;' : '') +
    ';',
  vcard: (v) => {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    lines.push(`N:${escapeVText(v.lastName.trim())};${escapeVText(v.firstName.trim())};;;`);
    const fn = `${v.firstName} ${v.lastName}`.trim() || v.organization.trim();
    lines.push(`FN:${escapeVText(fn)}`);
    if (v.organization.trim()) lines.push(`ORG:${escapeVText(v.organization.trim())}`);
    if (v.title.trim()) lines.push(`TITLE:${escapeVText(v.title.trim())}`);
    if (v.phone.trim()) lines.push(`TEL;TYPE=CELL:${v.phone.trim()}`);
    if (v.email.trim()) lines.push(`EMAIL:${v.email.trim()}`);
    if (v.website.trim()) lines.push(`URL:${normalizeUrl(v.website)}`);
    if (v.address.trim()) lines.push(`ADR:;;${escapeVText(v.address.trim())};;;;`);
    lines.push('END:VCARD');
    return lines.join('\n');
  },
  email: (v) => {
    const q = new URLSearchParams();
    if (v.subject) q.set('subject', v.subject);
    if (v.body) q.set('body', v.body);
    const qs = q.toString().replace(/\+/g, '%20');
    return `mailto:${v.to.trim()}${qs ? `?${qs}` : ''}`;
  },
  phone: (v) => `tel:${digits(v.phone)}`,
  sms: (v) => `SMSTO:${digits(v.phone)}:${v.message}`,
  whatsapp: (v) => {
    const num = digits(v.phone).replace(/^\+/, '');
    return `https://wa.me/${num}${v.message ? `?text=${encodeURIComponent(v.message)}` : ''}`;
  },
  telegram: (v) => `https://t.me/${v.username.trim().replace(/^@/, '')}`,
  location: (v) => {
    const base = `geo:${Number(v.latitude)},${Number(v.longitude)}`;
    return v.label.trim() ? `${base}?q=${Number(v.latitude)},${Number(v.longitude)}(${encodeURIComponent(v.label.trim())})` : base;
  },
  event: (v) => {
    const lines = ['BEGIN:VEVENT', `SUMMARY:${escapeVText(v.title.trim())}`];
    if (v.location.trim()) lines.push(`LOCATION:${escapeVText(v.location.trim())}`);
    lines.push(`DTSTART:${toICalDate(v.start)}`, `DTEND:${toICalDate(v.end)}`);
    if (v.description.trim()) lines.push(`DESCRIPTION:${escapeVText(v.description.trim())}`);
    lines.push('END:VEVENT');
    return lines.join('\n');
  },
  social: (v) => SOCIAL_BASE[v.network] + v.handle.trim().replace(/^@/, ''),
  youtube: (v) => normalizeUrl(v.url),
  spotify: (v) => normalizeUrl(v.url),
  applink: (v) => normalizeUrl(v.url),
  bitcoin: (v) => {
    const q = new URLSearchParams();
    if (v.amount) q.set('amount', v.amount);
    if (v.label.trim()) q.set('label', v.label.trim());
    const qs = q.toString().replace(/\+/g, '%20');
    return `bitcoin:${v.address.trim()}${qs ? `?${qs}` : ''}`;
  },
  payment: (v) => v.uri.trim(),
};

export type ValidationResult =
  | { ok: true; payload: string }
  | { ok: false; errors: Record<string, string> };

/** Validate form values for a content type and build the QR payload. */
export function buildPayload<T extends QRContentType>(type: T, values: unknown): ValidationResult {
  const parsed = schemas[type].safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '_');
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }
  const payload = (builders[type] as (v: unknown) => string)(parsed.data);
  return { ok: true, payload };
}
