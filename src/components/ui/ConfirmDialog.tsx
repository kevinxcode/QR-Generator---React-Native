import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { Button } from './Button';
import { Text } from './Text';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

/** Modal confirmation used before every destructive action. */
export function ConfirmDialog({ visible, title, message, confirmLabel = 'Confirm', destructive, loading, onConfirm, onCancel }: Props) {
  const p = useTheme();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      {visible && (
        <Animated.View entering={FadeIn.duration(150)} style={[styles.backdrop, { backgroundColor: p.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Cancel" />
          <Animated.View entering={ZoomIn.springify().damping(18)} accessibilityViewIsModal style={[styles.box, { backgroundColor: p.bgElevated }]}>
            <Text variant="heading" accessibilityRole="header">
              {title}
            </Text>
            <Text color="muted">{message}</Text>
            <View style={styles.row}>
              <Button title="Cancel" variant="secondary" onPress={onCancel} flex />
              <Button title={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} loading={loading} flex />
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  box: { width: '100%', maxWidth: 400, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
