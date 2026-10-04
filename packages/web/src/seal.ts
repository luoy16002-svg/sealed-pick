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

export function sealSvg(hex: string, size = 112): string {
  const bytes = (hex.match(/../g) ?? ['00']).map((h) => parseInt(h, 16));
  const id = `w${hex.slice(0, 10)}`;
  const c = size / 2, r = size * 0.43;
  const outline: [number, number][] = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const b = bytes[i % bytes.length] / 255;
    outline.push(point(c, c, r * (0.93 + 0.08 * b + 0.025 * Math.sin(a * 5 + bytes[1])), a));
  }
  const label = hex.slice(0, 4).toUpperCase();
  const fs = size * 0.19;
  return `<svg class="seal-svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
  <defs>
    <radialGradient id="${id}" cx="36%" cy="30%" r="78%">
      <stop offset="0" stop-color="#ef7457"/><stop offset=".5" stop-color="#c9432f"/><stop offset="1" stop-color="#8c2416"/>
    </radialGradient>
  </defs>
  <path d="${closedPath(outline)}" fill="url(#${id})"/>
  <circle cx="${c}" cy="${c + 1}" r="${r * 0.66}" fill="none" stroke="rgba(255,190,170,.28)" stroke-width="2"/>
  <circle cx="${c}" cy="${c}" r="${r * 0.66}" fill="none" stroke="rgba(70,10,4,.42)" stroke-width="2.4"/>
  <text x="${c}" y="${c + fs * 0.36 + 1}" text-anchor="middle" font-size="${fs}" class="seal-text seal-text-hi">${label}</text>
  <text x="${c}" y="${c + fs * 0.36}" text-anchor="middle" font-size="${fs}" class="seal-text">${label}</text>
</svg>`;
}
