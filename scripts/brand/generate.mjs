// Generates app icons and Google Play store graphics from the Qraft brand mark.
// Usage: node scripts/brand/generate.mjs
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';

import { glow, gradientDef, INDIGO, markGroup } from './logo.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const out = (p) => path.join(root, p);
fs.mkdirSync(out('store/play'), { recursive: true });

function png(svg, file, width) {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' } });
  fs.writeFileSync(out(file), r.render().asPng());
  console.log('✓', file);
}

const svg = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;

// Full-bleed gradient square with the mark (Play Store icon / iOS icon — the OS applies the corner mask).
const iconSvg = (size = 1024) =>
  svg(
    size,
    size,
    `<rect width="${size}" height="${size}" fill="url(#g)"/>
     <rect width="${size}" height="${size}" fill="url(#glow)"/>
     ${markGroup(size * 0.2, size * 0.2, size * 0.6)}`,
    gradientDef() + glow(size * 0.25, size * 0.15, size * 0.75, 0.22),
  );

// 1. App icons (Expo)
png(iconSvg(), 'assets/icon.png', 1024);
// Adaptive icon: foreground mark within the 66% safe zone, gradient background layer, monochrome layer.
png(svg(1024, 1024, markGroup(1024 * 0.29, 1024 * 0.29, 1024 * 0.42)), 'assets/adaptive-icon.png', 1024);
png(svg(1024, 1024, `<rect width="1024" height="1024" fill="url(#g)"/><rect width="1024" height="1024" fill="url(#glow)"/>`, gradientDef() + glow(260, 150, 800, 0.22)), 'assets/adaptive-icon-background.png', 1024);
png(svg(1024, 1024, markGroup(1024 * 0.29, 1024 * 0.29, 1024 * 0.42, '#000000')), 'assets/adaptive-icon-monochrome.png', 1024);
// Splash: rounded gradient tile with the mark (background colour comes from app.json per theme).
png(
  svg(512, 512, `<rect x="16" y="16" width="480" height="480" rx="120" fill="url(#g)"/>${markGroup(112, 112, 288)}`, gradientDef()),
  'assets/splash-icon.png',
  512,
);
png(svg(64, 64, `<rect width="64" height="64" rx="14" fill="url(#g)"/>${markGroup(10, 10, 44)}`, gradientDef()), 'assets/favicon.png', 64);

// 2. Google Play: hi-res icon 512x512 (32-bit PNG, full square)
png(iconSvg(512), 'store/play/icon-512.png', 512);

// 3. Google Play: feature graphic 1024x500
const qrDots = (() => {
  // decorative QR-like pattern on the right
  let d = '';
  const seed = [0x6d, 0x3a, 0xb5, 0x5c, 0xe9, 0x27, 0x9b, 0x4e, 0xd3, 0x71, 0xac, 0x36];
  for (let r = 0; r < 12; r++)
    for (let c = 0; c < 12; c++) if ((seed[r] >> (c % 8)) & 1 && !((r < 4 && c < 4) || (r < 4 && c > 7) || (r > 7 && c < 4))) d += `<rect x="${c * 22}" y="${r * 22}" width="18" height="18" rx="6"/>`;
  const eye = (x, y) => `<rect x="${x}" y="${y}" width="84" height="84" rx="26" fill="none" stroke="#fff" stroke-width="16"/><rect x="${x + 26}" y="${y + 26}" width="32" height="32" rx="10"/>`;
  return `<g fill="#fff">${d}${eye(0, 0)}${eye(176, 0)}${eye(0, 176)}</g>`;
})();

