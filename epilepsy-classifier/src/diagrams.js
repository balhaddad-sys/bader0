/*
 * Diagram generators (pure string builders — no DOM, no network).
 *  - waveformSvg(figKey)         stylised multichannel EEG schematic for each morphology
 *  - timelineSvg(rows, opts)     age-of-onset chart derived from the knowledge base
 *  - seizureTreeHtml()           ILAE 2025 seizure classification tree
 *  - scoringFlowSvg()            how mandatory / alert / exclusionary criteria combine
 *
 * EEG figures are SCHEMATIC illustrations (negative potential up), generated from a
 * seeded model so they are deterministic. They are not recordings.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EpiDiagrams = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const TAU = Math.PI * 2;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------------- signal primitives ---------------- */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const gauss = (x, s) => Math.exp(-((x / s) * (x / s)));
  function mix(seed, n, f0, f1, amp) { // sum of random sinusoids (band-limited texture)
    const r = rng(seed), c = [];
    for (let i = 0; i < n; i++) c.push([f0 + (f1 - f0) * r(), r() * TAU, 0.5 + r()]);
    const k = amp / Math.sqrt(n);
    return (t) => { let s = 0; for (let i = 0; i < n; i++) s += c[i][2] * Math.sin(TAU * c[i][0] * t + c[i][1]); return k * s; };
  }
  function alpha(seed, amp, f) {
    const r = rng(seed), p = r() * TAU, q = r() * TAU, f0 = (f || 10) + (r() - 0.5) * 0.6;
    return (t) => amp * Math.sin(TAU * f0 * t + p) * (0.55 + 0.45 * Math.sin(TAU * 0.33 * t + q));
  }
  const win = (t, a, b, edge) => 0.5 * (Math.tanh((t - a) / (edge || 0.06)) - Math.tanh((t - b) / (edge || 0.06)));
  const spike = (t, t0, a, w) => a * gauss(t - t0, w || 0.018);
  function sw(t, t0, T, a) { return spike(t, t0, a) - 0.55 * a * gauss(t - (t0 + 0.42 * T), 0.16 * T) + 0.12 * a * gauss(t - (t0 + 0.85 * T), 0.1 * T); }
  function psw(t, t0, T, a, n) { let v = -0.5 * a * gauss(t - (t0 + 0.14 + 0.42 * T), 0.14 * T); for (let k = 0; k < n; k++) v += spike(t, t0 + k * 0.045, a * (0.75 + 0.25 * ((k * 7) % 3) / 2), 0.015); return v; }
  function train(t, times, f) { let v = 0; for (let i = 0; i < times.length; i++) { const d = t - times[i]; if (d > -0.05 && d < 0.6) v += f(t, times[i], i); } return v; }
  function regular(a, b, hz) { const o = []; for (let x = a; x < b - 1e-6; x += 1 / hz) o.push(x); return o; }

  const LONG = ['Fp1–F3', 'F3–C3', 'C3–P3', 'P3–O1', 'Fp2–F4', 'F4–C4', 'C4–P4', 'P4–O2'];
  const TEMP = ['Fp1–F7', 'F7–T3', 'T3–T5', 'T5–O1', 'Fp2–F8', 'F8–T4', 'T4–T6', 'T6–O2'];
  const GEN_W = [0.9, 1, 0.95, 0.65, 0.9, 1, 0.95, 0.65];
  const isOcc = (i) => i % 4 === 3;

  /* background builders */
  const normalBg = (i, s, f) => { const al = alpha(s + i, isOcc(i) ? 42 : 12, f || 10), nz = mix(s + 50 + i, 7, 13, 30, 9); return (t) => al(t) + nz(t); };
  const slowBg = (i, s, amp) => { const a = mix(s + i, 6, 1, 4.5, amp), b = mix(s + 90 + i, 5, 4, 7, amp * 0.45); return (t) => a(t) + b(t); };

  /* ---------------- figure builders ---------------- */
  // Each returns { dur, montage, ch:(i)=>fn(t), bands?, tags?, photic?, note }
  const FIG = {
    normal: () => ({ dur: 4, montage: LONG, ch: (i) => normalBg(i, 100), tags: [{ rows: [3, 3], text: 'alpha|(posterior)' }, { rows: [0, 1], text: 'low-amplitude|frontal beta' }] }),
    mildslow: () => ({ dur: 4, montage: LONG, ch: (i) => { const a = alpha(200 + i, isOcc(i) ? 40 : 14, 7.5), s = mix(260 + i, 4, 4, 6.5, 10); return (t) => a(t) + s(t) + mix(300 + i, 5, 14, 28, 6)(t); }, tags: [{ rows: [3, 3], text: 'rhythm 1–2 Hz|slower than age' }] }),
    diffslow: () => ({ dur: 4, montage: LONG, ch: (i) => slowBg(i, 400, 52), tags: [{ rows: [0, 7], text: 'generalized|delta–theta,|no organised|rhythm' }] }),
    focalslow: () => ({ dur: 4, montage: TEMP, ch: (i) => { const bg = normalBg(i, 500); if (i === 1 || i === 2) { const d = mix(560 + i, 5, 1, 3, 70); return (t) => d(t) + 0.25 * bg(t); } return bg; }, tags: [{ rows: [1, 2], text: 'focal delta|(left temporal)' }] }),
    hemisph: () => ({ dur: 4, montage: LONG, ch: (i) => { if (i < 4) { const d = mix(600 + i, 5, 1.5, 4.5, 34), n = mix(640 + i, 4, 8, 20, 4); return (t) => d(t) + n(t); } return normalBg(i, 650); }, tags: [{ rows: [0, 3], text: 'left: slow,|attenuated' }, { rows: [4, 7], text: 'right:|preserved' }] }),
    bs: () => {
      const B = [[0.8, 3.1], [6.2, 8.0], [11.0, 12.6]], r = rng(7);
      const sp = []; B.forEach((b) => { for (let t = b[0] + 0.1; t < b[1] - 0.1; t += 0.12 + r() * 0.22) sp.push([t, 0.5 + r()]); });
      return { dur: 14, montage: LONG, scale: 5, ch: (i) => { const s = mix(700 + i, 6, 1, 6, 80), q = mix(740 + i, 4, 20, 40, 2); const ofs = i * 0.013; const spk = sp.filter((_, k) => (k + i) % 2 === 0);
        return (t) => { let burst = 0; B.forEach((b) => { burst += win(t, b[0], b[1], 0.04); }); let v = burst * s(t); spk.forEach((p) => { if (Math.abs(t - p[0] - ofs) < 0.06) v += burst * spike(t, p[0] + ofs, 150 * p[1], 0.02); }); return v + q(t); }; },
        bands: [{ t0: 0.8, t1: 3.1, label: 'burst (1–5 s)' }, { t0: 3.1, t1: 6.2, label: 'suppression (3–10 s)', cls: 'quiet' }, { t0: 6.2, t1: 8.0, label: 'burst' }, { t0: 11, t1: 12.6, label: 'burst' }], tags: [{ rows: [0, 7], text: 'bursts 150–300 µV|suppression <5 µV' }] };
    },
    hyps: () => { const r = rng(11), per = []; for (let i = 0; i < 8; i++) { const a = []; for (let k = 0; k < 4 + Math.floor(r() * 3); k++) a.push([r() * 3.7 + 0.1, 0.7 + r() * 0.8]); per.push(a); }
      return { dur: 4, montage: LONG, ch: (i) => { const s = mix(800 + i, 7, 0.8, 3.5, 62), n = mix(840 + i, 5, 4, 9, 30); return (t) => { let v = s(t) + n(t); per[i].forEach((p) => { v += spike(t, p[0], 150 * p[1], 0.02) - 0.4 * 150 * p[1] * gauss(t - p[0] - 0.09, 0.07); }); return v; }; },
        tags: [{ rows: [0, 7], text: 'chaotic high-|amplitude delta,|asynchronous|multifocal spikes' }] }; },
    multi: () => { const ev = [[0, 0.7], [6, 1.35], [3, 2.1], [5, 2.8], [1, 3.3], [7, 3.75]]; return { dur: 4, montage: LONG, ch: (i) => { const bg = slowBg(i, 900, 18), nz = normalBg(i, 940); const mine = ev.filter((e) => e[0] === i);
      return (t) => 0.5 * bg(t) + 0.5 * nz(t) + train(t, mine.map((e) => e[1]), (tt, t0) => sw(tt, t0, 0.3, 105)); }, tags: [{ rows: [0, 7], text: 'independent spikes|in different regions|at different times' }] }; },
    focalspike: () => ({ dur: 4, montage: TEMP, ch: (i) => { const bg = normalBg(i, 1000), T = [0.9, 2.5]; const k = i === 1 ? 1 : i === 2 ? -1 : i === 0 ? 0.25 : i === 3 ? -0.2 : 0;
      return (t) => bg(t) * 0.8 + k * train(t, T, (tt, t0) => sw(tt, t0, 0.32, 120)); }, tags: [{ rows: [1, 2], text: 'phase reversal|at T3 = spike|maximum' }] }),
    gsw3: () => ({ dur: 5, montage: LONG, ch: (i) => { const bg = normalBg(i, 1100), T = regular(1.0, 4.0, 3); return (t) => bg(t) * (1 - 0.7 * win(t, 1.0, 4.0, 0.05)) + GEN_W[i] * train(t, T, (tt, t0) => sw(tt, t0, 1 / 3, 125)); },
      bands: [{ t0: 1.0, t1: 4.0, label: '≈3 s absence' }], tags: [{ rows: [0, 7], text: '3 Hz, regular,|bisynchronous,|abrupt on/offset' }] }),
    poly: () => { const t1 = regular(0.7, 2.3, 4.5), t2 = regular(3.4, 4.2, 4); return { dur: 5, montage: LONG, ch: (i) => { const bg = normalBg(i, 1200); return (t) => bg(t) * (1 - 0.5 * win(t, 0.7, 2.3) - 0.5 * win(t, 3.4, 4.2)) + GEN_W[i] * (train(t, t1, (tt, t0, k) => psw(tt, t0, 1 / 4.5, 105, 2 + (k % 3))) + train(t, t2, (tt, t0, k) => psw(tt, t0, 1 / 4, 105, 3 + (k % 2)))); },
      bands: [{ t0: 0.7, t1: 2.3, label: 'polyspike-wave' }, { t0: 3.4, t1: 4.2, label: '' }], tags: [{ rows: [0, 7], text: '3–5.5 Hz|polyspikes + wave,|generalized' }] }; },
    gsw26: () => { const T = [0.5, 0.92, 1.5, 1.86, 2.55, 3.1, 3.42, 4.15]; return { dur: 5, montage: LONG, ch: (i) => { const bg = slowBg(i, 1300, 20), nz = normalBg(i, 1340); return (t) => 0.45 * bg(t) + 0.55 * nz(t) + GEN_W[i] * train(t, T, (tt, t0, k) => psw(tt, t0, 0.3, 105, 1 + (k % 3))); }, tags: [{ rows: [0, 7], text: 'irregular 2–6 Hz,|spike & polyspike|-wave' }] }; },
    slowsw: () => { const T = []; let x = 0.5; const r = rng(21); while (x < 5.4) { T.push(x); x += 0.42 + r() * 0.2; } const W = [1.15, 1, 0.8, 0.45, 1.15, 1, 0.8, 0.45]; return { dur: 6, montage: LONG, ch: (i) => { const bg = slowBg(i, 1400, 24); return (t) => bg(t) + W[i] * train(t, T, (tt, t0) => sw(tt, t0, 0.5, 105)); }, tags: [{ rows: [0, 7], text: '<2.5 Hz, irregular,|frontal-predominant,|slow background' }] }; },
    gpfa: () => ({ dur: 5, montage: LONG, ch: (i) => { const bg = mix(1500 + i, 5, 0.8, 3.5, 24), sp = alpha(1540 + i, 10, 13), f = 14 + (i % 3) * 0.7; return (t) => bg(t) + 0.4 * sp(t) * win(t, 0.3, 4.7) + GEN_W[i] * win(t, 2.0, 3.5, 0.2) * Math.min(1, (t - 2.0) / 0.5 + 0.2) * 38 * Math.sin(TAU * f * t); },
      bands: [{ t0: 0, t1: 5, label: 'NREM sleep', cls: 'state' }, { t0: 2.0, t1: 3.5, label: 'fast burst ≈14 Hz' }], tags: [{ rows: [0, 7], text: '10–20 Hz burst,|≥1 s, generalized|(sleep)' }] }),
    swas: () => { const T = []; const r = rng(31); let x = 0.2; while (x < 5) { T.push(x); x += 0.5 + (r() - 0.5) * 0.1; } return { dur: 5, montage: LONG, ch: (i) => { const bg = mix(1600 + i, 4, 0.8, 3, 18); return (t) => bg(t) + GEN_W[i] * train(t, T, (tt, t0) => sw(tt, t0, 0.5, 140)); }, bands: [{ t0: 0, t1: 5, label: 'NREM sleep', cls: 'state' }], tags: [{ rows: [0, 7], text: 'near-continuous|1.5–2 Hz diffuse|spike-wave' }] }; },
    ctsp: () => { const T = [1.0, 2.9]; return { dur: 4, montage: LONG, ch: (i) => { const bg = normalBg(i, 1700); const k = [0, 1, -1, 0, 0, 0, 0, 0][i]; const f = i === 0 ? -0.35 : 1; return (t) => bg(t) * 0.8 + (i === 0 ? -0.35 : k) * train(t, T, (tt, t0) => sw(tt, t0, 0.34, 190)) + (i === 2 ? -0.1 * f : 0); },
      tags: [{ rows: [1, 2], text: 'C3 centrotemporal|spike, phase|reversal' }, { rows: [0, 0], text: 'opposite polarity|(horizontal dipole)' }, { rows: [4, 7], text: 'right side quiet' }] }; },
    occ: () => { const T = regular(1.2, 2.9, 2.6); return { dur: 4, montage: LONG, ch: (i) => { const bg = normalBg(i, 1800); return (t) => (isOcc(i) ? bg(t) * (1 - win(t, 1.2, 2.9) * 0.6) : bg(t) * 0.7) + (isOcc(i) ? 1 : 0.12) * train(t, T, (tt, t0) => sw(tt, t0, 0.38, 130)); },
      bands: [{ t0: 1.2, t1: 2.9, label: 'occipital run' }], tags: [{ rows: [3, 3], text: 'occipital spike-|wave' }, { rows: [7, 7], text: 'bilateral' }] }; },
    occeye: () => { const T = regular(3.9, 7.4, 2.6); return { dur: 8, montage: LONG, ch: (i) => { const bg = normalBg(i, 1900); return (t) => bg(t) * (isOcc(i) ? (1 + 0.5 * win(t, 3.4, 8)) * (t < 3.4 ? 0.35 : 1) : 0.8) + (isOcc(i) ? 1 : 0.1) * train(t, T, (tt, t0) => sw(tt, t0, 0.38, 125)); },
      bands: [{ t0: 0, t1: 3.4, label: 'eyes open', cls: 'state' }, { t0: 3.4, t1: 8, label: 'eyes closed', cls: 'state2' }], tags: [{ rows: [3, 3], text: 'discharges only|after eye closure' }] }; },
    temporal: () => { const T = [0.8, 2.0, 3.3]; return { dur: 4, montage: TEMP, ch: (i) => { const bg = normalBg(i, 2000); const k = [0.85, -1, -0.15, 0, 0, 0, 0, 0][i]; return (t) => bg(t) * 0.8 + k * train(t, T, (tt, t0) => sw(tt, t0, 0.3, 135)); }, tags: [{ rows: [0, 1], text: 'phase reversal at|F7 – anterior|temporal sharp wave' }] }; },
    ppr: () => { const flashes = regular(1.0, 3.6, 12); return { dur: 6, montage: LONG, photic: { times: flashes }, ch: (i) => { const bg = normalBg(i, 2100), T = regular(2.3, 4.5, 3.8); return (t) => bg(t) * 0.7 + (isOcc(i) ? 24 * win(t, 1.0, 2.3) * Math.sin(TAU * 12 * t) : 0) + GEN_W[i] * train(t, T, (tt, t0, k) => psw(tt, t0, 0.26, 110, 2 + (k % 3))); },
      bands: [{ t0: 1.0, t1: 3.6, label: 'flicker 12 Hz', cls: 'state' }, { t0: 2.3, t1: 4.5, label: 'generalized discharge' }], tags: [{ rows: [0, 7], text: 'outlasts the|stimulus' }] }; },
    pprslow: () => { const flashes = regular(0.5, 5.5, 2); return { dur: 6, montage: LONG, photic: { times: flashes }, ch: (i) => { const bg = normalBg(i, 2200); return (t) => bg(t) * 0.7 + (isOcc(i) ? 1 : 0.18) * train(t, flashes.map((x) => x + 0.1), (tt, t0, k) => psw(tt, t0, 0.2, 135, 2 + (k % 2))); },
      bands: [{ t0: 0.5, t1: 5.5, label: 'slow flicker ≈2 Hz', cls: 'state' }], tags: [{ rows: [3, 3], text: 'time-locked|spike each flash' }, { rows: [7, 7], text: '' }] }; },
    eem: () => { const T = regular(1.9, 3.0, 5).concat(regular(4.1, 5.0, 5)); return { dur: 6, montage: LONG, ch: (i) => { const bg = normalBg(i, 2300); const art = (i === 0 || i === 4) ? (t) => 70 * (win(t, 1.9, 3.0) + win(t, 4.1, 5.0)) * Math.sin(TAU * 5 * t) : () => 0; return (t) => bg(t) * (t < 1.6 ? 0.45 : 1) + art(t) + GEN_W[i] * train(t, T, (tt, t0, k) => psw(tt, t0, 0.2, 110, 3 + (k % 2))); },
      bands: [{ t0: 0, t1: 1.6, label: 'eyes open', cls: 'state' }, { t0: 1.6, t1: 6, label: 'eyes closed', cls: 'state2' }], tags: [{ rows: [0, 0], text: 'eyelid flutter|artefact (>4 Hz)' }, { rows: [1, 7], text: 'polyspike-wave|after closure' }] }; },
    migrating: () => ({ dur: 30, montage: LONG, scale: 5, ch: (i) => { const bg = normalBg(i, 2400), seg = [[7, 0.0, 11], [6, 0.0, 11], [5, 8.5, 21], [4, 8.5, 21], [0, 18, 29], [1, 18, 29]]; const mine = seg.filter((s) => s[0] === i);
      return (t) => { let v = bg(t) * 0.7; mine.forEach((s) => { const e = win(t, s[1], s[2], 0.5) * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - s[1]) / (s[2] - s[1]))))); v += e * 52 * Math.sin(TAU * 5.5 * t); }); return v; }; },
      bands: [{ t0: 0, t1: 11, label: 'focus 1: right posterior' }, { t0: 8.5, t1: 21, label: 'focus 2: right fronto-central', cls: 'state' }, { t0: 18, t1: 29, label: 'focus 3: left frontal' }], tags: [{ rows: [0, 7], text: 'ictal rhythm moves|across regions|within one seizure' }] }),
  };

  /* ---------------- waveform -> SVG ---------------- */
  function waveformSvg(key, label, opts) {
    const spec = FIG[key] && FIG[key]();
    if (!spec) return '';
    const thumb = !!(opts && opts.thumb);
    // Thumbnail: the same signal on a compact canvas — no channel names, tags, band captions or axis — for picture cards.
    const W = thumb ? 300 : 740, L = thumb ? 4 : 78, Rg = thumb ? 296 : 600, top = thumb ? 5 : 24, rowH = thumb ? 15 : 24, scale = 0.145 * rowH / 24, clampV = rowH * 0.8;
    const n = spec.montage.length + (spec.photic ? 1 : 0);
    const H = thumb ? top + n * rowH + 5 : top + n * rowH + 40, plotW = Rg - L, pxs = plotW / spec.dur;
    const N = thumb ? Math.min(130, Math.max(60, Math.round(spec.dur * 36))) : Math.min(1000, Math.max(60, Math.round(spec.dur * 110))); // cap resolution: keeps long figures light
    let g = '';
    (spec.bands || []).forEach((b) => {
      const x = L + b.t0 * pxs, w = (b.t1 - b.t0) * pxs;
      g += `<rect class="fb ${b.cls || ''}" x="${x.toFixed(1)}" y="${top - 2}" width="${w.toFixed(1)}" height="${n * rowH + 2}"/>`;
      if (b.label && !thumb) g += `<text class="fbl" x="${(x + 4).toFixed(1)}" y="${top - 8}">${esc(b.label)}</text>`;
    });
    spec.montage.forEach((name, i) => {
      const cy = top + i * rowH + rowH / 2, fn = spec.ch(i);
      let d = '';
      for (let j = 0; j <= N; j++) {
        const t = (j / N) * spec.dur; let v = fn(t) * scale;
        v = clampV * Math.tanh(v / clampV); // soft saturation: no artificial flat tops
        d += (j ? 'L' : 'M') + (L + t * pxs).toFixed(thumb ? 0 : 1) + ' ' + (cy - v).toFixed(1);
      }
      if (!thumb) g += `<text class="fl" x="${L - 8}" y="${cy + 3.5}" text-anchor="end">${esc(name)}</text>`;
      g += `<path class="fw" d="${d}"/>`;
    });
    if (spec.photic) {
      const cy = top + spec.montage.length * rowH + rowH / 2;
      if (!thumb) g += `<text class="fl" x="${L - 8}" y="${cy + 3.5}" text-anchor="end">Photic</text>`;
      g += `<line class="fgrid" x1="${L}" x2="${Rg}" y1="${cy}" y2="${cy}"/>`;
      spec.photic.times.forEach((t) => { g += `<line class="fw ph" x1="${(L + t * pxs).toFixed(1)}" x2="${(L + t * pxs).toFixed(1)}" y1="${cy - (thumb ? 5 : 7)}" y2="${cy + (thumb ? 5 : 7)}"/>`; });
    }
    if (!thumb) {
      (spec.tags || []).forEach((tg) => {
        if (!tg.text) return;
        const y0 = top + tg.rows[0] * rowH + 4, y1 = top + (tg.rows[1] + 1) * rowH - 4, x = Rg + 8, mid = (y0 + y1) / 2, lines = tg.text.split('|');
        g += `<path class="tag-br" d="M${x} ${y0}V${y1}"/>`;
        g += `<text class="tag-t" x="${x + 7}" y="${mid - ((lines.length - 1) * 6.5) + 3.5}">${lines.map((s, k) => `<tspan x="${x + 7}" dy="${k ? 13 : 0}">${esc(s)}</tspan>`).join('')}</text>`;
      });
      const by = top + n * rowH + 14, sec = spec.dur > 10 ? 5 : 1, bx = Rg - sec * pxs;
      g += `<path class="axis" d="M${bx.toFixed(1)} ${by}H${Rg}M${bx.toFixed(1)} ${by - 4}V${by + 4}M${Rg} ${by - 4}V${by + 4}"/><text class="fl" x="${((bx + Rg) / 2).toFixed(1)}" y="${by + 16}" text-anchor="middle">${sec} s</text>`;
      g += `<text class="fl sch" x="${L}" y="${by + 16}">schematic · negative up</text>`;
    }
    const ttl = esc(label || key);
    return `<svg class="wave${thumb ? ' thumb' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Schematic EEG: ${ttl}" xmlns="http://www.w3.org/2000/svg"><title>Schematic EEG: ${ttl}</title>${g}</svg>`;
  }

  /* ---------------- age-of-onset chart ---------------- */
  const MIN_M = 0.03, MAX_M = 1100;
  const axX = (m, L, w) => L + (Math.log(Math.max(m, MIN_M) / MIN_M) / Math.log(MAX_M / MIN_M)) * w;
  const TICKS = [[0.03, 'birth'], [1, '1 mo'], [6, '6 mo'], [12, '1 y'], [24, '2 y'], [60, '5 y'], [120, '10 y'], [240, '20 y'], [480, '40 y'], [960, '80 y']];
  const GROUP_CLS = { 'Neonate–infant': 'g1', Childhood: 'g2', IGE: 'g3', 'Variable age': 'g4' };

  function timelineSvg(rows, opts) {
    opts = opts || {};
    const W = opts.width || 760, L = opts.labelW === undefined ? 170 : opts.labelW, R = 16, w = W - L - R, rh = opts.rowH || 19, top = 26;
    const H = top + rows.length * rh + 16 + (opts.footer ? 14 : 0);
    let g = '';
    TICKS.forEach((t) => { const x = axX(t[0], L, w); g += `<line class="tl-grid" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${top - 6}" y2="${H - 14}"/><text class="tl-tick" x="${(x < L + 12 ? L + 2 : x).toFixed(1)}" y="${top - 12}" text-anchor="${x < L + 12 ? 'start' : 'middle'}">${t[1]}</text>`; });
    let lastGroup = null;
    rows.forEach((r, i) => {
      const y = top + i * rh;
      if (opts.groupHeaders && r.group !== lastGroup) { lastGroup = r.group; }
      const cls = (GROUP_CLS[r.group] || 'g1') + (r.dim ? ' dim' : '') + (r.hi ? ' hi' : '');
      if (L > 12) g += `<text class="tl-lbl ${r.hi ? 'hi' : ''}" x="${L - 8}" y="${y + rh / 2 + 3.5}" text-anchor="end">${esc(r.abbr.length > 11 ? r.abbr.split(' / ')[0] : r.abbr)}</text>`;
      if (r.none) g += `<rect class="tl-none" x="${L}" y="${y + 5}" width="${w}" height="${rh - 10}" rx="3"/>`;
      (r.windows || []).forEach((a) => { const x0 = axX(a[0], L, w), x1 = axX(a[1], L, w); g += `<rect class="tl-bar ${cls}" x="${x0.toFixed(1)}" y="${y + 4}" width="${Math.max(2, x1 - x0).toFixed(1)}" height="${rh - 8}" rx="3"/>`; });
      (r.alerts || []).forEach((a) => { const x0 = axX(a[0], L, w), x1 = axX(a[1], L, w); g += `<rect class="tl-alert" x="${x0.toFixed(1)}" y="${y + 4}" width="${Math.max(2, x1 - x0).toFixed(1)}" height="${rh - 8}" rx="3"/>`; });
    });
    if (opts.marker !== null && opts.marker !== undefined) { const x = axX(opts.marker, L, w); g += `<line class="tl-mark" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${top - 6}" y2="${H - 14}"/><text class="tl-markt" x="${x.toFixed(1)}" y="${H - 3}" text-anchor="middle">patient onset</text>`; }
    if (opts.footer) g += `<text class="tl-foot" x="${L}" y="${H - 3}">${esc(opts.footer)}</text>`;
    return `<svg class="tl" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Age at onset by syndrome')}" xmlns="http://www.w3.org/2000/svg"><title>${esc(opts.label || 'Age at onset by syndrome')}</title>${g}</svg>`;
  }

  /* ---------------- ILAE 2025 seizure tree ---------------- */
  const TREE = [
    { cls: 'Focal', note: 'Originates in networks limited to one hemisphere', flag: 'consciousness is a classifier', groups: [{ g: 'By consciousness', t: ['Focal, consciousness preserved', 'Focal, consciousness impaired', 'Focal to bilateral tonic–clonic'] }] },
    { cls: 'Generalized', note: 'Originates in, and rapidly engages, bilaterally distributed networks', flag: '14 types', groups: [
      { g: 'Absence', t: ['Typical absence', 'Atypical absence', 'Myoclonic absence', 'Eyelid myoclonia with absence'] },
      { g: 'Tonic–clonic', t: ['Generalized tonic–clonic', 'Myoclonic–tonic–clonic (subtype)', 'Absence–tonic–clonic (subtype)'] },
      { g: 'Other generalized', t: ['Myoclonic', 'Myoclonic–atonic', 'Negative myoclonus', 'Atonic', 'Tonic', 'Clonic', 'Epileptic spasm'] }] },
    { cls: 'Unknown', note: 'Unknown whether focal or generalized', flag: 'consciousness is a classifier', groups: [{ g: 'By consciousness', t: ['Unknown, consciousness preserved', 'Unknown, consciousness impaired', 'Bilateral tonic–clonic (unknown onset)'] }] },
    { cls: 'Unclassified', note: 'Epileptic seizure, but too little information to characterise', flag: 'may be reclassified later', groups: [] },
  ];
  function seizureTreeHtml() {
    return `<div class="tree"><div class="tree-root">Epileptic seizure<small>4 classes · 21 types (ILAE 2025)</small></div><div class="tree-cols">` + TREE.map((c) => `<section class="tree-col c-${c.cls}">
      <h4>${esc(c.cls)}</h4><p class="tree-note">${esc(c.note)}</p><span class="tree-flag">${esc(c.flag)}</span>
      ${c.groups.map((g) => `<div class="tree-grp"><h5>${esc(g.g)}</h5><ul>${g.t.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</section>`).join('') +
      `</div><p class="tree-foot"><b>Classifiers</b> (class, type, consciousness) determine management; <b>descriptors</b> (observable manifestations; chronological semiology such as <i>epigastric aura → automatism → impaired responsiveness</i>) characterise the seizure. Epileptic spasms are a classifier in the generalized class but a descriptor in focal or unknown seizures.</p></div>`;
  }

  /* ---------------- scoring flow ---------------- */
  function scoringFlowSvg() {
    const box = (x, y, w, h, cls, t1, t2) => `<g class="fl-box ${cls}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9"/><text x="${x + w / 2}" y="${y + (t2 ? h / 2 - 3 : h / 2 + 4)}" text-anchor="middle" class="fl-t">${esc(t1)}</text>${t2 ? `<text x="${x + w / 2}" y="${y + h / 2 + 13}" text-anchor="middle" class="fl-s">${esc(t2)}</text>` : ''}</g>`;
    // arrows: horizontal labels sit above the line, vertical labels beside it
    const arr = (x1, y1, x2, y2, lab) => `<path class="fl-ar" d="M${x1} ${y1}L${x2} ${y2}" marker-end="url(#ah)"/>${lab ? (y1 === y2 ? `<text class="fl-lab" x="${(x1 + x2) / 2}" y="${y1 - 7}" text-anchor="middle">${esc(lab)}</text>` : `<text class="fl-lab" x="${x1 + 9}" y="${(y1 + y2) / 2 + 4}">${esc(lab)}</text>`) : ''}`;
    const lines = ['Alerts are rare in the syndrome: they never exclude it, but lower confidence.', 'Unassessed exclusions and course-dependent criteria are shown, never assumed absent.', 'Missing information stays “not assessed” unless a section is marked as reviewed.'];
    return `<svg class="flow" viewBox="0 0 800 300" role="img" aria-label="How a syndrome is scored: defining criterion, exclusions, mandatory criteria, alerts" xmlns="http://www.w3.org/2000/svg"><title>How a syndrome is scored</title>
      <defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="fl-head" d="M0 0L10 5L0 10z"/></marker></defs>
      ${box(20, 16, 200, 52, 'start', 'Defining criterion met?', 'e.g. typical absences for CAE')}
      ${arr(220, 42, 280, 42, 'yes')}${arr(120, 68, 120, 108, 'no')}${box(20, 108, 200, 44, 'hide', 'Syndrome not considered', 'not shown')}
      ${box(280, 16, 220, 52, 'q', 'Any exclusionary criterion', 'present, or mandatory unmet?')}
      ${arr(500, 42, 560, 42, 'no')}${arr(390, 68, 390, 108, 'yes')}${box(280, 108, 220, 44, 'bad', 'Not consistent', 'reason shown')}
      ${box(560, 16, 200, 52, 'q', 'Any mandatory criterion', 'still unassessed?')}
      ${arr(660, 68, 660, 108, 'yes')}${box(560, 108, 200, 44, 'warn', 'Possible — data missing', 'what to establish is listed')}
      <path class="fl-ar" d="M760 42H782V214H764" marker-end="url(#ah)"/><text class="fl-lab" x="790" y="130" text-anchor="middle" transform="rotate(-90 790 130)">no</text>
      ${box(560, 188, 200, 52, 'ok', 'Mandatory criteria met', 'confidence reduced by alerts')}
      <g class="fl-box note"><rect x="20" y="188" width="500" height="96" rx="9"/><text class="fl-t" x="36" y="212">Alerts &amp; unassessed items</text>${lines.map((l, i) => `<text class="fl-s" x="36" y="${232 + i * 17}">${esc(l)}</text>`).join('')}</g></svg>`;
  }

  return { waveformSvg, timelineSvg, seizureTreeHtml, scoringFlowSvg, FIG_KEYS: Object.keys(FIG), TREE, GROUP_CLS };
});
