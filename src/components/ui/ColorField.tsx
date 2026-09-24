import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isHexColor } from '@/services/scannability/color';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Input } from './Input';
import { PressableScale } from './Pressable';
import { Text } from './Text';

const SWATCHES = [
  '#000000', '#1F2937', '#374151', '#6B7280', '#FFFFFF', '#F8FAFC',
  '#0F172A', '#1E3A8A', '#1D4ED8', '#0369A1', '#0E7490', '#0F766E',
  '#14532D', '#166534', '#3F6212', '#854D0E', '#9A3412', '#991B1B',
  '#9D174D', '#86198F', '#5B21B6', '#4338CA', '#7C2D12', '#8A6A1F',
  '#FEF3C7', '#FCE7F3', '#EDE9FE', '#DBEAFE', '#DCFCE7', '#FFF7ED',
];

interface Props {
  label: string;
  value: string;
  onChange(hex: string): void;
}

/** Colour row with a swatch; opens a sheet with presets and hex entry. */
export function ColorField({ label, value, onChange }: Props) {
  const p = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const valid = isHexColor(draft);

  return (
    <>
      <PressableScale
        onPress={() => {
          setDraft(value);
          setOpen(true);
        }}
        accessibilityLabel={`${label}: ${value}. Change color`}
        style={[styles.row, { backgroundColor: p.surfaceAlt }]}
      >
        <View style={[styles.swatch, { backgroundColor: value, borderColor: p.border }]} />
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {label}
        </Text>
        <Text variant="mono" color="muted">
          {value.toUpperCase()}
        </Text>
      </PressableScale>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={styles.grid}>
          {SWATCHES.map((c) => (
            <PressableScale
              key={c}
              onPress={() => setDraft(c)}
              accessibilityLabel={`Color ${c}`}
              accessibilityState={{ selected: draft.toUpperCase() === c }}
              style={[
                styles.cell,
                { backgroundColor: c, borderColor: draft.toUpperCase() === c ? p.primary : p.border, borderWidth: draft.toUpperCase() === c ? 3 : 1 },
              ]}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
          <View style={[styles.preview, { backgroundColor: valid ? draft : 'transparent', borderColor: p.border }]} />
          <View style={{ flex: 1 }}>
            <Input
              label="Hex"
              value={draft}
              onChangeText={(t) => setDraft(t.startsWith('#') ? t : `#${t}`)}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={7}
              error={valid ? undefined : 'Use a hex color like #1D4ED8'}
            />
          </View>
        </View>
        <Button
          title="Apply"
          disabled={!valid}
          onPress={() => {
            onChange(draft.toUpperCase());
            setOpen(false);
          }}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, borderRadius: radius.md, paddingHorizontal: spacing.sm },
  swatch: { width: 28, height: 28, borderRadius: 8, borderWidth: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  cell: { width: 44, height: 44, borderRadius: 12 },
  preview: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, marginBottom: 2 },
});
