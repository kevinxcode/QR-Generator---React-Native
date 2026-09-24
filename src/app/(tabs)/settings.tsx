import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet, Card, Chip, Divider, ListRow, Screen, SectionHeader, SegmentedControl, SwitchRow, Text } from '@/components/ui';
import { getRepos } from '@/db/database';
import { useAsync } from '@/hooks/useAsync';
import { EXPORT_SIZES } from '@/services/export/ExportService';
import { BUILTIN_TEMPLATES } from '@/services/qr/templates';
import { useSettings } from '@/store/settings.store';
import { spacing } from '@/theme/tokens';

export default function SettingsTab() {
  const { settings, update } = useSettings();
  const [styleOpen, setStyleOpen] = useState(false);
  const stats = useAsync(() => getRepos().codes.stats(), []);
  const userTemplates = useAsync(() => getRepos().templates.list(), []);
  const templates = [...(userTemplates.data ?? []).map((t) => ({ id: t.id, name: t.name })), ...BUILTIN_TEMPLATES];
  const styleName = templates.find((t) => t.id === settings.defaultTemplateId)?.name ?? 'Minimal Black';

  return (
    <Screen title="Settings" large tabBar>
      <SectionHeader title="Appearance" />
      <Card>
        <SegmentedControl
          options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
          value={settings.theme}
          onChange={(theme) => update({ theme })}
          accessibilityLabel="Theme"
        />
      </Card>

      <SectionHeader title="Scanner" />
      <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
        <SwitchRow icon="phone-portrait-outline" title="Vibration" value={settings.scannerVibration} onValueChange={(scannerVibration) => update({ scannerVibration })} />
        <Divider />
        <SwitchRow icon="volume-high-outline" title="Sound" value={settings.scannerSound} onValueChange={(scannerSound) => update({ scannerSound })} />
        <Divider />
        <SwitchRow icon="time-outline" title="Save scans to history" value={settings.saveScansToHistory} onValueChange={(saveScansToHistory) => update({ saveScansToHistory })} />
        <Divider />
        <SwitchRow
          icon="open-outline"
          title="Auto-open safe links"
          subtitle="Only HTTPS links with no warnings. Off by default."
          value={settings.autoOpenResult}
          onValueChange={(autoOpenResult) => update({ autoOpenResult })}
        />
        <Divider />
        <SwitchRow
          icon="copy-outline"
          title="Keep duplicates in batch"
          subtitle="Off: repeated codes are counted but listed once"
          value={settings.batchAllowDuplicates}
          onValueChange={(batchAllowDuplicates) => update({ batchAllowDuplicates })}
        />
      </Card>

      <SectionHeader title="Generator" />
      <Card style={{ gap: spacing.sm }}>
        <Text variant="caption" color="muted">
          Default error correction
        </Text>
        <SegmentedControl
          options={(['L', 'M', 'Q', 'H'] as const).map((v) => ({ value: v, label: v }))}
          value={settings.defaultErrorCorrection}
          onChange={(defaultErrorCorrection) => update({ defaultErrorCorrection })}
          accessibilityLabel="Default error correction"
        />
        <Text variant="caption" color="muted">
          Default export resolution
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {EXPORT_SIZES.map((s) => (
            <Chip key={s} label={`${s}px`} selected={settings.defaultExportResolution === s} onPress={() => update({ defaultExportResolution: s })} />
          ))}
        </View>
        <ListRow icon="color-palette-outline" title="Default style" subtitle={styleName} onPress={() => setStyleOpen(true)} chevron />
      </Card>

      <SectionHeader title="Data" />
      <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
        <ListRow icon="folder-open-outline" title="Collections & tags" onPress={() => router.push('/collections')} chevron />
        <Divider />
        <ListRow icon="layers-outline" title="Batch sessions" onPress={() => router.push('/sessions')} chevron />
        <Divider />
        <ListRow
          icon="server-outline"
          title="Storage & backup"
          subtitle={stats.data ? `${stats.data.total} records · ${stats.data.scanned} scanned · ${stats.data.created} created` : undefined}
          onPress={() => router.push('/settings/storage')}
          chevron
        />
        <Divider />
        <ListRow icon="shield-checkmark-outline" title="Privacy" subtitle="Everything stays on this device" onPress={() => router.push('/settings/privacy')} chevron />
      </Card>

      <SectionHeader title="About" />
      <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
        <ListRow icon="information-circle-outline" title="About Qraft" subtitle={`Version ${Constants.expoConfig?.version ?? '1.0.0'}`} onPress={() => router.push('/settings/about')} chevron />
      </Card>

      <BottomSheet visible={styleOpen} onClose={() => setStyleOpen(false)} title="Default style">
        {templates.map((t) => (
          <ListRow
            key={t.id}
            title={t.name}
            onPress={() => {
              update({ defaultTemplateId: t.id });
              setStyleOpen(false);
            }}
            right={settings.defaultTemplateId === t.id ? <Text color="primary">✓</Text> : undefined}
          />
        ))}
      </BottomSheet>
    </Screen>
  );
}
