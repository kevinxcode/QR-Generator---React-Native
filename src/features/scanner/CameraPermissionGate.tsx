import { useCameraPermissions } from 'expo-camera';
import type { ReactNode } from 'react';
import { Linking, View } from 'react-native';

import { Button, EmptyState, Screen, Skeleton } from '@/components/ui';
import { spacing } from '@/theme/tokens';

/** Explains and requests camera permission only when the scanner is opened. */
export function CameraPermissionGate({ children, title = 'Scanner' }: { children: ReactNode; title?: string }) {
  const [perm, request] = useCameraPermissions();

  if (!perm) {
    return (
      <Screen title={title} back>
        <Skeleton height={320} />
      </Screen>
    );
  }
  if (perm.granted) return <>{children}</>;

  return (
    <Screen title={title} back>
      <EmptyState
        icon="camera-outline"
        title="Camera access needed"
        message="Qraft uses the camera only to read codes. Frames are processed on your device and never uploaded or stored."
      />
      <View style={{ gap: spacing.sm }}>
        {perm.canAskAgain ? (
          <Button title="Allow camera" icon="camera" onPress={request} size="lg" />
        ) : (
          <Button title="Open Settings" icon="settings-outline" onPress={() => Linking.openSettings()} size="lg" />
        )}
      </View>
    </Screen>
  );
}
