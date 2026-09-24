import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExportSheet } from '@/components/code/ExportSheet';
import { QRCodeView } from '@/components/qr/QRCodeView';
import { Badge, BottomSheet, Button, IconButton, Input, PressableScale, SegmentedControl, Skeleton, Text } from '@/components/ui';
import { getRepos } from '@/db/database';
import { safely } from '@/features/codes/actions';
import { saveQr, validateDraft } from '@/features/generator/saveQr';
import { AdvancedPanel, ScannabilityDetails } from '@/features/generator/studio/AdvancedPanel';
import { ContentPanel } from '@/features/generator/studio/ContentPanel';
import { ColorPanel, FramePanel, StylePanel } from '@/features/generator/studio/DesignPanels';
import { LogoPanel } from '@/features/generator/studio/LogoPanel';
import { useAsync } from '@/hooks/useAsync';
import { LocalFileService } from '@/services/files/LocalFileService';
import { contentTypeDef } from '@/services/qr/contentTypes';
import { renderQrSvg } from '@/services/qr/QRGeneratorService';
import { assessScannability } from '@/services/scannability/ScannabilityService';
import { notifyDataChanged } from '@/store/data.store';
import { useGenerator } from '@/store/generator.store';
import { toast } from '@/store/toast.store';
import { useTheme } from '@/theme/ThemeProvider';
import { elevation, radius, spacing } from '@/theme/tokens';
import type { QRContentType } from '@/types/domain';

type Tab = 'content' | 'style' | 'color' | 'logo' | 'frame' | 'advanced';
const TABS: { value: Tab; label: string }[] = [
  { value: 'content', label: 'Content' },
  { value: 'style', label: 'Style' },
  { value: 'color', label: 'Color' },
  { value: 'logo', label: 'Logo' },
  { value: 'frame', label: 'Frame' },
  { value: 'advanced', label: 'Advanced' },
];

