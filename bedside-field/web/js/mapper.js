// Gaze mapper: turns iris features (+ head position) into screen gaze angles, and MEASURES how
// accurate that is on the device in front of you. Pure and DOM-free; unit-tested in tests/.
//
// Terms (same as eye-tracker literature):
//   accuracy  = average offset between where the person was told to look and where the tracker says
//   precision = sample-to-sample steadiness while the person holds one point
//
// Model, per axis:  feature = b + A·u (+ Q(u))   with u = (eye-in-head angle) / 10°
//   'diag'  independent axes (what v1.0 assumed)
//   'lin'   2x2 matrix: also captures the horizontal feature moving when the eyes look up/down and vice versa
//   'quad'  adds u², u·v, v² terms for the mild non-linearity at the edges of the field
// The model is picked by LEAVE-ONE-DOT-OUT cross-validation in DEGREES: a more complex model has to
// beat the simpler one by 10 % (25 % for 'quad') on dots it has never seen, so it cannot win by over-fitting.
//
// The forward model is fitted (response = noisy feature, regressors = exactly known dot angles), so
// per-frame noise does not shrink the slope; gaze is then recovered by inverting it.
//
// Head translation: moving the head sideways by t changes where the same eye-in-head angle points
// on the screen by atan(t / distance). Eye-corner positions (which do not move with gaze) give the
// head position in inter-eye-distance units (~63 mm each), so this is corrected from geometry. The
// correction is on by default and is switched OFF automatically if cross-validation shows it
// makes things worse (wrong mirror sign, wrong distance...).

import { median, mean, std, clamp, rad2deg } from './util.js';

export const IPD_MM = 63;
export const U = 10; // degrees per regressor unit
export const ACC = { EXCELLENT: 1.0, GOOD: 2.0, FAIR: 3.5, GATE_X: 4.0, GATE_Y: 3.5 };

export function gradeOf(accDeg) {
  if (!Number.isFinite(accDeg)) return 'unknown';
  return accDeg <= ACC.EXCELLENT ? 'excellent' : accDeg <= ACC.GOOD ? 'good' : accDeg <= ACC.FAIR ? 'fair' : 'limited';
}

// ---------- small linear algebra ----------

/** Solve A x = b by Gaussian elimination with partial pivoting. null if singular. */
export function solve(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

/** Weighted least squares with a tiny ridge on every term except the intercept (column 0). */
function wls(X, y, w, ridge = 1e-6) {
  const p = X[0].length;
  const A = Array.from({ length: p }, () => new Array(p).fill(0));
  const b = new Array(p).fill(0);
  let sw = 0;
  for (let i = 0; i < X.length; i++) {
    sw += w[i];
    for (let j = 0; j < p; j++) {
      b[j] += w[i] * X[i][j] * y[i];
      for (let k = 0; k < p; k++) A[j][k] += w[i] * X[i][j] * X[i][k];
    }
  }
  for (let j = 1; j < p; j++) A[j][j] += ridge * sw;
  return solve(A, b);
}

export function slopeFit(xs, ys) {
  const n = xs.length, mx = mean(xs), my = mean(ys);
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); syy += (ys[i] - my) ** 2; }
  const k = sxx > 0 ? sxy / sxx : 0;
  return { k, a: my - k * mx, r2: sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : 0 };
}

// ---------- head translation ----------

/** Degrees to ADD to the eye-derived gaze when the head is away from where it was at calibration. */
export function headCorr(M, s) {
  if (!M.useHead || !Number.isFinite(s.hx) || !Number.isFinite(s.hy)) return { cx: 0, cy: 0 };
  const LIM = 80; // mm, sanity bound
  const tx = clamp((s.hx - M.h0.x) * IPD_MM * M.hsign, -LIM, LIM); // screen-right positive
  const ty = clamp((s.hy - M.h0.y) * IPD_MM, -LIM, LIM);           // screen-down positive
  return { cx: rad2deg(Math.atan(tx / M.D)), cy: rad2deg(Math.atan(ty / M.D)) };
}

// ---------- model ----------

const REG = {
  diag: (ux, uy, axis) => (axis === 0 ? [1, ux] : [1, uy]),
  lin: (ux, uy) => [1, ux, uy],
  quad: (ux, uy) => [1, ux, uy, ux * ux, ux * uy, uy * uy],
};

