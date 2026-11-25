// Pure, DOM-free gaze analysis. Everything here is unit-tested in tests/.
//
// A gaze SAMPLE is { t, ok, x, y }:
//   t   ms timestamp (performance.now() clock)
//   ok  false when no face / eye closed (blink) / low confidence
//   x,y raw iris-offset features, normalised by eye width (see gaze.js).
//       Their sign and scale are device-specific, so the tracking check fits a
//       per-axis linear map  feature = a + k * gaze_degrees  (screen-right / screen-down positive).
//
// Detection works on CHANGE from a pre-stimulus baseline, so absolute offsets
// (camera above the screen, anatomy, eye-corner geometry) cancel out.

import { median, std, mean } from './util.js';
import { predict } from './mapper.js';

export const DET = {
  MIN_LATENCY_MS: 70,      // ignore anything faster than a plausible saccade after onset
  REACH_FRAC: 0.45,        // required fraction of the target eccentricity (first saccades are hypometric)
  FX: 0.4,                 // per-axis requirement: horizontal component
  FY: 0.25,                // per-axis requirement: vertical component (only if vertical tracking is trusted)
  SUSTAIN: 2,              // consecutive valid frames that must satisfy the criterion
  MIN_VALID_FRAC: 0.5,     // share of frames in the window that must have a usable face/eye
  PROMPT_LATENCY_MS: 900,  // first, target-directed response later than this is scored "delayed"
  BASE_WINDOW_MS: 450,
  BASE_MIN_N: 4,
};

// ---------- linear fit / calibration ----------

export function linfit(xs, ys) {
  const n = xs.length;
  const mx = mean(xs), my = mean(ys);
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
    syy += (ys[i] - my) ** 2;
  }
  const k = sxx > 0 ? sxy / sxx : 0;
  const a = my - k * mx;
  const r2 = syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;
  return { k, a, r2 };
}

// pts: [{ dx, dy, xs:[], ys:[] }]  dx = screen-right degrees, dy = screen-DOWN degrees of the dot
// Returns the calibration used by every later detection.
export function fitCalibration(pts) {
  const rows = pts
    .filter((p) => p.xs.length >= 4)
    .map((p) => ({ dx: p.dx, dy: p.dy, x: median(p.xs), y: median(p.ys), sx: std(p.xs), sy: std(p.ys) }));
  if (rows.length < 4) return { ok: false, okX: false, okY: false, reason: 'Not enough steady gaze data (face lost?)' };

  const fx = linfit(rows.map((r) => r.dx), rows.map((r) => r.x));
  const fy = linfit(rows.map((r) => r.dy), rows.map((r) => r.y));
  const noiseX = Math.sqrt(mean(rows.map((r) => (Number.isFinite(r.sx) ? r.sx : 0) ** 2)));
  const noiseY = Math.sqrt(mean(rows.map((r) => (Number.isFinite(r.sy) ? r.sy : 0) ** 2)));
  const spanX = Math.max(...rows.map((r) => r.dx)) - Math.min(...rows.map((r) => r.dx));
  const spanY = Math.max(...rows.map((r) => r.dy)) - Math.min(...rows.map((r) => r.dy));

  // Trusted when the end-to-end change across the dot positions clearly exceeds the
  // within-dwell jitter, and the response is monotonic (high R^2).
  const snrX = (Math.abs(fx.k) * spanX) / Math.max(noiseX, 1e-6);
  const snrY = (Math.abs(fy.k) * spanY) / Math.max(noiseY, 1e-6);
  const okX = spanX > 5 && snrX >= 6 && fx.r2 >= 0.8;
  const okY = spanY > 5 && snrY >= 6 && fy.r2 >= 0.7;
  return {
    ok: okX, // horizontal tracking is the minimum for hemifield screening
    okX, okY,
    kx: fx.k, ax: fx.a, r2x: fx.r2, snrX, noiseX, noiseDegX: noiseX / Math.max(Math.abs(fx.k), 1e-9),
    ky: fy.k, ay: fy.a, r2y: fy.r2, snrY, noiseY, noiseDegY: noiseY / Math.max(Math.abs(fy.k), 1e-9),
    flipped: fx.k > 0, // informational: typical un-mirrored front camera gives k<0 (screen-right -> image-left)
    reason: okX ? (okY ? '' : 'Vertical tracking too noisy: hemifield (left/right) scoring only') : 'Horizontal gaze change not reliably detected',
  };
}

// ---------- windows & baseline ----------

export function windowSamples(buf, t0, t1) {
  const out = [];
  for (let i = buf.length - 1; i >= 0; i--) {
    const s = buf[i];
    if (s.t < t0) break;
    if (s.t <= t1) out.push(s);
  }
  return out.reverse();
}

