import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Button, Card, SectionHeader, SegmentedControl, Stepper, SwitchRow, Text } from '@/components/ui';
import type { ScannabilityReport } from '@/services/scannability/ScannabilityService';
import { useGenerator } from '@/store/generator.store';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import type { ErrorCorrection } from '@/types/domain';

const ECC: { value: ErrorCorrection; label: string }[] = [
  { value: 'L', label: 'L · 7%' },
  { value: 'M', label: 'M · 15%' },
  { value: 'Q', label: 'Q · 25%' },
  { value: 'H', label: 'H · 30%' },
];

export function AdvancedPanel({ report, onSaveTemplate }: { report: ScannabilityReport | null; onSaveTemplate(): void }) {
  const { design, patchDesign } = useGenerator();
  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title="Error correction" />
      <SegmentedControl options={ECC} value={design.errorCorrection} onChange={(errorCorrection) => patchDesign({ errorCorrection })} accessibilityLabel="Error correction level" />
      <Text variant="caption" color="muted">
        Higher levels survive damage and logos better, but make the code denser. Use H when adding a logo.
      </Text>
      <Stepper label="Quiet zone (margin)" value={design.quietZone} min={0} max={10} onChange={(quietZone) => patchDesign({ quietZone })} format={(v) => `${v} mod`} />
      <SwitchRow title="Transparent background" subtitle="Scannability then depends on the surface behind it" value={design.transparentBackground} onValueChange={(transparentBackground) => patchDesign({ transparentBackground })} />
      <SectionHeader title="Scannability" />
      {report && <ScannabilityDetails report={report} />}
      <Button title="Save design as template" icon="bookmark-outline" variant="tonal" onPress={onSaveTemplate} />
    </View>
  );
}

export function ScannabilityDetails({ report }: { report: ScannabilityReport }) {
  const p = useTheme();
  const color = report.level === 'excellent' ? p.success : report.level === 'good' ? p.primary : p.danger;
  return (
    <Card tone="alt" style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text variant="title" color={color}>
          {report.score}
        </Text>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" style={{ textTransform: 'capitalize' }}>
            {report.level}
          </Text>
          <Text variant="caption" color="muted">
            Contrast {report.contrast.toFixed(1)}:1
          </Text>
        </View>
      </View>
      {report.warnings.length === 0 && report.recommendations.length === 0 ? (
        <Text variant="caption" color="muted">
          Looks great. This design should scan reliably.
        </Text>
      ) : null}
      {report.warnings.map((w) => (
        <View key={w} style={{ flexDirection: 'row', gap: 6 }}>
          <Ionicons name="warning-outline" size={15} color={p.warning} />
          <Text variant="caption" style={{ flex: 1 }}>
            {w}
          </Text>
        </View>
      ))}
      {report.recommendations.map((r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 6 }}>
          <Ionicons name="bulb-outline" size={15} color={p.primary} />
          <Text variant="caption" color="muted" style={{ flex: 1 }}>
            {r}
          </Text>
        </View>
      ))}
    </Card>
  );
}
