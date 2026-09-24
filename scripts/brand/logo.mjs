// Qraft brand mark — a "Q" built from QR modules:
// the bowl is a QR finder "eye" (ring + centre), the tail is three diagonal modules.
// All geometry is in a 100x100 box so it can be placed at any size.

export const GRADIENT = ['#5B4BF5', '#8B5CF6', '#EC4899'];
export const INDIGO = '#5B4BF5';
export const INK = '#17172B';

const rr = (x, y, w, h, r) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

/** Path data for the mark inside a 100x100 box (fill-rule evenodd). */
export function markPath() {
  const ring = rr(6, 6, 68, 68, 22) + rr(19, 19, 42, 42, 12); // outer minus inner -> ring
  const eye = rr(29, 29, 22, 22, 7);
  // Q tail: two modules stepping out of the ring's bottom-right corner
  const tail = rr(60, 60, 16, 16, 5) + rr(78, 78, 16, 16, 5);
  return { ring, eye, tail };
}

/** SVG <g> with the mark scaled into a square of `size` at (x, y). */
export function markGroup(x, y, size, color = '#FFFFFF', accent = color) {
  const { ring, eye, tail } = markPath();
  const s = size / 100;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="${ring}" fill="${color}" fill-rule="evenodd"/>
    <path d="${eye}" fill="${accent}"/>
    <path d="${tail}" fill="${color}"/>
  </g>`;
}

export function gradientDef(id = 'g', x1 = '0%', y1 = '0%', x2 = '100%', y2 = '100%') {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
    <stop offset="0" stop-color="${GRADIENT[0]}"/>
    <stop offset="0.55" stop-color="${GRADIENT[1]}"/>
    <stop offset="1" stop-color="${GRADIENT[2]}"/>
  </linearGradient>`;
}

/** Soft highlight used on the icon background for depth. */
export function glow(cx, cy, r, opacity = 0.18) {
  return `<radialGradient id="glow" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="${opacity}"/>
    <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
  </radialGradient>`;
}
