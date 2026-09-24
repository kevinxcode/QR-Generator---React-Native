import { DEFAULT_BARCODE_OPTIONS } from '@/services/barcode/BarcodeGeneratorService';
import { DEFAULT_DESIGN } from '@/services/qr/QRGeneratorService';
import type { BarcodeOptions, QRDesign } from '@/types/domain';
import { uuid } from '@/utils/id';

import type { Db } from '../types';

interface DesignRow {
  body_style: QRDesign['bodyStyle'];
  eye_frame_style: QRDesign['eyeFrameStyle'];
  eye_style: QRDesign['eyeStyle'];
  foreground_color: string;
  background_color: string;
  transparent_background: number;
  gradient_type: QRDesign['gradientType'];
  gradient_start: string | null;
  gradient_end: string | null;
  gradient_angle: number | null;
  eye_color: string | null;
  corner_color: string | null;
  error_correction: QRDesign['errorCorrection'];
  quiet_zone: number;
  logo_uri: string | null;
  logo_size: number | null;
  logo_padding: number | null;
  logo_background: string | null;
  logo_rounded: number;
  frame_type: QRDesign['frameType'];
  frame_layout: QRDesign['frameLayout'] | null;
  frame_text: string | null;
  frame_color: string | null;
  frame_text_color: string | null;
  frame_font_size: number | null;
}

const D = DEFAULT_DESIGN;

export const mapDesign = (r: DesignRow): QRDesign => ({
  bodyStyle: r.body_style,
  eyeFrameStyle: r.eye_frame_style,
  eyeStyle: r.eye_style,
  foregroundColor: r.foreground_color,
  backgroundColor: r.background_color,
  transparentBackground: r.transparent_background === 1,
  gradientType: r.gradient_type,
  gradientStart: r.gradient_start ?? D.gradientStart,
  gradientEnd: r.gradient_end ?? D.gradientEnd,
  gradientAngle: r.gradient_angle ?? D.gradientAngle,
  eyeColor: r.eye_color ?? r.foreground_color,
  cornerColor: r.corner_color ?? r.foreground_color,
  errorCorrection: r.error_correction,
  quietZone: r.quiet_zone,
  logoUri: r.logo_uri,
  logoSize: r.logo_size ?? D.logoSize,
  logoPadding: r.logo_padding ?? D.logoPadding,
  logoBackground: r.logo_background ?? D.logoBackground,
  logoRounded: r.logo_rounded === 1,
  frameType: r.frame_type,
  frameLayout: r.frame_layout ?? D.frameLayout,
  frameText: r.frame_text ?? '',
  frameColor: r.frame_color ?? D.frameColor,
  frameTextColor: r.frame_text_color ?? D.frameTextColor,
  frameFontSize: r.frame_font_size ?? D.frameFontSize,
});

export class DesignRepository {
  constructor(private db: Db) {}

  async saveQrDesign(codeId: string, d: QRDesign): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO qr_designs (id, code_id, body_style, eye_frame_style, eye_style, foreground_color, background_color,
        transparent_background, gradient_type, gradient_start, gradient_end, gradient_angle, eye_color, corner_color,
        error_correction, quiet_zone, logo_uri, logo_size, logo_padding, logo_background, logo_rounded,
        frame_type, frame_layout, frame_text, frame_color, frame_text_color, frame_font_size)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(code_id) DO UPDATE SET
        body_style=excluded.body_style, eye_frame_style=excluded.eye_frame_style, eye_style=excluded.eye_style,
        foreground_color=excluded.foreground_color, background_color=excluded.background_color,
        transparent_background=excluded.transparent_background, gradient_type=excluded.gradient_type,
        gradient_start=excluded.gradient_start, gradient_end=excluded.gradient_end, gradient_angle=excluded.gradient_angle,
        eye_color=excluded.eye_color, corner_color=excluded.corner_color, error_correction=excluded.error_correction,
        quiet_zone=excluded.quiet_zone, logo_uri=excluded.logo_uri, logo_size=excluded.logo_size,
        logo_padding=excluded.logo_padding, logo_background=excluded.logo_background, logo_rounded=excluded.logo_rounded,
        frame_type=excluded.frame_type, frame_layout=excluded.frame_layout, frame_text=excluded.frame_text,
        frame_color=excluded.frame_color, frame_text_color=excluded.frame_text_color, frame_font_size=excluded.frame_font_size`,
      [uuid(), codeId, d.bodyStyle, d.eyeFrameStyle, d.eyeStyle, d.foregroundColor, d.backgroundColor,
        d.transparentBackground ? 1 : 0, d.gradientType, d.gradientStart, d.gradientEnd, d.gradientAngle, d.eyeColor,
        d.cornerColor, d.errorCorrection, d.quietZone, d.logoUri, d.logoSize, d.logoPadding, d.logoBackground,
        d.logoRounded ? 1 : 0, d.frameType, d.frameLayout, d.frameText, d.frameColor, d.frameTextColor, d.frameFontSize],
    );
  }

  async getQrDesign(codeId: string): Promise<QRDesign | null> {
    const row = await this.db.getFirstAsync<DesignRow>('SELECT * FROM qr_designs WHERE code_id = ?', [codeId]);
    return row ? mapDesign(row) : null;
  }

  async listLogoUris(): Promise<string[]> {
    const rows = await this.db.getAllAsync<{ logo_uri: string }>('SELECT DISTINCT logo_uri FROM qr_designs WHERE logo_uri IS NOT NULL');
    return rows.map((r) => r.logo_uri);
  }

  async saveBarcodeOptions(codeId: string, o: BarcodeOptions): Promise<void> {
    await this.db.runAsync(
      'INSERT INTO barcode_options (code_id, options) VALUES (?, ?) ON CONFLICT(code_id) DO UPDATE SET options = excluded.options',
      [codeId, JSON.stringify(o)],
    );
  }

  async getBarcodeOptions(codeId: string): Promise<BarcodeOptions | null> {
    const row = await this.db.getFirstAsync<{ options: string }>('SELECT options FROM barcode_options WHERE code_id = ?', [codeId]);
    if (!row) return null;
    try {
      return { ...DEFAULT_BARCODE_OPTIONS, ...(JSON.parse(row.options) as Partial<BarcodeOptions>) };
    } catch {
      return DEFAULT_BARCODE_OPTIONS;
    }
  }
}
