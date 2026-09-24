import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CodeListItem } from '@/components/code/CodeListItem';
import { QRCodeView } from '@/components/qr/QRCodeView';
import { Card, IconButton, PressableScale, Screen, SectionHeader, Skeleton, Text } from '@/components/ui';
import { getRepos } from '@/db/database';
import { toggleFavorite } from '@/features/codes/actions';
import { createFromClipboard } from '@/features/generator/clipboard';
import { startBarcode, startQr } from '@/features/generator/startCreate';
import { scanFromGallery } from '@/features/scanner/galleryScan';
import { useAsync } from '@/hooks/useAsync';
import { DEFAULT_DESIGN } from '@/services/qr/QRGeneratorService';
import { useTheme } from '@/theme/ThemeProvider';
import { elevation, radius, spacing, type FeatureKey } from '@/theme/tokens';
import type { QRContentType } from '@/types/domain';

type IconName = keyof typeof Ionicons.glyphMap;

const QUICK: { label: string; icon: IconName; feature: FeatureKey; hint: string; onPress(): void }[] = [
  { label: 'Scan QR', icon: 'scan-outline', feature: 'scan', hint: 'Open the camera scanner', onPress: () => router.navigate({ pathname: '/scan', params: { mode: 'qr' } }) },
  { label: 'Create QR', icon: 'color-wand-outline', feature: 'create', hint: 'Open the QR design studio', onPress: () => router.navigate('/create') },
  { label: 'Barcode', icon: 'barcode-outline', feature: 'barcode', hint: 'Create a product barcode', onPress: () => startBarcode() },
  { label: 'Scan Image', icon: 'images-outline', feature: 'gallery', hint: 'Read a code from a photo', onPress: () => scanFromGallery() },
];

const TEMPLATES: { label: string; icon: IconName; feature: FeatureKey; type?: QRContentType; barcode?: boolean }[] = [
  { label: 'Wi-Fi', icon: 'wifi', feature: 'wifi', type: 'wifi' },
  { label: 'Website', icon: 'globe-outline', feature: 'create', type: 'url' },
  { label: 'Contact', icon: 'person-outline', feature: 'scan', type: 'vcard' },
  { label: 'WhatsApp', icon: 'logo-whatsapp', feature: 'wifi', type: 'whatsapp' },
  { label: 'Email', icon: 'mail-outline', feature: 'gallery', type: 'email' },
  { label: 'Product', icon: 'pricetag-outline', feature: 'barcode', barcode: true },
  { label: 'Text', icon: 'text-outline', feature: 'create', type: 'text' },
];

