import type { BarcodeFormat } from '@/types/domain';

export interface BarcodeFormatInfo {
  id: BarcodeFormat;
  label: string;
  /** bwip-js encoder id */
  bcid: string;
  example: string;
  description: string;
  keyboard: 'numeric' | 'default';
}

export const BARCODE_FORMATS: BarcodeFormatInfo[] = [
  { id: 'ean13', label: 'EAN-13', bcid: 'ean13', example: '400638133393', description: 'Retail products worldwide', keyboard: 'numeric' },
  { id: 'ean8', label: 'EAN-8', bcid: 'ean8', example: '9638507', description: 'Small retail packages', keyboard: 'numeric' },
  { id: 'upc_a', label: 'UPC-A', bcid: 'upca', example: '03600029145', description: 'Retail products (US/CA)', keyboard: 'numeric' },
  { id: 'upc_e', label: 'UPC-E', bcid: 'upce', example: '0123456', description: 'Compressed UPC for small items', keyboard: 'numeric' },
  { id: 'code128', label: 'Code 128', bcid: 'code128', example: 'QRAFT-2026', description: 'Logistics, shipping, general use', keyboard: 'default' },
  { id: 'code39', label: 'Code 39', bcid: 'code39', example: 'ASSET-042', description: 'Asset tags, industrial', keyboard: 'default' },
  { id: 'code93', label: 'Code 93', bcid: 'code93', example: 'INV93', description: 'Compact alphanumeric', keyboard: 'default' },
  { id: 'itf14', label: 'ITF', bcid: 'interleaved2of5', example: '1234567890', description: 'Cartons and distribution', keyboard: 'numeric' },
  { id: 'codabar', label: 'Codabar', bcid: 'rationalizedCodabar', example: 'A40156B', description: 'Libraries, blood banks', keyboard: 'default' },
];

export const barcodeInfo = (id: BarcodeFormat) => BARCODE_FORMATS.find((f) => f.id === id)!;

export const formatLabel = (format: string): string => {
  const known = BARCODE_FORMATS.find((f) => f.id === format);
  if (known) return known.label;
  const map: Record<string, string> = { qr: 'QR Code', datamatrix: 'Data Matrix', pdf417: 'PDF417', aztec: 'Aztec' };
  return map[format] ?? format.toUpperCase();
};
