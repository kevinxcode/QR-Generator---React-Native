import type { ErrorCorrection, QRDesign } from '@/types/domain';

import { contrastRatio, luminance } from './color';

export type ScannabilityLevel = 'excellent' | 'good' | 'risky';

export interface ScannabilityReport {
  score: number;
  level: ScannabilityLevel;
  warnings: string[];
  recommendations: string[];
  contrast: number;
}

/** Approximate recoverable codewords per ECC level. */
export const ECC_CAPACITY: Record<ErrorCorrection, number> = { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 };

export function recommendedEcc(current: ErrorCorrection, hasLogo: boolean): ErrorCorrection {
  return hasLogo ? 'H' : current;
}

/** Largest logo size (fraction of QR width) that stays within a safe share of the ECC budget. */
export function safeLogoSize(ecc: ErrorCorrection): number {
  // coverage ≈ size², keep under ~55% of the recoverable capacity
  return Math.round(Math.sqrt(ECC_CAPACITY[ecc] * 0.55) * 100) / 100;
}

/**
 * Heuristic scannability assessment. `logoCoverage` is the fraction of modules hidden by the logo,
 * as returned by renderQrSvg.
 */
export function assessScannability(d: QRDesign, logoCoverage: number): ScannabilityReport {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  const bg = d.transparentBackground ? '#FFFFFF' : d.backgroundColor;
  const fgColors = d.gradientType === 'none' ? [d.foregroundColor] : [d.gradientStart, d.gradientEnd];
  const contrast = Math.min(...fgColors.map((c) => contrastRatio(c, bg)));
  const eyeContrast = Math.min(contrastRatio(d.cornerColor, bg), contrastRatio(d.eyeColor, bg));

  if (contrast < 2.5) {
    score -= 55;
    warnings.push(`Very low contrast (${contrast.toFixed(1)}:1) between code and background.`);
    recommendations.push('Use a darker foreground or a lighter background (aim for 4.5:1 or more).');
  } else if (contrast < 4.5) {
    score -= 20;
    warnings.push(`Low contrast (${contrast.toFixed(1)}:1). Some scanners may struggle.`);
    recommendations.push('Increase contrast to at least 4.5:1.');
  }
  if (eyeContrast < 3) {
    score -= 20;
    warnings.push('Corner eyes have low contrast. Scanners rely on them to locate the code.');
    recommendations.push('Make eye colors darker than the background.');
  }

  const fgLum = Math.max(...fgColors.map(luminance));
  if (fgLum > luminance(bg)) {
    score -= 15;
    warnings.push('Inverted colors (light code on dark background) are not supported by every scanner.');
    recommendations.push('Prefer a dark code on a light background.');
  }

  if (d.transparentBackground) {
    score -= 5;
    warnings.push('Transparent background: scannability depends on where the code is placed.');
    recommendations.push('Place it on a plain, light surface.');
  }

  if (d.logoUri) {
    const cap = ECC_CAPACITY[d.errorCorrection];
    if (logoCoverage > cap * 0.8) {
      score -= 50;
      warnings.push('Logo covers more of the code than error correction can recover.');
      recommendations.push(`Reduce logo size below ${Math.round(safeLogoSize(d.errorCorrection) * 100)}% or raise error correction to H.`);
    } else if (logoCoverage > cap * 0.55) {
      score -= 18;
      warnings.push('Logo is fairly large. The code may be harder to scan.');
      recommendations.push('Shrink the logo slightly or use error correction H.');
    }
    if (d.errorCorrection !== 'H' && d.errorCorrection !== 'Q') {
      score -= 10;
      recommendations.push('Use error correction H when adding a logo.');
    }
  }

  if (d.quietZone < 2) {
    score -= 20;
    warnings.push('Quiet zone (margin) is very small.');
    recommendations.push('Use a margin of at least 4 modules.');
  } else if (d.quietZone < 4) {
    score -= 6;
    recommendations.push('A quiet zone of 4 modules is recommended by the QR standard.');
  }

  if (d.bodyStyle === 'dots' || d.bodyStyle === 'diamond') score -= 4;
  if (d.eyeFrameStyle === 'diamond' || d.eyeStyle === 'diamond') score -= 4;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level: ScannabilityLevel = score >= 85 ? 'excellent' : score >= 60 ? 'good' : 'risky';
  return { score, level, warnings, recommendations, contrast };
}
