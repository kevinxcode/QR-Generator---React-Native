import Constants from 'expo-constants';
import { router } from 'expo-router';
import { View } from 'react-native';

import { QRCodeView } from '@/components/qr/QRCodeView';
import { Card, Divider, ListRow, Screen, SectionHeader, Text } from '@/components/ui';
import { BUILTIN_TEMPLATES } from '@/services/qr/templates';
import { SCANNER_CAPABILITIES } from '@/services/scanner/capabilities';
import { spacing } from '@/theme/tokens';

const LIBRARIES = [
  ['Expo & React Native', 'MIT'],
  ['expo-camera (on-device barcode decoding)', 'MIT'],
  ['expo-sqlite', 'MIT'],
  ['react-native-svg', 'MIT'],
  ['react-native-reanimated / gesture-handler', 'MIT'],
  ['qrcode (QR matrix encoding)', 'MIT'],
  ['bwip-js (barcode rendering)', 'MIT'],
  ['zustand, zod', 'MIT'],
];

export default function About() {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return (
    <Screen title="About" back>
      <Card style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
        <QRCodeView payload="Qraft — QR & Barcode Studio" design={BUILTIN_TEMPLATES[2].design} size={120} accessibilityLabel="Qraft logo code" />
        <Text variant="title">Qraft</Text>
        <Text color="muted">QR & Barcode Studio</Text>
        <Text variant="caption" color="faint">
          Version {version}
        </Text>
      </Card>

      <SectionHeader title="Supported scan formats" />
      <Card>
        <Text color="muted">{SCANNER_CAPABILITIES.map((c) => c.label).join(' · ')}</Text>
      </Card>

      <SectionHeader title="Open-source libraries" />
      <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
        {LIBRARIES.map(([name, license], i) => (
          <View key={name}>
            {i > 0 && <Divider />}
            <ListRow title={name} subtitle={license} />
          </View>
        ))}
      </Card>

      <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
        <ListRow icon="shield-checkmark-outline" title="Privacy statement" onPress={() => router.push('/settings/privacy')} chevron />
      </Card>
    </Screen>
  );
}
