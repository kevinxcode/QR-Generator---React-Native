import type { CodeFormat } from '@/types/domain';

/**
 * Formats decoded by expo-camera's CameraView (ML Kit on Android, AVFoundation on iOS).
 * Keep this the single source of truth so formats can be changed in one place.
 */
export type CameraBarcodeType =
  | 'qr'
  | 'ean13'
  | 'ean8'
  | 'upc_a'
  | 'upc_e'
  | 'code39'
  | 'code93'
  | 'code128'
  | 'itf14'
  | 'codabar'
  | 'datamatrix'
  | 'pdf417'
  | 'aztec';

export interface ScannerCapability {
  type: CameraBarcodeType;
  label: string;
  twoD: boolean;
}

export const SCANNER_CAPABILITIES: ScannerCapability[] = [
  { type: 'qr', label: 'QR Code', twoD: true },
  { type: 'datamatrix', label: 'Data Matrix', twoD: true },
  { type: 'pdf417', label: 'PDF417', twoD: true },
  { type: 'aztec', label: 'Aztec', twoD: true },
  { type: 'ean13', label: 'EAN-13', twoD: false },
  { type: 'ean8', label: 'EAN-8', twoD: false },
  { type: 'upc_a', label: 'UPC-A', twoD: false },
  { type: 'upc_e', label: 'UPC-E', twoD: false },
  { type: 'code39', label: 'Code 39', twoD: false },
  { type: 'code93', label: 'Code 93', twoD: false },
  { type: 'code128', label: 'Code 128', twoD: false },
  { type: 'itf14', label: 'ITF', twoD: false },
  { type: 'codabar', label: 'Codabar', twoD: false },
];

export type ScanMode = 'all' | 'qr' | 'barcode';

export function barcodeTypesFor(mode: ScanMode): CameraBarcodeType[] {
  if (mode === 'qr') return ['qr'];
  if (mode === 'barcode') return SCANNER_CAPABILITIES.filter((c) => !c.twoD).map((c) => c.type);
  return SCANNER_CAPABILITIES.map((c) => c.type);
}

/**
 * Normalise the `type` string reported by expo-camera. Android reports names like "qr"/"ean13",
 * iOS may report "org.iso.QRCode" / "org.gs1.EAN-13" on some versions; numeric values are
 * reported by some Android builds (ML Kit format constants).
 */
export function normalizeScannedType(raw: string | number | undefined): CodeFormat {
  if (raw === undefined || raw === null) return 'unknown';
  if (typeof raw === 'number') {
    const mlkit: Record<number, CodeFormat> = {
      1: 'code128', 2: 'code39', 4: 'code93', 8: 'codabar', 16: 'datamatrix', 32: 'ean13', 64: 'ean8',
      128: 'itf14', 256: 'qr', 512: 'upc_a', 1024: 'upc_e', 2048: 'pdf417', 4096: 'aztec',
    };
    return mlkit[raw] ?? 'unknown';
  }
  const s = raw.toLowerCase().replace(/^org\.(iso|gs1|ansi)\./, '').replace(/[^a-z0-9]/g, '');
  const map: Record<string, CodeFormat> = {
    qr: 'qr', qrcode: 'qr', ean13: 'ean13', ean8: 'ean8', upca: 'upc_a', upce: 'upc_e',
    code39: 'code39', code39mod43: 'code39', code93: 'code93', code128: 'code128',
    itf14: 'itf14', itf: 'itf14', interleaved2of5: 'itf14', i2of5: 'itf14', codabar: 'codabar',
    datamatrix: 'datamatrix', pdf417: 'pdf417', aztec: 'aztec',
  };
  return map[s] ?? 'unknown';
}

/**
 * On Android, ML Kit puts a human "display value" in `data` for structured codes
 * (e.g. "Office secret123" for a Wi-Fi QR). The exact encoded payload is in `raw`.
 */
export function rawScanValue(r: { data: string; raw?: string }): string {
  return r.raw && r.raw.length > 0 ? r.raw : r.data;
}
