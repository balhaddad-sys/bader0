// Virtual patient for the Demo mode and for automated tests.
// It behaves like a configurable patient (default: right homonymous hemianopia) and drives
// whichever response channel is active: synthetic gaze samples, examiner taps or touch taps.
// Demo results are always labelled as simulated in the report.

import { mulberry32 } from './util.js';

export const DEMO_PROFILES = {
  rhh: { label: 'Right homonymous hemianopia', field: { UR: false, LR: false, UL: true, LL: true } },
  lhh: { label: 'Left homonymous hemianopia', field: { UR: true, LR: true, UL: false, LL: false } },
  rsq: { label: 'Right superior quadrantanopia', field: { UR: false, LR: true, UL: true, LL: true } },
  neglect: { label: 'Left extinction (intact fields)', field: { UR: true, LR: true, UL: true, LL: true }, extinction: 'L' },
  normal: { label: 'Normal fields', field: { UR: true, LR: true, UL: true, LL: true } },
};

const DEFAULTS = {
  field: DEMO_PROFILES.rhh.field,
  latency: 240, latSd: 45,
  miss: 0.03,       // lapses of attention
  fa: 0.05,         // spontaneous responses on catch trials
  extinction: null, // 'L' | 'R' | null  (bilateral competition only)
  touchRT: 950, touchSd: 280, touchErr: 16,
  scanFind: 0.3,    // chance a hemianopic patient eventually finds the target by scanning (touch)
  bias: { gx: 0, gy: 0 },
  gain: { kx: -0.0075, ky: 0.0045, ax: 0.012, ay: -0.03, nx: 0.004, ny: 0.007 },
  blinkRate: 0.01,
};

export class VirtualPatient {
  constructor(profile = {}, seed = null) {
    this.p = { ...DEFAULTS, ...profile, gain: { ...DEFAULTS.gain, ...(profile.gain || {}) }, bias: { ...DEFAULTS.bias, ...(profile.bias || {}) } };
    this.rng = seed == null ? Math.random : mulberry32(seed);
  }
  gauss() {
    let u = 0, v = 0;
    while (!u) u = this.rng();
    while (!v) v = this.rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  lat() { return Math.max(130, this.p.latency + this.p.latSd * this.gauss()); }
  seesTarget(t) { return !!this.p.field[t.quad] && this.rng() > this.p.miss; }
}

/** Synthetic gaze stream with the same sample shape as CameraGazeSource. */
export class SimGazeSource {
  constructor(patient) {
    this.patient = patient;
    this.onSample = null;
    this.sim = true;
    this.gx = patient.p.bias.gx; this.gy = patient.p.bias.gy;
    this.from = { gx: this.gx, gy: this.gy };
    this.to = { gx: this.gx, gy: this.gy };
    this.moveT = 0;
    this.timers = new Set();
    this.timer = null;
    this.blink = 0;
    this.frameW = 640; this.frameH = 480;
    this.lastFeat = null;
    this.fps = 30;
  }
  async start() {
    this.timer = setInterval(() => this._tick(), 1000 / 30);
  }
  stop() {
    clearInterval(this.timer);
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }
  _pos(now) {
    const p = Math.min(1, (now - this.moveT) / 45);
    return { gx: this.from.gx + (this.to.gx - this.from.gx) * p, gy: this.from.gy + (this.to.gy - this.from.gy) * p };
  }
  _tick() {
    const now = performance.now();
    const g = this._pos(now);
    const { kx, ky, ax, ay, nx, ny } = this.patient.p.gain;
    if (this.blink > 0) this.blink--;
    else if (this.patient.rng() < this.patient.p.blinkRate) this.blink = 4;
    const ok = this.blink === 0;
    const pt = this.patient;
    this.onSample?.({
      t: now, ok,
      x: ok ? ax + kx * g.gx + nx * pt.gauss() : NaN,
      y: ok ? ay + ky * g.gy + ny * pt.gauss() : NaN,
      ipdPx: 105, open: ok ? 0.28 : 0.04, hx: 0, hy: 0,
    });
  }
  moveTo(gx, gy) {
    const now = performance.now();
    this.from = this._pos(now);
    this.to = { gx: gx + this.patient.p.bias.gx, gy: gy + this.patient.p.bias.gy };
    this.moveT = now;
  }
  later(ms, fn) {
    const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms);
    this.timers.add(id);
  }
  followDot(dx, dy) { this.later(250, () => this.moveTo(dx, dy)); } // tracking-check dot (screen-right / screen-down degrees)

