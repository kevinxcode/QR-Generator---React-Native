import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { BarcodeView } from '@/components/barcode/BarcodeView';
import { ExportSheet } from '@/components/code/ExportSheet';
import { Button, Card, Chip, ColorField, Input, Screen, SectionHeader, SegmentedControl, Stepper, SwitchRow, Text } from '@/components/ui';
import { getRepos } from '@/db/database';
import { safely } from '@/features/codes/actions';
import { DEFAULT_BARCODE_OPTIONS, renderBarcodeSvg } from '@/services/barcode/BarcodeGeneratorService';
import { BARCODE_FORMATS, barcodeInfo } from '@/services/barcode/formats';
import { validateBarcode } from '@/services/barcode/validators';
import { contrastRatio } from '@/services/scannability/color';
import { notifyDataChanged } from '@/store/data.store';
import { toast } from '@/store/toast.store';
import { spacing } from '@/theme/tokens';
import type { BarcodeFormat, BarcodeOptions } from '@/types/domain';

export default function BarcodeEditor() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ format?: BarcodeFormat; id?: string; value?: string }>();
  const [format, setFormat] = useState<BarcodeFormat>(params.format ?? 'ean13');
  const [value, setValue] = useState(params.value ?? '');
  const [opts, setOpts] = useState<BarcodeOptions>(DEFAULT_BARCODE_OPTIONS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const info = barcodeInfo(format);

  useEffect(() => {
    if (!params.id) return;
    (async () => {
      const { codes, designs } = getRepos();
      const c = await codes.get(params.id!);
      if (!c) return;
      setEditingId(c.id);
      if (BARCODE_FORMATS.some((f) => f.id === c.format)) setFormat(c.format as BarcodeFormat);
      setValue(c.payload);
      setOpts((await designs.getBarcodeOptions(c.id)) ?? DEFAULT_BARCODE_OPTIONS);
    })();
  }, [params.id]);

  const validation = useMemo(() => validateBarcode(format, value), [format, value]);
  const lowContrast = contrastRatio(opts.foregroundColor, opts.backgroundColor) < 4.5;
  const patch = (p: Partial<BarcodeOptions>) => setOpts((o) => ({ ...o, ...p }));

  const save = async () => {
    if (!validation.ok) return toast.error(validation.error);
    setSaving(true);
    const id = await safely(async () => {
      const { codes, designs } = getRepos();
      let codeId = editingId;
      if (codeId) await codes.update(codeId, { payload: validation.value, format, title: `${info.label} ${validation.value}` });
      else codeId = (await codes.create({ kind: 'barcode', format, contentType: 'barcode', payload: validation.value, source: 'generated', title: `${info.label} ${validation.value}` })).id;
      await designs.saveBarcodeOptions(codeId, opts);
      notifyDataChanged();
      return codeId;
    }, 'Could not save barcode.');
    setSaving(false);
    if (id) {
      toast.success(editingId ? 'Barcode updated' : 'Barcode saved');
      router.replace({ pathname: '/code/[id]', params: { id } });
    }
  };

  return (
    <Screen
      title={editingId ? 'Edit barcode' : 'Barcode'}
      back
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button title="Export" icon="share-outline" variant="secondary" flex disabled={!validation.ok} onPress={() => setExportOpen(true)} />
          <Button title="Save" icon="checkmark" flex onPress={save} loading={saving} disabled={!validation.ok} />
        </View>
      }
    >
      <Card style={{ alignItems: 'center', gap: spacing.sm }}>
        {validation.ok ? (
          <BarcodeView format={format} value={validation.value} options={opts} width={width - 80} />
        ) : (
          <View style={{ height: 120, justifyContent: 'center' }}>
            <Text color="muted" align="center">
              {value ? validation.error : `Enter a value to preview your ${info.label}`}
            </Text>
          </View>
        )}
        {validation.ok && validation.hint && (
          <Text variant="caption" color="primary">
            {validation.hint}
          </Text>
        )}
      </Card>

      {!editingId && (
        <>
          <SectionHeader title="Format" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
            {BARCODE_FORMATS.map((f) => (
              <Chip key={f.id} label={f.label} selected={f.id === format} onPress={() => setFormat(f.id)} />
            ))}
          </ScrollView>
        </>
      )}
      <Input
        label={`${info.label} value`}
        placeholder={info.example}
        value={value}
        onChangeText={setValue}
        keyboardType={info.keyboard === 'numeric' ? 'number-pad' : 'default'}
        autoCapitalize={format === 'code39' || format === 'codabar' ? 'characters' : 'none'}
        autoCorrect={false}
        error={value && !validation.ok ? validation.error : undefined}
        hint={`${info.description}. Example: ${info.example}`}
      />

      <SectionHeader title="Appearance" />
      <ColorField label="Bars" value={opts.foregroundColor} onChange={(foregroundColor) => patch({ foregroundColor })} />
      <ColorField label="Background" value={opts.backgroundColor} onChange={(backgroundColor) => patch({ backgroundColor })} />
      {lowContrast && (
        <Text variant="caption" color="warning">
          Low contrast between bars and background. Barcode scanners need dark bars on a light background.
        </Text>
      )}
      <SwitchRow title="Human-readable text" value={opts.showText} onValueChange={(showText) => patch({ showText })} />
      {opts.showText && (
        <SegmentedControl
          options={[{ value: 'bottom', label: 'Text below' }, { value: 'top', label: 'Text above' }]}
          value={opts.textPosition}
          onChange={(textPosition) => patch({ textPosition })}
          accessibilityLabel="Text position"
        />
      )}
      <Stepper label="Margin" value={opts.margin} min={2} max={30} step={2} onChange={(margin) => patch({ margin })} />

      {validation.ok && (
        <ExportSheet
          visible={exportOpen}
          onClose={() => setExportOpen(false)}
          name={`${format}-${validation.value}`}
          allowTransparent={false}
          build={() => renderBarcodeSvg(format, validation.value, opts)}
        />
      )}
    </Screen>
  );
}
