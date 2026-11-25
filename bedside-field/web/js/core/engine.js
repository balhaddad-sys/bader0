// Trial engine: schedules and runs the quadrant screen and the double-simultaneous-stimulation (DSS)
// block with one of three response methods:
//   'camera'   - reflexive gaze shift detected from the front camera (needs a tracking check first)
//   'examiner' - examiner watches the patient's eyes and taps Seen / Missed
//   'touch'    - patient taps the target ("pop the bubble")
//
// The engine is DOM-free apart from requestAnimationFrame/timers; the UI talks to it through
// pushSample / onPointer / onExaminer and receives callbacks through `ui`.

import { analyzeSingle, analyzeCatch, analyzeBilateral, baselineFrom, isFixating } from './detect.js';
import { buildQuadLocations, buildDssLocations, buildPracticeLocations } from './geometry.js';
import { shuffle, rand, median } from './util.js';

class Cancel extends Error {}

// ---------------- schedules (exported for tests) ----------------

export function buildQuadSchedule(locs, reps, rng = Math.random) {
  const out = [];
  let prevQuad = null;
  for (let r = 0; r < reps; r++) {
    const base = [...locs.map((l) => ({ kind: 'quad', loc: l })), { kind: 'catch' }];
    let best = null;
    for (let tries = 0; tries < 80; tries++) {
      const s = shuffle(base, rng);
      let ok = s[0].kind !== 'catch';
      let p = prevQuad;
      for (const it of s) {
        const q = it.kind === 'quad' ? it.loc.quad : 'C';
        if (p && q === p && q !== 'C') { ok = false; break; }
        p = q;
      }
      best = s;
      if (ok) break;
    }
    out.push(...best);
    const last = best[best.length - 1];
    prevQuad = last.kind === 'quad' ? last.loc.quad : null;
  }
  return out;
}

export function buildDssSchedule(locs, reps, rng = Math.random) {
  const uni = Math.max(2, reps - 1);
  const bi = uni * 2;
  const items = [];
  for (const elev of ['up', 'lo']) {
    const L = locs.find((l) => l.elev === elev && l.side === 'L');
    const R = locs.find((l) => l.elev === elev && l.side === 'R');
    for (let i = 0; i < uni; i++) { items.push({ kind: 'dss-uni', targets: [L] }); items.push({ kind: 'dss-uni', targets: [R] }); }
    for (let i = 0; i < bi; i++) items.push({ kind: 'dss-bi', targets: [L, R] });
  }
  for (let i = 0; i < Math.max(2, reps - 1); i++) items.push({ kind: 'catch' });
  let s = shuffle(items, rng);
  for (let k = 0; k < 50 && s[0].kind === 'catch'; k++) s = shuffle(items, rng);
  return s;
}

// ---------------- runner ----------------

export class TestRunner {
  constructor({ renderer, geo, settings, method, eyeMode = 'both', cal = null, ui = {}, hooks = {}, rng = Math.random }) {
    this.r = renderer;
    this.geo = geo;
    this.s = settings;
    this.method = method;
    this.eyeMode = eyeMode;
    this.cal = cal;
    this.ui = ui;
    this.hooks = hooks;
    this.rng = rng;

    this.buf = [];
    this.trials = [];
    this.practiceDone = 0;
    this._pending = new Set();
    this._tapSink = null;
    this._exSink = null;
    this._override = false;
    this.paused = false;
    this.finished = false;
    this.aborted = false;
    this._resumeResolve = null;
    this.done = 0;
    this.total = 0;

    this.stimR = Math.max(geo.sizePx(settings.stimDeg) / 2, 30);
    this.anchorR = Math.max(geo.sizePx(settings.anchor === 'face' ? 3 : 1.8) / 2, 18);
    this.hitR = Math.max(this.stimR * 1.8, 64);
    this.quadLocs = buildQuadLocations(geo, settings.stimDeg);
    this.dssLocs = buildDssLocations(geo, settings.stimDeg);
  }

  // ---- inputs ----
  pushSample(s) {
    this.buf.push(s);
    if (this.buf.length > 600) this.buf.splice(0, this.buf.length - 400);
  }
  onPointer(x, y, t = performance.now()) {
    this._tapSink?.({ x, y, t });
  }
  onExaminer(code) {
    if (code === 'present') { this._override = true; return; }
    this._exSink?.(code, performance.now());
  }

