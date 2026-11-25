// Eye features from MediaPipe Face Mesh landmarks (with iris refinement). Pure functions, no DOM.
// A feature is the iris offset from the eye-corner midpoint, along and across the eye, divided by eye width, so it
// does not depend on how far the face is from the camera.

export const LM = {
  // Patient's RIGHT eye appears on the image LEFT in an un-mirrored front-camera frame.
  // Corners are ordered image-left -> image-right so one formula serves both eyes.
  R: { a: 33, b: 133, up: 159, lo: 145, iris: 468 },
  L: { a: 362, b: 263, up: 386, lo: 374, iris: 473 },
};

export const OPEN_MIN = 0.13; // lid gap / eye width below this = blink or closed eye

function eyeFeat(lm, e, W, H) {
  const P = (i) => ({ x: lm[i].x * W, y: lm[i].y * H });
  const A = P(e.a), B = P(e.b), up = P(e.up), lo = P(e.lo), ir = P(e.iris);
  const ax = B.x - A.x, ay = B.y - A.y;
  const w = Math.hypot(ax, ay);
  if (!(w > 8)) return null;
  const ux = ax / w, uy = ay / w; // along the eye, image-left -> image-right
  const nx = -uy, ny = ux;        // perpendicular, image-down
  const dx = ir.x - (A.x + B.x) / 2, dy = ir.y - (A.y + B.y) / 2;
  return {
    h: (dx * ux + dy * uy) / w,
    v: (dx * nx + dy * ny) / w,
    open: ((lo.x - up.x) * nx + (lo.y - up.y) * ny) / w,
    irisX: ir.x, irisY: ir.y,
    cx: (A.x + B.x) / 2, cy: (A.y + B.y) / 2, // eye-corner midpoint: moves with the head, not with the eye
  };
}

/** landmarks (normalised) + frame size -> per-eye features and inter-iris distance (px). */
export function computeFeatures(lm, W, H) {
  if (!lm || lm.length < 478) return null;
  const r = eyeFeat(lm, LM.R, W, H), l = eyeFeat(lm, LM.L, W, H);
  if (!r || !l) return null;
  // Head position in inter-eye-distance units, from eye-corner midpoints (unaffected by where the eyes point).
  const sep = Math.hypot(r.cx - l.cx, r.cy - l.cy);
  const hx = sep > 8 ? ((r.cx + l.cx) / 2 - W / 2) / sep : NaN;
  const hy = sep > 8 ? ((r.cy + l.cy) / 2 - H / 2) / sep : NaN;
  return { r, l, hx, hy, ipdPx: Math.hypot(r.irisX - l.irisX, r.irisY - l.irisY) };
}

/**
 * Combine eyes into one sample. eyeMode: 'both' | 'right' | 'left' (the VIEWING eye when one is covered).
 * 'both' requires both eyes open so that a single-eye blink can't shift the average.
 */
export function combine(f, eyeMode = 'both') {
  if (!f) return { ok: false };
  const okR = f.r.open >= OPEN_MIN, okL = f.l.open >= OPEN_MIN;
  // hx/hy: head position (for the 2D map's head correction); xr/xl: each eye's own horizontal feature (eye-agreement check)
  const extra = { hx: f.hx, hy: f.hy, xr: f.r.h, xl: f.l.h, yr: f.r.v, yl: f.l.v };
  if (eyeMode === 'right') return okR ? { ok: true, x: f.r.h, y: f.r.v, ...extra } : { ok: false };
  if (eyeMode === 'left') return okL ? { ok: true, x: f.l.h, y: f.l.v, ...extra } : { ok: false };
  if (!okR || !okL) return { ok: false };
  return { ok: true, x: (f.r.h + f.l.h) / 2, y: (f.r.v + f.l.v) / 2, ...extra };
}

/** Very rough camera-to-face distance from inter-iris distance (assumes IPD 63 mm, ~70 deg HFOV). */
export function estimateDistanceCm(ipdPx, frameW, hfovDeg = 70) {
  if (!(ipdPx > 1)) return NaN;
  const f = frameW / (2 * Math.tan((hfovDeg * Math.PI) / 360));
  return (f * 63) / ipdPx / 10;
}
