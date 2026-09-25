import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button, EmptyState, ToastHost } from '@/components/ui';
import { initDatabase } from '@/db/database';
import { PngRenderHost } from '@/services/export/PngRenderHost';
import { LocalFileService } from '@/services/files/LocalFileService';
import { useSettings } from '@/store/settings.store';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

// The Stack must mount on the first render (expo-router requirement); screens stay blank until startup finishes.
function Shell({ ready, error, onRetry }: { ready: boolean; error: string | null; onRetry(): void }) {
  const p = useTheme();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(p.bg).catch(() => {});
  }, [p.bg]);
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <LinearGradient colors={p.bgGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <StatusBar style={p.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, animation: 'slide_from_right' }}
        screenLayout={({ children }) => (ready ? children : <View style={{ flex: 1 }} />)}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="scan/result" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="scan/batch" options={{ animation: 'fade' }} />
      </Stack>
      {ready && <PngRenderHost />}
      {ready && <ToastHost />}
      {!ready && error ? (
        <View style={StyleSheet.absoluteFill}>
          <StartupError message={error} onRetry={onRetry} />
        </View>
      ) : null}
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
          <Shell ready={ready} error={error} onRetry={() => setAttempt((a) => a + 1)} />
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
