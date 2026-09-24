import type { EyeBallStyle, EyeFrameStyle, ModuleStyle } from '@/types/domain';

const f = (n: number) => Number(n.toFixed(3));

/** Rectangle path with individual corner radii (tl, tr, br, bl). */
export function roundedRect(x: number, y: number, w: number, h: number, tl: number, tr: number, br: number, bl: number): string {
  return (
    `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}` +
    (tr ? `A${f(tr)} ${f(tr)} 0 0 1 ${f(x + w)} ${f(y + tr)}` : '') +
    `V${f(y + h - br)}` +
    (br ? `A${f(br)} ${f(br)} 0 0 1 ${f(x + w - br)} ${f(y + h)}` : '') +
    `H${f(x + bl)}` +
    (bl ? `A${f(bl)} ${f(bl)} 0 0 1 ${f(x)} ${f(y + h - bl)}` : '') +
    `V${f(y + tl)}` +
    (tl ? `A${f(tl)} ${f(tl)} 0 0 1 ${f(x + tl)} ${f(y)}` : '') +
    'Z'
  );
}

export function circle(cx: number, cy: number, r: number): string {
  return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
}

export function diamond(cx: number, cy: number, r: number): string {
  return `M${f(cx)} ${f(cy - r)}L${f(cx + r)} ${f(cy)}L${f(cx)} ${f(cy + r)}L${f(cx - r)} ${f(cy)}Z`;
}

/** Square with chamfered ("gem-cut") corners. */
export function chamfer(x: number, y: number, w: number, c: number): string {
  return `M${f(x + c)} ${f(y)}H${f(x + w - c)}L${f(x + w)} ${f(y + c)}V${f(y + w - c)}L${f(x + w - c)} ${f(y + w)}H${f(x + c)}L${f(x)} ${f(y + w - c)}V${f(y + c)}Z`;
}

export interface Neighbours {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

/** Path for one data module at (x, y) with unit size `s`. */
export function modulePath(style: ModuleStyle, x: number, y: number, s: number, n: Neighbours): string {
  const cx = x + s / 2;
  const cy = y + s / 2;
  switch (style) {
    case 'square':
      return `M${f(x)} ${f(y)}h${f(s)}v${f(s)}h${f(-s)}Z`;
    case 'dots':
      return circle(cx, cy, s * 0.38);
    case 'circle':
      return circle(cx, cy, s * 0.5);
    case 'diamond':
      return diamond(cx, cy, s * 0.55);
    case 'softSquare':
      return roundedRect(x + s * 0.05, y + s * 0.05, s * 0.9, s * 0.9, s * 0.25, s * 0.25, s * 0.25, s * 0.25);
    case 'rounded': {
      const r = s * 0.35;
      return roundedRect(x, y, s, s,
        !n.top && !n.left ? r : 0, !n.top && !n.right ? r : 0,
        !n.bottom && !n.right ? r : 0, !n.bottom && !n.left ? r : 0);
    }
    case 'extraRounded': {
      const r = s * 0.5;
      return roundedRect(x, y, s, s,
        !n.top && !n.left ? r : 0, !n.top && !n.right ? r : 0,
        !n.bottom && !n.right ? r : 0, !n.bottom && !n.left ? r : 0);
    }
    case 'classy': {
      const r = s * 0.5;
      return roundedRect(x, y, s, s, !n.top && !n.left ? r : 0, 0, !n.bottom && !n.right ? r : 0, 0);
    }
  }
}

/**
 * Outer eye frame (7x7 with a 5x5 hole) as a path using the even-odd rule.
 * `corner` rotates asymmetric styles (leaf) so they point outwards.
 */
export function eyeFramePath(style: EyeFrameStyle, x: number, y: number, s: number, corner: 'tl' | 'tr' | 'bl'): string {
  const o = 7 * s;
  const i = 5 * s;
  const ix = x + s;
  const iy = y + s;
  switch (style) {
    case 'square':
      return roundedRect(x, y, o, o, 0, 0, 0, 0) + roundedRect(ix, iy, i, i, 0, 0, 0, 0);
    case 'rounded':
      return roundedRect(x, y, o, o, 2 * s, 2 * s, 2 * s, 2 * s) + roundedRect(ix, iy, i, i, 1.2 * s, 1.2 * s, 1.2 * s, 1.2 * s);
    case 'extraRounded':
      return roundedRect(x, y, o, o, 3 * s, 3 * s, 3 * s, 3 * s) + roundedRect(ix, iy, i, i, 2 * s, 2 * s, 2 * s, 2 * s);
    case 'circle':
      return circle(x + o / 2, y + o / 2, o / 2) + circle(x + o / 2, y + o / 2, i / 2);
    case 'diamond':
      return chamfer(x, y, o, 1.6 * s) + chamfer(ix, iy, i, 1.1 * s);
    case 'leaf': {
      const R = 3 * s;
      const r = 2 * s;
      if (corner === 'tr') return roundedRect(x, y, o, o, 0, R, 0, R) + roundedRect(ix, iy, i, i, 0, r, 0, r);
      return roundedRect(x, y, o, o, R, 0, R, 0) + roundedRect(ix, iy, i, i, r, 0, r, 0);
    }
  }
}

/** Inner eyeball (3x3) path. */
export function eyeBallPath(style: EyeBallStyle, x: number, y: number, s: number): string {
  const b = 3 * s;
  const bx = x + 2 * s;
  const by = y + 2 * s;
  switch (style) {
    case 'square':
      return roundedRect(bx, by, b, b, 0, 0, 0, 0);
    case 'rounded':
      return roundedRect(bx, by, b, b, s * 0.9, s * 0.9, s * 0.9, s * 0.9);
    case 'circle':
      return circle(bx + b / 2, by + b / 2, b / 2);
    case 'diamond':
      return chamfer(bx, by, b, 0.8 * s);
  }
}