const HERO_QR = { ...DEFAULT_DESIGN, bodyStyle: 'rounded' as const, eyeFrameStyle: 'extraRounded' as const, eyeStyle: 'circle' as const, foregroundColor: '#FFFFFF', cornerColor: '#FFFFFF', eyeColor: '#FFFFFF', transparentBackground: true, quietZone: 0 };

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const p = useTheme();
  const { data, loading } = useAsync(async () => {
    const { codes } = getRepos();
    const [stats, recent] = await Promise.all([codes.stats(), codes.list({ limit: 4 })]);
    return { stats, recent };
  });

  return (
    <Screen tabBar>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="muted">
            {greeting()}
          </Text>
          <Text variant="title">Qraft Studio</Text>
        </View>
        <IconButton icon="search" label="Search history" variant="filled" onPress={() => router.navigate({ pathname: '/history', params: { focus: '1' } })} />
        <IconButton icon="settings-outline" label="Settings" variant="filled" onPress={() => router.navigate('/settings')} />
      </View>

      <Animated.View entering={FadeInDown.duration(350)} style={[styles.heroShadow, { shadowColor: p.primary }]}>
        <LinearGradient colors={p.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="title" color="#FFFFFF" style={{ fontSize: 26, lineHeight: 31 }}>
              Scan anything
            </Text>
            <Text color="#FFFFFF" style={{ opacity: 0.92 }}>
              QR codes, barcodes & more. Processed on your device.
            </Text>
            <PressableScale haptic onPress={() => router.navigate('/scan')} accessibilityLabel="Scan now" style={styles.heroBtn}>
              <Ionicons name="scan" size={18} color="#4B3BD9" />
              <Text variant="bodyStrong" color="#4B3BD9">
                Scan Now
              </Text>
            </PressableScale>
          </View>
          <View style={styles.heroArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <QRCodeView payload="Qraft" design={HERO_QR} size={92} accessibilityLabel="" />
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.quickRow}>
        {QUICK.map((q) => {
          const f = p.feature[q.feature];
          return (
            <PressableScale key={q.label} haptic onPress={q.onPress} accessibilityLabel={q.label} accessibilityHint={q.hint} style={[styles.quick, elevation(p, 1), { backgroundColor: p.surface, borderColor: p.border }]}>
              <View style={[styles.quickIcon, { backgroundColor: f.tint }]}>
                <Ionicons name={q.icon} size={22} color={f.color} />
              </View>
              <Text variant="caption" style={{ fontWeight: '700', fontSize: 12 }} numberOfLines={1}>
                {q.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <View style={{ gap: spacing.xs }}>
        <SectionHeader title="Recent codes" action={data?.recent.length ? 'See all' : undefined} onAction={() => router.navigate('/history')} />
        {loading && !data ? (
          <Skeleton height={64} />
        ) : data?.recent.length ? (
          data.recent.map((c) => <CodeListItem key={c.id} item={c} compact onToggleFavorite={toggleFavorite} />)
        ) : (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }} onPress={() => router.navigate('/scan')} accessibilityLabel="No codes yet. Scan your first code">
            <View style={[styles.quickIcon, { backgroundColor: p.feature.scan.tint }]}>
              <Ionicons name="sparkles-outline" size={20} color={p.feature.scan.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">No codes yet</Text>
              <Text variant="caption" color="muted">
                Scan or create your first code. It stays on this device.
              </Text>
            </View>
          </Card>
        )}
      </View>

      <View style={styles.stats}>
        <Stat value={data?.stats.scannedToday ?? 0} label="Scanned today" feature="scan" icon="scan-outline" />
        <Stat value={data?.stats.created ?? 0} label="Created" feature="create" icon="sparkles-outline" />
        <Stat value={data?.stats.favorites ?? 0} label="Favorites" feature="gallery" icon="star-outline" onPress={() => router.navigate({ pathname: '/history', params: { filter: 'favorites' } })} />
      </View>

      <SectionHeader title="Quick templates" action="From clipboard" onAction={createFromClipboard} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
        {TEMPLATES.map((t) => {
          const f = p.feature[t.feature];
          return (
            <PressableScale
              key={t.label}
              haptic
              onPress={() => (t.barcode ? startBarcode('ean13') : startQr(t.type!))}
              accessibilityLabel={`Create ${t.label} ${t.barcode ? 'barcode' : 'QR code'}`}
              style={[styles.tpl, { backgroundColor: f.tint, borderColor: p.border }]}
            >
              <Ionicons name={t.icon} size={17} color={f.color} />
              <Text variant="caption" color={f.ink} style={{ fontWeight: '700' }}>
                {t.label}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function Stat({ value, label, feature, icon, onPress }: { value: number; label: string; feature: FeatureKey; icon: IconName; onPress?: () => void }) {
  const p = useTheme();
  const f = p.feature[feature];
  return (
    <PressableScale onPress={onPress} disabled={!onPress} accessibilityLabel={`${label}: ${value}`} style={[styles.stat, { backgroundColor: f.tint }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={icon} size={15} color={f.color} />
        <Text variant="heading" color={f.ink}>
          {value}
        </Text>
      </View>
      <Text variant="caption" color={f.ink} numberOfLines={1} style={{ fontSize: 12 }}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xs },
  heroShadow: { borderRadius: radius.xl, shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, minHeight: 176, overflow: 'hidden' },
  heroGlow: { position: 'absolute', right: -40, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: spacing.xs, backgroundColor: '#FFFFFF', borderRadius: radius.pill, paddingHorizontal: spacing.md, minHeight: 44 },
  heroArt: { width: 116, height: 116, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: '-6deg' }] },
  quickRow: { flexDirection: 'row', gap: spacing.xs },
  quick: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: spacing.sm, borderRadius: 18, borderWidth: 1 },
  quickIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: spacing.xs },
  stat: { flex: 1, gap: 2, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: 16 },
  tpl: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, minHeight: 40, borderRadius: radius.pill, borderWidth: 1 },
});