  // ---- control ----
  requestPause() {
    if (this.paused || this.finished) return;
    this.paused = true;
    this._cancelTrial();
    this.r.clearTargets(); this.r.clearRing(); this.r.stopDemo(); this.r.setAnchor({ on: false });
    this.ui.buttons?.('none'); this.ui.hint?.('');
  }
  resume() {
    this.paused = false;
    this._resumeResolve?.();
    this._resumeResolve = null;
  }
  finish() { this.finished = true; this._cancelTrial(); this.resume(); }
  abort() { this.aborted = true; this.finish(); }

  _cancelTrial() {
    for (const p of [...this._pending]) { p.cleanup?.(); p.reject(new Cancel()); }
    this._pending.clear();
    this._tapSink = null; this._exSink = null;
  }

  // ---- cancel-aware primitives ----
  _cancelable(setup) {
    return new Promise((resolve, reject) => {
      const entry = { reject };
      this._pending.add(entry);
      const done = (v) => { this._pending.delete(entry); entry.cleanup?.(); resolve(v); };
      setup(done, entry);
    });
  }
  _wait(ms) {
    return this._cancelable((done, entry) => {
      const id = setTimeout(done, ms);
      entry.cleanup = () => clearTimeout(id);
    });
  }
  _nextFrame() {
    return this._cancelable((done) => requestAnimationFrame(() => done(performance.now())));
  }
  _waitResume() {
    return new Promise((r) => { this._resumeResolve = r; });
  }

  // ---- main loop ----
  async run(blocks) {
    this.r.start();
    for (const block of blocks) {
      const sched = block.type === 'quad'
        ? buildQuadSchedule(this.quadLocs, this.s.reps, this.rng)
        : buildDssSchedule(this.dssLocs, this.s.reps, this.rng);
      this.total += sched.length;
      this.ui.progress?.(this.done, this.total);
      if (this.method === 'touch' && this.practiceDone === 0 && this.s.practice) await this._guard(() => this._touchIntro());

      const queue = sched.map((it) => ({ it, tries: 0 }));
      while (queue.length && !this.finished) {
        if (this.paused) { await this._waitResume(); if (this.finished) break; }
        const q = queue.shift();
        let rec;
        try {
          rec = await this._runOne(q.it, block.type);
        } catch (e) {
          if (e instanceof Cancel) { queue.unshift(q); continue; }
          throw e;
        }
        if (rec.outcome === 'invalid' && q.tries < 1) { q.tries++; rec.retried = true; queue.push(q); }
        else { this.done++; }
        this.trials.push(rec);
        this.ui.progress?.(this.done, this.total);
        this.ui.trial?.(rec);
      }
      if (this.finished) break;
    }
    this._cancelTrial();
    this.r.clearTargets(); this.r.clearRing(); this.r.setAnchor({ on: false });
    this.ui.buttons?.('none'); this.ui.hint?.('');
    return { trials: this.trials, aborted: this.aborted, finishedEarly: this.finished && !this.aborted };
  }

  async _guard(fn) {
    while (!this.finished) {
      try { return await fn(); } catch (e) {
        if (!(e instanceof Cancel)) throw e;
        if (this.paused) await this._waitResume();
      }
    }
  }

  // ---- one trial ----
  async _runOne(item, blockType) {
    const kind = item.kind;
    const locs = item.kind === 'quad' ? [item.loc] : item.kind === 'catch' ? [] : item.targets;
    const targets = locs.map((l) => ({ id: l.id, x: l.x, y: l.y, h: l.h, v: l.v, ecc: l.ecc, r: this.stimR, side: l.side, quad: l.quad }));
    const rec = {
      idx: this.trials.length,
      block: blockType,
      kind,
      locId: kind === 'catch' ? 'catch' : kind === 'dss-bi' ? 'DSS-bi-' + locs[0].elev : locs[0].id,
      quad: kind === 'quad' || kind === 'dss-uni' ? locs[0].quad : null,
      ring: locs[0]?.ring ?? null,
      elev: locs[0]?.elev ?? null,
      side: kind === 'dss-uni' ? locs[0].side : null,
      targets: targets.map((t) => ({ id: t.id, h: +t.h.toFixed(1), v: +t.v.toFixed(1), ecc: +t.ecc.toFixed(1) })),
      method: this.method,
      outcome: 'invalid',
    };

    this.r.setAnchor({ on: true, x: this.geo.cx, y: this.geo.cy, r: this.anchorR, style: this.s.anchor });
    this.hooks.onTrialStart?.(rec);

    let res;
    if (this.method === 'camera') res = await this._camera(rec, targets);
    else if (this.method === 'examiner') res = await this._examiner(rec, targets);
    else res = await this._touch(rec, targets);
    Object.assign(rec, res);

    this.r.clearTargets();
    this.ui.buttons?.('none');
    this.ui.hint?.('');
    if (this.method !== 'touch') await this._wait(450);
    return rec;
  }

