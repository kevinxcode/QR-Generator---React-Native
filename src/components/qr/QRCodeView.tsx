import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { Text } from '@/components/ui';
import { renderQrSvg, type QRRenderResult } from '@/services/qr/QRGeneratorService';
import { useTheme } from '@/theme/ThemeProvider';
import type { QRDesign } from '@/types/domain';

interface Props {
  payload: string;
  design: QRDesign;
  logoHref?: string | null;
  size: number;
  onRendered?: (r: QRRenderResult | null, error: string | null) => void;
  accessibilityLabel?: string;
}

/** Renders a styled QR code (pure SVG) at the given display width. */
export const QRCodeView = memo(function QRCodeView({ payload, design, logoHref, size, accessibilityLabel }: Props) {
  const p = useTheme();
  const result = useMemo(() => {
    try {
      return { r: renderQrSvg({ payload, design, logoHref }), error: null as string | null };
    } catch (e) {
      return { r: null, error: e instanceof Error ? e.message : 'Could not render QR code.' };
    }
  }, [payload, design, logoHref]);

  if (!result.r) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, backgroundColor: p.surfaceAlt }}>
        <Text color="muted" align="center" variant="caption">
          {result.error}
        </Text>
      </View>
    );
  }
  const h = (size * result.r.height) / result.r.width;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel ?? 'QR code preview'}>
      <SvgXml xml={result.r.svg} width={size} height={h} />
    </View>
  );
});
