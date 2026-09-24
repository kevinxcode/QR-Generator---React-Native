import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { PressableScale, Text } from '@/components/ui';
import { eyeBallPath, eyeFramePath, modulePath } from '@/services/qr/shapes';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import type { EyeBallStyle, EyeFrameStyle, ModuleStyle } from '@/types/domain';

// 5x5 sample pattern for body-style previews
const SAMPLE = ['10110', '11011', '01110', '11001', '10111'];

function bodySample(style: ModuleStyle, color: string): string {
  let d = '';
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (SAMPLE[r][c] !== '1') continue;
      const on = (rr: number, cc: number) => SAMPLE[rr]?.[cc] === '1';
      d += modulePath(style, c * 10, r * 10, 10, { top: on(r - 1, c), right: on(r, c + 1), bottom: on(r + 1, c), left: on(r, c - 1) });
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 54 54"><path d="${d}" fill="${color}"/></svg>`;
}

function eyeSample(frame: EyeFrameStyle, ball: EyeBallStyle, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 78 78"><path d="${eyeFramePath(frame, 0, 0, 10, 'tl')}" fill="${color}" fill-rule="evenodd"/><path d="${eyeBallPath(ball, 0, 0, 10)}" fill="${color}"/></svg>`;
}

interface TileProps {
  label: string;
  xml: string;
  selected: boolean;
  onPress(): void;
}

function Tile({ label, xml, selected, onPress }: TileProps) {
  const p = useTheme();
  return (
    <PressableScale
      haptic
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{ width: 78, alignItems: 'center', gap: 6, padding: spacing.xs, borderRadius: radius.md, borderWidth: 2, borderColor: selected ? p.primary : 'transparent', backgroundColor: p.surfaceAlt }}
    >
      <SvgXml xml={xml} width={40} height={40} />
      <Text variant="caption" style={{ fontSize: 11, fontWeight: selected ? '700' : '500' }} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

function Row<T extends string>({ items, render }: { items: { value: T; label: string }[]; render(i: { value: T; label: string }): React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
      {items.map(render)}
    </ScrollView>
  );
}

export const BODY_STYLES: { value: ModuleStyle; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'dots', label: 'Dots' },
  { value: 'circle', label: 'Circle' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'softSquare', label: 'Soft' },
  { value: 'classy', label: 'Classy' },
  { value: 'extraRounded', label: 'Extra round' },
];
export const EYE_FRAMES: { value: EyeFrameStyle; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'circle', label: 'Circle' },
  { value: 'extraRounded', label: 'Extra round' },
  { value: 'leaf', label: 'Leaf' },
  { value: 'diamond', label: 'Diamond' },
];
export const EYE_BALLS: { value: EyeBallStyle; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'circle', label: 'Circle' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'diamond', label: 'Diamond' },
];

export function BodyStylePicker({ value, onChange }: { value: ModuleStyle; onChange(v: ModuleStyle): void }) {
  const p = useTheme();
  const xmls = useMemo(() => Object.fromEntries(BODY_STYLES.map((s) => [s.value, bodySample(s.value, p.text)])), [p.text]);
  return <Row items={BODY_STYLES} render={(s) => <Tile key={s.value} label={s.label} xml={xmls[s.value]} selected={value === s.value} onPress={() => onChange(s.value)} />} />;
}

export function EyeFramePicker({ value, ball, onChange }: { value: EyeFrameStyle; ball: EyeBallStyle; onChange(v: EyeFrameStyle): void }) {
  const p = useTheme();
  return <Row items={EYE_FRAMES} render={(s) => <Tile key={s.value} label={s.label} xml={eyeSample(s.value, ball, p.text)} selected={value === s.value} onPress={() => onChange(s.value)} />} />;
}

export function EyeBallPicker({ value, frame, onChange }: { value: EyeBallStyle; frame: EyeFrameStyle; onChange(v: EyeBallStyle): void }) {
  const p = useTheme();
  return (
    <View>
      <Row items={EYE_BALLS} render={(s) => <Tile key={s.value} label={s.label} xml={eyeSample(frame, s.value, p.text)} selected={value === s.value} onPress={() => onChange(s.value)} />} />
    </View>
  );
}
