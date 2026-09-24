import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { SmartResultCard } from '@/components/scanner/SmartResultCard';
import { BottomSheet, Button, IconButton, Screen, Text } from '@/components/ui';
import { toggleFavorite } from '@/features/codes/actions';
import { ACTION_META, copyText, runScanAction } from '@/features/scanner/scanActions';
import { saveScan } from '@/features/scanner/saveScan';
import { parseScan, type ScanAction } from '@/services/scanner/ScanResultParser';
import { useSettings } from '@/store/settings.store';
import { toast } from '@/store/toast.store';
import { spacing } from '@/theme/tokens';
import type { CodeFormat } from '@/types/domain';

export default function ScanResult() {
  const params = useLocalSearchParams<{ data: string; format: string; id?: string; from?: string }>();
  const scan = useMemo(() => parseScan(params.data ?? '', (params.format as CodeFormat) || 'qr'), [params.data, params.format]);
  const [savedId, setSavedId] = useState(params.id || '');
  const [favorite, setFavorite] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const autoOpen = useSettings((s) => s.settings.autoOpenResult);
  const autoOpened = useRef(false);

  const unusual = scan.metadata.unusual === 'true';

  // Opt-in only: auto-open plain HTTPS links that raised no warnings.
  useEffect(() => {
    if (autoOpen && !autoOpened.current && scan.type === 'url' && !unusual && scan.metadata.protocol === 'https' && params.from === 'camera') {
      autoOpened.current = true;
      runScanAction('open', scan);
    }
  }, [autoOpen, scan, unusual, params.from]);

  const onAction = async (a: ScanAction) => {
    try {
      if (a === 'open') {
        setConfirmOpen(true);
        return;
      }
      if (a === 'save') {
        const id = savedId || (await saveScan(scan.rawValue, scan.format));
        setSavedId(id);
        if (!favorite) {
          setFavorite(await toggleFavorite({ id }));
          toast.success('Saved to favorites');
        } else {
          router.push({ pathname: '/code/[id]', params: { id } });
        }
        return;
      }
      if (a === 'copyPassword') setShowPassword(true);
      await runScanAction(a, scan);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed.');
    }
  };

  const primary = scan.actions[0];
  const secondary = scan.actions.slice(1);

  return (
    <Screen
      title="Scan result"
      back
      right={savedId ? <IconButton icon="information-circle-outline" label="Open details" onPress={() => router.push({ pathname: '/code/[id]', params: { id: savedId } })} /> : undefined}
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button title="Scan again" icon="scan" variant="secondary" flex onPress={() => (router.canGoBack() ? router.back() : router.replace('/scan'))} />
          {primary && <Button title={ACTION_META[primary].label} icon={ACTION_META[primary].icon} flex onPress={() => onAction(primary)} />}
        </View>
      }
    >
      <Animated.View entering={FadeInUp.springify().damping(18)} style={{ gap: spacing.md }}>
        <SmartResultCard scan={scan} showPassword={showPassword} />
        <View style={styles.grid}>
          {secondary.map((a) => (
            <Button
              key={a}
              title={a === 'save' ? (favorite ? 'View details' : 'Save to favorites') : ACTION_META[a].label}
              icon={a === 'save' ? (favorite ? 'star' : 'star-outline') : ACTION_META[a].icon}
              variant="tonal"
              onPress={() => onAction(a)}
              style={styles.gridItem}
            />
          ))}
        </View>
        {scan.type === 'wifi' && (
          <Text variant="caption" color="faint">
            Mobile operating systems don’t let apps join Wi-Fi networks directly. Copy the password, then pick the network in Wi-Fi settings.
          </Text>
        )}
        {savedId ? (
          <Text variant="caption" color="faint" align="center">
            Saved to history on this device.
          </Text>
        ) : null}
      </Animated.View>

      <BottomSheet visible={confirmOpen} onClose={() => setConfirmOpen(false)} title={unusual ? 'Potentially unusual link' : 'Open link?'}>
        <Text color="muted">
          {unusual ? 'This link has some unusual characteristics. Only open it if you trust where the code came from.' : 'You are about to leave Qraft and open:'}
        </Text>
        <Text variant="bodyStrong">{scan.metadata.domain}</Text>
        <Text variant="mono" color="muted" selectable numberOfLines={5}>
          {scan.metadata.url}
        </Text>
        <View style={{ gap: spacing.xs }}>
          <Button
            title="Open"
            icon="open-outline"
            variant={unusual ? 'danger' : 'primary'}
            onPress={() => {
              setConfirmOpen(false);
              runScanAction('open', scan);
            }}
          />
          <Button
            title="Copy link"
            icon="copy-outline"
            variant="secondary"
            onPress={() => {
              setConfirmOpen(false);
              copyText(scan.metadata.url ?? scan.rawValue, 'Link copied');
            }}
          />
          <Button title="Cancel" variant="ghost" onPress={() => setConfirmOpen(false)} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  gridItem: { flexGrow: 1, flexBasis: '45%' },
});