function fitModel(pts, model, base) {
  const X = [[], []], y = [[], []], w = [];
  for (const p of pts) {
    const wt = 1 / p.f.length; // every dot counts equally, however many frames it has
    for (const fr of p.f) {
      const hc = headCorr(base, fr);
      const ux = (p.dx - hc.cx) / U, uy = (p.dy - hc.cy) / U; // eye-in-head angle that fixates the dot
      X[0].push(REG[model](ux, uy, 0)); X[1].push(REG[model](ux, uy, 1));
      y[0].push(fr.x); y[1].push(fr.y);
      w.push(wt);
    }
  }
  const c0 = wls(X[0], y[0], w), c1 = wls(X[1], y[1], w);
  if (!c0 || !c1) return null;
  const M = { ...base, model, b: [c0[0], c1[0]], Q: null };
  if (model === 'diag') M.A = [[c0[1], 0], [0, c1[1]]];
  else M.A = [[c0[1], c0[2]], [c1[1], c1[2]]];
  if (model === 'quad') M.Q = [[c0[3], c0[4], c0[5]], [c1[3], c1[4], c1[5]]];
  if (!(Math.abs(M.A[0][0]) > 1e-6) || !(Math.abs(M.A[1][1]) > 1e-6)) return null;
  return M;
}

/** Invert the forward model: features -> eye-in-head angle (units of U degrees). */
function invertEye(M, fx, fy, useY) {
  const rx = fx - M.b[0], ry = fy - M.b[1];
  const [[a, b], [c, d]] = M.A;
  const det = a * d - b * c;
  if (M.model === 'diag' || !useY || Math.abs(det) < 0.25 * Math.abs(a * d)) {
    return { ux: rx / a, uy: useY ? ry / d : 0 }; // ignore cross terms when they are ill-conditioned
  }
  let ux = (d * rx - b * ry) / det, uy = (-c * rx + a * ry) / det;
  if (M.model === 'quad' && M.Q) {
    const [q0, q1] = M.Q;
    for (let it = 0; it < 5; it++) {
      const e0 = rx - (a * ux + b * uy + q0[0] * ux * ux + q0[1] * ux * uy + q0[2] * uy * uy);
      const e1 = ry - (c * ux + d * uy + q1[0] * ux * ux + q1[1] * ux * uy + q1[2] * uy * uy);
      const j00 = a + 2 * q0[0] * ux + q0[1] * uy, j01 = b + q0[1] * ux + 2 * q0[2] * uy;
      const j10 = c + 2 * q1[0] * ux + q1[1] * uy, j11 = d + q1[1] * ux + 2 * q1[2] * uy;
      const dj = j00 * j11 - j01 * j10;
      if (Math.abs(dj) < 1e-12) break;
      const stepX = (j11 * e0 - j01 * e1) / dj, stepY = (-j10 * e0 + j00 * e1) / dj;
      ux += stepX; uy += stepY;
      if (Math.abs(stepX) + Math.abs(stepY) < 1e-7) break;
    }
    ux = clamp(ux, -4, 4); uy = clamp(uy, -4, 4); // +-40 deg safety net
  }
  return { ux, uy };
}

/** Sample {x, y, hx?, hy?} -> screen gaze in degrees from the calibration centre (right +, DOWN +). */
export function predict(M, s, { okY = true } = {}) {
  const { ux, uy } = invertEye(M, s.x, s.y, okY);
  const hc = headCorr(M, s);
  return { gx: ux * U + hc.cx, gy: okY ? uy * U + hc.cy : 0 };
}

// ---------- fitting ----------

/** Drop blink / tracking-glitch frames: > k robust SDs from the dwell median on either axis. */
export function trimFrames(frames, { k = 3.5, floor = 0.004, minN = 6 } = {}) {
  const f = (frames || []).filter((r) => Number.isFinite(r.x) && Number.isFinite(r.y));
  if (f.length < minN) return null;
  const mx = median(f.map((r) => r.x)), my = median(f.map((r) => r.y));
  const sx = Math.max(median(f.map((r) => Math.abs(r.x - mx))) * 1.4826, floor);
  const sy = Math.max(median(f.map((r) => Math.abs(r.y - my))) * 1.4826, floor);
  const keep = f.filter((r) => Math.abs(r.x - mx) <= k * sx && Math.abs(r.y - my) <= k * sy);
  return keep.length >= minN ? keep : null;
}

function prepare(rawPts, minN) {
  const out = [];
  for (const p of rawPts) {
    const f = trimFrames(p.frames, { minN });
    if (!f) continue;
    const hxs = f.map((r) => r.hx).filter(Number.isFinite), hys = f.map((r) => r.hy).filter(Number.isFinite);
    out.push({
      dx: p.dx, dy: p.dy, f,
      mx: median(f.map((r) => r.x)), my: median(f.map((r) => r.y)),
      mhx: hxs.length ? mean(hxs) : NaN, mhy: hys.length ? mean(hys) : NaN,
    });
  }
  return out;
}

