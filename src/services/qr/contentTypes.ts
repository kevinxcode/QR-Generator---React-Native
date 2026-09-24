import type { Ionicons } from '@expo/vector-icons';
import type { KeyboardTypeOptions } from 'react-native';

import type { QRContentType } from '@/types/domain';

export type FieldDef =
  | { key: string; kind: 'text'; label: string; placeholder?: string; keyboard?: KeyboardTypeOptions; multiline?: boolean; secure?: boolean; autoCapitalize?: 'none' | 'sentences' | 'words'; hint?: string }
  | { key: string; kind: 'select'; label: string; options: { value: string; label: string }[] }
  | { key: string; kind: 'switch'; label: string; hint?: string };

export interface ContentTypeDef {
  type: QRContentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  fields: FieldDef[];
  group: 'essentials' | 'communication' | 'social' | 'other';
}

const url = (label = 'URL', placeholder = 'https://example.com'): FieldDef => ({
  key: 'url', kind: 'text', label, placeholder, keyboard: 'url', autoCapitalize: 'none',
});

export const CONTENT_TYPES: ContentTypeDef[] = [
  { type: 'url', label: 'Website', icon: 'globe-outline', description: 'Link to any web page', group: 'essentials', fields: [url()] },
  { type: 'text', label: 'Text', icon: 'text-outline', description: 'Plain text or a note', group: 'essentials', fields: [{ key: 'text', kind: 'text', label: 'Text', placeholder: 'Type anything…', multiline: true }] },
  {
    type: 'wifi', label: 'Wi-Fi', icon: 'wifi-outline', description: 'Join a network instantly', group: 'essentials',
    fields: [
      { key: 'ssid', kind: 'text', label: 'Network name (SSID)', placeholder: 'Office-5G', autoCapitalize: 'none' },
      { key: 'security', kind: 'select', label: 'Security', options: [{ value: 'WPA', label: 'WPA/WPA2' }, { value: 'WEP', label: 'WEP' }, { value: 'nopass', label: 'None' }] },
      { key: 'password', kind: 'text', label: 'Password', placeholder: 'Network password', secure: true, autoCapitalize: 'none' },
      { key: 'hidden', kind: 'switch', label: 'Hidden network' },
    ],
  },
  {
    type: 'vcard', label: 'Contact', icon: 'person-circle-outline', description: 'Digital business card', group: 'essentials',
    fields: [
      { key: 'firstName', kind: 'text', label: 'First name', autoCapitalize: 'words' },
      { key: 'lastName', kind: 'text', label: 'Last name', autoCapitalize: 'words' },
      { key: 'organization', kind: 'text', label: 'Company' },
      { key: 'title', kind: 'text', label: 'Job title' },
      { key: 'phone', kind: 'text', label: 'Phone', keyboard: 'phone-pad' },
      { key: 'email', kind: 'text', label: 'Email', keyboard: 'email-address', autoCapitalize: 'none' },
      { key: 'website', kind: 'text', label: 'Website', keyboard: 'url', autoCapitalize: 'none' },
      { key: 'address', kind: 'text', label: 'Address', multiline: true },
    ],
  },
  {
    type: 'email', label: 'Email', icon: 'mail-outline', description: 'Pre-filled email', group: 'communication',
    fields: [
      { key: 'to', kind: 'text', label: 'To', placeholder: 'name@example.com', keyboard: 'email-address', autoCapitalize: 'none' },
      { key: 'subject', kind: 'text', label: 'Subject' },
      { key: 'body', kind: 'text', label: 'Message', multiline: true },
    ],
  },
  { type: 'phone', label: 'Phone', icon: 'call-outline', description: 'Tap to call', group: 'communication', fields: [{ key: 'phone', kind: 'text', label: 'Phone number', placeholder: '+1 555 123 4567', keyboard: 'phone-pad' }] },
  {
    type: 'sms', label: 'SMS', icon: 'chatbox-outline', description: 'Pre-filled text message', group: 'communication',
    fields: [
      { key: 'phone', kind: 'text', label: 'Phone number', keyboard: 'phone-pad' },
      { key: 'message', kind: 'text', label: 'Message', multiline: true },
    ],
  },
  {
    type: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', description: 'Start a chat', group: 'communication',
    fields: [
      { key: 'phone', kind: 'text', label: 'Number with country code', placeholder: '+62 812 3456 7890', keyboard: 'phone-pad' },
      { key: 'message', kind: 'text', label: 'Message', multiline: true },
    ],
  },
  { type: 'telegram', label: 'Telegram', icon: 'paper-plane-outline', description: 'Open a profile', group: 'communication', fields: [{ key: 'username', kind: 'text', label: 'Username', placeholder: '@username', autoCapitalize: 'none' }] },
  {
    type: 'location', label: 'Location', icon: 'location-outline', description: 'Coordinates on a map', group: 'other',
    fields: [
      { key: 'latitude', kind: 'text', label: 'Latitude', placeholder: '-6.1754', keyboard: 'numbers-and-punctuation' },
      { key: 'longitude', kind: 'text', label: 'Longitude', placeholder: '106.8272', keyboard: 'numbers-and-punctuation' },
      { key: 'label', kind: 'text', label: 'Label (optional)' },
    ],
  },
  {
    type: 'event', label: 'Event', icon: 'calendar-outline', description: 'Add to calendar', group: 'other',
    fields: [
      { key: 'title', kind: 'text', label: 'Title' },
      { key: 'location', kind: 'text', label: 'Location' },
      { key: 'start', kind: 'text', label: 'Starts', placeholder: '2026-10-01 18:00', keyboard: 'numbers-and-punctuation', hint: 'Format: YYYY-MM-DD HH:MM (local time)' },
      { key: 'end', kind: 'text', label: 'Ends', placeholder: '2026-10-01 20:00', keyboard: 'numbers-and-punctuation' },
      { key: 'description', kind: 'text', label: 'Description', multiline: true },
    ],
  },
  {
    type: 'social', label: 'Social', icon: 'at-outline', description: 'Instagram, X, TikTok…', group: 'social',
    fields: [
      {
        key: 'network', kind: 'select', label: 'Network',
        options: [
          { value: 'instagram', label: 'Instagram' }, { value: 'x', label: 'X' }, { value: 'facebook', label: 'Facebook' },
          { value: 'tiktok', label: 'TikTok' }, { value: 'linkedin', label: 'LinkedIn' }, { value: 'github', label: 'GitHub' },
        ],
      },
      { key: 'handle', kind: 'text', label: 'Username', placeholder: '@yourname', autoCapitalize: 'none' },
    ],
  },
  { type: 'youtube', label: 'YouTube', icon: 'logo-youtube', description: 'Video or channel', group: 'social', fields: [url('YouTube link', 'https://youtube.com/@channel')] },
  { type: 'spotify', label: 'Spotify', icon: 'musical-notes-outline', description: 'Song, album or playlist', group: 'social', fields: [url('Spotify link', 'https://open.spotify.com/…')] },
  { type: 'applink', label: 'App Link', icon: 'apps-outline', description: 'App store or deep link', group: 'other', fields: [url('App link', 'https://apps.apple.com/…')] },
  {
    type: 'bitcoin', label: 'Bitcoin', icon: 'logo-bitcoin', description: 'BIP-21 payment request', group: 'other',
    fields: [
      { key: 'address', kind: 'text', label: 'Address', autoCapitalize: 'none' },
      { key: 'amount', kind: 'text', label: 'Amount (BTC, optional)', keyboard: 'decimal-pad' },
      { key: 'label', kind: 'text', label: 'Label (optional)' },
    ],
  },
  { type: 'payment', label: 'Payment URI', icon: 'card-outline', description: 'Any payment link / URI', group: 'other', fields: [{ key: 'uri', kind: 'text', label: 'Payment URI', placeholder: 'upi://pay?pa=…', autoCapitalize: 'none' }] },
];

export const contentTypeDef = (t: string): ContentTypeDef | undefined => CONTENT_TYPES.find((c) => c.type === t);

