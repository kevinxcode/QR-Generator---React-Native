import { Text as RNText, type TextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { typography, type TypographyVariant } from '@/theme/tokens';

interface Props extends TextProps {
  variant?: TypographyVariant;
  color?: 'text' | 'muted' | 'faint' | 'primary' | 'danger' | 'success' | 'warning' | 'onPrimary' | string;
  align?: 'left' | 'center' | 'right';
}

export function Text({ variant = 'body', color = 'text', align, style, ...rest }: Props) {
  const p = useTheme();
  const map: Record<string, string> = {
    text: p.text,
    muted: p.textMuted,
    faint: p.textFaint,
    primary: p.primary,
    danger: p.danger,
    success: p.success,
    warning: p.warning,
    onPrimary: p.onPrimary,
  };
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      style={[typography[variant], { color: map[color] ?? color, textAlign: align }, style]}
      {...rest}
    />
  );
}
