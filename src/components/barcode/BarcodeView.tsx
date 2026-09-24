import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { Text } from '@/components/ui';
import { renderBarcodeSvg } from '@/services/barcode/BarcodeGeneratorService';
import { useTheme } from '@/theme/ThemeProvider';
import type { BarcodeFormat, BarcodeOptions } from '@/types/domain';

interface Props {
  format: BarcodeFormat;
  value: string;
  options: BarcodeOptions;
  width: number;
}

export const BarcodeView = memo(function BarcodeView({ format, value, options, width }: Props) {
  const p = useTheme();
  const result = useMemo(() => {
    try {
      return { r: renderBarcodeSvg(format, value, options), error: null };
    } catch (e) {
      return { r: null, error: e instanceof Error ? e.message : 'Invalid barcode' };
    }
  }, [format, value, options]);

  if (!result.r) {
    return (
      <View style={{ width, height: width * 0.5, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: p.surfaceAlt, padding: 16 }}>
        <Text color="muted" variant="caption" align="center">
          {result.error}
        </Text>
      </View>
    );
  }
  const h = Math.min(width * 0.7, (width * result.r.height) / result.r.width);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Barcode ${value}`}>
      <SvgXml xml={result.r.svg} width={width} height={h} />
    </View>
  );
});