  async _present(rec, targets, extra = {}) {
    if (targets.length) this.r.showTargets(targets.map((t) => ({ x: t.x, y: t.y, r: t.r })));
    const t0 = await this._nextFrame();
    rec.tOnset = Math.round(t0);
    this.hooks.onStimulus?.({ rec, targets, t0, method: this.method, ...extra });
    return t0;
  }

  _windowFor(rec) { return rec.kind === 'dss-bi' ? Math.max(this.s.windowMs, 2500) : this.s.windowMs; }
  _stimFor(rec) { return rec.kind === 'dss-bi' ? Math.max(this.s.stimMs, 1500) : this.s.stimMs; }

  async _gap() {
    if (this.s.gapMs > 0) { this.r.setAnchor({ on: false }); await this._wait(this.s.gapMs); }
  }

  // ================= camera =================
  async _fixate() {
    const tStart = performance.now();
    this._override = false;
    for (;;) {
      const now = performance.now();
      const fx = isFixating(this.buf, now, this.cal);
      if (fx.stable) { this.ui.buttons?.('none'); this.ui.hint?.(''); return { ok: true, how: 'stable', fx }; }
      if (this._override) { this._override = false; this.ui.buttons?.('none'); return { ok: true, how: 'override', fx }; }
      const waited = now - tStart;
      if (waited > 4000) this.ui.buttons?.('present');
      const why = fx.why;
      this.ui.hint?.(
        why === 'no-data' ? 'Face not detected — reposition tablet' :
        why === 'off-center' ? 'Waiting: patient not looking at the centre' :
        why === 'blink-or-lost' ? 'Waiting for steady gaze…' : 'Waiting for steady gaze…');
      if (waited > 45000) return { ok: false, how: 'timeout' };
      await this._wait(50);
    }
  }

