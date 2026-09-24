import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

const POINTS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: 'person-remove-outline', title: 'No account required', body: 'Qraft has no sign-up, login or user profile.' },
  { icon: 'cloud-offline-outline', title: 'No cloud sync', body: 'Your history, designs and settings are stored only in this app’s private storage on this device.' },
  { icon: 'eye-off-outline', title: 'No tracking', body: 'No analytics, advertising identifiers or third-party trackers are used.' },
  { icon: 'server-outline', title: 'No uploads', body: 'Scanned and generated content is never sent to a server. Camera frames are decoded on-device.' },
  { icon: 'phone-portrait-outline', title: 'History stays on this device', body: 'Uninstalling the app removes all data. Use Backup if you want a copy.' },
  { icon: 'hand-left-outline', title: 'You stay in control', body: 'Links are never opened automatically unless you enable it, and the clipboard is only read when you tap “Create from clipboard”.' },
];

export default function Privacy() {
  const p = useTheme();
  return (
    <Screen title="Privacy" back>
      <Text variant="title">Private by design</Text>
      <Text color="muted">Qraft works fully offline. Here is exactly what that means.</Text>
      {POINTS.map((pt) => (
        <Card key={pt.title} style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Ionicons name={pt.icon} size={22} color={p.primary} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong">{pt.title}</Text>
            <Text variant="caption" color="muted">
              {pt.body}
            </Text>
          </View>
        </Card>
      ))}
      <Text variant="caption" color="faint">
        Opening a scanned link, searching the web, or sharing a file hands that content to the app you choose. Qraft asks before doing any of this.
      </Text>
      <Button title="Manage & delete data" icon="trash-outline" variant="secondary" onPress={() => router.push('/settings/storage')} />
    </Screen>
  );
}
