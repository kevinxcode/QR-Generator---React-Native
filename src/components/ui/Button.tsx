import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';

import { PressableScale } from './Pressable';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'tonal';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg' | 'sm';
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  flex?: boolean;
}

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, size = 'md', style, accessibilityHint, flex }: Props) {
  const p = useTheme();
  const bg: Record<Variant, string> = {
    primary: p.primary,
    secondary: p.surfaceAlt,
    ghost: 'transparent',
    danger: p.danger,
    tonal: p.primarySoft,
  };
  const fg: Record<Variant, string> = {
    primary: p.onPrimary,
    secondary: p.text,
    ghost: p.primary,
    danger: '#FFFFFF',
    tonal: p.primary,
  };
  const h = size === 'lg' ? 54 : size === 'sm' ? 36 : 48;
  const off = disabled || loading;
  return (
    <PressableScale
      haptic
      onPress={off ? undefined : onPress}
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={[
        styles.base,
        { backgroundColor: bg[variant], minHeight: Math.max(h, size === 'sm' ? 36 : MIN_TOUCH), opacity: disabled ? 0.45 : 1 },
        size === 'sm' && { paddingHorizontal: spacing.sm },
        flex && { flex: 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={fg[variant]} />}
          <Text variant={size === 'sm' ? 'caption' : 'bodyStrong'} color={fg[variant]} numberOfLines={1} style={size === 'sm' && { fontWeight: '600' }}>
            {title}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
