import { Ionicons } from '@expo/vector-icons';
import { CameraView, type BarcodeScanningResult } from 'expo-camera';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet, Button, ConfirmDialog, IconButton, Input, PressableScale, Text } from '@/components/ui';
import { getRepos } from '@/db/database';
import { copyText } from '@/features/scanner/scanActions';
import { CameraPermissionGate } from '@/features/scanner/CameraPermissionGate';
import { useScanFeedback } from '@/features/scanner/useScanFeedback';
import { toCsv } from '@/services/export/csv';
import { shareFile } from '@/services/export/ExportService';
import { formatLabel } from '@/services/barcode/formats';
import { LocalFileService } from '@/services/files/LocalFileService';
import { barcodeTypesFor, normalizeScannedType, rawScanValue, type ScanMode } from '@/services/scanner/capabilities';
import { BatchSession, ScanCooldown } from '@/services/scanner/dedupe';
import { parseScan } from '@/services/scanner/ScanResultParser';
import { notifyDataChanged } from '@/store/data.store';
import { useSettings } from '@/store/settings.store';
import { toast } from '@/store/toast.store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

export default function BatchScreen() {
  return (
    <CameraPermissionGate title="Batch scan">
      <Batch />
    </CameraPermissionGate>
  );
}

function Batch() {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { mode = 'all' } = useLocalSearchParams<{ mode?: ScanMode }>();
  const allowDuplicates = useSettings((s) => s.settings.batchAllowDuplicates);
  const [session] = useState(() => new BatchSession(allowDuplicates));
  const cooldown = useRef(new ScanCooldown(1800, 350));
  const feedback = useScanFeedback();
  const [, setRev] = useState(0);
  const [active, setActive] = useState(true);
  const [torch, setTorch] = useState(false);
  const [paused, setPaused] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [name, setName] = useState(() => `Session ${new Date().toLocaleDateString()}`);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ text: string; dup: boolean } | null>(null);

  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, []),
  );

  const settings = useMemo(() => ({ barcodeTypes: barcodeTypesFor(mode) }), [mode]);
  const rerender = () => setRev((r) => r + 1);

  const onScanned = useCallback(
    (r: BarcodeScanningResult) => {
      const data = rawScanValue(r);
      if (!data) return;
      const format = normalizeScannedType(r.type);
      if (!cooldown.current.accept(`${format}:${data}`)) return;
      const res = session.add(data, format);
      feedback(res === 'added' ? 'success' : 'duplicate');
      setFlash({ text: res === 'added' ? `Added ${data.slice(0, 40)}` : 'Already scanned (duplicate)', dup: res !== 'added' });
      setRev((v) => v + 1);
    },
    [feedback, session],
  );

  const stats = session.stats();
  const items = [...session.items].reverse();

  const exportCsv = async () => {
    if (!items.length) return;
    try {
      const csv = toCsv(
        ['#', 'value', 'format', 'type', 'times_scanned', 'scanned_at'],
        session.items.map((i, n) => [n + 1, i.value, formatLabel(i.format), parseScan(i.value, i.format).type, i.count, new Date(i.scannedAt).toISOString()]),
      );
      const uri = await LocalFileService.writeText('exports', `batch-${Date.now()}.csv`, csv);
      await shareFile(uri, 'csv', 'Export CSV');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await getRepos().sessions.save(
        name,
        session.items.map((i) => ({ payload: i.value, format: i.format, contentType: parseScan(i.value, i.format).type, scannedAt: i.scannedAt })),
      );
      notifyDataChanged();
      toast.success(`Saved ${session.items.length} codes`);
      session.clear();
      setSaveOpen(false);
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save session');
    } finally {
      setSaving(false);
    }
  };

  const exit = () => (items.length ? setConfirmExit(true) : router.back());
  const camH = Math.round(height * 0.42);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: camH, backgroundColor: '#000', overflow: 'hidden', borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl }}>
        {active && !paused && <CameraView style={StyleSheet.absoluteFill} enableTorch={torch} barcodeScannerSettings={settings} onBarcodeScanned={onScanned} />}
        {paused && (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text color="#fff">Paused</Text>
          </View>
        )}
        <View style={[styles.camTop, { paddingTop: insets.top + spacing.xs }]}>
          <IconButton icon="close" label="Exit batch scan" variant="glass" onPress={exit} />
          <Text variant="heading" color="#fff" style={{ flex: 1, textAlign: 'center' }}>
            Batch scan
          </Text>
          <IconButton icon={torch ? 'flash' : 'flash-outline'} label="Flashlight" variant="glass" active={torch} onPress={() => setTorch((t) => !t)} />
        </View>
        <View style={styles.reticle} pointerEvents="none" />
        {flash && (
          <Animated.View key={`${flash.text}${stats.total}`} entering={FadeInDown.duration(200)} style={[styles.flash, { backgroundColor: flash.dup ? 'rgba(245,158,11,0.92)' : 'rgba(18,161,80,0.92)' }]}>
            <Ionicons name={flash.dup ? 'copy-outline' : 'checkmark-circle'} size={16} color="#fff" />
            <Text variant="caption" color="#fff" numberOfLines={1} style={{ fontWeight: '700' }} accessibilityLiveRegion="polite">
              {flash.text}
            </Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.stats}>
        <Stat label="Total" value={stats.total} />
        <Stat label="Unique" value={stats.unique} />
        <Stat label="Duplicates" value={stats.duplicates} />
        <IconButton icon={paused ? 'play' : 'pause'} label={paused ? 'Resume scanning' : 'Pause scanning'} variant="filled" onPress={() => setPaused((v) => !v)} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.key}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.xs, paddingBottom: spacing.md }}
        ListEmptyComponent={
          <Text color="muted" align="center" style={{ marginTop: spacing.xl }}>
            Point the camera at codes. Each unique code is added to the list.
          </Text>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.item, { backgroundColor: p.surface, borderColor: p.border }]}>
            <Text variant="caption" color="faint" style={{ width: 26 }}>
              {items.length - index}
            </Text>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1} selectable>
                {item.value}
              </Text>
              <Text variant="caption" color="muted">
                {formatLabel(item.format)}
                {item.count > 1 ? ` · scanned ${item.count}×` : ''}
              </Text>
            </View>
            <PressableScale onPress={() => { session.remove(item.key); rerender(); }} accessibilityLabel={`Remove ${item.value}`} style={styles.remove}>
              <Ionicons name="trash-outline" size={18} color={p.danger} />
            </PressableScale>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm, borderTopColor: p.border }]}>
        <Button title="Copy all" icon="copy-outline" variant="secondary" size="sm" disabled={!items.length} onPress={() => copyText(session.items.map((i) => i.value).join('\n'), `Copied ${items.length} values`)} flex />
        <Button title="CSV" icon="document-text-outline" variant="secondary" size="sm" disabled={!items.length} onPress={exportCsv} flex />
        <Button title="Save session" icon="save-outline" size="sm" disabled={!items.length} onPress={() => setSaveOpen(true)} flex />
      </View>

      <BottomSheet visible={saveOpen} onClose={() => setSaveOpen(false)} title="Save session">
        <Input label="Session name" value={name} onChangeText={setName} autoFocus />
        <Text variant="caption" color="muted">
          {stats.unique} unique codes will be saved to your history on this device.
        </Text>
        <Button title="Save" onPress={save} loading={saving} />
      </BottomSheet>
      <ConfirmDialog
        visible={confirmExit}
        title="Discard batch?"
        message={`You have ${items.length} scanned codes that are not saved.`}
        confirmLabel="Discard"
        destructive
        onCancel={() => setConfirmExit(false)}
        onConfirm={() => {
          setConfirmExit(false);
          router.back();
        }}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="title">{value}</Text>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  camTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm },
  reticle: { position: 'absolute', left: '15%', right: '15%', top: '32%', bottom: '18%', borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', borderRadius: 18 },
  flash: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.sm, flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: 999 },
  stats: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
});
