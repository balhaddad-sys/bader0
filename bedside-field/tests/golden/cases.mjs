// Deterministic inputs run through every pure module; the outputs are snapshotted in snapshot.json.
// Module paths are resolved against both the current and the original layout, so the same cases run
// unchanged before and after a refactor.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CANDIDATES = {
  util: ['core/util.js', 'util.js'],
  geometry: ['core/geometry.js', 'geometry.js'],
  features: ['camera/features.js', 'gaze.js'],
  errors: ['camera/errors.js', 'gaze.js'],
  mapper: ['core/mapper.js', 'mapper.js'],
  detect: ['core/detect.js', 'detect.js'],
  analysis: ['core/analysis.js', 'analysis.js'],
  report: ['core/report.js', 'report.js'],
  engine: ['core/engine.js', 'engine.js'],
  sim: ['core/sim.js', 'sim.js'],
  store: ['core/store.js', 'store.js'],
};

async function load(jsDir, name) {
  for (const rel of CANDIDATES[name]) {
    const f = path.join(jsDir, rel);
    if (fs.existsSync(f)) return import(pathToFileURL(f).href);
  }
  throw new Error(`module ${name} not found in ${jsDir}`);
}

// Stable JSON: numbers to 12 significant digits, non-finite numbers as strings, functions dropped.
export function canon(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? +v.toPrecision(12) : String(v);
  if (typeof v === 'function' || v === undefined) return undefined;
  if (Array.isArray(v)) return v.map((x) => { const c = canon(x); return c === undefined ? null : c; });
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) { const c = canon(v[k]); if (c !== undefined) o[k] = c; }
    return o;
  }
  return v;
}

function installBrowserStubs() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
  globalThis.window = globalThis;
  globalThis.matchMedia = () => ({ matches: false });
  Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/131' }, configurable: true, writable: true });
  return store;
}
const setUA = (ua) => { globalThis.navigator.userAgent = ua; };

