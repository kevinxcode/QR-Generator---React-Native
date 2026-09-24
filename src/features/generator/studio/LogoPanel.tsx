import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Button, Card, ColorField, SectionHeader, Stepper, SwitchRow, Text } from '@/components/ui';
import { LocalFileService } from '@/services/files/LocalFileService';
import { safeLogoSize } from '@/services/scannability/ScannabilityService';
import { useGenerator } from '@/store/generator.store';
import { toast } from '@/store/toast.store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

export function LogoPanel() {
  const p = useTheme();
  const { design, patchDesign, logoHref, setLogoHref } = useGenerator();
  const [busy, setBusy] = useState(false);
  const safe = safeLogoSize('H');

  const pick = async () => {
    setBusy(true);
    try {
      let res: ImagePicker.ImagePickerResult;
      try {
        res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
      } catch {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          toast.error('Photo access is needed to add a logo.');
          if (!perm.canAskAgain) Linking.openSettings().catch(() => {});
          return;
        }
        res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
      }
      if (res.canceled || !res.assets[0]) return;
      const stored = await LocalFileService.importLogo(res.assets[0].uri);
      const href = await LocalFileService.toDataUri(stored);
      if (!href) throw new Error('Could not read the selected image.');
      const bumped = design.errorCorrection !== 'H';
      patchDesign({ logoUri: stored, errorCorrection: 'H', logoSize: Math.min(design.logoSize, safe) });
      setLogoHref(href);
      if (bumped) toast.info('Error correction raised to H so the code stays scannable with a logo.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add logo.');
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    patchDesign({ logoUri: null });
    setLogoHref(null);
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Card tone="alt" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {logoHref ? (
            <Image source={{ uri: logoHref }} style={{ width: 64, height: 64 }} contentFit="contain" accessibilityLabel="Current logo" />
          ) : (
            <Ionicons name="image-outline" size={28} color={p.textFaint} />
          )}
        </View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Button title={logoHref ? 'Replace logo' : 'Upload logo'} icon="cloud-upload-outline" size="sm" onPress={pick} loading={busy} />
          {logoHref && <Button title="Remove logo" icon="trash-outline" variant="ghost" size="sm" onPress={remove} />}
        </View>
      </Card>
      <Text variant="caption" color="muted">
        Transparent PNGs work best. You can crop the image to a square after choosing it. The logo is stored only on this device.
      </Text>
      {logoHref && (
        <>
          <SectionHeader title="Size & spacing" />
          <Stepper
            label="Logo size"
            value={design.logoSize}
            min={0.1}
            max={0.34}
            step={0.02}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(logoSize) => patchDesign({ logoSize })}
          />
          <Text variant="caption" color={design.logoSize > safe ? 'warning' : 'faint'}>
            {design.logoSize > safe ? `Above the recommended ${Math.round(safe * 100)}%. Scanning may become unreliable.` : `Recommended: up to ${Math.round(safe * 100)}% with error correction H.`}
          </Text>
          <Stepper label="Padding" value={design.logoPadding} min={0} max={3} step={0.5} format={(v) => `${v}`} onChange={(logoPadding) => patchDesign({ logoPadding })} />
          <ColorField label="Logo background" value={design.logoBackground} onChange={(logoBackground) => patchDesign({ logoBackground })} />
          <SwitchRow title="Rounded background" value={design.logoRounded} onValueChange={(logoRounded) => patchDesign({ logoRounded })} />
        </>
      )}
    </View>
  );
}