png(
  svg(
    1024,
    500,
    `<rect width="1024" height="500" fill="url(#g)"/>
     <rect width="1024" height="500" fill="url(#glow)"/>
     <circle cx="930" cy="-40" r="260" fill="#fff" opacity="0.08"/>
     <circle cx="860" cy="560" r="200" fill="#fff" opacity="0.06"/>
     <g transform="translate(64 138)">
       <rect width="104" height="104" rx="28" fill="#fff" opacity="0.18"/>
       ${markGroup(14, 14, 76)}
     </g>
     <text x="64" y="330" font-family="Segoe UI, Arial" font-weight="800" font-size="76" fill="#fff" letter-spacing="-2">Qraft</text>
     <text x="66" y="378" font-family="Segoe UI, Arial" font-weight="600" font-size="30" fill="#fff" opacity="0.95">QR &amp; Barcode Studio</text>
     <text x="66" y="428" font-family="Segoe UI, Arial" font-weight="500" font-size="22" fill="#fff" opacity="0.85">Scan · Design · 100% offline &amp; private</text>
     <g transform="translate(620 96) rotate(-6 150 150)">
       <rect x="-28" y="-28" width="320" height="320" rx="56" fill="#fff" opacity="0.14" stroke="#fff" stroke-opacity="0.35" stroke-width="2"/>
       ${qrDots}
     </g>`,
    gradientDef() + glow(200, 60, 700, 0.2),
  ),
  'store/play/feature-graphic-1024x500.png',
  1024,
);

// 4. Brand mark on light background (for README / website)
png(
  svg(1200, 400, `<rect width="1200" height="400" fill="#F4F2FF"/><g transform="translate(120 100)"><rect width="200" height="200" rx="52" fill="url(#g)"/>${markGroup(30, 30, 140)}</g>
   <text x="370" y="225" font-family="Segoe UI, Arial" font-weight="800" font-size="120" fill="#17172B" letter-spacing="-3">Qraft</text>
   <text x="374" y="285" font-family="Segoe UI, Arial" font-weight="600" font-size="36" fill="${INDIGO}">QR &amp; Barcode Studio</text>`, gradientDef()),
  'store/brand-logo.png',
  1200,
);

// 5. Google Play phone screenshots (1080x1920) from raw captures in store/play/raw
const SHOTS = [
  ['1-home', 'Scan anything,', 'instantly'],
  ['2-studio', 'Design stunning', 'QR codes'],
  ['3-result', 'Smart actions', 'for every scan'],
  ['4-safety', 'Safer links,', 'clear warnings'],
  ['5-create', '17 QR types', '+ 9 barcode formats'],
];
for (const [name, l1, l2] of SHOTS) {
  const raw = out(`store/play/raw/${name}.png`);
  if (!fs.existsSync(raw)) continue;
  const b64 = fs.readFileSync(raw).toString('base64');
  const W = 1080, H = 1920;
  const pw = 700, ph = Math.round((pw * 2424) / 1080); // phone screen size
  const px = (W - pw) / 2, py = 470;
  png(
    svg(
      W,
      H,
      `<rect width="${W}" height="${H}" fill="url(#g)"/>
       <rect width="${W}" height="${H}" fill="url(#glow)"/>
       <circle cx="980" cy="120" r="260" fill="#fff" opacity="0.07"/>
       <text x="${W / 2}" y="190" text-anchor="middle" font-family="Segoe UI, Arial" font-weight="800" font-size="86" fill="#fff" letter-spacing="-2">${l1}</text>
       <text x="${W / 2}" y="292" text-anchor="middle" font-family="Segoe UI, Arial" font-weight="800" font-size="86" fill="#fff" letter-spacing="-2" opacity="0.92">${l2.replace('&', '&amp;')}</text>
       <g transform="translate(${W / 2 - 120} 350)">${markGroup(0, 0, 44)}<text x="58" y="34" font-family="Segoe UI, Arial" font-weight="700" font-size="32" fill="#fff" opacity="0.9">Qraft</text></g>
       <rect x="${px - 18}" y="${py - 18}" width="${pw + 36}" height="${ph + 36}" rx="78" fill="#17172B"/>
       <clipPath id="c"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="62"/></clipPath>
       <image x="${px}" y="${py}" width="${pw}" height="${ph}" href="data:image/png;base64,${b64}" clip-path="url(#c)" preserveAspectRatio="xMidYMin slice"/>`,
      gradientDef() + glow(200, 100, 1300, 0.2),
    ),
    `store/play/screenshot-${name}.png`,
    W,
  );
}
