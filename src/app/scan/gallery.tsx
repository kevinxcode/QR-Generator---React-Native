import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Card, Screen, SectionHeader, Text } from '@/components/ui';
import type { DetectedCode } from '@/features/scanner/galleryScan';
import { saveScan } from '@/features/scanner/saveScan';
import { formatLabel } from '@/services/barcode/formats';
import { parseScan } from '@/services/scanner/ScanResultParser';
import { useSettings } from '@/store/settings.store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import type { CodeFormat } from '@/types/domain';
import { typeMeta } from '@/utils/format';

/** Shown when one image contains several codes: user picks which result to open. */
export default function GalleryResults() {
  const p = useTheme();
  const { results, uri } = useLocalSearchParams<{ results: string; uri?: string }>();
  const saveToHistory = useSettings((s) => s.settings.saveScansToHistory);
  const items = useMemo<DetectedCode[]>(() => {
    try {
      return JSON.parse(results ?? '[]') as DetectedCode[];
    } catch {
      return [];
    }
  }, [results]);

  const open = async (c: DetectedCode) => {
    let id = '';
    try {
      if (saveToHistory) id = await saveScan(c.data, c.format as CodeFormat);
    } catch {
      id = '';
    }
    router.push({ pathname: '/scan/result', params: { data: c.data, format: c.format, id, from: 'gallery' } });
  };

  return (
    <Screen title={`${items.length} codes found`} back>
      {uri ? <Image source={{ uri }} style={{ width: '100%', height: 200, borderRadius: radius.lg }} contentFit="cover" accessibilityLabel="Selected image" /> : null}
      <SectionHeader title="Choose a result" />
      {items.map((c, i) => {
        const parsed = parseScan(c.data, c.format as CodeFormat);
        const meta = parsed.type === 'barcode' ? { icon: 'barcode-outline' as const, label: 'Barcode' } : typeMeta(parsed.type);
        return (
          <Card key={`${c.format}-${i}`} onPress={() => open(c)} accessibilityLabel={`${meta.label}: ${parsed.title}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: p.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={meta.icon} size={20} color={p.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {parsed.type === 'barcode' ? c.data : parsed.title}
                </Text>
                <Text variant="caption" color="muted">
                  {meta.label} · {formatLabel(c.format)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={p.textFaint} />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
