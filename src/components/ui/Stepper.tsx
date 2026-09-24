import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { IconButton } from './IconButton';
import { Text } from './Text';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange(v: number): void;
}

/** Accessible numeric stepper (used instead of sliders for precise, screen-reader friendly input). */
export function Stepper({ label, value, min, max, step = 1, format = String, onChange }: Props) {
  const p = useTheme();
  const clamp = (v: number) => Math.round(Math.min(max, Math.max(min, v)) * 1000) / 1000;
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(clamp(value + (e.nativeEvent.actionName === 'increment' ? step : -step)))}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: p.surfaceAlt, borderRadius: radius.md, paddingLeft: spacing.sm, minHeight: 48 }}
    >
      <Text variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </Text>
      <IconButton icon="remove" label={`Decrease ${label}`} onPress={() => onChange(clamp(value - step))} disabled={value <= min} size={18} />
      <Text variant="bodyStrong" style={{ minWidth: 48, textAlign: 'center' }}>
        {format(value)}
      </Text>
      <IconButton icon="add" label={`Increase ${label}`} onPress={() => onChange(clamp(value + step))} disabled={value >= max} size={18} />
    </View>
  );
}
