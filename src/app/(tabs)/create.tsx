import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';

import { QRCodeView } from '@/components/qr/QRCodeView';
import { Card, PressableScale, Screen, SectionHeader, Text } from '@/components/ui';
import { getRepos } from '@/db/database';
import { createFromClipboard } from '@/features/generator/clipboard';
import { defaultDesign, startBarcode, startQr } from '@/features/generator/startCreate';
import { useAsync } from '@/hooks/useAsync';
import { BARCODE_FORMATS } from '@/services/barcode/formats';
import { CONTENT_TYPES, type ContentTypeDef } from '@/services/qr/contentTypes';
import { BUILTIN_TEMPLATES } from '@/services/qr/templates';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

const GROUPS: { key: ContentTypeDef['group']; title: string }[] = [
  { key: 'essentials', title: 'Essentials' },
  { key: 'communication', title: 'Communication' },
  { key: 'social', title: 'Social & media' },
  { key: 'other', title: 'More' },
];

export default function Create() {
  const p = useTheme();
  const userTemplates = useAsync(() => getRepos().templates.list(), []);

  return (
    <Screen title="Create" subtitle="Step 1 · Choose what your code does" large tabBar>
      <Card onPress={createFromClipboard} tone="primary" accessibilityLabel="Create QR from clipboard">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="clipboard-outline" size={22} color={p.primary} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Create from clipboard</Text>
            <Text variant="caption" color="muted">
              Reads your clipboard once, only when you tap.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={p.primary} />
        </View>
      </Card>

      {GROUPS.map((g) => (
        <View key={g.key} style={{ gap: spacing.xs }}>
          <SectionHeader title={g.title} />
          <View style={styles.grid}>
            {CONTENT_TYPES.filter((c) => c.group === g.key).map((c) => (
              <PressableScale
                key={c.type}
                haptic
                onPress={() => startQr(c.type)}
                accessibilityLabel={`${c.label} QR code. ${c.description}`}
                style={[styles.tile, { backgroundColor: p.surface, borderColor: p.border }]}
              >
                <View style={[styles.tileIcon, { backgroundColor: p.primarySoft }]}>
                  <Ionicons name={c.icon} size={20} color={p.primary} />
                </View>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {c.label}
                </Text>
                <Text variant="caption" color="muted" numberOfLines={1}>
                  {c.description}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>
      ))}

      <SectionHeader title="Barcodes" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
        {BARCODE_FORMATS.map((f) => (
          <PressableScale key={f.id} haptic onPress={() => startBarcode(f.id)} accessibilityLabel={`${f.label} barcode. ${f.description}`} style={[styles.barcode, { backgroundColor: p.surface, borderColor: p.border }]}>
            <Ionicons name="barcode-outline" size={22} color={p.text} />
            <Text variant="bodyStrong">{f.label}</Text>
            <Text variant="caption" color="muted" numberOfLines={2}>
              {f.description}
            </Text>
          </PressableScale>
        ))}
      </ScrollView>

      <SectionHeader title="Design templates" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
        {[...(userTemplates.data ?? []), ...BUILTIN_TEMPLATES].map((t) => (
          <PressableScale
            key={t.id}
            onPress={async () => startQr('url', { ...t.design, errorCorrection: (await defaultDesign()).errorCorrection })}
            accessibilityLabel={`Start with ${t.name} template`}
            style={[styles.tpl, { backgroundColor: p.surface, borderColor: p.border }]}
          >
            <QRCodeView payload="QRAFT" design={{ ...t.design, logoUri: null }} size={84} accessibilityLabel={`${t.name} template preview`} />
            <Text variant="caption" style={{ fontWeight: '700' }} numberOfLines={1}>
              {t.name}
            </Text>
          </PressableScale>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tile: { flexBasis: '48%', flexGrow: 1, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, gap: 4 },
  tileIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  barcode: { width: 132, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, gap: 4 },
  tpl: { width: 112, alignItems: 'center', padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, gap: 6 },
});
