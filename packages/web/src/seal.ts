// SPDX-License-Identifier: Apache-2.0
// A wax seal drawn from a commitment hash: the outline wobble and the stamped letters come from the hash bytes, so
// every seal on screen is the visible face of the exact value stored on the public ledger.

const point = (cx: number, cy: number, r: number, a: number): [number, number] => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

/** Smooth closed path through points (Catmull-Rom converted to cubic Bezier). */
function closedPath(pts: [number, number][]): string {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d + 'Z';
}

/** The irregular wax outline: radius wobbles with the hash bytes. */
function waxOutline(bytes: number[], c: number, r: number): string {
  const outline: [number, number][] = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const b = bytes[i % bytes.length] / 255;
    outline.push(point(c, c, r * (0.93 + 0.08 * b + 0.025 * Math.sin(a * 5 + bytes[1])), a));
  }
  return closedPath(outline);
}

const WAX_STOPS = '<stop offset="0" stop-color="#ef7457"/><stop offset=".5" stop-color="#c9432f"/><stop offset="1" stop-color="#8c2416"/>';

export function sealSvg(hex: string, size = 112): string {
  const bytes = (hex.match(/../g) ?? ['00']).map((h) => parseInt(h, 16));
  const id = `w${hex.slice(0, 10)}${size}`;
  const c = size / 2, r = size * 0.43;
  const label = hex.slice(0, 4).toUpperCase();
  const fs = size * 0.19;
  return `<svg class="seal-svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
  <defs><radialGradient id="${id}" cx="36%" cy="30%" r="78%">${WAX_STOPS}</radialGradient></defs>
  <path d="${waxOutline(bytes, c, r)}" fill="url(#${id})"/>
  <circle cx="${c}" cy="${c + 1}" r="${r * 0.66}" fill="none" stroke="rgba(255,190,170,.28)" stroke-width="2"/>
  <circle cx="${c}" cy="${c}" r="${r * 0.66}" fill="none" stroke="rgba(70,10,4,.42)" stroke-width="2.4"/>
  <text x="${c}" y="${c + fs * 0.36 + 1}" text-anchor="middle" font-size="${fs}" class="seal-text seal-text-hi">${label}</text>
  <text x="${c}" y="${c + fs * 0.36}" text-anchor="middle" font-size="${fs}" class="seal-text">${label}</text>
</svg>`;
}

// The "S" of Bricolage Grotesque ExtraBold (SIL OFL 1.1), as an outline in font units (y up, 1000 per em), so the
// monogram renders the same everywhere, favicon included, without loading the font.
const MONOGRAM_S = 'M331 -14Q267 -14 215 -2Q163 10 125 34.5Q87 59 65 97Q43 135 39 185L180 232Q183 190 204 162Q225 134 260.5 120.5Q296 107 340 107Q382 107 410.5 117.5Q439 128 453.5 144.5Q468 161 468 180Q468 202 449 216.5Q430 231 397 241.5Q364 252 320 262Q270 274 222 288Q174 302 135 324.5Q96 347 73.5 382.5Q51 418 51 472Q51 533 82 578Q113 623 173 648.5Q233 674 321 674Q408 674 469 649Q530 624 563 579.5Q596 535 599 476L455 435Q455 464 445.5 486Q436 508 419 522.5Q402 537 377 544.5Q352 552 320 552Q282 552 255.5 543Q229 534 216 519.5Q203 505 203 486Q203 462 223.5 446.5Q244 431 279.5 420.5Q315 410 358 400Q401 391 447 377.5Q493 364 533 342Q573 320 597.5 282.5Q622 245 622 188Q622 127 589.5 81.5Q557 36 492 11Q427 -14 331 -14Z';

/**
 * The brand mark: a wax seal pressed with an S monogram. No live text, so it stays crisp from 16 px favicon size up.
 */
export function emblemSvg(size = 48, id = 'emblem'): string {
  const bytes = [0x5e, 0xa1, 0xed, 0xc0, 0xde, 0x3a, 0x91, 0x6c, 0xb4, 0x27, 0xf0, 0x48];
  const c = size / 2, r = size * 0.45;
  const ring = r * 0.68, sw = Math.max(1, size / 34);
  // glyph box: x 39..622, y -14..674 (font units); scale it to 0.86 r tall and centre it
  const s = (r * 0.86) / 688, gx = c - (583 * s) / 2 - 39 * s, gy = c + (688 * s) / 2 - 14 * s;
  const glyph = (dy: number, fill: string) => `<path d="${MONOGRAM_S}" transform="translate(${gx.toFixed(2)},${(gy + dy).toFixed(2)}) scale(${s.toFixed(5)},${(-s).toFixed(5)})" fill="${fill}"/>`;
  return `<svg class="emblem-svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
  <defs><radialGradient id="${id}" cx="36%" cy="30%" r="80%">${WAX_STOPS}</radialGradient></defs>
  <path d="${waxOutline(bytes, c, r)}" fill="url(#${id})"/>
  <circle cx="${c}" cy="${c + sw * 0.6}" r="${ring}" fill="none" stroke="rgba(255,196,178,.34)" stroke-width="${sw}"/>
  <circle cx="${c}" cy="${c}" r="${ring}" fill="none" stroke="rgba(66,9,3,.5)" stroke-width="${sw * 1.2}"/>
  ${glyph(Math.max(0.8, size / 40) * 0.7, 'rgba(255,200,186,.36)')}
  ${glyph(0, 'rgba(70,10,4,.6)')}
</svg>`;
}
