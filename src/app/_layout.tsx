import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button, EmptyState, ToastHost } from '@/components/ui';
import { initDatabase } from '@/db/database';
import { PngRenderHost } from '@/services/export/PngRenderHost';
import { LocalFileService } from '@/services/files/LocalFileService';
import { useSettings } from '@/store/settings.store';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const p = useTheme();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(p.bg).catch(() => {});
  }, [p.bg]);
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StatusBar style={p.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="scan/result" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="scan/batch" options={{ animation: 'fade' }} />
      </Stack>
      <PngRenderHost />
      <ToastHost />
    </View>
  );
}

export default function RootLayout() {
  const hydrate = useSettings((s) => s.hydrate);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Promise.all([hydrate(), initDatabase(), LocalFileService.ensureDirs()]);
        if (alive) {
          setError(null);
          setReady(true);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
    return () => {
      alive = false;
    };
  }, [hydrate, attempt]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          {ready ? (
            <Shell />
          ) : error ? (
            <StartupError message={error} onRetry={() => setAttempt((a) => a + 1)} />
          ) : null}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function StartupError({ message, onRetry }: { message: string; onRetry(): void }) {
  const p = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: p.bg, justifyContent: 'center', padding: 24 }}>
      <EmptyState icon="warning-outline" title="Storage unavailable" message={`Qraft couldn't open its local database. ${message}`} />
      <Button title="Try again" onPress={onRetry} />
    </View>
  );
}
