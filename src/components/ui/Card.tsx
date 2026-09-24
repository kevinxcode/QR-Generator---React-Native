import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { elevation, radius, spacing } from '@/theme/tokens';

import { PressableScale } from './Pressable';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  padded?: boolean;
  tone?: 'surface' | 'alt' | 'primary';
  accessibilityLabel?: string;
}

export function Card({ children, style, onPress, onLongPress, padded = true, tone = 'surface', accessibilityLabel }: Props) {
  const p = useTheme();
  const bg = tone === 'alt' ? p.surfaceAlt : tone === 'primary' ? p.primarySoft : p.surface;
  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: bg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: p.border,
      padding: padded ? spacing.md : 0,
    },
    tone === 'surface' && elevation(p, 1),
    style,
  ];
  if (onPress || onLongPress) {
    return (
      <PressableScale onPress={onPress} onLongPress={onLongPress} accessibilityLabel={accessibilityLabel} style={base} scaleTo={0.98}>
        {children}
      </PressableScale>
    );
  }
  return <View style={base}>{children}</View>;
}
