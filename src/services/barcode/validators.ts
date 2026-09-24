import type { BarcodeFormat } from '@/types/domain';

export type BarcodeValidation =
  | { ok: true; value: string; hint?: string }
  | { ok: false; error: string };

/** GS1 mod-10 check digit for the given digits (without check digit). */
export function gs1CheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const n = body.charCodeAt(body.length - 1 - i) - 48;
    sum += i % 2 === 0 ? n * 3 : n;
  }
  return (10 - (sum % 10)) % 10;
}

function gs1(value: string, fullLen: number, label: string): BarcodeValidation {
  if (!/^\d+$/.test(value)) return { ok: false, error: `${label} accepts digits only.` };
  if (value.length === fullLen - 1) {
    const cd = gs1CheckDigit(value);
    return { ok: true, value: value + cd, hint: `Check digit ${cd} was added automatically.` };
  }
  if (value.length !== fullLen) {
    return { ok: false, error: `${label} needs ${fullLen - 1} digits (or ${fullLen} with check digit).` };
  }
  const expected = gs1CheckDigit(value.slice(0, -1));
  if (Number(value[fullLen - 1]) !== expected) {
    return { ok: false, error: `Invalid check digit. Expected ${expected}, got ${value[fullLen - 1]}.` };
  }
  return { ok: true, value };
}

/** Expand a UPC-E (8 digits, number system 0/1) into its UPC-A equivalent. */
export function expandUpcE(upce: string): string {
  const ns = upce[0];
  const d = upce.slice(1, 7);
  const last = d[5];
  let body: string;
  switch (last) {
    case '0':
    case '1':
    case '2':
      body = `${d[0]}${d[1]}${last}0000${d[2]}${d[3]}${d[4]}`;
      break;
    case '3':
      body = `${d[0]}${d[1]}${d[2]}00000${d[3]}${d[4]}`;
      break;
    case '4':
      body = `${d[0]}${d[1]}${d[2]}${d[3]}00000${d[4]}`;
      break;
    default:
      body = `${d[0]}${d[1]}${d[2]}${d[3]}${d[4]}0000${last}`;
  }
  return ns + body;
}

function upcE(value: string): BarcodeValidation {
  if (!/^\d+$/.test(value)) return { ok: false, error: 'UPC-E accepts digits only.' };
  if (value.length !== 7 && value.length !== 8) {
    return { ok: false, error: 'UPC-E needs 7 digits (or 8 with check digit).' };
  }
  if (value[0] !== '0' && value[0] !== '1') return { ok: false, error: 'UPC-E must start with 0 or 1.' };
  const expected = gs1CheckDigit(expandUpcE(value.slice(0, 7)));
  if (value.length === 7) {
    return { ok: true, value: value + expected, hint: `Check digit ${expected} was added automatically.` };
  }
  if (Number(value[7]) !== expected) {
    return { ok: false, error: `Invalid check digit. Expected ${expected}, got ${value[7]}.` };
  }
  return { ok: true, value };
}

const CODE39 = /^[0-9A-Z \-.$/+%]+$/;
const CODABAR_BODY = /^[0-9\-$:/.+]+$/;

export function validateBarcode(format: BarcodeFormat, input: string): BarcodeValidation {
  const value = input.trim();
  if (!value) return { ok: false, error: 'Enter a value to encode.' };
  switch (format) {
    case 'ean13':
      return gs1(value, 13, 'EAN-13');
    case 'ean8':
      return gs1(value, 8, 'EAN-8');
    case 'upc_a':
      return gs1(value, 12, 'UPC-A');
    case 'upc_e':
      return upcE(value);
    case 'itf14': {
      if (!/^\d+$/.test(value)) return { ok: false, error: 'ITF accepts digits only.' };
      if (value.length % 2 !== 0) return { ok: false, error: 'ITF needs an even number of digits.' };
      if (value.length > 80) return { ok: false, error: 'ITF is limited to 80 digits.' };
      return { ok: true, value };
    }
    case 'code39': {
      const upper = value.toUpperCase();
      if (!CODE39.test(upper)) return { ok: false, error: 'Code 39 supports A–Z, 0–9, space and - . $ / + %' };
      if (upper.length > 43) return { ok: false, error: 'Code 39 is limited to 43 characters.' };
      return { ok: true, value: upper, hint: upper !== value ? 'Converted to uppercase.' : undefined };
    }
    case 'code93': {
      if (!/^[\x20-\x7e]+$/.test(value)) return { ok: false, error: 'Code 93 supports printable ASCII characters only.' };
      if (value.length > 48) return { ok: false, error: 'Code 93 is limited to 48 characters.' };
      return { ok: true, value };
    }
    case 'code128': {
      if (!/^[\x00-\x7f]+$/.test(value)) return { ok: false, error: 'Code 128 supports ASCII characters only (no emoji or accents).' };
      if (value.length > 80) return { ok: false, error: 'Code 128 is limited to 80 characters.' };
      return { ok: true, value };
    }
    case 'codabar': {
      const upper = value.toUpperCase();
      const m = /^([ABCD])?(.*?)([ABCD])?$/.exec(upper)!;
      const [, start, body, stop] = m;
      if (!body || !CODABAR_BODY.test(body)) {
        return { ok: false, error: 'Codabar supports 0–9 and - $ : / . + (with optional A–D start/stop).' };
      }
      if (!!start !== !!stop) return { ok: false, error: 'Codabar needs both a start and stop character, or neither.' };
      const full = start ? upper : `A${body}B`;
      return { ok: true, value: full, hint: start ? undefined : 'Start/stop characters A…B were added.' };
    }
  }
}
