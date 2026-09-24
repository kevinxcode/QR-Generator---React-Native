import type { FrameType, QRDesign } from '@/types/domain';

import { createMatrix, isFinder } from './matrix';
import { eyeBallPath, eyeFramePath, modulePath, roundedRect } from './shapes';

/** Size of one module in SVG user units. */
const U = 10;

export const FRAME_LABELS: Record<FrameType, string> = {
  none: '',
  scanMe: 'SCAN ME',
  open: 'OPEN',
  visit: 'VISIT WEBSITE',
  connect: 'CONNECT',
  menu: 'VIEW MENU',
  follow: 'FOLLOW US',
  custom: 'YOUR TEXT',
};

export const DEFAULT_DESIGN: QRDesign = {
  bodyStyle: 'square',
  eyeFrameStyle: 'square',
  eyeStyle: 'square',
  foregroundColor: '#0B0D12',
  backgroundColor: '#FFFFFF',
  transparentBackground: false,
  gradientType: 'none',
  gradientStart: '#5B5BF7',
  gradientEnd: '#B04BF5',
  gradientAngle: 45,
  cornerColor: '#0B0D12',
  eyeColor: '#0B0D12',
  errorCorrection: 'M',
  quietZone: 4,
  logoUri: null,
  logoSize: 0.22,
  logoPadding: 1,
  logoBackground: '#FFFFFF',
  logoRounded: true,
  frameType: 'none',
  frameLayout: 'bottom',
  frameText: '',
  frameColor: '#0B0D12',
  frameTextColor: '#FFFFFF',
  frameFontSize: 18,
};

export interface QRRenderResult {
  svg: string;
  width: number;
  height: number;
  moduleCount: number;
  version: number;
  /** Fraction (0..1) of the symbol's modules hidden behind the logo. */
  logoCoverage: number;
}