export default function QRStudio() {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; fromDraft?: string; tab?: Tab }>();
  const g = useGenerator();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'content');
  const [loading, setLoading] = useState(!!params.id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplName, setTplName] = useState('');
  const templates = useAsync(() => getRepos().templates.list(), []);

  // Load an existing code for "Edit / Edit Design".
  useEffect(() => {
    if (!params.id) return;
    (async () => {
      try {
        const { codes, designs } = getRepos();
        const code = await codes.get(params.id!);
        const design = await designs.getQrDesign(params.id!);
        if (!code || !design) throw new Error('This code can no longer be edited.');
        let values: Record<string, unknown> = {};
        try {
          values = code.formData ? (JSON.parse(code.formData) as Record<string, unknown>) : {};
        } catch {
          values = {};
        }
        const type = (contentTypeDef(code.contentType) ? code.contentType : 'text') as QRContentType;
        if (!code.formData && type === 'text') values = { text: code.payload };
        g.load({ id: code.id, type, values, design });
        if (design.logoUri) {
          const href = await LocalFileService.toDataUri(design.logoUri);
          if (!href) {
            toast.error('The logo file is missing. It has been removed from this design.');
            g.patchDesign({ logoUri: null });
          }
          g.setLogoHref(href);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not open this code.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const validation = useMemo(() => validateDraft(g.type, g.values), [g.type, g.values]);
  const previewPayload = validation.ok ? validation.payload : 'https://qraft.app';
  const render = useMemo(() => {
    try {
      return renderQrSvg({ payload: previewPayload, design: g.design, logoHref: g.logoHref });
    } catch {
      return null;
    }
  }, [previewPayload, g.design, g.logoHref]);
  const report = useMemo(() => (render ? assessScannability(g.design, render.logoCoverage) : null), [render, g.design]);

  const requireValid = () => {
    if (!validation.ok) {
      setErrors(validation.errors);
      setTab('content');
      toast.error('Please complete the content first.');
      return null;
    }
    setErrors({});
    return validation.payload;
  };

  const onSave = async () => {
    const payload = requireValid();
    if (!payload) return;
    setSaving(true);
    const id = await safely(() => saveQr({ editingId: g.editingId, type: g.type, values: g.values, design: g.design, payload }), 'Could not save the QR code.');
    setSaving(false);
    if (id) {
      toast.success(g.editingId ? 'Changes saved' : 'QR code saved');
      router.replace({ pathname: '/code/[id]', params: { id } });
    }
  };

  const saveTemplate = async () => {
    const t = await safely(() => getRepos().templates.save(tplName || 'My template', g.design));
    if (t) {
      notifyDataChanged();
      toast.success('Template saved');
      setTplOpen(false);
    }
  };

  const userTemplates = (templates.data ?? []).map((t) => ({ id: t.id, name: t.name, design: t.design, custom: true }));
  const levelTone = report?.level === 'excellent' ? 'success' : report?.level === 'good' ? 'primary' : 'danger';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <Text variant="heading" style={{ flex: 1 }}>
          {g.editingId ? 'Edit QR code' : 'QR Studio'}
        </Text>
        <Button title="Save" size="sm" onPress={onSave} loading={saving} />
      </View>

      <View style={[styles.previewWrap, { backgroundColor: p.surface, borderColor: p.border }, elevation(p, 1)]}>
        {loading ? (
          <Skeleton height={190} style={{ width: 190 }} />
        ) : (
          <Animated.View entering={FadeIn} style={[styles.previewBox, { backgroundColor: g.design.transparentBackground ? p.surfaceAlt : 'transparent' }]}>
            <QRCodeView payload={previewPayload} design={g.design} logoHref={g.logoHref} size={176} accessibilityLabel="Live QR preview" />
          </Animated.View>
        )}
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="label" color="faint">
            {contentTypeDef(g.type)?.label}
          </Text>
          {!validation.ok && (
            <Text variant="caption" color="muted">
              Preview shows a sample until content is complete.
            </Text>
          )}
          {report && (
            <PressableScale onPress={() => setScoreOpen(true)} accessibilityLabel={`Scannability ${report.level}, score ${report.score}. Show details`}>
              <Badge label={`${report.level[0].toUpperCase()}${report.level.slice(1)} · ${report.score}`} tone={levelTone} icon={report.level === 'risky' ? 'warning' : 'checkmark-circle'} />
            </PressableScale>
          )}
          <Button title="Export" icon="share-outline" size="sm" variant="tonal" onPress={() => requireValid() && setExportOpen(true)} />
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}>
        <SegmentedControl options={TABS} value={tab} onChange={setTab} scrollable accessibilityLabel="Studio sections" />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {tab === 'content' && <ContentPanel errors={errors} lockType={!!g.editingId} />}
        {tab === 'style' && (
          <StylePanel
            userTemplates={userTemplates}
            onDeleteTemplate={async (t) => {
              await safely(() => getRepos().templates.delete(t.id));
              notifyDataChanged();
            }}
          />
        )}
        {tab === 'color' && <ColorPanel />}
        {tab === 'logo' && <LogoPanel />}
        {tab === 'frame' && <FramePanel />}
        {tab === 'advanced' && <AdvancedPanel report={report} onSaveTemplate={() => setTplOpen(true)} />}
      </ScrollView>

      {render && (
        <ExportSheet
          visible={exportOpen}
          onClose={() => setExportOpen(false)}
          name={`qr-${g.type}`}
          report={report}
          build={(transparent) => renderQrSvg({ payload: previewPayload, design: { ...g.design, transparentBackground: transparent || g.design.transparentBackground }, logoHref: g.logoHref })}
        />
      )}
      <BottomSheet visible={scoreOpen} onClose={() => setScoreOpen(false)} title="Scannability">
        {report && <ScannabilityDetails report={report} />}
      </BottomSheet>
      <BottomSheet visible={tplOpen} onClose={() => setTplOpen(false)} title="Save as template">
        <Input label="Template name" value={tplName} onChangeText={setTplName} placeholder="My brand" autoFocus />
        <Text variant="caption" color="muted">
          Templates keep style, colors and frame, but not the logo.
        </Text>
        <Button title="Save template" onPress={saveTemplate} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingRight: spacing.md, minHeight: 56 },
  previewWrap: { marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderRadius: radius.xl, borderWidth: 1 },
  previewBox: { padding: 4, borderRadius: radius.md },
});
