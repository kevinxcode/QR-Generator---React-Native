/**
 * @jest-environment node
 *
 * End-to-end check: rasterise the generated SVG and decode it with jsQR to prove
 * each design option still produces a scannable symbol.
 */
import { Resvg } from '@resvg/resvg-js';
import jsQR from 'jsqr';

import { DEFAULT_DESIGN, renderQrSvg } from '@/services/qr/QRGeneratorService';
import type { EyeBallStyle, EyeFrameStyle, FrameLayout, ModuleStyle, QRDesign } from '@/types/domain';

// 1x1 opaque white PNG used as a logo stand-in
const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

function decode(payload: string, design: QRDesign, logo = false): string | null {
  const { svg } = renderQrSvg({ payload, design, logoHref: logo ? LOGO : null });
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: 600 }, background: '#FFFFFF' }).render();
  const data = new Uint8ClampedArray(img.pixels);
  return jsQR(data, img.width, img.height)?.data ?? null;
}

const PAYLOAD = 'https://qraft.app/p?id=42';

describe('generated QR codes decode', () => {
  it.each(['square', 'rounded', 'dots', 'circle', 'softSquare', 'classy', 'extraRounded', 'diamond'] as ModuleStyle[])('body %s', (bodyStyle) => {
    expect(decode(PAYLOAD, { ...DEFAULT_DESIGN, bodyStyle })).toBe(PAYLOAD);
  });

  it.each(['square', 'rounded', 'circle', 'extraRounded', 'leaf', 'diamond'] as EyeFrameStyle[])('eye frame %s', (eyeFrameStyle) => {
    expect(decode(PAYLOAD, { ...DEFAULT_DESIGN, eyeFrameStyle })).toBe(PAYLOAD);
  });

  it.each(['square', 'rounded', 'circle', 'diamond'] as EyeBallStyle[])('eyeball %s', (eyeStyle) => {
    expect(decode(PAYLOAD, { ...DEFAULT_DESIGN, eyeStyle })).toBe(PAYLOAD);
  });

  it('gradient', () => {
    expect(decode(PAYLOAD, { ...DEFAULT_DESIGN, gradientType: 'linear', gradientStart: '#1D2B64', gradientEnd: '#5B21B6' })).toBe(PAYLOAD);
    expect(decode(PAYLOAD, { ...DEFAULT_DESIGN, gradientType: 'radial', gradientStart: '#111111', gradientEnd: '#0F4C81' })).toBe(PAYLOAD);
  });

  it('logo at safe size with ECC H', () => {
    expect(decode(PAYLOAD, { ...DEFAULT_DESIGN, errorCorrection: 'H', logoUri: 'x', logoSize: 0.22 }, true)).toBe(PAYLOAD);
  });

  it.each(['bottom', 'top', 'card', 'bubble', 'badge', 'minimal'] as FrameLayout[])('frame %s', (frameLayout) => {
    expect(decode(PAYLOAD, { ...DEFAULT_DESIGN, frameType: 'scanMe', frameLayout, frameColor: '#0B0D12' })).toBe(PAYLOAD);
  });

  it('unicode + emoji payload', () => {
    const text = 'Hej 👋 こんにちは — Qraft';
    expect(decode(text, DEFAULT_DESIGN)).toBe(text);
  });

  it('long URL', () => {
    const url = `https://example.com/${'segment/'.repeat(40)}?q=${'x'.repeat(100)}`;
    expect(decode(url, { ...DEFAULT_DESIGN, errorCorrection: 'L' })).toBe(url);
  });

  it('WiFi and vCard payloads', () => {
    const wifi = 'WIFI:T:WPA;S:Office\\;5G;P:p@ss\\:word;;';
    expect(decode(wifi, DEFAULT_DESIGN)).toBe(wifi);
    const vcard = 'BEGIN:VCARD\nVERSION:3.0\nN:Doe;Jane;;;\nFN:Jane Doe\nTEL;TYPE=CELL:+15551234\nEND:VCARD';
    expect(decode(vcard, DEFAULT_DESIGN)).toBe(vcard);
  });
});
