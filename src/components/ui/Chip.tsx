import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { PressableScale } from './Pressable';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Chip({ label, selected, onPress, onRemove, icon }: ChipProps) {
  const p = useTheme();
  const fg = selected ? p.onPrimary : p.text;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 36,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: selected ? p.primary : p.surfaceAlt,
      }}
    >
      {icon && <Ionicons name={icon} size={15} color={fg} />}
      <Text variant="caption" color={fg} style={{ fontWeight: '600' }}>
        {label}
      </Text>
      {onRemove && (
        <PressableScale onPress={onRemove} accessibilityLabel={`Remove ${label}`} hitSlop={10}>
          <Ionicons name="close" size={15} color={fg} />
        </PressableScale>
      )}
    </PressableScale>
  );
}

interface BadgeProps {
  label: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Badge({ label, tone = 'neutral', icon }: BadgeProps) {
  const p = useTheme();
  const map = {
    neutral: [p.surfaceAlt, p.textMuted],
    primary: [p.primarySoft, p.primary],
    success: [p.successSoft, p.success],
    warning: [p.warningSoft, p.warning],
    danger: [p.dangerSoft, p.danger],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
      {icon && <Ionicons name={icon} size={12} color={fg} />}
      <Text variant="caption" color={fg} style={{ fontWeight: '700', fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}