// Median gaze features over the last `dur` ms before tEnd. Returns null if too little data.
export function baselineFrom(buf, tEnd, dur = DET.BASE_WINDOW_MS) {
  const w = windowSamples(buf, tEnd - dur, tEnd).filter((s) => s.ok);
  if (w.length < DET.BASE_MIN_N) return null;
  const xs = w.map((s) => s.x), ys = w.map((s) => s.y);
  const hxs = w.map((s) => s.hx).filter(Number.isFinite), hys = w.map((s) => s.hy).filter(Number.isFinite);
  return {
    x: median(xs), y: median(ys), n: w.length, sdx: std(xs), sdy: std(ys),
    hx: hxs.length ? median(hxs) : undefined, hy: hys.length ? median(hys) : undefined, // head position, for the 2D map's head correction
  };
}

// Baseline spread expressed in degrees (used to confirm steady fixation).
export function spreadDeg(base, cal) {
  return {
    x: cal.okX ? (base.sdx || 0) / Math.abs(cal.kx) : 0,
    y: cal.okY ? (base.sdy || 0) / Math.abs(cal.ky) : 0,
  };
}

// With a fitted 2D map (cal.M, from the tracking check) both axes are read through it: this removes the
// horizontal<->vertical cross-talk and, if the head moved between baseline and sample, the head-translation
// part. Without one (older sessions, unit tests) the original per-axis linear map is used.
export function toDeg(s, base, cal) {
  if (cal.M) {
    const a = predict(cal.M, s, { okY: cal.okY }), b = predict(cal.M, base, { okY: cal.okY });
    return { dx: cal.okX ? a.gx - b.gx : 0, dy: cal.okY ? a.gy - b.gy : 0 };
  }
  return {
    dx: cal.okX ? (s.x - base.x) / cal.kx : 0,
    dy: cal.okY ? (s.y - base.y) / cal.ky : 0,
  };
}

// Absolute gaze relative to the calibrated straight-ahead point (the fixation anchor).
export function absDeg(s, cal) {
  if (cal.M) {
    const p = predict(cal.M, s, { okY: cal.okY });
    return { gx: cal.okX ? p.gx : 0, gy: cal.okY ? p.gy : 0 };
  }
  return {
    gx: cal.okX ? (s.x - cal.ax) / cal.kx : 0,
    gy: cal.okY ? (s.y - cal.ay) / cal.ky : 0,
  };
}

// Steady-fixation test used to gate stimulus onset in camera mode.
export function isFixating(buf, now, cal, { dur = 600, tolDegX = 12, tolDegY = 14, maxSpreadDeg = 2.5, minN = 6 } = {}) {
  const w = windowSamples(buf, now - dur, now);
  if (w.length < minN || w.some((s) => !s.ok)) return { stable: false, why: w.length < minN ? 'no-data' : 'blink-or-lost' };
  const base = baselineFrom(buf, now, dur);
  if (!base) return { stable: false, why: 'no-data' };
  const sp = spreadDeg(base, cal);
  const abs = absDeg({ x: base.x, y: base.y }, cal);
  const offX = cal.okX ? Math.abs(abs.gx) : 0;
  const offY = cal.okY ? Math.abs(abs.gy) : 0;
  // Slow drift / pursuit check: first-half vs second-half medians of the window.
  const half = Math.floor(w.length / 2);
  const m1x = median(w.slice(0, half).map((s) => s.x)), m2x = median(w.slice(half).map((s) => s.x));
  const driftX = cal.okX ? Math.abs(m2x - m1x) / Math.abs(cal.kx) : 0;
  if (sp.x > maxSpreadDeg || sp.y > maxSpreadDeg * 1.6 || driftX > 2.2) return { stable: false, why: 'moving', base, gx: abs.gx, gy: abs.gy };
  if (offX > tolDegX || offY > tolDegY) return { stable: false, why: 'off-center', base, gx: abs.gx, gy: abs.gy };
  return { stable: true, base, gx: abs.gx, gy: abs.gy };
}

// ---------- trial analysis ----------

function quadOf(dx, dy, useY) {
  const side = dx >= 0 ? 'R' : 'L';
  if (!useY) return side;
  return (dy >= 0 ? 'L' : 'U') + side; // dy > 0 = gaze moved DOWN = lower field
}

// Runs of >= SUSTAIN consecutive ok frames satisfying `pred`; returns the first frame of the first run.
function firstSustained(frames, pred, sustain = DET.SUSTAIN) {
  let run = 0, start = null;
  for (const f of frames) {
    if (!f.ok) { run = 0; start = null; continue; }
    if (pred(f)) {
      if (run === 0) start = f;
      run++;
      if (run >= sustain) return start;
    } else { run = 0; start = null; }
  }
  return null;
}

function frameDegs(win, base, cal) {
  return win.map((s) => (s.ok ? { ok: true, t: s.t, ...toDeg(s, base, cal) } : { ok: false, t: s.t }));
}

/**
 * Single peripheral target. target = { h, v } (visual angle, v up-positive).
 * Returns { valid, reason?, validFrac, outcome: 'seen'|'delayed'|'missed', latency, firstShift, peakDeg }
 */
