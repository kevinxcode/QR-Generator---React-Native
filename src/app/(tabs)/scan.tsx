import { CameraView, type BarcodeScanningResult } from 'expo-camera';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScannerOverlay } from '@/components/scanner/ScannerOverlay';
import { IconButton, SegmentedControl, Text } from '@/components/ui';
import { CameraPermissionGate } from '@/features/scanner/CameraPermissionGate';
import { scanFromGallery } from '@/features/scanner/galleryScan';
import { saveScan } from '@/features/scanner/saveScan';
import { useScanFeedback } from '@/features/scanner/useScanFeedback';
import { barcodeTypesFor, normalizeScannedType, rawScanValue, type ScanMode } from '@/services/scanner/capabilities';
import { ScanCooldown } from '@/services/scanner/dedupe';
import { useSettings } from '@/store/settings.store';
import { toast } from '@/store/toast.store';
import { spacing } from '@/theme/tokens';

const MODES: { value: ScanMode; label: string }[] = [
  { value: 'all', label: 'All codes' },
  { value: 'qr', label: 'QR' },
  { value: 'barcode', label: 'Barcode' },
];

export default function ScanTab() {
  return (
    <CameraPermissionGate>
      <Scanner />
    </CameraPermissionGate>
  );
}

function Scanner() {
  const params = useLocalSearchParams<{ mode?: ScanMode }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [mode, setMode] = useState<ScanMode>(params.mode ?? 'all');
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [active, setActive] = useState(true);
  const [pulse, setPulse] = useState(0);
  const [status, setStatus] = useState('Align code inside frame');
  const busy = useRef(false);
  const cooldown = useRef(new ScanCooldown(2500, 400));
  const feedback = useScanFeedback();
  const { scannerSound, scannerVibration, saveScansToHistory } = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);

  // Only run the camera while this tab is focused and the app is in the foreground.
  useFocusEffect(
    useCallback(() => {
      if (params.mode) setMode(params.mode);
      busy.current = false;
      cooldown.current.reset();
      setStatus('Align code inside frame');
      setActive(true);
      const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
      return () => {
        sub.remove();
        setActive(false);
        setTorch(false);
      };
    }, [params.mode]),
  );

  const frameW = mode === 'barcode' ? Math.min(width - 48, 340) : Math.min(width * 0.72, 300);
  const frameH = mode === 'barcode' ? frameW * 0.55 : frameW;
  const types = useMemo(() => barcodeTypesFor(mode), [mode]);
  const settings = useMemo(() => ({ barcodeTypes: types }), [types]);

  const onScanned = useCallback(
    async (r: BarcodeScanningResult) => {
      const data = rawScanValue(r);
      if (busy.current || !data) return;
      if (!cooldown.current.accept(`${r.type}:${data}`)) return;
      busy.current = true;
      const format = normalizeScannedType(r.type);
      feedback('success');
      setPulse((k) => k + 1);
      setStatus('Code detected');
      try {
        const id = saveScansToHistory ? await saveScan(data, format) : undefined;
        router.push({ pathname: '/scan/result', params: { data, format, id: id ?? '', from: 'camera' } });
      } catch {
        toast.error('Could not save this scan to history.');
        router.push({ pathname: '/scan/result', params: { data, format, from: 'camera' } });
      }
    },
    [feedback, saveScansToHistory],
  );

  return (
    <View style={styles.root}>
      {active && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={torch}
          barcodeScannerSettings={settings}
          onBarcodeScanned={onScanned}
          onMountError={(e) => toast.error(`Camera unavailable: ${e.message}`)}
          accessibilityLabel="Camera viewfinder"
        />
      )}
      <ScannerOverlay width={width} height={height} frameWidth={frameW} frameHeight={frameH} color="#FFFFFF" pulseKey={pulse} />

      <View style={[styles.top, { paddingTop: insets.top + spacing.xs }]}>
        <IconButton icon="close" label="Close scanner" variant="glass" onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))} />
        <View style={{ flex: 1, paddingHorizontal: spacing.xs }}>
          <SegmentedControl options={MODES} value={mode} onChange={setMode} accessibilityLabel="Code type" />
        </View>
        <IconButton icon={torch ? 'flash' : 'flash-outline'} label={torch ? 'Turn flashlight off' : 'Turn flashlight on'} variant="glass" active={torch} onPress={() => setTorch((t) => !t)} />
      </View>

      <View style={[styles.statusWrap, { top: (height - frameH) / 2 - 40 + frameH + spacing.lg }]} pointerEvents="none">
        <View style={styles.status}>
          <Text variant="bodyStrong" color="#FFFFFF" accessibilityLiveRegion="polite">
            {status}
          </Text>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <IconButton icon="images-outline" label="Scan from gallery" variant="glass" onPress={scanFromGallery} />
        <IconButton icon="layers-outline" label="Batch scan mode" variant="glass" onPress={() => router.push({ pathname: '/scan/batch', params: { mode } })} />
        <IconButton icon="camera-reverse-outline" label="Switch camera" variant="glass" onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} />
        <IconButton
          icon={scannerSound ? 'volume-high-outline' : 'volume-mute-outline'}
          label={scannerSound ? 'Sound on' : 'Sound off'}
          variant="glass"
          active={scannerSound}
          onPress={() => update({ scannerSound: !scannerSound })}
        />
        <IconButton
          icon="phone-portrait-outline"
          label={scannerVibration ? 'Vibration on' : 'Vibration off'}
          variant="glass"
          active={scannerVibration}
          onPress={() => update({ scannerVibration: !scannerVibration })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm },
  statusWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  status: { backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: spacing.md },
});
