// core/calibration.js: the tracking-check scoring that used to live inside the camera-check screen.
// `reference()` is the 1.4.0.6 code copied verbatim from js/app.js runCheck(); the module must match it exactly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../../web/js/core/util.js';
import { fitCalibration } from '../../web/js/core/detect.js';
import { fitMapping, validateMapping, eyeAgreement, ACC } from '../../web/js/core/mapper.js';
import { Geometry } from '../../web/js/core/geometry.js';
import { gridDots, valDots, dotExtent, dwellFrames, asEye, scoreCheck, sessionCalSummary } from '../../web/js/core/calibration.js';

function reference(rawCal, rawVal, s, demo) {
  const asEye = (raw, eye) => eye === 'both' ? raw : raw.map((p) => ({ ...p,
    frames: p.frames.filter((f) => Number.isFinite(eye === 'right' ? f.xr : f.xl) && Number.isFinite(eye === 'right' ? f.yr : f.yl))
      .map((f) => ({ ...f, x: eye === 'right' ? f.xr : f.xl, y: eye === 'right' ? f.yr : f.yl })) }));
  const fitOpts = { distanceMm: s.distanceCm * 10, headComp: !!s.headComp };
  let trackEye = s.eye, calPts = rawCal, valPts = rawVal;
  let fit = fitMapping(rawCal, fitOpts);
  if (s.eye === 'both' && !demo) {
    let one = null;
    for (const eye of ['right', 'left']) {
      const pts = asEye(rawCal, eye), f1 = fitMapping(pts, fitOpts);
      if (f1.ok && (!one || f1.cv.total < one.fit.cv.total)) one = { eye, pts, fit: f1 };
    }
    if (one && (!fit.ok || one.fit.cv.total < 0.85 * fit.cv.total)) {
      trackEye = one.eye; fit = one.fit; calPts = one.pts; valPts = asEye(rawVal, one.eye);
    }
  }
  const axisPts = calPts.filter((p) => p.dx === 0 || p.dy === 0)
    .map((p) => ({ dx: p.dx, dy: p.dy, xs: p.frames.map((f) => f.x), ys: p.frames.map((f) => f.y) }));
  const cal = fitCalibration(axisPts);
  cal.dx = s.dx; cal.dy = s.dy; cal.fps = s.fps; cal.camMode = s.camMode; cal.trackEye = trackEye;
  const val = fit.ok ? validateMapping(fit.M, valPts) : null;
  if (fit.ok && val?.ok) {
    cal.M = fit.M; cal.val = val; cal.fit = fit;
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

// Synthetic dwells: gain model like the simulated patient, optional poorly seen left eye, cross-talk, head drift.
function dwells(seed, pts, { noise = 0.004, badLeft = 0, cross = 0, head = 0, gain = 1 } = {}) {
  const rng = mulberry32(seed);
  const g = () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  return pts.map(([dx, dy]) => {
    const hx = head * g(), hy = head * g();
    return { dx, dy, frames: Array.from({ length: 20 }, () => {
      const xr = 0.012 - 0.0075 * gain * dx + cross * dy + noise * g(), yr = -0.03 + 0.0045 * gain * dy + noise * g();
      const xl = 0.012 - 0.0075 * gain * dx + cross * dy + noise * (1 + badLeft) * g(), yl = -0.03 + 0.0045 * gain * dy + noise * (1 + badLeft) * g();
      return { x: (xr + xl) / 2, y: (yr + yl) / 2, hx, hy, xr, xl, yr, yl };
    }) };
  });
}

const CASES = [];
for (let seed = 1; seed <= 40; seed++) {
  const v = { noise: [0.003, 0.006, 0.012, 0.03][seed % 4], badLeft: seed % 3 === 0 ? 6 : 0, cross: seed % 5 === 0 ? 0.0015 : 0, head: seed % 7 === 0 ? 0.05 : 0, gain: seed % 11 === 0 ? 0.15 : 1 };
  const [dx, dy] = seed % 2 ? [14, 8] : [9.8, 5];
  for (const eye of ['both', 'right']) for (const demo of [false, true]) {
    CASES.push({ name: `seed ${seed} ${eye}${demo ? ' demo' : ''}`, rawCal: dwells(seed, gridDots(dx, dy), v), rawVal: dwells(seed + 500, valDots(dx, dy), v),
      s: { eye, demo, distanceCm: seed % 2 ? 30 : 20, headComp: seed % 4 !== 1 ? 1 : 0, dx, dy, fps: 12.5, camMode: 'normal' } });
  }
}

test('scoreCheck reproduces the 1.4.0.6 tracking-check scoring on 160 synthetic checks', () => {
  for (const c of CASES) {
    const want = reference(c.rawCal, c.rawVal, c.s, c.s.demo);
    const got = scoreCheck({ rawCal: c.rawCal, rawVal: c.rawVal, eye: c.s.eye, distanceCm: c.s.distanceCm, headComp: c.s.headComp,
      allowSingleEye: !c.s.demo, dx: c.s.dx, dy: c.s.dy, fps: c.s.fps, camMode: c.s.camMode });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(got)), JSON.parse(JSON.stringify(want)), c.name);
  }
});

