// Tracking check, the pure part: where the dots go, and how the gaze recorded on them becomes the calibration
// (`cal`) that every later trial is scored with. No DOM; the screen that runs the dots is screens/check.js.

import { clamp } from './util.js';
import { fitCalibration } from './detect.js';
import { fitMapping, validateMapping, eyeAgreement, ACC } from './mapper.js';

// Calibration grid (fits the map) and validation dots (never used in the fit) in screen-right / screen-DOWN degrees.
export const gridDots = (dx, dy) => [[0, 0], [dx, 0], [dx, dy], [0, dy], [-dx, dy], [-dx, 0], [-dx, -dy], [0, -dy], [dx, -dy]];
export const valDots = (dx, dy) => [[0.5 * dx, -0.5 * dy], [-0.5 * dx, -0.5 * dy], [-0.5 * dx, 0.5 * dy], [0.5 * dx, 0.5 * dy], [0, 0.5 * dy]];

/** Dot spread (degrees) for this screen and distance. */
export function dotExtent(geo) {
  const e = geo.halfExtentDeg();
  return { dx: +clamp(0.7 * e.h, 8, 18).toFixed(1), dy: +clamp(0.6 * e.v, 5, 9).toFixed(1) };
}

export const DOT_MS = 1400;       // each dot stays at least this long
export const SETTLE_MS = 650;     // after the dot jumps the eyes have landed and settled by then
export const DOT_MIN_FRAMES = 8;  // steady frames wanted per dot (the fit trims outliers and needs 6)
export const DOT_MAX_MS = 4000;   // ...but a dot never stays longer than this

/** Recorded dwell -> the frames kept for fitting (steady part of the dwell, usable frames only). */
export function dwellFrames(buf, t0, tEnd = t0 + DOT_MS) {
  return buf.filter((x) => x.t >= t0 + SETTLE_MS && x.t <= tEnd && x.ok)
    .map((x) => ({ x: x.x, y: x.y, hx: x.hx, hy: x.hy, xr: x.xr, xl: x.xl, yr: x.yr, yl: x.yl }));
}

/**
 * Keeps a dot up until it has enough steady frames. A device that tracks at ~30 fps has them after DOT_MS, so the
 * dot moves on exactly as before; a slow one (a phone tracking on the CPU at ~8 fps) or a face that briefly left the
 * picture gets more time, up to DOT_MAX_MS, instead of losing the dot. `onShort()` is called while waiting.
 */
export async function collectDot(buf, t0, { now, sleep, onShort = null }) {
  await sleep(Math.max(0, t0 + DOT_MS - now()));
  let frames = dwellFrames(buf, t0);
  while (frames.length < DOT_MIN_FRAMES && now() - t0 < DOT_MAX_MS) {
    onShort?.();
    await sleep(100);
    frames = dwellFrames(buf, t0, now());
  }
  return frames;
}

/** The same dwells, with x/y taken from one eye instead of the two-eye average. */
export function asEye(raw, eye) {
  if (eye === 'both') return raw;
  const fx = eye === 'right' ? 'xr' : 'xl', fy = eye === 'right' ? 'yr' : 'yl';
  return raw.map((p) => ({
    ...p,
    frames: p.frames.filter((f) => Number.isFinite(f[fx]) && Number.isFinite(f[fy])).map((f) => ({ ...f, x: f[fx], y: f[fy] })),
  }));
}

/**
 * A camera at the side of the screen (phones in landscape) sees the far eye at a steep angle, and averaging it in can
 * spoil the map. Fit both eyes, the right eye and the left eye; track a single eye only when its fit is clearly better
 * on the fit's own leave-one-dot-out error, so the validation dots stay unseen. Eyes move together, so with both eyes
 * open one eye is enough to see a saccade.
 */
