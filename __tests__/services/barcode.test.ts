import { renderBarcodeSvg } from '@/services/barcode/BarcodeGeneratorService';
import { BARCODE_FORMATS } from '@/services/barcode/formats';
import { expandUpcE, gs1CheckDigit, validateBarcode } from '@/services/barcode/validators';

describe('barcode validation', () => {
  it('computes GS1 check digits', () => {
    expect(gs1CheckDigit('400638133393')).toBe(1);
    expect(gs1CheckDigit('03600029145')).toBe(2);
    expect(gs1CheckDigit('9638507')).toBe(4);
  });

  it('accepts a valid EAN-13 and appends check digit when missing', () => {
    expect(validateBarcode('ean13', '4006381333931')).toEqual({ ok: true, value: '4006381333931' });
    const r = validateBarcode('ean13', '400638133393');
    expect(r).toMatchObject({ ok: true, value: '4006381333931' });
  });

  it('rejects a wrong EAN-13 check digit with a precise message', () => {
    const r = validateBarcode('ean13', '4006381333932');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('Expected 1');
  });

  it('rejects letters and wrong lengths for GS1', () => {
    expect(validateBarcode('ean13', '40063813339A').ok).toBe(false);
    expect(validateBarcode('ean8', '12345').ok).toBe(false);
    expect(validateBarcode('upc_a', '036000291452').ok).toBe(true);
  });

  it('validates UPC-E via expansion', () => {
    expect(expandUpcE('0425261')).toBe('04210000526');
    expect(validateBarcode('upc_e', '04252614')).toEqual({ ok: true, value: '04252614' });
    expect(validateBarcode('upc_e', '04252615').ok).toBe(false);
    expect(validateBarcode('upc_e', '2425261').ok).toBe(false);
  });

  it('validates code39 charset and uppercases', () => {
    expect(validateBarcode('code39', 'abc-1')).toMatchObject({ ok: true, value: 'ABC-1' });
    expect(validateBarcode('code39', 'a_b').ok).toBe(false);
  });

  it('rejects non-ASCII for code128', () => {
    expect(validateBarcode('code128', 'Hello')).toMatchObject({ ok: true });
    expect(validateBarcode('code128', 'héllo').ok).toBe(false);
    expect(validateBarcode('code128', '📦').ok).toBe(false);
  });

  it('requires even digits for ITF', () => {
    expect(validateBarcode('itf14', '1234').ok).toBe(true);
    expect(validateBarcode('itf14', '123').ok).toBe(false);
  });

  it('handles Codabar start/stop', () => {
    expect(validateBarcode('codabar', '40156')).toMatchObject({ ok: true, value: 'A40156B' });
    expect(validateBarcode('codabar', 'C40156D')).toMatchObject({ ok: true, value: 'C40156D' });
    expect(validateBarcode('codabar', 'A40156').ok).toBe(false);
  });

  it('rejects empty input', () => {
    expect(validateBarcode('code128', '   ').ok).toBe(false);
  });
});

describe('renderBarcodeSvg', () => {
  it.each(BARCODE_FORMATS.map((f) => [f.id, f.example] as const))('renders %s example', (id, example) => {
    const r = renderBarcodeSvg(id, example);
    expect(r.svg).toContain('<svg');
    expect(r.width).toBeGreaterThan(0);
  });

  it('throws on invalid input', () => {
    expect(() => renderBarcodeSvg('ean13', 'abc')).toThrow('digits only');
  });

  it('applies colors', () => {
    const r = renderBarcodeSvg('code128', 'X1', { foregroundColor: '#112233', backgroundColor: '#FFEEDD', showText: false, textPosition: 'bottom', margin: 4 });
    expect(r.svg).toContain('#112233');
  });
});