export async function runCases(jsDir, { sessionsDir }) {
  process.env.TZ = 'UTC';
  const lsStore = installBrowserStubs();
  const U = await load(jsDir, 'util');
  const G = await load(jsDir, 'geometry');
  const F = await load(jsDir, 'features');
  const E = await load(jsDir, 'errors');
  const M = await load(jsDir, 'mapper');
  const D = await load(jsDir, 'detect');
  const A = await load(jsDir, 'analysis');
  const R = await load(jsDir, 'report');
  const EN = await load(jsDir, 'engine');
  const SIM = await load(jsDir, 'sim');
  const ST = await load(jsDir, 'store');
  const out = {};

  // ---------- util ----------
  {
    const rng = U.mulberry32(42);
    const xs = Array.from({ length: 31 }, () => rng() * 10 - 3);
    out.util = { mulberry: xs.slice(0, 5), median: U.median(xs), medianEven: U.median(xs.slice(1)), std: U.std(xs), mean: U.mean(xs),
      shuffle: U.shuffle([1, 2, 3, 4, 5, 6, 7, 8], U.mulberry32(7)), clamp: [U.clamp(5, 0, 3), U.clamp(-1, 0, 3)],
      fmt: [U.fmtMs(123.6), U.fmtPct(0.456), U.fmtDeg(3.14159, 1), U.fmtMs(NaN)], esc: U.escapeHtml(`<a href="x">'&'</a>`) };
  }

  // ---------- geometry ----------
  const screens = [[1280, 800, 4.7, 30], [2048, 1536, 5.4, 30], [915, 412, 6.1, 20], [1366, 1024, 4.7, 25]];
  out.geometry = screens.map(([w, h, px, d]) => {
    const geo = new G.Geometry({ pxPerMm: px, distanceCm: d, width: w, height: h });
    return { half: geo.halfExtentDeg(), size3: geo.sizePx(3), p: geo.pointFromDeg(10, -5), d: geo.degFromPoint(100, 200), sum: geo.summary(3),
      quad: G.buildQuadLocations(geo, 3), dss: G.buildDssLocations(geo, 3), practice: G.buildPracticeLocations(geo, 3) };
  });
  out.geometryMisc = { diag: G.pxPerMmFromDiagonal(12.9, 2732, 2048), est: [G.estimatePxPerMm(412), G.estimatePxPerMm(700), G.estimatePxPerMm(900)] };

  // ---------- eye features ----------
  function face(rng, { closeR = false, tiny = false } = {}) {
    const cx = 0.5 + (rng() - 0.5) * 0.1, cy = 0.45 + (rng() - 0.5) * 0.1, w = tiny ? 0.01 : 0.3 + rng() * 0.1;
    const lm = Array.from({ length: 478 }, (_, i) => ({ x: cx - w / 2 + w * ((i * 37) % 100) / 100, y: cy - w / 2 + w * ((i * 53) % 100) / 100, z: 0 }));
    const set = (i, x, y) => { lm[i] = { x: cx + x * w + (rng() - 0.5) * 0.004, y: cy + y * w + (rng() - 0.5) * 0.004, z: 0 }; };
    const gx = (rng() - 0.5) * 0.06, gy = (rng() - 0.5) * 0.03;
    set(33, -0.35, -0.1); set(133, -0.12, -0.1); set(159, -0.235, closeR ? -0.105 : -0.14); set(145, -0.235, closeR ? -0.095 : -0.06); set(468, -0.235 + gx, -0.1 + gy);
    set(362, 0.12, -0.1); set(263, 0.35, -0.1); set(386, 0.235, -0.14); set(374, 0.235, -0.06); set(473, 0.235 + gx, -0.1 + gy);
    return lm;
  }
  {
    const rng = U.mulberry32(11);
    const faces = [...Array.from({ length: 6 }, () => face(rng)), face(rng, { closeR: true }), face(rng, { tiny: true })];
    out.features = faces.map((lm) => {
      const f = F.computeFeatures(lm, 640, 480);
      return { f, both: F.combine(f, 'both'), right: F.combine(f, 'right'), left: F.combine(f, 'left') };
    });
    out.featuresMisc = { short: F.computeFeatures(face(rng).slice(0, 400), 640, 480), none: F.combine(null), dist: [F.estimateDistanceCm(105, 640), F.estimateDistanceCm(0, 640)], LM: F.LM, OPEN_MIN: F.OPEN_MIN };
  }

  // ---------- calibration data (gain model like the simulated patient) ----------
  const gain = { kx: -0.0075, ky: 0.0045, ax: 0.012, ay: -0.03 };
  const grid = (dx, dy) => [[0, 0], [dx, 0], [dx, dy], [0, dy], [-dx, dy], [-dx, 0], [-dx, -dy], [0, -dy], [dx, -dy]];
  const vals = (dx, dy) => [[0.5 * dx, -0.5 * dy], [-0.5 * dx, -0.5 * dy], [-0.5 * dx, 0.5 * dy], [0.5 * dx, 0.5 * dy], [0, 0.5 * dy]];
  function dots(seed, pts, { noise = 0.004, cross = 0, badLeft = 0, head = 0 } = {}) {
    const rng = U.mulberry32(seed);
    const g = () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    return pts.map(([dx, dy]) => {
      const hx = head * g(), hy = head * g();
      const frames = Array.from({ length: 20 }, () => {
        const xr = gain.ax + gain.kx * dx + cross * dy + noise * g(), yr = gain.ay + gain.ky * dy + noise * g();
        const xl = gain.ax + gain.kx * dx + cross * dy + noise * (1 + badLeft) * g(), yl = gain.ay + gain.ky * dy + noise * (1 + badLeft) * g();
        return { x: (xr + xl) / 2, y: (yr + yl) / 2, hx, hy, xr, xl, yr, yl };
      });
      if (rng() < 0.3) frames[3] = { ...frames[3], x: frames[3].x + 0.2 }; // a glitch frame for trimFrames
      return { dx, dy, frames };
    });
  }
  const variants = [
    { seed: 1, dx: 14, dy: 8 }, { seed: 2, dx: 10, dy: 5, noise: 0.008 }, { seed: 3, dx: 14, dy: 8, cross: 0.0015 },
    { seed: 4, dx: 14, dy: 8, badLeft: 5 }, { seed: 5, dx: 9, dy: 5, noise: 0.03 }, { seed: 6, dx: 14, dy: 8, head: 0.05 },
  ];
  const cals = [];
  out.mapper = variants.map((v) => {
    const rawCal = dots(v.seed, grid(v.dx, v.dy), v), rawVal = dots(v.seed + 100, vals(v.dx, v.dy), v);
    const fit = M.fitMapping(rawCal, { distanceMm: 300, headComp: true });
    const fitNoHead = M.fitMapping(rawCal, { distanceMm: 300, headComp: false });
    const val = fit.ok ? M.validateMapping(fit.M, rawVal) : null;
    const axisPts = rawCal.filter((p) => p.dx === 0 || p.dy === 0).map((p) => ({ dx: p.dx, dy: p.dy, xs: p.frames.map((f) => f.x), ys: p.frames.map((f) => f.y) }));
    const cal = D.fitCalibration(axisPts);
    if (fit.ok) cal.M = fit.M;
    cals.push(cal);
    const preds = fit.ok ? rawVal.map((p) => M.predict(fit.M, { ...p.frames[0], ok: true }, { okY: true })) : null;
    return { fit, fitNoHead, val, cal, agree: M.eyeAgreement(rawCal), trim: M.trimFrames(rawCal[1].frames), preds };
  });
  out.mapperMisc = { grades: [0.5, 1.5, 3, 5].map(M.gradeOf), solve: M.solve([[2, 1], [1, 3]], [3, 5]), ACC: M.ACC, U: M.U, short: M.trimFrames([{ x: 1, y: 1 }]) };
  {
    const fit = out.mapper[0].fit;
    const tr = new M.GazeTracker(M.fitMapping(dots(1, grid(14, 8)), { distanceMm: 300 }).M, { okY: true });
    const rng = U.mulberry32(9); const seq = [];
    for (let i = 0; i < 40; i++) {
      const gx = i < 20 ? 0 : 10, t = i * 33 + (i === 30 ? 600 : 0);
      seq.push(tr.push({ t, ok: i !== 25, x: gain.ax + gain.kx * gx + 0.003 * (rng() - 0.5), y: gain.ay + 0.003 * (rng() - 0.5), hx: 0, hy: 0 }));
    }
    const recentered = tr.recenter();
    out.tracker = { seq, current: [tr.current(1300), tr.current(5000), tr.current(1400, 500)], recentered, off: tr.off, fitOk: fit.ok };
    const oe = new M.OneEuro(); out.oneEuro = Array.from({ length: 12 }, (_, i) => oe.filter(i < 6 ? 0 : 10, i * 33));
  }

  // ---------- detection on synthetic trials ----------
  function trialBuf(seed, cal, { onset = 1000, target = null, latency = 250, blink = false, spont = null, hz = 30, second = null } = {}) {
    const rng = U.mulberry32(seed); const buf = [];
    for (let t = 0; t < onset + 2400; t += 1000 / hz) {
      let gx = 0, gy = 0;
      if (target && t >= onset + latency) { gx = target.h * 0.88; gy = -target.v * 0.88; }
      if (second && t >= onset + latency + 520) { gx = second.h * 0.88; gy = -second.v * 0.88; }
      if (spont && t >= onset + spont.at) { gx = spont.gx; gy = spont.gy; }
      const ok = !(blink && t > onset + 100 && t < onset + 900);
      buf.push({ t, ok, x: ok ? gain.ax + gain.kx * gx + 0.0015 * (rng() - 0.5) : NaN, y: ok ? gain.ay + gain.ky * gy + 0.0015 * (rng() - 0.5) : NaN, hx: 0, hy: 0 });
    }
    return buf;
  }
  const tUR = { h: 10, v: 6, quad: 'UR' }, tUL = { h: -10, v: 6, quad: 'UL' }, tLR = { h: 12, v: -5, quad: 'LR' }, tL = { h: -9, v: 4, side: 'L' }, tR = { h: 9, v: 4, side: 'R' };
  out.detect = [cals[0], { ...cals[0], M: undefined }, cals[2]].map((cal, ci) => {
    const run = (seed, opts, fn) => { const buf = trialBuf(seed + ci * 1000, cal, opts); const base = D.baselineFrom(buf, opts.onset ?? 1000); return { base, fix: D.isFixating(buf, 1000, cal), r: fn(buf, base) }; };
    const single = (t) => (buf, base) => D.analyzeSingle(buf, { onset: 1000, windowMs: 1800, base, cal, target: t });
    return {
      seen: run(1, { target: tUR }, single(tUR)),
      seenUL: run(2, { target: tUL, latency: 330 }, single(tUL)),
      delayed: run(3, { target: tLR, latency: 1100 }, single(tLR)),
      missed: run(4, {}, single(tUR)),
      wrongWay: run(5, { target: tUL }, single(tUR)),
      lost: run(6, { target: tUR, blink: true }, single(tUR)),
      catchQuiet: run(7, {}, (buf, base) => D.analyzeCatch(buf, { onset: 1000, windowMs: 1800, base, cal, refMag: 8 })),
      catchFA: run(8, { spont: { at: 500, gx: 9, gy: 0 } }, (buf, base) => D.analyzeCatch(buf, { onset: 1000, windowMs: 1800, base, cal, refMag: 8 })),
      biBoth: run(9, { target: tL, second: tR }, (buf, base) => D.analyzeBilateral(buf, { onset: 1000, windowMs: 2500, base, cal, tL, tR })),
      biRight: run(10, { target: tR }, (buf, base) => D.analyzeBilateral(buf, { onset: 1000, windowMs: 2500, base, cal, tL, tR })),
      fixOff: D.isFixating(trialBuf(11, cal, { spont: { at: -900, gx: 20, gy: 0 } }), 1000, cal),
      fixNone: D.isFixating([], 1000, cal),
    };
  });
  out.detectMisc = { linfit: D.linfit([0, 1, 2, 3], [1, 3, 5, 7.5]), DET: D.DET, calFail: D.fitCalibration([{ dx: 0, dy: 0, xs: [1], ys: [1] }]) };

  // ---------- schedules + simulated patient ----------
  {
    const geo = new G.Geometry({ pxPerMm: 4.7, distanceCm: 30, width: 1280, height: 800 });
    const q = G.buildQuadLocations(geo, 3), d = G.buildDssLocations(geo, 3);
    const ids = (s) => s.map((it) => it.kind + ':' + (it.loc ? it.loc.id : it.targets ? it.targets.map((t) => t.id).join('+') : '-'));
    out.schedules = [1, 2, 3].map((seed) => ({ quad: ids(EN.buildQuadSchedule(q, 3, U.mulberry32(seed))), quad2: ids(EN.buildQuadSchedule(q, 2, U.mulberry32(seed + 10))), dss: ids(EN.buildDssSchedule(d, 3, U.mulberry32(seed))) }));
    out.sim = Object.entries(SIM.DEMO_PROFILES).map(([k, prof]) => {
      const p = new SIM.VirtualPatient(prof, 5);
      return { k, label: prof.label, g: Array.from({ length: 5 }, () => p.gauss()), lat: [p.lat(), p.lat()], sees: ['UR', 'UL', 'LR', 'LL'].map((quad) => p.seesTarget({ quad })) };
    });
  }

  // ---------- analysis + report on recorded sessions ----------
  out.sessions = fs.readdirSync(sessionsDir).filter((f) => f.endsWith('.json')).sort().map((f) => {
    const { summary: _drop, ...session } = JSON.parse(fs.readFileSync(path.join(sessionsDir, f), 'utf8'));
    const summary = A.summarize(session);
    return { f, summary, eligible: A.dssEligible(summary), html: R.reportHTML(session, summary), print: R.reportHTML(session, summary, { forPrint: true }), csv: R.csvOf(session), svg: R.fieldMapSVG(summary, session) };
  });
  out.analysisMisc = { classify: [[0.9, 5], [0.1, 5], [0.5, 5], [1, 2]].map(([r, n]) => A.classify(r, n)), T: A.T, QUADS: A.QUADS };

  // ---------- store ----------
  {
    lsStore.clear();
    const s0 = ST.loadSettings();
    ST.saveSettings({ ...s0, reps: 4 });
    const s1 = ST.loadSettings();
    ST.saveSession({ id: 'a', n: 1 }); ST.saveSession({ id: 'b', n: 2 }); ST.saveSession({ id: 'a', n: 3 });
    const list1 = ST.loadSessions(); ST.deleteSession('b'); const list2 = ST.loadSessions(); ST.clearAll();
    out.store = { VERSION: ST.VERSION, DEFAULTS: ST.DEFAULTS, s0, s1reps: s1.reps, list1, list2, afterClear: [ST.loadSessions(), ST.loadSettings().reps] };
  }

  // ---------- camera error explanations ----------
  {
    const err = (name, message) => Object.assign(new Error(message), { name });
    const errs = [[err('NotAllowedError', 'Permission denied'), 'permission'], [err('NotAllowedError', 'Permission denied by system'), 'permission'],
      [err('NotAllowedError', 'Permission dismissed'), 'permission'], [err('NotFoundError', 'Requested device not found'), 'permission'],
      [err('NotReadableError', 'Could not start video source'), 'permission'], [err('Error', 'Could not load vendor/x.js'), 'model'],
      [err('Error', 'Camera API unavailable (needs HTTPS or localhost)'), 'permission'], [err('TimeoutError', 'The camera did not answer within 30 s'), 'permission'],
      [err('OverconstrainedError', ''), 'permission'], [err('AbortError', 'x'), 'play']];
    const uas = { chrome: 'Mozilla/5.0 (Linux; Android 14) Chrome/131', app: 'Mozilla/5.0 (Linux; Android 14; wv) Chrome/131 BedsideFieldApp/1.4.0', inapp: 'Mozilla/5.0 (Linux; Android 14; wv) Instagram 300' };
    out.cameraErrors = {};
    for (const [k, ua] of Object.entries(uas)) {
      setUA(ua);
      globalThis.BedsideNative = k === 'app' ? { cameraReport: () => 'App check: REPORT' } : undefined;
      out.cameraErrors[k] = errs.map(([e, st]) => E.explainCameraError(e, st));
    }
    delete globalThis.BedsideNative;
    setUA(uas.chrome);
  }
  return canon(out);
}