  /** Wire the virtual patient into a TestRunner. */
  attach(runner) {
    const P = this.patient, p = P.p;
    const rng = P.rng;
    const winOf = (rec) => (rec.kind === 'dss-bi' ? 2500 : runner.s.windowMs);
    runner.hooks = {
      onTrialStart: () => this.later(60, () => this.moveTo(0, 0)),
      onDemo: ({ x, y, hit }) => this.later(1700, () => hit({ x, y, t: performance.now() })),
      onStimulus: ({ rec, targets, t0, method }) => {
        const kind = rec.kind;
        const win = winOf(rec);
        const spont = kind === 'catch' && rng() < p.fa;

        // which targets does the patient see (before competition)?
        let seen = targets.map((t) => P.seesTarget(t));
        if (kind === 'dss-bi' && p.extinction) {
          const idx = targets.findIndex((t) => t.side === p.extinction);
          const other = idx === 0 ? 1 : 0;
          if (seen[idx] && seen[other]) seen[idx] = false; // extinguished under competition
        }

        if (method === 'camera') {
          const sched = (ms, t) => this.later(ms, () => this.moveTo(t.h * 0.88 + P.gauss() * 0.6, -t.v * 0.88 + P.gauss() * 0.8));
          const back = (ms) => this.later(ms, () => this.moveTo(0, 0));
          if (spont) { this.later(300 + rng() * 1200, () => this.moveTo((rng() - 0.5) * 24, (rng() - 0.5) * 14)); back(1700); }
          let order = targets.map((t, i) => ({ t, i })).filter((o) => seen[o.i]);
          if (kind === 'dss-bi' && order.length === 2 && rng() < 0.5) order.reverse();
          order.forEach((o, k) => sched(P.lat() + k * 520, o.t));
          if (order.length) back(Math.min(win - 200, runner._stimFor(rec) + 450 + (order.length - 1) * 520));
        } else if (method === 'examiner') {
          let code;
          if (kind === 'catch') code = spont ? 'seen' : 'missed';
          else if (kind === 'dss-bi') {
            const l = seen[targets.findIndex((t) => t.side === 'L')], r = seen[targets.findIndex((t) => t.side === 'R')];
            code = l && r ? 'both' : l ? 'left' : r ? 'right' : 'none';
          } else code = seen[0] ? 'seen' : 'missed';
          this.later(P.lat() + 450 + rng() * 350, () => runner.onExaminer(code));
        } else if (method === 'touch') {
          const tap = (t, ms) => this.later(ms, () => runner.onPointer(t.x + P.gauss() * p.touchErr, t.y + P.gauss() * p.touchErr, performance.now()));
          if (kind === 'catch') { if (spont) this.later(500 + rng() * 800, () => runner.onPointer(runner.geo.cx + (rng() - 0.5) * 400, runner.geo.cy + (rng() - 0.5) * 300, performance.now())); return; }
          let k = 0;
          const order = targets.map((t, i) => ({ t, i }));
          if (kind === 'dss-bi' && rng() < 0.5) order.reverse();
          for (const o of order) {
            if (seen[o.i]) { tap(o.t, Math.max(350, p.touchRT + p.touchSd * P.gauss()) + k * 700); k++; }
            else if (P.p.field[o.t.quad] === false && rng() < p.scanFind && kind !== 'dss-bi') { tap(o.t, 3400 + 700 * rng()); }
          }
          // some stray taps when nothing is seen (searching)
          if (!seen.some(Boolean) && rng() < 0.4) this.later(1500 + rng() * 1500, () => runner.onPointer(runner.geo.cx + (rng() - 0.5) * 500, runner.geo.cy + (rng() - 0.5) * 400, performance.now()));
        }
      },
    };
  }
}
