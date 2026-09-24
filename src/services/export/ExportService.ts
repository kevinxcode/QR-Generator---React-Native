import * as MediaLibrary from 'expo-media-library/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { LocalFileService } from '@/services/files/LocalFileService';

import { renderSvgToPng } from './PngRenderHost';

export type ExportFormat = 'png' | 'svg' | 'pdf';
export const EXPORT_SIZES = [256, 512, 1024, 2048, 4096] as const;
export type ExportSize = (typeof EXPORT_SIZES)[number];

const MIME: Record<ExportFormat, string> = { png: 'image/png', svg: 'image/svg+xml', pdf: 'application/pdf' };

function safeName(base: string): string {
  const clean = base.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'qraft';
  return `${clean}-${Date.now()}`;
}

export interface ExportRequest {
  svg: string;
  /** intrinsic SVG size (user units) to keep aspect ratio */
  width: number;
  height: number;
  format: ExportFormat;
  /** target pixel width for PNG / points for PDF */
  size: ExportSize;
  name: string;
}

/** Produce a local file for the request; returns its file:// URI. */
export async function createExportFile(req: ExportRequest): Promise<string> {
  const name = safeName(req.name);
  const ratio = req.height / req.width;
  switch (req.format) {
    case 'svg': {
      const sized = req.svg.replace(/width="[\d.]+" height="[\d.]+"/, `width="${req.size}" height="${Math.round(req.size * ratio)}"`);
      return LocalFileService.writeText('exports', `${name}.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n${sized}`);
    }
    case 'png': {
      const b64 = await renderSvgToPng(req.svg, req.size, req.size * ratio);
      return LocalFileService.writeBase64('exports', `${name}.png`, b64);
    }
    case 'pdf': {
      const w = 595; // A4 portrait in points
      const h = 842;
      const box = Math.min(420, w - 96);
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>
        @page { size: ${w}pt ${h}pt; margin: 0 }
        html,body { margin:0; height:100%; }
        body { display:flex; align-items:center; justify-content:center; }
        svg { width:${box}pt; height:${Math.round(box * ratio)}pt; }
      </style></head><body>${req.svg}</body></html>`;
      const { uri } = await Print.printToFileAsync({ html, width: w, height: h });
      return LocalFileService.copyTo('exports', uri, `${name}.pdf`);
    }
  }
}

export async function shareFile(uri: string, format: ExportFormat | 'csv' | 'json' | 'vcf' | 'ics', title = 'Share'): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  const mime: Record<string, string> = { ...MIME, csv: 'text/csv', json: 'application/json', vcf: 'text/x-vcard', ics: 'text/calendar' };
  const uti: Record<string, string> = { png: 'public.png', svg: 'public.svg-image', pdf: 'com.adobe.pdf', csv: 'public.comma-separated-values-text', json: 'public.json', vcf: 'public.vcard', ics: 'com.apple.ical.ics' };
  await Sharing.shareAsync(uri, { mimeType: mime[format], UTI: uti[format], dialogTitle: title });
}

export type SaveResult = 'saved' | 'denied';

/** Save a PNG to the photo gallery; asks for write-only permission when needed. */
export async function saveToGallery(uri: string): Promise<SaveResult> {
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return 'denied';
  await MediaLibrary.saveToLibraryAsync(uri);
  return 'saved';
}
