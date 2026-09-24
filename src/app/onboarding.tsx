import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QRCodeView } from '@/components/qr/QRCodeView';
import { Button, PressableScale, Text } from '@/components/ui';
import { BUILTIN_TEMPLATES } from '@/services/qr/templates';
import { useSettings } from '@/store/settings.store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

const PAGES = [
  { icon: 'scan' as const, title: 'Scan anything.', body: 'QR codes, product barcodes, Wi-Fi, contacts and more. Fast and accurate, with smart actions for every result.' },
  { icon: 'color-palette' as const, title: 'Create beautiful QR codes.', body: 'Design with styles, gradients, logos and frames. Scannability checks help keep every code reliable.' },
  { icon: 'lock-closed' as const, title: 'Private by design.', body: 'No account. No cloud. No tracking. Everything stays on your device.' },
];

export default function Onboarding() {
  const p = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const update = useSettings((s) => s.update);

  const finish = async () => {
    await update({ onboardingCompleted: true });
    router.replace('/');
  };
  const next = () => {
    if (page >= PAGES.length - 1) finish();
    else scroller.current?.scrollTo({ x: width * (page + 1), animated: true });
  };

  return (
    <View style={[styles.root, { backgroundColor: p.bg, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.top}>
        <Text variant="heading">Qraft</Text>
        {page < PAGES.length - 1 && (
          <PressableScale onPress={finish} accessibilityLabel="Skip onboarding" style={styles.skip}>
            <Text color="muted" variant="bodyStrong">
              Skip
            </Text>
          </PressableScale>
        )}
      </View>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {PAGES.map((pg, i) => (
          <View key={pg.title} style={[styles.page, { width }]}>
            <View style={[styles.hero, { backgroundColor: p.surface, borderColor: p.border }]}>
              {i === 1 ? (
                <QRCodeView payload="https://qraft.app" design={BUILTIN_TEMPLATES[2].design} size={170} accessibilityLabel="Example styled QR code" />
              ) : (
                <View style={[styles.iconCircle, { backgroundColor: p.primarySoft }]}>
                  <Ionicons name={pg.icon} size={64} color={p.primary} />
                </View>
              )}
            </View>
            {page === i && (
              <Animated.View entering={FadeInDown.duration(350)} style={{ gap: spacing.sm }}>
                <Text variant="display" align="center">
                  {pg.title}
                </Text>
                <Text color="muted" align="center" style={{ fontSize: 16, lineHeight: 23 }}>
                  {pg.body}
                </Text>
              </Animated.View>
            )}
          </View>
        ))}
      </ScrollView>
      <View style={styles.bottom}>
        <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}>
          {PAGES.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === page ? p.primary : p.surfaceAlt, width: i === page ? 22 : 8 }]} />
          ))}
        </View>
        <Button title={page === PAGES.length - 1 ? 'Get Started' : 'Continue'} onPress={next} size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, minHeight: 52 },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs },
  page: { paddingHorizontal: spacing.xl, justifyContent: 'center', gap: spacing.xxl },
  hero: { alignSelf: 'center', width: 240, height: 240, borderRadius: radius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
});
