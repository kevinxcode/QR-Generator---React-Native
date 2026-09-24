import { ScrollView, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

import { PressableScale } from './Pressable';
import { Text } from './Text';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: NoInfer<T>;
  onChange(v: NoInfer<T>): void;
  scrollable?: boolean;
  accessibilityLabel?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, scrollable, accessibilityLabel }: Props<T>) {
  const p = useTheme();
  const items = options.map((o) => {
    const selected = o.value === value;
    return (
      <PressableScale
        key={o.value}
        haptic
        onPress={() => onChange(o.value)}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        accessibilityLabel={o.label}
        style={{
          flex: scrollable ? undefined : 1,
          minHeight: 36,
          paddingHorizontal: 14,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.sm,
          backgroundColor: selected ? p.surface : 'transparent',
          shadowColor: '#000',
          shadowOpacity: selected ? 0.08 : 0,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
          elevation: selected ? 1 : 0,
        }}
      >
        <Text variant="caption" color={selected ? 'text' : 'muted'} style={{ fontWeight: selected ? '700' : '600' }} numberOfLines={1}>
          {o.label}
        </Text>
      </PressableScale>
    );
  });
  const box = { flexDirection: 'row' as const, backgroundColor: p.surfaceAlt, borderRadius: radius.md, padding: 3, gap: 2 };
  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} contentContainerStyle={box}>
        {items}
      </ScrollView>
    );
  }
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={box}>
      {items}
    </View>
  );
}
