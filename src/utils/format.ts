import type { Ionicons } from '@expo/vector-icons';

import { formatLabel } from '@/services/barcode/formats';
import { contentTypeDef } from '@/services/qr/contentTypes';
import type { CodeRecord } from '@/types/domain';

export function relativeDate(ts: number, now = Date.now()): string {
  const diff = now - ts;
  const min = 60_000;
  if (diff < min) return 'Just now';
  if (diff < 60 * min) return `${Math.floor(diff / min)}m ago`;
  const d = new Date(ts);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (ts >= today.getTime()) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (ts >= today.getTime() - 86_400_000) return 'Yesterday';
  if (diff < 7 * 86_400_000) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

export function fullDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

const PARSED_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  url: { label: 'Website', icon: 'globe-outline' },
  wifi: { label: 'Wi-Fi', icon: 'wifi-outline' },
  email: { label: 'Email', icon: 'mail-outline' },
  phone: { label: 'Phone', icon: 'call-outline' },
  sms: { label: 'SMS', icon: 'chatbox-outline' },
  vcard: { label: 'Contact', icon: 'person-circle-outline' },
  location: { label: 'Location', icon: 'location-outline' },
  event: { label: 'Event', icon: 'calendar-outline' },
  text: { label: 'Text', icon: 'text-outline' },
  barcode: { label: 'Barcode', icon: 'barcode-outline' },
  product: { label: 'Product', icon: 'pricetag-outline' },
};

export function typeMeta(contentType: string): { label: string; icon: keyof typeof Ionicons.glyphMap } {
  const def = contentTypeDef(contentType);
  if (def) return { label: def.label, icon: def.icon };
  return PARSED_META[contentType] ?? { label: 'Code', icon: 'qr-code-outline' };
}

/** Short one-line preview of a code's content. */
export function codeSummary(c: Pick<CodeRecord, 'payload' | 'contentType' | 'title'>): string {
  if (c.title) return c.title;
  const p = c.payload;
  if (c.contentType === 'wifi') return /S:((?:\\.|[^;])*)/.exec(p)?.[1]?.replace(/\\(.)/g, '$1') ?? 'Wi-Fi network';
  if (c.contentType === 'vcard') return /FN:(.*)/.exec(p)?.[1]?.trim() ?? 'Contact';
  if (c.contentType === 'event') return /SUMMARY:(.*)/.exec(p)?.[1]?.trim() ?? 'Event';
  const line = p.replace(/^(mailto:|tel:|SMSTO:|geo:)/i, '').split('\n')[0];
  return line.length > 80 ? `${line.slice(0, 77)}…` : line;
}

export function codeFormatLabel(c: Pick<CodeRecord, 'format'>): string {
  return formatLabel(c.format);
}
