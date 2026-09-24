import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

interface Props {
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  color: string;
  /** flash the frame on a successful scan */
  pulseKey: number;
}

const DIM = 'rgba(0,0,0,0.58)';
const CORNER = 30;
const STROKE = 4;

/** Darkened surround, corner guides, animated scan line and success pulse. */
export const ScannerOverlay = memo(function ScannerOverlay({ width, height, frameWidth, frameHeight, color, pulseKey }: Props) {
  const top = (height - frameHeight) / 2 - 40;
  const left = (width - frameWidth) / 2;
  const line = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    line.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [line]);

  useEffect(() => {
    if (pulseKey === 0) return;
    pulse.set(withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 450 })));
  }, [pulseKey, pulse]);

  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: line.get() * (frameHeight - 8) }] }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.get(), transform: [{ scale: 1 + pulse.get() * 0.04 }] }));

  const corner = (pos: object, borders: object) => <View style={[styles.corner, { borderColor: color }, pos, borders]} />;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: top, backgroundColor: DIM }} />
      <View style={{ position: 'absolute', top: top + frameHeight, left: 0, right: 0, bottom: 0, backgroundColor: DIM }} />
      <View style={{ position: 'absolute', top, left: 0, width: left, height: frameHeight, backgroundColor: DIM }} />
      <View style={{ position: 'absolute', top, right: 0, width: left, height: frameHeight, backgroundColor: DIM }} />

      <View style={{ position: 'absolute', top, left, width: frameWidth, height: frameHeight, overflow: 'hidden', borderRadius: 18 }}>
        <Animated.View style={[styles.line, { backgroundColor: color, shadowColor: color }, lineStyle]} />
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 18, borderWidth: 3, borderColor: color, backgroundColor: 'rgba(255,255,255,0.08)' }, pulseStyle]} />
      </View>
      <View style={{ position: 'absolute', top: top - STROKE / 2, left: left - STROKE / 2, width: frameWidth + STROKE, height: frameHeight + STROKE }}>
        {corner({ top: 0, left: 0 }, { borderTopWidth: STROKE, borderLeftWidth: STROKE, borderTopLeftRadius: 20 })}
        {corner({ top: 0, right: 0 }, { borderTopWidth: STROKE, borderRightWidth: STROKE, borderTopRightRadius: 20 })}
        {corner({ bottom: 0, left: 0 }, { borderBottomWidth: STROKE, borderLeftWidth: STROKE, borderBottomLeftRadius: 20 })}
        {corner({ bottom: 0, right: 0 }, { borderBottomWidth: STROKE, borderRightWidth: STROKE, borderBottomRightRadius: 20 })}
      </View>
    </View>
  );
});

export function frameTop(height: number, frameHeight: number) {
  return (height - frameHeight) / 2 - 40;
}

const styles = StyleSheet.create({
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  line: { position: 'absolute', left: 12, right: 12, top: 4, height: 2.5, borderRadius: 2, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
});