export function xmlEscape(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function frameLabel(d: Pick<QRDesign, 'frameType' | 'frameText'>): string {
  if (d.frameType === 'none') return '';
  return d.frameText.trim() || FRAME_LABELS[d.frameType];
}

function gradientDef(d: QRDesign): string {
  if (d.gradientType === 'none') return '';
  const s = xmlEscape(d.gradientStart);
  const e = xmlEscape(d.gradientEnd);
  if (d.gradientType === 'radial') {
    return `<radialGradient id="qg" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="${s}"/><stop offset="1" stop-color="${e}"/></radialGradient>`;
  }
  const rad = (d.gradientAngle * Math.PI) / 180;
  const x = Math.cos(rad) * 50;
  const y = Math.sin(rad) * 50;
  const p = (n: number) => `${(50 + n).toFixed(1)}%`;
  return `<linearGradient id="qg" x1="${p(-x)}" y1="${p(-y)}" x2="${p(x)}" y2="${p(y)}"><stop offset="0" stop-color="${s}"/><stop offset="1" stop-color="${e}"/></linearGradient>`;
}

interface QRArgs {
  payload: string;
  design: QRDesign;
  /** data: URI (or file URI) of the logo image; omitted = no logo drawn */
  logoHref?: string | null;
}

/** Render the QR symbol (with quiet zone) into an SVG fragment positioned at (ox, oy). */
function renderSymbol({ payload, design: d, logoHref }: QRArgs, ox: number, oy: number) {
  const m = createMatrix(payload, d.errorCorrection);
  const n = m.size;
  const qz = Math.max(0, Math.min(10, Math.round(d.quietZone)));
  const side = (n + 2 * qz) * U;

  // Logo box in module coordinates (centred, padded)
  let logo: { x0: number; y0: number; x1: number; y1: number; px: number; size: number } | null = null;
  if (logoHref && d.logoSize > 0) {
    const size = Math.max(0.08, Math.min(0.4, d.logoSize)) * n;
    const pad = Math.max(0, Math.min(4, d.logoPadding));
    const start = (n - size) / 2 - pad;
    logo = { x0: start, y0: start, x1: start + size + 2 * pad, y1: start + size + 2 * pad, px: pad, size };
  }
  const covered = (r: number, c: number) =>
    !!logo && c + 1 > logo.x0 && c < logo.x1 && r + 1 > logo.y0 && r < logo.y1;

  let body = '';
  let align = '';
  let hidden = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (isFinder(r, c, n)) continue;
      if (covered(r, c)) {
        hidden++;
        continue;
      }
      if (!m.get(r, c)) continue;
      if (m.isAlignment(r, c)) {
        align += `M${ox + (c + qz) * U} ${oy + (r + qz) * U}h${U}v${U}h-${U}Z`;
        continue;
      }
      const nb = {
        top: m.get(r - 1, c) && !isFinder(r - 1, c, n) && !covered(r - 1, c),
        right: m.get(r, c + 1) && !isFinder(r, c + 1, n) && !covered(r, c + 1),
        bottom: m.get(r + 1, c) && !isFinder(r + 1, c, n) && !covered(r + 1, c),
        left: m.get(r, c - 1) && !isFinder(r, c - 1, n) && !covered(r, c - 1),
      };
      body += modulePath(d.bodyStyle, ox + (c + qz) * U, oy + (r + qz) * U, U, nb);
    }
  }

  const fill = d.gradientType === 'none' ? xmlEscape(d.foregroundColor) : 'url(#qg)';
  let eyesFrame = '';
  let eyesBall = '';
  const corners: [number, number, 'tl' | 'tr' | 'bl'][] = [[0, 0, 'tl'], [0, n - 7, 'tr'], [n - 7, 0, 'bl']];
  for (const [r, c, k] of corners) {
    const x = ox + (c + qz) * U;
    const y = oy + (r + qz) * U;
    eyesFrame += eyeFramePath(d.eyeFrameStyle, x, y, U, k);
    eyesBall += eyeBallPath(d.eyeStyle, x, y, U);
  }

  let out = '';
  if (!d.transparentBackground) out += `<rect x="${ox}" y="${oy}" width="${side}" height="${side}" fill="${xmlEscape(d.backgroundColor)}"/>`;
  out += `<path d="${body}${align}" fill="${fill}"/>`;
  out += `<path d="${eyesFrame}" fill="${xmlEscape(d.cornerColor)}" fill-rule="evenodd"/>`;
  out += `<path d="${eyesBall}" fill="${xmlEscape(d.eyeColor)}"/>`;

  if (logo && logoHref) {
    const bx = ox + (logo.x0 + qz) * U;
    const by = oy + (logo.y0 + qz) * U;
    const bw = (logo.x1 - logo.x0) * U;
    const rad = d.logoRounded ? bw * 0.22 : 0;
    out += `<path d="${roundedRect(bx, by, bw, bw, rad, rad, rad, rad)}" fill="${xmlEscape(d.logoBackground)}"/>`;
    const ix = bx + logo.px * U;
    const iw = logo.size * U;
    out += `<image x="${ix.toFixed(2)}" y="${(by + logo.px * U).toFixed(2)}" width="${iw.toFixed(2)}" height="${iw.toFixed(2)}" href="${xmlEscape(logoHref)}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  return { svg: out, side, moduleCount: n, version: m.version, logoCoverage: hidden / (n * n) };
}

/** Build the full QR (+ optional frame) SVG. Throws a user-friendly Error on failure. */
export function renderQrSvg(args: QRArgs): QRRenderResult {
  const d = args.design;
  const label = frameLabel(d);
  const layout = d.frameType === 'none' ? null : d.frameLayout;

  // First pass to learn the symbol side length.
  const probe = renderSymbol(args, 0, 0);
  const Q = probe.side;
  const fs = (Math.max(10, Math.min(40, d.frameFontSize)) * Q) / 300;
  const pad = Q * 0.05;
  const band = fs * 2.4;
  const fc = xmlEscape(d.frameColor);
  const tc = xmlEscape(d.frameTextColor);
  const text = (x: number, y: number, color: string) =>
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${color}" font-size="${fs.toFixed(1)}" font-weight="700" font-family="sans-serif" text-anchor="middle" letter-spacing="${(fs * 0.08).toFixed(1)}">${xmlEscape(label)}</text>`;

  let W = Q;
  let H = Q;
  let qx = 0;
  let qy = 0;
  let before = '';
  let after = '';

  switch (layout) {
    case null:
      break;
    case 'bottom':
    case 'top': {
      W = Q + 2 * pad;
      H = Q + 2 * pad + band;
      qx = pad;
      qy = layout === 'top' ? pad + band : pad;
      before = `<path d="${roundedRect(0, 0, W, H, pad * 2, pad * 2, pad * 2, pad * 2)}" fill="${fc}"/>`;
      const ty = layout === 'top' ? pad + band * 0.5 + fs * 0.35 : pad + Q + band * 0.5 + fs * 0.35;
      after = text(W / 2, ty, tc);
      break;
    }
    case 'card': {
      const sw = pad * 0.8;
      W = Q + 2 * pad + sw;
      H = Q + 2 * pad + band + sw;
      qx = pad + sw / 2;
      qy = pad + sw / 2;
      const bg = d.transparentBackground ? 'none' : xmlEscape(d.backgroundColor);
      before = `<rect x="${sw / 2}" y="${sw / 2}" width="${W - sw}" height="${H - sw}" rx="${pad * 2}" fill="${bg}" stroke="${fc}" stroke-width="${sw}"/>`;
      after = text(W / 2, qy + Q + band * 0.45 + fs * 0.35, fc);
      break;
    }
    case 'bubble': {
      const gap = fs * 0.9;
      W = Q;
      H = Q + gap + band;
      const by = Q + gap;
      const tri = `M${W / 2 - fs * 0.6} ${by + 0.5}L${W / 2} ${by - fs * 0.6}L${W / 2 + fs * 0.6} ${by + 0.5}Z`;
      after = `<path d="${roundedRect(Q * 0.08, by, Q * 0.84, band, band / 2, band / 2, band / 2, band / 2)}${tri}" fill="${fc}"/>` +
        text(W / 2, by + band / 2 + fs * 0.35, tc);
      break;
    }
    case 'badge': {
      const bw = Math.min(Q * 0.8, label.length * fs * 0.75 + fs * 2);
      W = Q;
      H = Q + band * 0.55;
      const by = Q - band * 0.45;
      after = `<path d="${roundedRect((W - bw) / 2, by, bw, band, band / 2, band / 2, band / 2, band / 2)}" fill="${fc}"/>` +
        text(W / 2, by + band / 2 + fs * 0.35, tc);
      break;
    }
    case 'minimal': {
      W = Q;
      H = Q + band;
      after = text(W / 2, Q + band * 0.5 + fs * 0.35, fc);
      break;
    }
  }

  const symbol = qx === 0 && qy === 0 ? probe : renderSymbol(args, qx, qy);
  const defs = gradientDef(d);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" width="${W.toFixed(1)}" height="${H.toFixed(1)}">` +
    (defs ? `<defs>${defs}</defs>` : '') +
    before + symbol.svg + after +
    '</svg>';

  return { svg, width: W, height: H, moduleCount: symbol.moduleCount, version: symbol.version, logoCoverage: symbol.logoCoverage };
}