export function chooseTrackedEye(rawCal, rawVal, { eye, fitOpts, allowSingleEye }) {
  let trackEye = eye, calPts = rawCal, valPts = rawVal;
  let fit = fitMapping(rawCal, fitOpts);
  if (eye === 'both' && allowSingleEye) {
    let one = null;
    for (const e of ['right', 'left']) {
      const pts = asEye(rawCal, e), f1 = fitMapping(pts, fitOpts);
      if (f1.ok && (!one || f1.cv.total < one.fit.cv.total)) one = { eye: e, pts, fit: f1 };
    }
    if (one && (!fit.ok || one.fit.cv.total < 0.85 * fit.cv.total)) {
      trackEye = one.eye; fit = one.fit; calPts = one.pts; valPts = asEye(rawVal, one.eye);
    }
  }
  return { trackEye, fit, calPts, valPts };
}

/**
 * Turns the recorded dots into the calibration. `rawCal`/`rawVal` = [{ dx, dy, frames }] for the 9 grid and 5
 * validation dots. The measured accuracy on the validation dots has to clear the limits (ACC.GATE_X / GATE_Y),
 * not just the response being monotonic.
 */
export function scoreCheck({ rawCal, rawVal, eye, distanceCm, headComp, allowSingleEye, dx, dy, fps, camMode }) {
  const fitOpts = { distanceMm: distanceCm * 10, headComp: !!headComp };
  const { trackEye, fit, calPts, valPts } = chooseTrackedEye(rawCal, rawVal, { eye, fitOpts, allowSingleEye });

  // legacy per-axis fit on the five axis dots: still supplies the saccade detector's thresholds and the sanity gate
  const axisPts = calPts.filter((p) => p.dx === 0 || p.dy === 0)
    .map((p) => ({ dx: p.dx, dy: p.dy, xs: p.frames.map((f) => f.x), ys: p.frames.map((f) => f.y) }));
  const cal = fitCalibration(axisPts);
  cal.dx = dx; cal.dy = dy;
  cal.fps = fps;
  cal.camMode = camMode;
  cal.trackEye = trackEye;

  const val = fit.ok ? validateMapping(fit.M, valPts) : null;
  if (fit.ok && val?.ok) {
    cal.M = fit.M;
    cal.val = val; cal.fit = fit;
    cal.acc = val.acc; cal.accX = val.accX; cal.accY = val.accY; cal.grade = val.grade;
    cal.prec = Math.hypot(val.precision.x, val.precision.y);
    if (cal.okX && val.accX > ACC.GATE_X) { cal.okX = false; cal.ok = false; cal.reason = `Measured horizontal accuracy ${val.accX.toFixed(1)}° is too coarse for left/right scoring (limit ${ACC.GATE_X}°)`; }
    else if (cal.okY && val.accY > ACC.GATE_Y) { cal.okY = false; cal.reason = `Measured vertical accuracy ${val.accY.toFixed(1)}° is too coarse (limit ${ACC.GATE_Y}°): left/right scoring only`; }
  } else {
    cal.fitReason = (!fit.ok ? fit.reason : val?.reason) || 'accuracy could not be measured';
  }
  cal.agree = eyeAgreement(rawCal);
  return cal;
}

export const MAP_NAMES = { diag: 'per-axis', lin: 'linear 2×2', quad: 'curved' };

/** What the session record keeps of the calibration (rounded; no raw data). */
export function sessionCalSummary(cal) {
  return {
    okX: cal.okX, okY: cal.okY, noiseDegX: cal.noiseDegX, noiseDegY: cal.noiseDegY, kx: cal.kx, ky: cal.ky, fps: cal.fps, flipped: cal.flipped,
    acc: cal.acc != null ? +cal.acc.toFixed(2) : null, accX: cal.accX != null ? +cal.accX.toFixed(2) : null, accY: cal.accY != null ? +cal.accY.toFixed(2) : null,
    prec: cal.prec != null ? +cal.prec.toFixed(2) : null, grade: cal.grade || null,
    model: cal.M ? cal.M.model : null, headCorr: cal.M ? !!cal.M.useHead : null, eyesAgree: cal.agree ? !!cal.agree.ok : null,
    markerOff: cal.markerOff || null, camMode: cal.camMode || null, trackEye: cal.trackEye || null,
  };
}
