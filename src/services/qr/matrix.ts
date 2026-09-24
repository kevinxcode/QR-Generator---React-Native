import QRCode from 'qrcode';
import { getPositions } from 'qrcode/lib/core/alignment-pattern';

import type { ErrorCorrection } from '@/types/domain';

export interface QRMatrix {
  size: number;
  /** true = dark module */
  get(row: number, col: number): boolean;
  version: number;
  /** true if the module belongs to an alignment pattern (drawn solid for robustness) */
  isAlignment(row: number, col: number): boolean;
}

export function createMatrix(payload: string, ecc: ErrorCorrection): QRMatrix {
  if (!payload) throw new Error('Nothing to encode yet.');
  let qr: ReturnType<typeof QRCode.create>;
  try {
    qr = QRCode.create(payload, { errorCorrectionLevel: ecc });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/too big|amount of data/i.test(msg)) {
      throw new Error('Content is too long for a QR code at this error-correction level.');
    }
    throw new Error(`Could not generate QR code: ${msg}`);
  }
  const { size, data } = qr.modules;
  const align = new Set<number>();
  for (const [r0, c0] of getPositions(qr.version)) {
    for (let r = r0; r < r0 + 5; r++) for (let c = c0; c < c0 + 5; c++) align.add(r * size + c);
  }
  return {
    size,
    version: qr.version,
    isAlignment: (r, c) => align.has(r * size + c),
    get: (r, c) => r >= 0 && c >= 0 && r < size && c < size && data[r * size + c] === 1,
  };
}

/** True if (row, col) lies inside one of the three 7x7 finder patterns. */
export function isFinder(row: number, col: number, size: number): boolean {
  const inTL = row < 7 && col < 7;
  const inTR = row < 7 && col >= size - 7;
  const inBL = row >= size - 7 && col < 7;
  return inTL || inTR || inBL;
}
