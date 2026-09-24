import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Share, StyleSheet, useWindowDimensions, View } from 'react-native';

import { BarcodeView } from '@/components/barcode/BarcodeView';
import { ExportSheet } from '@/components/code/ExportSheet';
import { QRCodeView } from '@/components/qr/QRCodeView';
import { Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, Screen, SectionHeader, Skeleton, Text } from '@/components/ui';
import { getRepos } from '@/db/database';
import { deleteCode, safely, toggleFavorite } from '@/features/codes/actions';
import { CodeMetaEditor } from '@/features/codes/CodeMetaEditor';
import { startQr } from '@/features/generator/startCreate';
import { copyText } from '@/features/scanner/scanActions';
import { useAsync } from '@/hooks/useAsync';
import { DEFAULT_BARCODE_OPTIONS, renderBarcodeSvg } from '@/services/barcode/BarcodeGeneratorService';
import { BARCODE_FORMATS, formatLabel } from '@/services/barcode/formats';
import { LocalFileService } from '@/services/files/LocalFileService';
import { DEFAULT_DESIGN, renderQrSvg } from '@/services/qr/QRGeneratorService';
import { parseScan } from '@/services/scanner/ScanResultParser';
import { useGenerator } from '@/store/generator.store';
import { toast } from '@/store/toast.store';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import type { BarcodeFormat } from '@/types/domain';
import { fullDate, typeMeta } from '@/utils/format';

export default function CodeDetail() {
  const p = useTheme();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data, loading } = useAsync(async () => {
    const { codes, designs } = getRepos();
    const code = await codes.get(id);
    if (!code) return null;
    const design = code.kind === 'qr' ? await designs.getQrDesign(id) : null;
    const barcodeOpts = code.kind === 'barcode' ? await designs.getBarcodeOptions(id) : null;
    const logoHref = design?.logoUri ? await LocalFileService.toDataUri(design.logoUri) : null;
    return { code, design, barcodeOpts, logoHref, logoMissing: !!design?.logoUri && !logoHref };
  }, [id]);

  const isBarcode = !!data && BARCODE_FORMATS.some((f) => f.id === data.code.format);
  const parsed = useMemo(() => (data ? parseScan(data.code.payload, data.code.format) : null), [data]);

  if (loading && !data) {
    return (
      <Screen title="Details" back>
        <Skeleton height={260} />
        <Skeleton height={120} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen title="Details" back>
        <EmptyState icon="alert-circle-outline" title="Code not found" message="It may have been deleted." cta="Go back" onCta={() => router.back()} />
      </Screen>
    );
  }

  const { code, design, barcodeOpts, logoHref, logoMissing } = data;
  const meta = typeMeta(code.contentType);
  const generated = code.source === 'generated';
  const qrDesign = design ?? DEFAULT_DESIGN;
  const canPreview = code.format === 'qr' || isBarcode;

  const buildExport = (transparent: boolean) =>
    isBarcode
      ? renderBarcodeSvg(code.format as BarcodeFormat, code.payload, barcodeOpts ?? DEFAULT_BARCODE_OPTIONS)
      : renderQrSvg({ payload: code.payload, design: { ...qrDesign, transparentBackground: transparent || qrDesign.transparentBackground }, logoHref });

  const regenerate = () => {
    if (isBarcode) return router.push({ pathname: '/create/barcode', params: { format: code.format, value: code.payload } });
    const type = parsed?.type === 'url' ? 'url' : 'text';
    startQr(type).then(() => useGenerator.getState().setValues(type === 'url' ? { url: code.payload } : { text: code.payload }));
  };

  const edit = () => (isBarcode ? router.push({ pathname: '/create/barcode', params: { id: code.id } }) : router.push({ pathname: '/create/qr', params: { id: code.id } }));

  return (
    <Screen
      title={meta.label}
      subtitle={generated ? 'Created by you' : code.source === 'scanned' ? 'Scanned' : 'Imported'}
      back
      right={
        <IconButton
          icon={code.isFavorite ? 'star' : 'star-outline'}
          color={code.isFavorite ? '#F5B301' : undefined}
          label={code.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          onPress={() => safely(() => toggleFavorite(code))}
        />
      }
    >
      <Card style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg }}>
        {code.format === 'qr' ? (
          <QRCodeView payload={code.payload} design={qrDesign} logoHref={logoHref} size={Math.min(240, width - 96)} />
        ) : isBarcode ? (
          <BarcodeView format={code.format as BarcodeFormat} value={code.payload} options={barcodeOpts ?? DEFAULT_BARCODE_OPTIONS} width={width - 96} />
        ) : (
          <View style={{ alignItems: 'center', gap: spacing.xs, padding: spacing.lg }}>
            <Ionicons name="grid-outline" size={48} color={p.textFaint} />
            <Text variant="caption" color="muted" align="center">
              Preview isn’t available for {formatLabel(code.format)}. The content is shown below.
            </Text>
          </View>
        )}
        {logoMissing && (
          <Text variant="caption" color="warning" align="center">
            The logo file for this design is missing, so it is shown without a logo.
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <Badge label={formatLabel(code.format)} />
          <Badge label={meta.label} tone="primary" icon={meta.icon} />
        </View>
      </Card>

      <View style={styles.actions}>
        <Button title="Copy" icon="copy-outline" variant="tonal" size="sm" flex onPress={() => copyText(code.payload)} />
        <Button title="Share" icon="share-outline" variant="tonal" size="sm" flex onPress={() => Share.share({ message: code.payload })} />
        {canPreview && <Button title="Export" icon="image-outline" variant="tonal" size="sm" flex onPress={() => setExportOpen(true)} />}
      </View>
      <View style={styles.actions}>
        {generated ? (
          <Button title={code.kind === 'qr' ? 'Edit design' : 'Edit'} icon="color-palette-outline" variant="secondary" size="sm" flex onPress={edit} />
        ) : (
          <Button title="Smart actions" icon="flash-outline" variant="secondary" size="sm" flex onPress={() => router.push({ pathname: '/scan/result', params: { data: code.payload, format: code.format, id: code.id, from: 'history' } })} />
        )}
        <Button title="Regenerate" icon="refresh-outline" variant="secondary" size="sm" flex onPress={regenerate} />
        <Button title="Delete" icon="trash-outline" variant="secondary" size="sm" flex onPress={() => setConfirmDelete(true)} />
      </View>

      <SectionHeader title="Content" />
      <Card tone="alt">
        <Text selectable variant={code.payload.length > 120 ? 'caption' : 'body'} style={{ fontFamily: 'monospace' }}>
          {code.payload}
        </Text>
      </Card>

      <SectionHeader title="Info" />
      <Card style={{ gap: spacing.xs }}>
        <Row label="Type" value={meta.label} />
        <Row label="Format" value={formatLabel(code.format)} />
        <Row label={generated ? 'Created' : 'Scanned'} value={fullDate(code.createdAt)} />
        {code.updatedAt !== code.createdAt && <Row label="Updated" value={fullDate(code.updatedAt)} />}
      </Card>

      <CodeMetaEditor code={code} />

      {canPreview && <ExportSheet visible={exportOpen} onClose={() => setExportOpen(false)} name={`${code.contentType}-${code.id.slice(0, 6)}`} allowTransparent={!isBarcode} build={buildExport} />}
      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this code?"
        message="It will be permanently removed from this device."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          if (await safely(() => deleteCode(code))) {
            toast.success('Deleted');
            router.back();
          }
        }}
      />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text variant="caption" style={{ fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.xs },
});