test('the checks cover good, single-eye, vertical-off and failed outcomes', () => {
  const outcomes = new Set(CASES.map((c) => {
    const cal = scoreCheck({ rawCal: c.rawCal, rawVal: c.rawVal, eye: c.s.eye, distanceCm: c.s.distanceCm, headComp: c.s.headComp, allowSingleEye: !c.s.demo, dx: c.s.dx, dy: c.s.dy });
    return !cal.okX ? 'failed' : cal.trackEye !== c.s.eye ? 'single-eye' : !cal.okY ? 'vertical-off' : 'good';
  }));
  for (const o of ['good', 'single-eye', 'vertical-off', 'failed']) assert.ok(outcomes.has(o), `no case produced "${o}"`);
});

test('a poorly seen left eye switches tracking to the right eye; demo mode never does', () => {
  const rawCal = dwells(3, gridDots(14, 8), { badLeft: 6 }), rawVal = dwells(503, valDots(14, 8), { badLeft: 6 });
  const args = { rawCal, rawVal, eye: 'both', distanceCm: 30, headComp: 1, dx: 14, dy: 8 };
  assert.equal(scoreCheck({ ...args, allowSingleEye: true }).trackEye, 'right');
  assert.equal(scoreCheck({ ...args, allowSingleEye: false }).trackEye, 'both');
});

test('asEye takes x/y from one eye and drops frames without that eye', () => {
  const raw = [{ dx: 1, dy: 2, frames: [{ x: 0, y: 0, xr: 1, yr: 2, xl: 3, yl: 4 }, { x: 0, y: 0, xr: NaN, yr: 2, xl: 3, yl: 4 }] }];
  assert.strictEqual(asEye(raw, 'both'), raw);
  assert.deepStrictEqual(asEye(raw, 'right')[0].frames.map((f) => [f.x, f.y]), [[1, 2]]);
  assert.deepStrictEqual(asEye(raw, 'left')[0].frames.map((f) => [f.x, f.y]), [[3, 4], [3, 4]]);
});

test('dot layout and dwell window are those of 1.4.0.6', () => {
  const tablet = new Geometry({ pxPerMm: 4.7, distanceCm: 30, width: 1280, height: 800 });
  const phone = new Geometry({ pxPerMm: 6.1, distanceCm: 20, width: 915, height: 412 });
  // 1.4.0.6 formula from runCheck(): +clamp(0.7 * halfH, 8, 18).toFixed(1), +clamp(0.6 * halfV, 5, 9).toFixed(1)
  const old = (geo) => { const e = geo.halfExtentDeg(); const c = (v, a, b) => Math.min(b, Math.max(a, v)); return { dx: +c(0.7 * e.h, 8, 18).toFixed(1), dy: +c(0.6 * e.v, 5, 9).toFixed(1) }; };
  for (const geo of [tablet, phone]) assert.deepStrictEqual(dotExtent(geo), old(geo));
  assert.equal(gridDots(10, 5).length, 9);
  assert.deepStrictEqual(valDots(10, 6), [[5, -3], [-5, -3], [-5, 3], [5, 3], [0, 3]]);
  const buf = [600, 650, 1000, 1400, 1450].map((t) => ({ t, ok: true, x: t, y: 0 })).concat([{ t: 900, ok: false, x: 1, y: 1 }]);
  assert.deepStrictEqual(dwellFrames(buf, 0).map((f) => f.x), [650, 1000, 1400]);
});

test('sessionCalSummary rounds and keeps only the summary fields', () => {
  const s = sessionCalSummary({ okX: true, okY: false, acc: 1.23456, accX: 0.5, accY: null, prec: 2.3456, grade: 'good', M: { model: 'lin', useHead: 1 }, agree: { ok: 0 }, trackEye: 'left', extra: 'dropped' });
  assert.deepStrictEqual(s, { okX: true, okY: false, noiseDegX: undefined, noiseDegY: undefined, kx: undefined, ky: undefined, fps: undefined, flipped: undefined,
    acc: 1.23, accX: 0.5, accY: null, prec: 2.35, grade: 'good', model: 'lin', headCorr: true, eyesAgree: false, markerOff: null, camMode: null, trackEye: 'left' });
});
