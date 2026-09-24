import { DEFAULT_DESIGN } from '@/services/qr/QRGeneratorService';
import { contrastRatio } from '@/services/scannability/color';
import { assessScannability, recommendedEcc } from '@/services/scannability/ScannabilityService';

const base = { ...DEFAULT_DESIGN, foregroundColor: '#000000', backgroundColor: '#FFFFFF', cornerColor: '#000000', eyeColor: '#000000' };

describe('contrastRatio', () => {
  it('black on white is 21', () => expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 0));
  it('identical colors are 1', () => expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1));
});

describe('assessScannability', () => {
  it('rates classic black/white as excellent', () => {
    const r = assessScannability(base, 0);
    expect(r.level).toBe('excellent');
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.warnings).toEqual([]);
  });

  it('flags low contrast as risky', () => {
    const r = assessScannability({ ...base, foregroundColor: '#DDDDDD', cornerColor: '#DDDDDD', eyeColor: '#DDDDDD' }, 0);
    expect(r.level).toBe('risky');
    expect(r.warnings.join()).toMatch(/contrast/i);
  });

  it('uses the weakest gradient stop for contrast', () => {
    const r = assessScannability({ ...base, gradientType: 'linear', gradientStart: '#000000', gradientEnd: '#EEEEEE' }, 0);
    expect(r.warnings.join()).toMatch(/contrast/i);
  });

  it('warns when the logo covers more than the error correction can recover', () => {
    const r = assessScannability({ ...base, logoUri: 'x', errorCorrection: 'L' }, 0.12);
    expect(r.level).toBe('risky');
    expect(r.warnings.join()).toMatch(/logo/i);
  });

  it('accepts a moderate logo at level H', () => {
    const r = assessScannability({ ...base, logoUri: 'x', errorCorrection: 'H' }, 0.08);
    expect(r.level).not.toBe('risky');
  });

  it('warns on a small quiet zone', () => {
    const r = assessScannability({ ...base, quietZone: 0 }, 0);
    expect(r.warnings.join()).toMatch(/quiet zone/i);
    expect(r.score).toBeLessThan(90);
  });

  it('warns on inverted colors and transparent background', () => {
    expect(assessScannability({ ...base, foregroundColor: '#FFFFFF', backgroundColor: '#000000', cornerColor: '#fff', eyeColor: '#fff' }, 0).warnings.join()).toMatch(/inverted/i);
    expect(assessScannability({ ...base, transparentBackground: true }, 0).warnings.join()).toMatch(/transparent/i);
  });

  it('recommends H when a logo is present', () => {
    expect(recommendedEcc('M', true)).toBe('H');
    expect(recommendedEcc('M', false)).toBe('M');
  });
});