  async _camera(rec, targets) {
    // 1. steady fixation + baseline (retry up to 3x if it breaks during the random foreperiod)
    let base = null, fixInfo = null, how = null;
    for (let a = 0; a < 3 && !base; a++) {
      this.r.setAnchor({ on: true });
      const f = await this._fixate();
      if (!f.ok) return { outcome: 'invalid', reason: 'no steady fixation' };
      how = f.how;
      await this._wait(rand(250, 800, this.rng));
      const now = performance.now();
      const chk = isFixating(this.buf, now, this.cal);
      if (chk.stable || how === 'override') { base = baselineFrom(this.buf, now); fixInfo = chk.base ? chk : f.fx; }
    }
    if (!base) return { outcome: 'invalid', reason: 'baseline unavailable' };
    const fixGx = fixInfo?.gx, fixGy = fixInfo?.gy;

    await this._gap();
    const t0 = await this._present(rec, targets);
    const windowMs = this._windowFor(rec);
    const stimMs = this._stimFor(rec);
    await this._wait(stimMs);
    this.r.clearTargets();
    await this._wait(Math.max(0, t0 + windowMs - performance.now()) + 160); // let trailing frames arrive
    const common = { onset: t0, windowMs, base, cal: this.cal };
    const meta = { fixGx: fixGx != null ? +fixGx.toFixed(2) : null, fixGy: fixGy != null ? +fixGy.toFixed(2) : null, fixOverride: how === 'override' };

    if (rec.kind === 'catch') {
      const refMag = median(this.quadLocs.filter((l) => l.ring === 'in').map((l) => Math.hypot(l.h, this.cal.okY ? l.v : 0)));
      const a = analyzeCatch(this.buf, { ...common, refMag });
      if (!a.valid) return { outcome: 'invalid', reason: a.reason, validFrac: +a.validFrac.toFixed(2), ...meta };
      return { outcome: a.falseAlarm ? 'fa' : 'cr', latency: a.latency != null ? Math.round(a.latency) : null, validFrac: +a.validFrac.toFixed(2), ...meta };
    }
    if (rec.kind === 'dss-bi') {
      const tL = targets.find((t) => t.side === 'L'), tR = targets.find((t) => t.side === 'R');
      const a = analyzeBilateral(this.buf, { ...common, tL, tR });
      if (!a.valid) return { outcome: 'invalid', reason: a.reason, validFrac: +a.validFrac.toFixed(2), ...meta };
      const sides = new Set([a.first?.side, a.second?.side].filter(Boolean));
      const outcome = sides.size === 2 ? 'both' : sides.has('L') ? 'left' : sides.has('R') ? 'right' : 'none';
      return { outcome, first: a.first ? a.first.side : null, latency: a.first ? Math.round(a.first.latency) : null, secondLatency: a.second ? Math.round(a.second.latency) : null, validFrac: +a.validFrac.toFixed(2), ...meta };
    }
    const a = analyzeSingle(this.buf, { ...common, target: targets[0] });
    if (!a.valid) return { outcome: 'invalid', reason: a.reason, validFrac: +a.validFrac.toFixed(2), ...meta };
    return {
      outcome: a.outcome,
      latency: a.latency != null ? Math.round(a.latency) : null,
      peakDeg: +a.peakDeg.toFixed(1),
      firstQuad: a.firstShift?.quad ?? null,
      validFrac: +a.validFrac.toFixed(2),
      ...meta,
    };
  }

  // ================= examiner =================
  _waitExaminer(timeoutMs) {
    return this._cancelable((done, entry) => {
      const id = setTimeout(() => done(null), timeoutMs);
      entry.cleanup = () => { clearTimeout(id); this._exSink = null; };
      this._exSink = (code, t) => done({ code, t });
    });
  }

  async _examiner(rec, targets) {
    await this._wait(rand(1000, 2200, this.rng));
    await this._gap();
    const t0 = await this._present(rec, targets);
    const windowMs = this._windowFor(rec);
    const stimMs = this._stimFor(rec);
    const hideTimer = setTimeout(() => this.r.clearTargets(), stimMs);
    this.ui.buttons?.(rec.kind === 'dss-bi' ? 'dss4' : 'seen-missed');
    this.ui.hint?.('Score what the eyes did');
    let resp;
    try { resp = await this._waitExaminer(windowMs + 2500); } finally { clearTimeout(hideTimer); }
    if (!resp) return { outcome: 'invalid', reason: 'unscored' };
    const scoreMs = Math.round(resp.t - t0);
    const c = resp.code;
    if (rec.kind === 'catch') return { outcome: c === 'seen' ? 'fa' : 'cr', scoreMs };
    if (rec.kind === 'dss-bi') return { outcome: c, scoreMs, first: null };
    return { outcome: c === 'seen' ? 'seen' : 'missed', scoreMs };
  }

  // ================= touch =================
  async _touchIntro() {
    const { geo } = this;
    const p = { x: geo.cx + geo.width * 0.12, y: geo.cy + geo.height * 0.1 };
    this.r.setAnchor({ on: false });
    this.r.startDemo(p.x, p.y, this.stimR * 1.15);
    this.ui.buttons?.('skip');
    this.ui.hint?.('Demo: patient taps the glowing circle (or tap “Skip demo”)');
    await this._cancelable((done, entry) => {
      const hit = (tap) => {
        if (Math.hypot(tap.x - p.x, tap.y - p.y) <= this.hitR * 1.2) { this.r.pop(p.x, p.y, this.stimR); done(); }
      };
      entry.cleanup = () => { this._tapSink = null; this._exSink = null; };
      this._tapSink = hit;
      this._exSink = (code) => { if (code === 'skip') done(); };
      this.hooks.onDemo?.({ x: p.x, y: p.y, hit });
    });
    this.r.stopDemo();
    this.ui.buttons?.('none'); this.ui.hint?.('');
    await this._wait(500);
    // two easy practice trials, not scored
    for (const loc of buildPracticeLocations(geo, this.s.stimDeg)) {
      this.r.setAnchor({ on: true, x: geo.cx, y: geo.cy, r: this.anchorR, style: this.s.anchor });
      await this._wait(rand(900, 1500, this.rng));
      const rec = { kind: 'practice', targets: [] };
      const tg = [{ id: loc.id, x: loc.x, y: loc.y, h: loc.h, v: loc.v, ecc: loc.ecc, r: this.stimR }];
      await this._touchCollect(rec, tg, { timeoutMs: Math.max(this.s.touchTimeoutMs, 8000), practice: true });
      this.r.clearTargets();
      await this._returnRing(tg[0]);
    }
    this.practiceDone = 2;
  }

