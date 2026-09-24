import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { IconButton } from './IconButton';
import { Text } from './Text';

interface Props {
  visible: boolean;
  onClose(): void;
  title?: string;
  children: ReactNode;
  scroll?: boolean;
}

export function BottomSheet({ visible, onClose, title, children, scroll = true }: Props) {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        {visible && (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={[StyleSheet.absoluteFill, { backgroundColor: p.overlay }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close sheet" accessibilityRole="button" />
          </Animated.View>
        )}
        {visible && (
          <Animated.View
            entering={SlideInDown.springify().damping(22).stiffness(220)}
            exiting={SlideOutDown.duration(180)}
            accessibilityViewIsModal
            style={[styles.sheet, { backgroundColor: p.bgElevated, paddingBottom: insets.bottom + spacing.md }]}
          >
            <View style={[styles.handle, { backgroundColor: p.border }]} />
            {title && (
              <View style={styles.header}>
                <Text variant="heading" accessibilityRole="header" style={{ flex: 1 }}>
                  {title}
                </Text>
                <IconButton icon="close" label="Close" onPress={onClose} variant="filled" size={18} />
              </View>
            )}
            {scroll ? (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            ) : (
              <View style={styles.content}>{children}</View>
            )}
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '88%', paddingTop: spacing.xs },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, gap: spacing.md },
});
