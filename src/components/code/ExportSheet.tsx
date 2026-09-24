import { useState } from 'react';
import { Linking, View } from 'react-native';

import { BottomSheet, Button, Chip, SectionHeader, SwitchRow, Text } from '@/components/ui';
import { createExportFile, EXPORT_SIZES, saveToGallery, shareFile, type ExportFormat, type ExportSize } from '@/services/export/ExportService';
import type { ScannabilityReport } from '@/services/scannability/ScannabilityService';
import { useSettings } from '@/store/settings.store';
import { toast } from '@/store/toast.store';
import { spacing } from '@/theme/tokens';

export interface ExportSource {
  svg: string;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  onClose(): void;
  name: string;
  /** Build the SVG for export; `transparent` toggles the background. */
  build(transparent: boolean): ExportSource;
  allowTransparent?: boolean;
  report?: ScannabilityReport | null;
}

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'svg', label: 'SVG' },
  { value: 'pdf', label: 'PDF' },
];

export function ExportSheet({ visible, onClose, name, build, allowTransparent = true, report }: Props) {
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const [format, setFormat] = useState<ExportFormat>(settings.defaultExportFormat);
  const [size, setSize] = useState<ExportSize>(settings.defaultExportResolution);
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const risky = report?.level === 'risky' && !acknowledged;

  const run = async (mode: 'share' | 'save') => {
    setBusy(mode);
    try {
      const src = build(transparent && format !== 'pdf');
      const uri = await createExportFile({ ...src, format, size, name });
      update({ defaultExportFormat: format, defaultExportResolution: size });
      if (mode === 'save') {
        const r = await saveToGallery(uri);
        if (r === 'denied') {
          toast.error('Allow photo access to save images.');
          Linking.openSettings().catch(() => {});
        } else {
          toast.success('Saved to your gallery');
          onClose();
        }
      } else {
        await shareFile(uri, format, 'Share code');
        onClose();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Export">
      {report?.level === 'risky' && (
        <View style={{ gap: spacing.xs }}>
          <Text color="warning" variant="bodyStrong">
            This design may be hard to scan (score {report.score}).
          </Text>
          {report.warnings.slice(0, 3).map((w) => (
            <Text key={w} variant="caption" color="muted">
              • {w}
            </Text>
          ))}
          {!acknowledged && <Button title="Export anyway" variant="secondary" size="sm" onPress={() => setAcknowledged(true)} />}
        </View>
      )}
      <SectionHeader title="Format" />
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {FORMATS.map((f) => (
          <Chip key={f.value} label={f.label} selected={format === f.value} onPress={() => setFormat(f.value)} />
        ))}
      </View>
      {format !== 'pdf' && (
        <>
          <SectionHeader title={format === 'png' ? 'Resolution (px)' : 'Size (px)'} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {EXPORT_SIZES.map((s) => (
              <Chip key={s} label={String(s)} selected={size === s} onPress={() => setSize(s)} />
            ))}
          </View>
        </>
      )}
      {allowTransparent && format !== 'pdf' && <SwitchRow title="Transparent background" value={transparent} onValueChange={setTransparent} />}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {format === 'png' && <Button title="Save to gallery" icon="download-outline" variant="secondary" flex loading={busy === 'save'} disabled={!!busy || risky} onPress={() => run('save')} />}
        <Button title="Share" icon="share-outline" flex loading={busy === 'share'} disabled={!!busy || risky} onPress={() => run('share')} />
      </View>
      {format !== 'png' && (
        <Text variant="caption" color="faint">
          {format === 'svg' ? 'SVG is a vector format, ideal for print and design tools.' : 'PDF places the code on an A4 page, ready to print.'} Use Share to save it to Files.
        </Text>
      )}
    </BottomSheet>
  );
}