function withinDwellSd(M, pts) {
  const sx = [], sy = [];
  for (const p of pts) {
    const g = p.f.map((fr) => predict(M, fr, { okY: true }));
    sx.push(std(g.map((v) => v.gx)) ** 2);
    sy.push(std(g.map((v) => v.gy)) ** 2);
  }
  return { x: Math.sqrt(mean(sx)), y: Math.sqrt(mean(sy)) };
}

/**
 * rawPts: [{ dx, dy, frames: [{ x, y, hx?, hy? }] }]   dx = screen-RIGHT degrees, dy = screen-DOWN degrees of the dot
 * Returns { ok, M, cv, cvAll, precision, nPoints } or { ok: false, reason }.
 */
export function fitMapping(rawPts, { distanceMm = 300, headComp = true } = {}) {
  const pts = prepare(rawPts, 6);
  if (pts.length < 6) return { ok: false, reason: `Only ${pts.length} of ${rawPts.length} dots had steady gaze data (face or eyes lost?)` };
  const spanX = Math.max(...pts.map((p) => p.dx)) - Math.min(...pts.map((p) => p.dx));
  const spanY = Math.max(...pts.map((p) => p.dy)) - Math.min(...pts.map((p) => p.dy));
  if (spanX < 5) return { ok: false, reason: 'Dots did not cover enough of the screen width' };

  const k = slopeFit(pts.map((p) => p.dx), pts.map((p) => p.mx)).k;
  const hsign = k > 0 ? 1 : -1;                     // k > 0: stream is mirrored (screen-right = image-right)
  const hxs = pts.map((p) => p.mhx).filter(Number.isFinite), hys = pts.map((p) => p.mhy).filter(Number.isFinite);
  const haveHead = hxs.length === pts.length && hys.length === pts.length;
  const h0 = { x: haveHead ? mean(hxs) : 0, y: haveHead ? mean(hys) : 0 };
  const baseOf = (useHead) => ({ hsign, h0, D: distanceMm, useHead: useHead && haveHead });

  const cvRms = (model, useHead) => {
    let ex = 0, ey = 0;
    for (let i = 0; i < pts.length; i++) {
      const M = fitModel(pts.filter((_, j) => j !== i), model, baseOf(useHead));
      if (!M) return null;
      const p = pts[i];
      const g = predict(M, { x: p.mx, y: p.my, hx: p.mhx, hy: p.mhy }, { okY: true });
      ex += (g.gx - p.dx) ** 2; ey += (g.gy - p.dy) ** 2;
    }
    const n = pts.length;
    return { x: Math.sqrt(ex / n), y: Math.sqrt(ey / n), total: Math.sqrt((ex + ey) / n) };
  };

  const useHead0 = headComp && haveHead;
  const candidates = spanY >= 3 ? ['diag', 'lin', ...(pts.length >= 8 ? ['quad'] : [])] : ['diag'];
  const cvAll = {};
  for (const m of candidates) cvAll[m] = cvRms(m, useHead0);
  // A richer model must win on unseen dots by a margin that grows with its flexibility (10 % for the
  // 2x2 matrix, 25 % for the quadratic one), so noise alone rarely buys extra terms.
  const MARGIN = { lin: 0.9, quad: 0.75 };
  let best = 'diag';
  for (const m of candidates.slice(1)) {
    if (cvAll[m] && cvAll[best] && cvAll[m].total < MARGIN[m] * cvAll[best].total) best = m;
  }
  if (!cvAll[best]) return { ok: false, reason: 'Calibration fit was degenerate (dots too close together?)' };

  // Head correction is a physical prior; the data may overrule it, never silently confirm a wrong one.
  let useHead = useHead0;
  if (useHead0) {
    const without = cvRms(best, false);
    if (without && without.total < 0.9 * cvAll[best].total) useHead = false;
  }
  const cv = useHead === useHead0 ? cvAll[best] : cvRms(best, useHead);

  const M = fitModel(pts, best, baseOf(useHead));
  if (!M) return { ok: false, reason: 'Calibration fit failed' };
  return {
    ok: true, M, cv, cvAll, nPoints: pts.length, nDropped: rawPts.length - pts.length,
    headChecked: haveHead, precision: withinDwellSd(M, pts),
  };
}

/**
 * Out-of-sample accuracy: dots that were NOT used to fit the map.
 * Returns { ok, n, accX, accY, acc, worst, biasX, biasY, precision, grade, perPoint }.
 */
