import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CodeListItem } from '@/components/code/CodeListItem';
import { Card, IconButton, PressableScale, Screen, SectionHeader, Skeleton, Text } from '@/components/ui';
import { getRepos } from '@/db/database';
import { toggleFavorite } from '@/features/codes/actions';
import { createFromClipboard } from '@/features/generator/clipboard';
import { startBarcode, startQr } from '@/features/generator/startCreate';
import { scanFromGallery } from '@/features/scanner/galleryScan';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import type { QRContentType } from '@/types/domain';

type IconName = keyof typeof Ionicons.glyphMap;

const QUICK: { label: string; icon: IconName; onPress(): void; hint: string }[] = [
  { label: 'Scan QR', icon: 'qr-code-outline', hint: 'Open camera for QR codes', onPress: () => router.navigate({ pathname: '/scan', params: { mode: 'qr' } }) },
  { label: 'Scan Barcode', icon: 'barcode-outline', hint: 'Open camera for product barcodes', onPress: () => router.navigate({ pathname: '/scan', params: { mode: 'barcode' } }) },
  { label: 'Create QR', icon: 'color-wand-outline', hint: 'Open the QR design studio', onPress: () => router.navigate('/create') },
  { label: 'Barcode', icon: 'create-outline', hint: 'Create a barcode', onPress: () => startBarcode() },
  { label: 'From Image', icon: 'images-outline', hint: 'Scan a code from a photo', onPress: () => scanFromGallery() },
];

const TEMPLATES: { label: string; icon: IconName; type?: QRContentType; barcode?: boolean }[] = [
  { label: 'Wi-Fi', icon: 'wifi', type: 'wifi' },
  { label: 'Website', icon: 'globe-outline', type: 'url' },
  { label: 'Contact', icon: 'person-outline', type: 'vcard' },
  { label: 'WhatsApp', icon: 'logo-whatsapp', type: 'whatsapp' },
  { label: 'Email', icon: 'mail-outline', type: 'email' },
  { label: 'Product', icon: 'pricetag-outline', barcode: true },
  { label: 'Text', icon: 'text-outline', type: 'text' },
];

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const p = useTheme();
  const { data, loading } = useAsync(async () => {
    const { codes } = getRepos();
    const [stats, scanned, created] = await Promise.all([
      codes.stats(),
      codes.list({ filter: 'scanned', limit: 3 }),
      codes.list({ filter: 'created', limit: 3 }),
    ]);
    return { stats, scanned, created };
  });

  return (
    <Screen tabBar>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="muted">
            {greeting()}
          </Text>
          <Text variant="title">Qraft</Text>
        </View>
        <IconButton icon="search" label="Search history" variant="filled" onPress={() => router.navigate({ pathname: '/history', params: { focus: '1' } })} />
        <IconButton icon="settings-outline" label="Settings" variant="filled" onPress={() => router.navigate('/settings')} />
      </View>

      <Animated.View entering={FadeInDown.duration(350)}>
        <PressableScale
          haptic
          onPress={() => router.navigate('/scan')}
          accessibilityLabel="Scan anything. Opens the camera scanner."
          style={[styles.hero, { backgroundColor: p.primary }]}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="title" color="onPrimary">
              Scan anything
            </Text>
            <Text color="onPrimary" style={{ opacity: 0.85 }}>
              QR codes, barcodes, Wi-Fi, contacts. Processed on your device.
            </Text>
          </View>
          <View style={[styles.heroBtn, { backgroundColor: p.onPrimary }]}>
            <Ionicons name="scan" size={30} color={p.primary} />
          </View>
        </PressableScale>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
        {QUICK.map((q) => (
          <PressableScale key={q.label} haptic onPress={q.onPress} accessibilityLabel={q.label} accessibilityHint={q.hint} style={[styles.quick, { backgroundColor: p.surface, borderColor: p.border }]}>
            <View style={[styles.quickIcon, { backgroundColor: p.primarySoft }]}>
              <Ionicons name={q.icon} size={20} color={p.primary} />
            </View>
            <Text variant="caption" style={{ fontWeight: '700' }} numberOfLines={1}>
              {q.label}
            </Text>
          </PressableScale>
        ))}
      </ScrollView>

      {loading && !data ? (
        <Skeleton height={76} />
      ) : (
        <View style={styles.stats}>
          <Stat label="Scanned today" value={data?.stats.scannedToday ?? 0} icon="scan-outline" />
          <Stat label="Created" value={data?.stats.created ?? 0} icon="sparkles-outline" />
          <Stat label="Favorites" value={data?.stats.favorites ?? 0} icon="star-outline" onPress={() => router.navigate({ pathname: '/history', params: { filter: 'favorites' } })} />
        </View>
      )}

      <SectionHeader title="Quick create" action="From clipboard" onAction={createFromClipboard} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
        {TEMPLATES.map((t) => (
          <PressableScale
            key={t.label}
            haptic
            onPress={() => (t.barcode ? startBarcode('ean13') : startQr(t.type!))}
            accessibilityLabel={`Create ${t.label} ${t.barcode ? 'barcode' : 'QR code'}`}
            style={[styles.tpl, { backgroundColor: p.surfaceAlt }]}
          >
            <Ionicons name={t.icon} size={18} color={p.text} />
            <Text variant="caption" style={{ fontWeight: '700' }}>
              {t.label}
            </Text>
          </PressableScale>
        ))}
      </ScrollView>

      <Recent title="Recently scanned" items={data?.scanned} empty="No scans yet." filter="scanned" />
      <Recent title="Recently created" items={data?.created} empty="No QR codes created yet." filter="created" />
    </Screen>
  );
}

function Stat({ label, value, icon, onPress }: { label: string; value: number; icon: IconName; onPress?: () => void }) {
  const p = useTheme();
  return (
    <Card style={{ flex: 1, gap: 4, padding: spacing.sm }} onPress={onPress} accessibilityLabel={`${label}: ${value}`}>
      <Ionicons name={icon} size={16} color={p.primary} />
      <Text variant="title">{value}</Text>
      <Text variant="caption" color="muted" numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

function Recent({ title, items, empty, filter }: { title: string; items?: Awaited<ReturnType<ReturnType<typeof getRepos>['codes']['list']>>; empty: string; filter: string }) {
  if (!items) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      <SectionHeader title={title} action={items.length ? 'See all' : undefined} onAction={() => router.navigate({ pathname: '/history', params: { filter } })} />
      {items.length === 0 ? (
        <Card tone="alt">
          <Text color="muted" variant="caption">
            {empty}
          </Text>
        </Card>
      ) : (
        items.map((c) => <CodeListItem key={c.id} item={c} compact onToggleFavorite={toggleFavorite} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xs },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, minHeight: 128 },
  heroBtn: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  quick: { width: 92, alignItems: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: radius.lg, borderWidth: 1 },
  quickIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: spacing.xs },
  tpl: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, minHeight: 40, borderRadius: radius.pill },
});
