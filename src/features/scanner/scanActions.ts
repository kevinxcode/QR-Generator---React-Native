import type { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Linking, Platform, Share } from 'react-native';

import { shareFile } from '@/services/export/ExportService';
import { LocalFileService } from '@/services/files/LocalFileService';
import type { ParsedScan, ScanAction } from '@/services/scanner/ScanResultParser';
import { toast } from '@/store/toast.store';

export const ACTION_META: Record<ScanAction, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  open: { label: 'Open', icon: 'open-outline' },
  copy: { label: 'Copy', icon: 'copy-outline' },
  share: { label: 'Share', icon: 'share-outline' },
  save: { label: 'Save', icon: 'bookmark-outline' },
  copyPassword: { label: 'Copy password', icon: 'key-outline' },
  wifiSettings: { label: 'Wi-Fi settings', icon: 'wifi-outline' },
  saveContact: { label: 'Save contact', icon: 'person-add-outline' },
  call: { label: 'Call', icon: 'call-outline' },
  email: { label: 'Compose email', icon: 'mail-outline' },
  sms: { label: 'Send SMS', icon: 'chatbox-outline' },
  maps: { label: 'Open in Maps', icon: 'map-outline' },
  searchWeb: { label: 'Search web', icon: 'search-outline' },
  addEvent: { label: 'Add to calendar', icon: 'calendar-outline' },
};

async function open(url: string, failMessage: string) {
  try {
    await Linking.openURL(url);
  } catch {
    toast.error(failMessage);
  }
}

export async function copyText(text: string, label = 'Copied to clipboard') {
  await Clipboard.setStringAsync(text);
  toast.success(label);
}

/** Execute a smart action. `open` for URLs must be confirmed by the caller first. */
export async function runScanAction(action: ScanAction, s: ParsedScan): Promise<void> {
  const m = s.metadata;
  switch (action) {
    case 'open':
      return open(m.url ?? s.rawValue, 'No app can open this link.');
    case 'copy':
      return copyText(s.rawValue);
    case 'share':
      await Share.share({ message: s.rawValue });
      return;
    case 'copyPassword':
      return copyText(m.password ?? '', 'Password copied');
    case 'wifiSettings':
      if (Platform.OS === 'android') {
        try {
          await Linking.sendIntent('android.settings.WIFI_SETTINGS');
          return;
        } catch {
          // fall through to app settings
        }
      }
      await Linking.openSettings();
      return;
    case 'saveContact': {
      const uri = await LocalFileService.writeText('exports', `contact-${Date.now()}.vcf`, s.rawValue);
      return shareFile(uri, 'vcf', 'Save contact');
    }
    case 'addEvent': {
      const body = /BEGIN:VCALENDAR/i.test(s.rawValue)
        ? s.rawValue
        : `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Qraft//EN\r\n${s.rawValue.replace(/\r?\n/g, '\r\n')}\r\nEND:VCALENDAR`;
      const uri = await LocalFileService.writeText('exports', `event-${Date.now()}.ics`, body);
      return shareFile(uri, 'ics', 'Add to calendar');
    }
    case 'call':
      return open(`tel:${(m.phone ?? '').replace(/[^\d+]/g, '')}`, 'Calling is not available on this device.');
    case 'sms': {
      const phone = (m.phone ?? '').replace(/[^\d+]/g, '');
      const sep = Platform.OS === 'ios' ? '&' : '?';
      return open(`sms:${phone}${m.message ? `${sep}body=${encodeURIComponent(m.message)}` : ''}`, 'Messaging is not available on this device.');
    }
    case 'email': {
      if (/^mailto:/i.test(s.rawValue)) return open(s.rawValue, 'No email app is installed.');
      const to = m.to ?? m.email ?? '';
      const q = [m.subject && `subject=${encodeURIComponent(m.subject)}`, m.body && `body=${encodeURIComponent(m.body)}`].filter(Boolean).join('&');
      return open(`mailto:${to}${q ? `?${q}` : ''}`, 'No email app is installed.');
    }
    case 'maps': {
      const { latitude: lat, longitude: lng, label } = m;
      const url =
        Platform.OS === 'ios'
          ? `maps://?ll=${lat},${lng}${label ? `&q=${encodeURIComponent(label)}` : ''}`
          : `geo:${lat},${lng}?q=${lat},${lng}${label ? `(${encodeURIComponent(label)})` : ''}`;
      return open(url, 'No maps app is installed.');
    }
    case 'searchWeb':
      return open(`https://duckduckgo.com/?q=${encodeURIComponent(s.rawValue)}`, 'No browser is available.');
    case 'save':
      return;
  }
}
