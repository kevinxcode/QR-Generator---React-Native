import { ScrollView, View } from 'react-native';

import { Chip, ColorField, Input, PressableScale, SectionHeader, SegmentedControl, Stepper, Text } from '@/components/ui';
import { FRAME_LABELS } from '@/services/qr/QRGeneratorService';
import { applyPalette, applyTemplate, BUILTIN_TEMPLATES, PALETTES, type Template } from '@/services/qr/templates';
import { useGenerator } from '@/store/generator.store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import type { FrameLayout, FrameType, GradientType } from '@/types/domain';

import { BodyStylePicker, EyeBallPicker, EyeFramePicker } from './StyleTiles';

export function StylePanel({ userTemplates, onDeleteTemplate }: { userTemplates: Template[]; onDeleteTemplate(t: Template): void }) {
  const { design, patchDesign, setDesign } = useGenerator();
  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title="Templates" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
        {[...userTemplates, ...BUILTIN_TEMPLATES].map((t) => (
          <Chip
            key={t.id}
            label={t.name}
            icon={t.custom ? 'bookmark' : undefined}
            onPress={() => setDesign(applyTemplate(design, t.design))}
            onRemove={t.custom ? () => onDeleteTemplate(t) : undefined}
          />
        ))}
      </ScrollView>
      <SectionHeader title="Body pattern" />
      <BodyStylePicker value={design.bodyStyle} onChange={(bodyStyle) => patchDesign({ bodyStyle })} />
      <SectionHeader title="Corner frame" />
      <EyeFramePicker value={design.eyeFrameStyle} ball={design.eyeStyle} onChange={(eyeFrameStyle) => patchDesign({ eyeFrameStyle })} />
      <SectionHeader title="Corner eye" />
      <EyeBallPicker value={design.eyeStyle} frame={design.eyeFrameStyle} onChange={(eyeStyle) => patchDesign({ eyeStyle })} />
    </View>
  );
}

const FILLS: { value: GradientType; label: string }[] = [
  { value: 'none', label: 'Solid' },
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
];

export function ColorPanel() {
  const p = useTheme();
  const { design, patchDesign, setDesign } = useGenerator();
  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title="Palettes" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
        {PALETTES.map((pal) => (
          <PressableScale
            key={pal.id}
            onPress={() => setDesign(applyPalette(design, pal, design.gradientType !== 'none'))}
            accessibilityLabel={`${pal.name} palette`}
            style={{ alignItems: 'center', gap: 4, padding: 6, borderRadius: radius.md, backgroundColor: p.surfaceAlt, width: 76 }}
          >
            <View style={{ flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: p.border }}>
              <View style={{ width: 22, height: 30, backgroundColor: pal.gradient?.[0] ?? pal.fg }} />
              <View style={{ width: 22, height: 30, backgroundColor: pal.eye }} />
              <View style={{ width: 22, height: 30, backgroundColor: pal.bg }} />
            </View>
            <Text variant="caption" style={{ fontSize: 11 }} numberOfLines={1}>
              {pal.name}
            </Text>
          </PressableScale>
        ))}
      </ScrollView>
      <SectionHeader title="Foreground fill" />
      <SegmentedControl options={FILLS} value={design.gradientType} onChange={(gradientType) => patchDesign({ gradientType })} accessibilityLabel="Fill type" />
      {design.gradientType === 'none' ? (
        <ColorField label="Foreground" value={design.foregroundColor} onChange={(foregroundColor) => patchDesign({ foregroundColor })} />
      ) : (
        <>
          <ColorField label="Gradient start" value={design.gradientStart} onChange={(gradientStart) => patchDesign({ gradientStart })} />
          <ColorField label="Gradient end" value={design.gradientEnd} onChange={(gradientEnd) => patchDesign({ gradientEnd })} />
          {design.gradientType === 'linear' && (
            <Stepper label="Direction" value={design.gradientAngle} min={0} max={315} step={45} format={(v) => `${v}°`} onChange={(gradientAngle) => patchDesign({ gradientAngle })} />
          )}
        </>
      )}
      <ColorField label="Background" value={design.backgroundColor} onChange={(backgroundColor) => patchDesign({ backgroundColor })} />
      <ColorField label="Corner frame color" value={design.cornerColor} onChange={(cornerColor) => patchDesign({ cornerColor })} />
      <ColorField label="Corner eye color" value={design.eyeColor} onChange={(eyeColor) => patchDesign({ eyeColor })} />
    </View>
  );
}

const FRAME_TYPES: FrameType[] = ['none', 'scanMe', 'open', 'visit', 'connect', 'menu', 'follow', 'custom'];
const LAYOUTS: { value: FrameLayout; label: string }[] = [
  { value: 'bottom', label: 'Bottom caption' },
  { value: 'top', label: 'Top caption' },
  { value: 'card', label: 'Border card' },
  { value: 'bubble', label: 'Bubble' },
  { value: 'badge', label: 'Badge' },
  { value: 'minimal', label: 'Minimal' },
];

export function FramePanel() {
  const { design, patchDesign } = useGenerator();
  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title="Call to action" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {FRAME_TYPES.map((t) => (
          <Chip
            key={t}
            label={t === 'none' ? 'None' : t === 'custom' ? 'Custom' : FRAME_LABELS[t]}
            selected={design.frameType === t}
            onPress={() => patchDesign({ frameType: t, frameText: t === 'custom' ? design.frameText : '' })}
          />
        ))}
      </View>
      {design.frameType !== 'none' && (
        <>
          <Input label="Text" placeholder={FRAME_LABELS[design.frameType]} value={design.frameText} onChangeText={(frameText) => patchDesign({ frameText: frameText.slice(0, 28) })} maxLength={28} autoCapitalize="characters" hint="Leave empty to use the default label" />
          <SectionHeader title="Layout" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {LAYOUTS.map((l) => (
              <Chip key={l.value} label={l.label} selected={design.frameLayout === l.value} onPress={() => patchDesign({ frameLayout: l.value })} />
            ))}
          </View>
          <Stepper label="Font size" value={design.frameFontSize} min={12} max={32} step={2} onChange={(frameFontSize) => patchDesign({ frameFontSize })} />
          <ColorField label="Frame color" value={design.frameColor} onChange={(frameColor) => patchDesign({ frameColor })} />
          {['bottom', 'top', 'bubble', 'badge'].includes(design.frameLayout) && (
            <ColorField label="Text color" value={design.frameTextColor} onChange={(frameTextColor) => patchDesign({ frameTextColor })} />
          )}
        </>
      )}
    </View>
  );
}