  async _returnRing(from) {
    this.r.startRing(from.x, from.y, this.geo.cx, this.geo.cy, this.stimR * 1.5, this.anchorR * 1.7, 900);
    await this._wait(950);
  }

  // Presents `targets` and collects taps until all are hit, or timeout.
  async _touchCollect(rec, targets, { timeoutMs, practice = false }) {
    const t0 = await this._present(rec, targets, { practice });
    const remaining = new Set(targets.map((_, i) => i));
    const hits = [], taps = [];
    await this._cancelable((done, entry) => {
      const timer = setTimeout(() => done(), timeoutMs);
      entry.cleanup = () => { clearTimeout(timer); this._tapSink = null; };
      this._tapSink = (tap) => {
        const rt = tap.t - t0;
        let best = -1, bd = Infinity;
        for (const i of remaining) {
          const d = Math.hypot(tap.x - targets[i].x, tap.y - targets[i].y);
          if (d < bd) { bd = d; best = i; }
        }
        const hit = best >= 0 && bd <= this.hitR;
        taps.push({ t: Math.round(rt), x: Math.round(tap.x), y: Math.round(tap.y), hit, err: best >= 0 ? Math.round(bd) : null });
        if (hit) {
          hits.push({ i: best, rt });
          remaining.delete(best);
          this.r.pop(targets[best].x, targets[best].y, this.stimR);
          // remove just that target
          this.r.targets = this.r.targets.filter((tt) => !(tt.x === targets[best].x && tt.y === targets[best].y));
          if (!remaining.size) done();
        }
      };
    });
    return { t0, hits, taps, remaining };
  }

  async _touch(rec, targets) {
    await this._wait(rand(1000, 2200, this.rng));
    await this._gap();
    if (rec.kind === 'catch') {
      const c = await this._touchCollect(rec, [], { timeoutMs: this.s.windowMs + 600 });
      return { outcome: c.taps.length ? 'fa' : 'cr', stray: c.taps.length };
    }
    const c = await this._touchCollect(rec, targets, { timeoutMs: this.s.touchTimeoutMs });
    const strays = c.taps.filter((t) => !t.hit);
    const out = { stray: strays.length, strayTaps: strays.slice(0, 4).map((t) => ({ x: t.x, y: t.y, t: t.t })) };

    if (rec.kind === 'dss-bi') {
      const sideOf = (i) => targets[i].side;
      const order = c.hits.map((h) => sideOf(h.i));
      const sides = new Set(order);
      const outcome = sides.size === 2 ? 'both' : sides.has('L') ? 'left' : sides.has('R') ? 'right' : 'none';
      const rtL = c.hits.find((h) => sideOf(h.i) === 'L')?.rt, rtR = c.hits.find((h) => sideOf(h.i) === 'R')?.rt;
      Object.assign(out, { outcome, first: order[0] ?? null, rtL: rtL != null ? Math.round(rtL) : null, rtR: rtR != null ? Math.round(rtR) : null });
      out.latency = c.hits.length ? Math.round(c.hits[0].rt) : null;
    } else if (c.hits.length) {
      const rt = Math.round(c.hits[0].rt);
      out.rt = rt; out.latency = rt;
      out.outcome = rt <= this.s.delayedMs ? 'seen' : 'delayed';
    } else {
      out.outcome = 'missed';
    }
    // shrinking ring pulls gaze back to centre
    const last = c.hits.length ? targets[c.hits[c.hits.length - 1].i] : targets[0];
    this.r.clearTargets();
    await this._returnRing(last);
    return out;
  }
}
