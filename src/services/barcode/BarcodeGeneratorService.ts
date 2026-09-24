import { toSVG } from 'bwip-js/generic';

import type { BarcodeFormat, BarcodeOptions } from '@/types/domain';

import { barcodeInfo } from './formats';
import { validateBarcode } from './validators';

export const DEFAULT_BARCODE_OPTIONS: BarcodeOptions = {
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF',
  showText: true,
  textPosition: 'bottom',
  margin: 10,
};

const hex = (c: string) => c.replace('#', '').slice(0, 6).toUpperCase();

export interface BarcodeSvg {
  svg: string;
  width: number;
  height: number;
  value: string;
}

/** Render a validated barcode to an SVG string. Throws with a friendly message on invalid input. */
export function renderBarcodeSvg(format: BarcodeFormat, input: string, opts: BarcodeOptions = DEFAULT_BARCODE_OPTIONS): BarcodeSvg {
  const v = validateBarcode(format, input);
  if (!v.ok) throw new Error(v.error);
  const info = barcodeInfo(format);
  // For GS1 formats bwip-js expects the full value including check digit.
  const svg = toSVG({
    bcid: info.bcid,
    text: v.value,
    scale: 3,
    height: 14,
    includetext: opts.showText,
    textxalign: 'center',
    textyalign: opts.textPosition === 'top' ? 'above' : 'below',
    barcolor: hex(opts.foregroundColor),
    textcolor: hex(opts.foregroundColor),
    backgroundcolor: hex(opts.backgroundColor),
    paddingwidth: opts.margin,
    paddingheight: opts.margin,
  });
  const m = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg);
  const width = m ? Number(m[1]) : 300;
  const height = m ? Number(m[2]) : 150;
  const sized = /<svg[^>]*\swidth=/.test(svg) ? svg : svg.replace('<svg ', `<svg width="${width}" height="${height}" `);
  return { svg: sized, width, height, value: v.value };
}
