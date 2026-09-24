import QRCode from 'qrcode';

import { DEFAULT_DESIGN, renderQrSvg } from '@/services/qr/QRGeneratorService';
import { createMatrix } from '@/services/qr/matrix';
import type { EyeBallStyle, EyeFrameStyle, FrameLayout, ModuleStyle } from '@/types/domain';

describe('QR matrix', () => {
  it('encodes unicode/emoji as UTF-8 bytes', () => {
    const text = 'Grüße 👋 世界';
    const m = createMatrix(text, 'M');
    const ref = QRCode.create(text, { errorCorrectionLevel: 'M' });
    expect(m.size).toBe(ref.modules.size);
    expect(ref.segments[0].mode.id).toBe('Byte');
  });

  it('throws a friendly error when content is too long', () => {
    expect(() => createMatrix('x'.repeat(4000), 'H')).toThrow(/too long/);
  });

  it('throws on empty payload', () => {
    expect(() => createMatrix('', 'M')).toThrow();
  });
});

describe('renderQrSvg', () => {
  const styles: ModuleStyle[] = ['square', 'rounded', 'dots', 'circle', 'diamond', 'softSquare', 'classy', 'extraRounded'];
  const frames: EyeFrameStyle[] = ['square', 'rounded', 'circle', 'extraRounded', 'leaf', 'diamond'];
  const balls: EyeBallStyle[] = ['square', 'circle', 'rounded', 'diamond'];

  it.each(styles)('renders body style %s', (bodyStyle) => {
    const r = renderQrSvg({ payload: 'https://qraft.app', design: { ...DEFAULT_DESIGN, bodyStyle } });
    expect(r.svg.startsWith('<svg')).toBe(true);
    expect(r.svg).not.toContain('NaN');
  });

  it.each(frames.flatMap((f) => balls.map((b) => [f, b] as const)))('renders eyes %s/%s', (eyeFrameStyle, eyeStyle) => {
    const r = renderQrSvg({ payload: 'x', design: { ...DEFAULT_DESIGN, eyeFrameStyle, eyeStyle } });
    expect(r.svg).not.toContain('NaN');
  });

  it('adds linear and radial gradients', () => {
    expect(renderQrSvg({ payload: 'x', design: { ...DEFAULT_DESIGN, gradientType: 'linear' } }).svg).toContain('linearGradient');
    expect(renderQrSvg({ payload: 'x', design: { ...DEFAULT_DESIGN, gradientType: 'radial' } }).svg).toContain('radialGradient');
  });

  it('omits background when transparent', () => {
    const r = renderQrSvg({ payload: 'x', design: { ...DEFAULT_DESIGN, transparentBackground: true } });
    expect(r.svg).not.toContain('fill="#FFFFFF"');
  });

  it('cuts out modules behind the logo and reports coverage', () => {
    const noLogo = renderQrSvg({ payload: 'https://example.com', design: { ...DEFAULT_DESIGN, errorCorrection: 'H' } });
    expect(noLogo.logoCoverage).toBe(0);
    const withLogo = renderQrSvg({
      payload: 'https://example.com',
      design: { ...DEFAULT_DESIGN, errorCorrection: 'H', logoUri: 'file://logo.png', logoSize: 0.25 },
      logoHref: 'data:image/png;base64,AAAA',
    });
    expect(withLogo.svg).toContain('<image');
    expect(withLogo.logoCoverage).toBeGreaterThan(0.05);
    expect(withLogo.logoCoverage).toBeLessThan(0.2);
  });

  it.each(['bottom', 'top', 'card', 'bubble', 'badge', 'minimal'] as FrameLayout[])('renders frame layout %s with escaped text', (frameLayout) => {
    const r = renderQrSvg({ payload: 'x', design: { ...DEFAULT_DESIGN, frameType: 'custom', frameLayout, frameText: 'Tom & <Jerry>' } });
    expect(r.svg).toContain('Tom &amp; &lt;Jerry&gt;');
    expect(r.height).toBeGreaterThan(r.width - 1);
    expect(r.svg).not.toContain('NaN');
  });

  it('respects quiet zone in dimensions', () => {
    const a = renderQrSvg({ payload: 'x', design: { ...DEFAULT_DESIGN, quietZone: 0 } });
    const b = renderQrSvg({ payload: 'x', design: { ...DEFAULT_DESIGN, quietZone: 4 } });
    expect(b.width - a.width).toBeCloseTo(80);
  });
});