export function validateMapping(M, rawPts) {
  const pts = prepare(rawPts, 5);
  if (pts.length < 3) return { ok: false, n: pts.length, reason: 'Too few steady validation dots' };
  const per = pts.map((p) => {
    const g = predict(M, { x: p.mx, y: p.my, hx: p.mhx, hy: p.mhy }, { okY: true });
    return { dx: p.dx, dy: p.dy, ex: g.gx - p.dx, ey: g.gy - p.dy };
  });
  const rad = per.map((e) => Math.hypot(e.ex, e.ey));
  const acc = mean(rad);
  return {
    ok: true, n: pts.length,
    accX: mean(per.map((e) => Math.abs(e.ex))), accY: mean(per.map((e) => Math.abs(e.ey))),
    acc, worst: Math.max(...rad),
    biasX: mean(per.map((e) => e.ex)), biasY: mean(per.map((e) => e.ey)),
    precision: withinDwellSd(M, pts), grade: gradeOf(acc), perPoint: per,
  };
}

/** Do both eyes respond like each other? Returns null when per-eye data is missing. */
export function eyeAgreement(rawPts) {
  const rows = [];
  for (const p of rawPts) {
    const f = (p.frames || []).filter((r) => Number.isFinite(r.xr) && Number.isFinite(r.xl));
    if (f.length >= 6) rows.push({ dx: p.dx, xr: median(f.map((r) => r.xr)), xl: median(f.map((r) => r.xl)) });
  }
  if (rows.length < 5) return null;
  const R = slopeFit(rows.map((r) => r.dx), rows.map((r) => r.xr));
  const L = slopeFit(rows.map((r) => r.dx), rows.map((r) => r.xl));
  const big = Math.max(Math.abs(R.k), Math.abs(L.k)) || 1e-9;
  const ratio = Math.min(Math.abs(R.k), Math.abs(L.k)) / big;
  const ok = R.k * L.k > 0 && ratio >= 0.6 && R.r2 >= 0.8 && L.r2 >= 0.8;
  return { ok, ratio, kR: R.k, kL: L.k, r2R: R.r2, r2L: L.r2, weaker: Math.abs(R.k) < Math.abs(L.k) ? 'right' : 'left' };
}

// ---------- live smoothing ----------

/** One-Euro filter: strong smoothing at rest, almost none during a fast eye movement. */
export class OneEuro {
  constructor({ minCutoff = 1.5, beta = 0.05, dCutoff = 1.0 } = {}) {
    this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff;
    this.reset();
  }
  reset() { this.x = null; this.dx = 0; this.t = null; }
  _alpha(cutoff, dt) { return 1 / (1 + 1 / (2 * Math.PI * cutoff) / dt); }
  filter(v, tMs) {
    if (this.t === null) { this.t = tMs; this.x = v; this.dx = 0; return v; }
    const dt = Math.max((tMs - this.t) / 1000, 1e-3);
    this.t = tMs;
    const d = (v - this.x) / dt;
    this.dx += this._alpha(this.dCutoff, dt) * (d - this.dx);
    this.x += this._alpha(this.minCutoff + this.beta * Math.abs(this.dx), dt) * (v - this.x);
    return this.x;
  }
}

/** Live gaze for the examiner's ring: map every sample, smooth, hide when tracking is stale. */
export class GazeTracker {
  constructor(M, { okY = true, off = null } = {}) {
    this.M = M; this.okY = okY;
    this.off = off ? { x: off.x, y: off.y } : { x: 0, y: 0 };
    this.fx = new OneEuro(); this.fy = new OneEuro();
    this.recent = []; this.last = null;
  }
  push(s) {
    if (!s || !s.ok || !Number.isFinite(s.x) || !Number.isFinite(s.y)) return null;
    const p = predict(this.M, s, { okY: this.okY });
    this.recent.push(p); if (this.recent.length > 12) this.recent.shift();
    if (this.last && s.t - this.last.t > 400) { this.fx.reset(); this.fy.reset(); }
    this.last = { gx: this.fx.filter(p.gx + this.off.x, s.t), gy: this.fy.filter(p.gy + this.off.y, s.t), t: s.t };
    return this.last;
  }
  current(now, maxAgeMs = 250) {
    return this.last && now - this.last.t <= maxAgeMs ? this.last : null;
  }
  /** The person is looking at the centre dot right now: remove the current offset from the marker only. */
  recenter() {
    if (this.recent.length < 4) return false;
    this.off = { x: -median(this.recent.map((p) => p.gx)), y: this.okY ? -median(this.recent.map((p) => p.gy)) : 0 };
    this.fx.reset(); this.fy.reset();
    return true;
  }
}