export function analyzeSingle(buf, { onset, windowMs, base, cal, target }) {
  const win = windowSamples(buf, onset, onset + windowMs);
  const okN = win.filter((s) => s.ok).length;
  const validFrac = win.length ? okN / win.length : 0;
  if (!base) return { valid: false, reason: 'no baseline', validFrac };
  if (win.length < 4 || validFrac < DET.MIN_VALID_FRAC) return { valid: false, reason: 'tracking lost during trial', validFrac };

  const tx = target.h, ty = -target.v; // screen-down positive for y, matching features
  const tmag = Math.hypot(tx, ty);
  const useY = !!cal.okY;
  const frames = frameDegs(win, base, cal).filter((f) => !f.ok || f.t - onset >= DET.MIN_LATENCY_MS);

  const towardTarget = (f) => {
    const cx = f.dx * Math.sign(tx) >= DET.FX * Math.abs(tx);
    const cy = !useY ? true : f.dy * Math.sign(ty) >= DET.FY * Math.abs(ty);
    const proj = useY ? (f.dx * tx + f.dy * ty) / tmag : f.dx * Math.sign(tx);
    const need = DET.REACH_FRAC * (useY ? tmag : Math.abs(tx));
    return cx && cy && proj >= need;
  };
  const anyShift = (f) => Math.hypot(f.dx, useY ? f.dy : 0) >= DET.REACH_FRAC * (useY ? tmag : Math.abs(tx));

  const hitFrame = firstSustained(frames, towardTarget);
  const firstFrame = firstSustained(frames, anyShift);
  let peakDeg = 0;
  for (const f of frames) if (f.ok) peakDeg = Math.max(peakDeg, Math.hypot(f.dx, useY ? f.dy : 0));

  // The first sustained shift counts as "the" response to the target if it ends up target-directed
  // (small lead allowed: horizontal and vertical components rarely cross threshold on the same frame).
  const firstWasTarget = !!(hitFrame && firstFrame && hitFrame.t - firstFrame.t <= 150 && Math.sign(firstFrame.dx) === Math.sign(tx));
  const firstShift = firstFrame
    ? { t: firstFrame.t - onset, quad: quadOf(firstFrame.dx, firstFrame.dy, useY), towardTarget: firstWasTarget }
    : null;

  let outcome = 'missed', latency = null;
  if (hitFrame) {
    latency = (firstWasTarget ? firstFrame.t : hitFrame.t) - onset;
    outcome = firstWasTarget && latency <= DET.PROMPT_LATENCY_MS ? 'seen' : 'delayed';
  }
  return { valid: true, validFrac, outcome, latency, firstShift, peakDeg };
}

/** Catch trial: any sustained gaze shift of at least `refMag` degrees counts as a false alarm. */
export function analyzeCatch(buf, { onset, windowMs, base, cal, refMag }) {
  const win = windowSamples(buf, onset, onset + windowMs);
  const okN = win.filter((s) => s.ok).length;
  const validFrac = win.length ? okN / win.length : 0;
  if (!base || win.length < 4 || validFrac < DET.MIN_VALID_FRAC) return { valid: false, reason: 'tracking lost during trial', validFrac };
  const frames = frameDegs(win, base, cal);
  const f = firstSustained(frames, (q) => Math.hypot(q.dx, cal.okY ? q.dy : 0) >= DET.REACH_FRAC * refMag);
  return { valid: true, validFrac, falseAlarm: !!f, latency: f ? f.t - onset : null };
}

/**
 * Bilateral (double simultaneous) trial with a left target tL and right target tR.
 * Horizontal axis only: it is the discriminating axis and the most reliable one.
 * Returns { valid, first:{side,latency}|null, second:{side,latency}|null }
 */
export function analyzeBilateral(buf, { onset, windowMs, base, cal, tL, tR }) {
  const win = windowSamples(buf, onset, onset + windowMs);
  const okN = win.filter((s) => s.ok).length;
  const validFrac = win.length ? okN / win.length : 0;
  if (!base || win.length < 4 || validFrac < DET.MIN_VALID_FRAC) return { valid: false, reason: 'tracking lost during trial', validFrac };
  const frames = frameDegs(win, base, cal).filter((f) => !f.ok || f.t - onset >= DET.MIN_LATENCY_MS);
  const thrR = DET.REACH_FRAC * Math.abs(tR.h);
  const thrL = DET.REACH_FRAC * Math.abs(tL.h);

  const fR = firstSustained(frames, (f) => f.dx >= thrR);
  const fL = firstSustained(frames, (f) => -f.dx >= thrL);
  let first = null, second = null;
  const cand = [];
  if (fR) cand.push({ side: 'R', t: fR.t });
  if (fL) cand.push({ side: 'L', t: fL.t });
  cand.sort((a, b) => a.t - b.t);
  if (cand[0]) first = { side: cand[0].side, latency: cand[0].t - onset };
  if (cand[1]) second = { side: cand[1].side, latency: cand[1].t - onset };
  return { valid: true, validFrac, first, second };
}
