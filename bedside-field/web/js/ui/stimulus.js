// Canvas renderer for everything the PATIENT sees: fixation anchor, flickering/looming
// peripheral targets, the "pop" feedback, the return ring, and the finger-tap demo.
// No text is ever drawn here (patients may be aphasic): all instructions are animations.

const AMBER = '#ffb703';

function makeGabor(D, phase) {
  const c = document.createElement('canvas');
  c.width = c.height = D;
  const g = c.getContext('2d');
  const img = g.createImageData(D, D);
  const sigma = D / 4.4, cycles = 2.4;
  for (let y = 0; y < D; y++) {
    for (let x = 0; x < D; x++) {
      const dx = x - D / 2, dy = y - D / 2;
      const env = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      const car = 0.5 + 0.5 * Math.cos((2 * Math.PI * cycles * dx) / D + phase);
      const i = (y * D + x) * 4;
      const v = Math.round(255 * car);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = Math.round(255 * env);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0; this.h = 0; this.dpr = 1;
    this.anchor = { on: false, x: 0, y: 0, r: 20, style: 'pulse' };
    this.targets = [];
    this.fx = [];
    this.ring = null;
    this.demo = null;
    this.flickerHz = 12;
    this.style = 'disc';
    this.running = false;
    this._gabor = null;
    this.gazeFn = null;   // () => {x, y, r} | null, set by the app while a gaze marker should show
    this._gz = null;
  }

  resize(w, h, dpr = window.devicePixelRatio || 1) {
    this.w = w; this.h = h; this.dpr = Math.min(dpr, 2.5);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  configure({ style, flickerHz }) {
    if (style) this.style = style;
    if (flickerHz) this.flickerHz = flickerHz;
    this._gabor = null;
  }

  setAnchor(a) { Object.assign(this.anchor, a); }
  showTargets(list) {
    const t0 = performance.now();
    this.targets = list.map((t) => ({ ...t, t0 }));
  }
  clearTargets() { this.targets = []; }
  pop(x, y, r) { this.fx.push({ x, y, r, t0: performance.now(), kind: 'pop' }); }
  startRing(x0, y0, x1, y1, r0, r1, dur = 900) { this.ring = { x0, y0, x1, y1, r0, r1, dur, t0: performance.now() }; }
  clearRing() { this.ring = null; }
  startDemo(x, y, r) { this.demo = { x, y, r, t0: performance.now(), popped: false }; }
  stopDemo() { this.demo = null; }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = (now) => {
      if (!this.running) return;
      this.draw(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  stop() { this.running = false; }

  // ---------------- drawing ----------------
  draw(now) {
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.w, this.h);
    if (this.anchor.on) this._anchor(now);
    if (this.ring) this._ring(now);
    for (const t of this.targets) this._target(t, now);
    if (this.demo) this._demo(now);
    this.fx = this.fx.filter((f) => now - f.t0 < 420);
    for (const f of this.fx) this._pop(f, now);
    if (this.gazeFn) this._gaze();
  }

  setGaze(fn) { this.gazeFn = fn || null; this._gz = null; }

  // Examiner-facing marker: a green ring that follows where the tracker thinks the eyes point.
  // Smoothed lightly so camera jitter does not make it shake; hidden whenever tracking is lost.
  _gaze() {
    const g = this.gazeFn();
    if (!g) { this._gz = null; return; }
    const st = this._gz || (this._gz = { x: g.x, y: g.y });
    st.x += (g.x - st.x) * 0.35;
    st.y += (g.y - st.y) * 0.35;
    const { ctx } = this, r = g.r || 18;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(61,220,151,.95)';
    ctx.fillStyle = 'rgba(61,220,151,.16)';
    ctx.beginPath(); ctx.arc(st.x, st.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(st.x - r * 0.5, st.y); ctx.lineTo(st.x + r * 0.5, st.y);
    ctx.moveTo(st.x, st.y - r * 0.5); ctx.lineTo(st.x, st.y + r * 0.5);
    ctx.stroke();
    if (g.unc > r) { // measured error radius of this device, so the ring is never drawn more precisely than it is
      ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(61,220,151,.55)';
      ctx.beginPath(); ctx.arc(st.x, st.y, g.unc, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  _anchor(now) {
    const { ctx } = this;
    const { x, y, r, style } = this.anchor;
    const t = now / 1000;
    const p = 0.5 + 0.5 * Math.sin(2 * Math.PI * 1.1 * t);
    if (style === 'face') {
      const R = r * (1.5 + 0.06 * p);
      ctx.fillStyle = AMBER;
      ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
      const blink = (now % 3600) > 3480;
      ctx.fillStyle = '#1b1200';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + s * R * 0.36, y - R * 0.2, R * 0.1, blink ? R * 0.02 : R * 0.15, 0, 0, 7);
        ctx.fill();
      }
      ctx.strokeStyle = '#1b1200'; ctx.lineWidth = Math.max(2, R * 0.08); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y + R * 0.05, R * 0.52, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      return;
    }
    ctx.strokeStyle = `rgba(255,183,3,${0.85 - 0.5 * p})`;
    ctx.lineWidth = Math.max(2, r * 0.18);
    ctx.beginPath(); ctx.arc(x, y, r * (1.25 + 0.4 * p), 0, 7); ctx.stroke();
    ctx.fillStyle = AMBER;
    ctx.beginPath(); ctx.arc(x, y, r * (0.8 + 0.1 * p), 0, 7); ctx.fill();
    ctx.fillStyle = '#1b1200';
    ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, 7); ctx.fill();
  }

  _target(tg, now) {
    const { ctx } = this;
    const age = (now - tg.t0) / 1000;
    const phase = Math.floor(age * this.flickerHz * 2) % 2;
    const r = tg.r;
    if (this.style === 'gabor') {
      if (!this._gabor || this._gabor.D !== Math.ceil(r * 3.8)) {
        const D = Math.ceil(r * 3.8);
        this._gabor = { D, a: makeGabor(D, 0), b: makeGabor(D, Math.PI) };
      }
      const img = phase ? this._gabor.b : this._gabor.a;
      const loom = 0.92 + 0.12 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 2.5 * age));
      const D = this._gabor.D * loom;
      ctx.drawImage(img, tg.x - D / 2, tg.y - D / 2, D, D);
      return;
    }
    // looming + luminance-flickering disc
    const loom = 0.86 + 0.24 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 3 * age));
    const R = r * loom;
    const grad = ctx.createRadialGradient(tg.x, tg.y, R * 0.6, tg.x, tg.y, R * 1.7);
    grad.addColorStop(0, phase ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.08)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(tg.x, tg.y, R * 1.7, 0, 7); ctx.fill();
    ctx.fillStyle = phase ? '#ffffff' : '#6b6b6b';
    ctx.beginPath(); ctx.arc(tg.x, tg.y, R, 0, 7); ctx.fill();
    ctx.strokeStyle = phase ? '#6b6b6b' : '#ffffff';
    ctx.lineWidth = Math.max(2, R * 0.12);
    ctx.beginPath(); ctx.arc(tg.x, tg.y, R * 0.62, 0, 7); ctx.stroke();
  }

  _pop(f, now) {
    const { ctx } = this;
    const p = (now - f.t0) / 420;
    ctx.strokeStyle = `rgba(255,255,255,${1 - p})`;
    ctx.lineWidth = 4 * (1 - p) + 1;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 + 1.6 * p), 0, 7); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - p)})`;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - 0.4 * p), 0, 7); ctx.fill();
  }

  _ring(now) {
    const { ctx } = this;
    const k = this.ring;
    const p = Math.min(1, (now - k.t0) / k.dur);
    const e = easeInOut(p);
    const x = k.x0 + (k.x1 - k.x0) * e, y = k.y0 + (k.y1 - k.y0) * e;
    const r = k.r0 + (k.r1 - k.r0) * e;
    ctx.strokeStyle = `rgba(255,255,255,${0.95 - 0.25 * p})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    if (p >= 1) this.ring = null;
  }

  // Looping "finger taps the glowing circle" animation: no language required.
  _demo(now) {
    const { ctx } = this;
    const d = this.demo;
    const T = 3200;
    const age = (now - d.t0) % T;
    // glowing circle (pulsing)
    const glow = 0.5 + 0.5 * Math.sin(now / 220);
    const grad = ctx.createRadialGradient(d.x, d.y, d.r * 0.5, d.x, d.y, d.r * 2.1);
    grad.addColorStop(0, `rgba(255,255,255,${0.35 + 0.2 * glow})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 2.1, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill();

    // fingertip path: starts lower-right, approaches, presses at 1.6s, lifts away
    const start = { x: d.x + d.r * 4.2, y: d.y + d.r * 5.2 };
    const end = { x: d.x + d.r * 0.15, y: d.y + d.r * 0.2 };
    let q;
    if (age < 1400) q = easeInOut(age / 1400);
    else if (age < 1900) q = 1;
    else if (age < 2700) q = 1 - easeInOut((age - 1900) / 800);
    else q = 0;
    const press = age > 1400 && age < 1900 ? 1 : 0;
    const fx = start.x + (end.x - start.x) * q, fy = start.y + (end.y - start.y) * q;
    this._hand(fx, fy, d.r, press);
    if (age > 1450 && age < 1900) {
      const p = (age - 1450) / 450;
      ctx.strokeStyle = `rgba(255,255,255,${1 - p})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * (1.1 + 1.2 * p), 0, 7); ctx.stroke();
    }
  }

  _hand(x, y, r, pressed) {
    const { ctx } = this;
    const s = r * 0.9; // scale
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.38);
    ctx.scale(pressed ? 0.94 : 1, pressed ? 0.94 : 1);
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#e9e2da'; ctx.strokeStyle = '#8d857c'; ctx.lineWidth = 3;
    // finger
    ctx.beginPath();
    ctx.roundRect(-s * 0.55, -s * 0.4, s * 1.1, s * 3.2, s * 0.55);
    ctx.fill(); ctx.stroke();
    // palm
    ctx.beginPath();
    ctx.roundRect(-s * 1.4, s * 2.0, s * 2.8, s * 2.6, s * 0.8);
    ctx.fill(); ctx.stroke();
    // thumb
    ctx.beginPath();
    ctx.roundRect(s * 1.1, s * 2.3, s * 0.95, s * 1.7, s * 0.45);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
