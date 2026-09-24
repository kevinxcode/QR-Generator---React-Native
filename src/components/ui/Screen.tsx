import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

import { IconButton } from './IconButton';
import { Text } from './Text';

interface Props {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  /** Extra bottom padding for screens under the tab bar. */
  tabBar?: boolean;
  footer?: ReactNode;
  refreshControl?: ScrollViewProps['refreshControl'];
  large?: boolean;
}

export function Screen({ title, subtitle, back, right, children, scroll = true, tabBar, footer, refreshControl, large }: Props) {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = (tabBar ? 96 : spacing.xl) + (footer ? 0 : insets.bottom);
  return (
    <View style={[styles.root, { backgroundColor: p.bg, paddingTop: insets.top }]}>
      {(title || back || right) && (
        <View style={styles.header}>
          {back && <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}
          <View style={{ flex: 1, paddingLeft: back ? 0 : spacing.xxs }}>
            {title && (
              <Text variant={large ? 'title' : 'heading'} accessibilityRole="header" numberOfLines={1}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text variant="caption" color="muted" numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          {right}
        </View>
      )}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {footer && <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm, backgroundColor: p.bg, borderTopColor: p.border }]}>{footer}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.sm, minHeight: 56 },
  content: { paddingHorizontal: spacing.md, gap: spacing.md, paddingTop: spacing.xs },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
});
