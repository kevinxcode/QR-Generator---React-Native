import { Ionicons } from '@expo/vector-icons';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { MIN_TOUCH, radius } from '@/theme/tokens';

import { PressableScale } from './Pressable';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  variant?: 'plain' | 'filled' | 'glass' | 'primary';
  color?: string;
  size?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function IconButton({ icon, label, onPress, variant = 'plain', color, size = 22, active, style, disabled }: Props) {
  const p = useTheme();
  const bg =
    variant === 'filled' ? p.surfaceAlt
      : variant === 'glass' ? (active ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.42)')
      : variant === 'primary' ? p.primary
      : 'transparent';
  const fg = color ?? (variant === 'glass' ? (active ? '#0A0C12' : '#FFFFFF') : variant === 'primary' ? p.onPrimary : p.text);
  return (
    <PressableScale
      haptic
      onPress={disabled ? undefined : onPress}
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      hitSlop={6}
      style={[
        {
          width: MIN_TOUCH,
          height: MIN_TOUCH,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={fg} />
    </PressableScale>
  );
}
