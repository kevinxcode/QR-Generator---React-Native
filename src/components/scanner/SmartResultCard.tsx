import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import { formatLabel } from '@/services/barcode/formats';
import type { ParsedScan } from '@/services/scanner/ScanResultParser';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { typeMeta } from '@/utils/format';

const LABELS: Record<string, string> = {
  ssid: 'Network', password: 'Password', security: 'Security', hidden: 'Hidden',
  name: 'Name', organization: 'Company', title: 'Title', phone: 'Phone', email: 'Email', website: 'Website', address: 'Address',
  to: 'To', subject: 'Subject', body: 'Message', message: 'Message',
  latitude: 'Latitude', longitude: 'Longitude', label: 'Label',
  summary: 'Event', location: 'Location', start: 'Starts', end: 'Ends', description: 'Details',
  format: 'Format', value: 'Value',
};

const HIDDEN = new Set(['unusual', 'warnings', 'url', 'domain', 'protocol', 'length']);

function displayValue(key: string, v: string): string {
  if (key === 'hidden') return v === 'true' ? 'Yes' : 'No';
  if ((key === 'start' || key === 'end') && v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  return v;
}

/** Visual summary of a parsed scan with type-specific fields and URL safety details. */
export function SmartResultCard({ scan, showPassword }: { scan: ParsedScan; showPassword: boolean }) {
  const p = useTheme();
  const meta = scan.type === 'barcode' ? { label: scan.title, icon: 'barcode-outline' as const } : typeMeta(scan.type);
  const rows = Object.entries(scan.metadata).filter(([k, v]) => !HIDDEN.has(k) && v !== '' && !(scan.type === 'barcode' && k === 'value'));
  const unusual = scan.metadata.unusual === 'true';

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: p.primarySoft }]}>
          <Ionicons name={meta.icon} size={24} color={p.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label" color="primary">
            {meta.label}
          </Text>
          <Text variant="heading" numberOfLines={2} selectable>
            {scan.type === 'barcode' ? scan.rawValue : scan.title || scan.rawValue}
          </Text>
        </View>
        <Badge label={formatLabel(scan.format)} />
      </View>

      {scan.type === 'url' && (
        <View style={[styles.urlBox, { backgroundColor: unusual ? p.warningSoft : p.surfaceAlt }]}>
          <View style={styles.urlRow}>
            <Ionicons name={scan.metadata.protocol === 'https' ? 'lock-closed' : 'lock-open'} size={16} color={scan.metadata.protocol === 'https' ? p.success : p.warning} />
            <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
              {scan.metadata.domain}
            </Text>
            <Badge label={scan.metadata.protocol.toUpperCase()} tone={scan.metadata.protocol === 'https' ? 'success' : 'warning'} />
          </View>
          <Text variant="mono" color="muted" selectable numberOfLines={4}>
            {scan.metadata.url}
          </Text>
          {unusual && (
            <View style={{ gap: 4 }}>
              <View style={styles.urlRow}>
                <Ionicons name="warning" size={16} color={p.warning} />
                <Text variant="bodyStrong" color="warning">
                  Potentially unusual link
                </Text>
              </View>
              {scan.metadata.warnings.split('\n').map((w) => (
                <Text key={w} variant="caption" color="muted">
                  • {w}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {rows.length > 0 && (
        <View style={{ gap: spacing.xs }}>
          {rows.map(([k, v]) => (
            <View key={k} style={styles.kv}>
              <Text variant="caption" color="muted" style={{ width: 88 }}>
                {LABELS[k] ?? k}
              </Text>
              <Text variant="body" style={{ flex: 1 }} selectable>
                {k === 'password' && !showPassword ? '•'.repeat(Math.min(v.length, 12)) : displayValue(k, v)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {scan.type === 'text' && (
        <Text selectable style={{ lineHeight: 22 }}>
          {scan.rawValue}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  urlBox: { borderRadius: radius.md, padding: spacing.sm, gap: spacing.xs },
  urlRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kv: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
});
