import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { elevation, radius } from '@/theme/tokens';

const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  index: ['home', 'home-outline'],
  create: ['add-circle', 'add-circle-outline'],
  scan: ['scan', 'scan'],
  history: ['time', 'time-outline'],
  settings: ['settings', 'settings-outline'],
};

/** Floating tab bar with a prominent centre Scan action. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  if (current === 'scan') return null; // full-screen camera

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.bar, elevation(p, 3), { backgroundColor: p.surfaceGlass, borderColor: p.border }]}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const [on, off] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };
          if (route.name === 'scan') {
            return (
              <PressableScale
                key={route.key}
                haptic
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityLabel="Scan a code"
                style={[styles.fab, { backgroundColor: p.primary, shadowColor: p.primary }]}
              >
                <LinearGradient colors={p.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
                <Ionicons name="scan" size={26} color="#FFFFFF" />
              </PressableScale>
            );
          }
          return (
            <PressableScale
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={styles.item}
            >
              <Ionicons name={focused ? on : off} size={22} color={focused ? p.primary : p.textFaint} />
              <Text variant="caption" color={focused ? 'primary' : 'faint'} style={{ fontSize: 10.5, fontWeight: '700' }} numberOfLines={1}>
                {label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: radius.xl,
    borderWidth: 1,
    height: 66,
    paddingHorizontal: 6,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 52 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
