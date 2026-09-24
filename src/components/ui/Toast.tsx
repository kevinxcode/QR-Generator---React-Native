import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToastStore } from '@/store/toast.store';
import { useTheme } from '@/theme/ThemeProvider';
import { elevation, radius, spacing } from '@/theme/tokens';

import { Text } from './Text';

export function ToastHost() {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const { toast, hide } = useToastStore();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hide, toast.kind === 'error' ? 3800 : 2200);
    return () => clearTimeout(t);
  }, [toast, hide]);

  if (!toast) return null;
  const icon = toast.kind === 'success' ? 'checkmark-circle' : toast.kind === 'error' ? 'alert-circle' : 'information-circle';
  const color = toast.kind === 'success' ? p.success : toast.kind === 'error' ? p.danger : p.primary;
  return (
    <Animated.View
      key={toast.id}
      entering={FadeInUp.springify().damping(18)}
      exiting={FadeOutUp.duration(150)}
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.toast, elevation(p, 3), { top: insets.top + spacing.xs, backgroundColor: p.bgElevated, borderColor: p.border }]}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text variant="bodyStrong" style={{ flex: 1 }} onPress={hide}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    zIndex: 1000,
  },
});
