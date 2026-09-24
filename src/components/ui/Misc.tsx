import { Ionicons } from '@expo/vector-icons';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Switch as RNSwitch, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';

import { Button } from './Button';
import { PressableScale } from './Pressable';
import { Text } from './Text';

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text variant="label" color="faint" accessibilityRole="header">
        {title}
      </Text>
      {action && (
        <PressableScale onPress={onAction} accessibilityLabel={action} hitSlop={10}>
          <Text variant="caption" color="primary" style={{ fontWeight: '700' }}>
            {action}
          </Text>
        </PressableScale>
      )}
    </View>
  );
}

interface EmptyProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  cta?: string;
  onCta?: () => void;
}

export function EmptyState({ icon, title, message, cta, onCta }: EmptyProps) {
  const p = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: p.primarySoft }]}>
        <Ionicons name={icon} size={30} color={p.primary} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {message && (
        <Text color="muted" align="center" style={{ maxWidth: 280 }}>
          {message}
        </Text>
      )}
      {cta && <Button title={cta} onPress={onCta} style={{ marginTop: spacing.xs }} />}
    </View>
  );
}

export function Skeleton({ height = 64, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const p = useTheme();
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.set(withRepeat(withTiming(1, { duration: 700 }), -1, true));
  }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View accessibilityLabel="Loading" style={[{ height, borderRadius: radius.md, backgroundColor: p.surfaceAlt }, a, style]} />;
}

interface RowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  chevron?: boolean;
}

export function ListRow({ icon, iconColor, title, subtitle, right, onPress, destructive, chevron }: RowProps) {
  const p = useTheme();
  const color = destructive ? p.danger : iconColor ?? p.primary;
  const body = (
    <>
      {icon && (
        <View style={[styles.rowIcon, { backgroundColor: destructive ? p.dangerSoft : p.primarySoft }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" color={destructive ? 'danger' : 'text'}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" color="muted">
            {subtitle}
          </Text>
        )}
      </View>
      {right}
      {chevron && <Ionicons name="chevron-forward" size={18} color={p.textFaint} />}
    </>
  );
  if (onPress) {
    return (
      <PressableScale onPress={onPress} accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title} style={styles.row} scaleTo={0.99}>
        {body}
      </PressableScale>
    );
  }
  return <View style={styles.row}>{body}</View>;
}

export function SwitchRow({ title, subtitle, value, onValueChange, icon }: { title: string; subtitle?: string; value: boolean; onValueChange(v: boolean): void; icon?: keyof typeof Ionicons.glyphMap }) {
  const p = useTheme();
  return (
    <ListRow
      icon={icon}
      title={title}
      subtitle={subtitle}
      right={
        <RNSwitch
          value={value}
          onValueChange={onValueChange}
          accessibilityLabel={title}
          trackColor={{ true: p.primary, false: p.surfaceAlt }}
          thumbColor="#FFFFFF"
        />
      }
    />
  );
}

export function Divider() {
  const p = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border, marginLeft: 52 }} />;
}

const styles = StyleSheet.create({
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: MIN_TOUCH + 12, paddingVertical: spacing.xs },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
