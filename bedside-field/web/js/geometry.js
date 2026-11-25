// Viewing geometry: converts between visual angle and screen pixels, and lays out
// the stimulus locations. Convention everywhere in the app:
//   h = horizontal visual angle, positive to the PATIENT'S RIGHT (screen right)
//   v = vertical visual angle, positive UP
// Quadrant names are in the patient's visual field: UR, UL, LR, LL.

import { deg2rad, rad2deg } from './util.js';

export const CARD_W_MM = 85.6; // ISO/IEC 7810 ID-1 card (credit / ID card)
export const CARD_H_MM = 53.98;

export function pxPerMmFromDiagonal(diagInches, w, h) {
  return Math.hypot(w, h) / (diagInches * 25.4);
}

// Rough CSS px per mm from the short side of the screen. Used only when the person skips calibration
// (good to roughly +/-10 %, which is why the app labels it "estimated" everywhere it is shown).
export function estimatePxPerMm(shortSidePx = Math.min(screen.width, screen.height)) {
  if (shortSidePx < 600) return 6.1;   // phones
  if (shortSidePx < 780) return 5.4;   // small tablets
  return 4.7;                          // 10-13 inch tablets
}

export class Geometry {
  constructor({ pxPerMm, distanceCm, width, height }) {
    this.pxPerMm = pxPerMm;
    this.distanceCm = distanceCm;
    this.width = width;
    this.height = height;
    this.cx = width / 2;
    this.cy = height / 2;
  }
  get dMm() {
    return this.distanceCm * 10;
  }
  pointFromDeg(h, v) {
    return {
      x: this.cx + this.dMm * Math.tan(deg2rad(h)) * this.pxPerMm,
      y: this.cy - this.dMm * Math.tan(deg2rad(v)) * this.pxPerMm,
    };
  }
  degFromPoint(x, y) {
    const dx = (x - this.cx) / this.pxPerMm;
    const dy = (this.cy - y) / this.pxPerMm;
    return { h: rad2deg(Math.atan(dx / this.dMm)), v: rad2deg(Math.atan(dy / this.dMm)), ecc: rad2deg(Math.atan(Math.hypot(dx, dy) / this.dMm)) };
  }
  // Diameter in px of a disc subtending `deg` at the viewing distance.
  sizePx(deg) {
    return 2 * this.dMm * Math.tan(deg2rad(deg / 2)) * this.pxPerMm;
  }
  halfExtentDeg() {
    return {
      h: rad2deg(Math.atan(this.width / 2 / this.pxPerMm / this.dMm)),
      v: rad2deg(Math.atan(this.height / 2 / this.pxPerMm / this.dMm)),
    };
  }
  summary(stimDeg) {
    const e = this.halfExtentDeg();
    return {
      pxPerMm: +this.pxPerMm.toFixed(4),
      distanceCm: this.distanceCm,
      width: Math.round(this.width),
      height: Math.round(this.height),
      halfDegH: +e.h.toFixed(1),
      halfDegV: +e.v.toFixed(1),
      stimDeg,
    };
  }
}

const QUADS = [
  { quad: 'UR', sx: +1, sy: -1 },
  { quad: 'UL', sx: -1, sy: -1 },
  { quad: 'LR', sx: +1, sy: +1 },
  { quad: 'LL', sx: -1, sy: +1 },
];

// Usable half-extents (px) leaving room for the stimulus, edge margin and the
// examiner status strip at the top / buttons at the bottom.
function usableHalf(geo, stimDeg) {
  const r = geo.sizePx(stimDeg) / 2;
  const margin = r + 24;
  return { mx: Math.max(40, geo.width / 2 - margin - 8), my: Math.max(40, geo.height / 2 - margin - 56) };
}

export const RING_FRACTIONS = { in: 0.4, out: 0.75 };

// Quadrant screening locations: one inner and one outer ring point per quadrant,
// placed as fractions of the usable half-extent so the pattern adapts to the screen.
export function buildQuadLocations(geo, stimDeg) {
  const { mx, my } = usableHalf(geo, stimDeg);
  const out = [];
  for (const q of QUADS) {
    for (const [ring, f] of Object.entries(RING_FRACTIONS)) {
      const x = geo.cx + q.sx * f * mx;
      const y = geo.cy + q.sy * f * my;
      const d = geo.degFromPoint(x, y);
      out.push({ id: `${q.quad}-${ring}`, kind: 'quad', quad: q.quad, ring, x, y, h: d.h, v: d.v, ecc: d.ecc });
    }
  }
  return out;
}

// Double simultaneous stimulation: mirror-image pairs at two elevations.
export function buildDssLocations(geo, stimDeg) {
  const { mx, my } = usableHalf(geo, stimDeg);
  const out = [];
  for (const [elev, sy] of [['up', -1], ['lo', +1]]) {
    for (const [side, sx] of [['L', -1], ['R', +1]]) {
      const x = geo.cx + sx * 0.6 * mx;
      const y = geo.cy + sy * 0.45 * my;
      const d = geo.degFromPoint(x, y);
      out.push({ id: `DSS-${elev}-${side}`, kind: 'dss', elev, side, quad: (sy < 0 ? 'U' : 'L') + side, x, y, h: d.h, v: d.v, ecc: d.ecc });
    }
  }
  return out;
}

// Easy, near-central locations used only for the touch-mode practice trials.
export function buildPracticeLocations(geo, stimDeg) {
  const { mx, my } = usableHalf(geo, stimDeg);
  return [
    { id: 'PR-1', kind: 'practice', x: geo.cx + 0.28 * mx, y: geo.cy - 0.3 * my },
    { id: 'PR-2', kind: 'practice', x: geo.cx - 0.28 * mx, y: geo.cy + 0.3 * my },
  ].map((p) => ({ ...p, ...geo.degFromPoint(p.x, p.y), quad: 'PR' }));
}
