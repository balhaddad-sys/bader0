// Camera + MediaPipe Face Mesh (iris refinement) -> gaze feature samples.
// The MediaPipe runtime and model are vendored in /vendor so this works fully offline.

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

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error('Could not load ' + src));
    document.head.append(s);
  });
}

/** Plain-language reason for a camera start-up failure (what the person should do), keeping the raw error for diagnostics. */
export function explainCameraError(e, stage) {
  const name = e?.name || '';
  const raw = e?.message || String(e);
  const ua = navigator.userAgent || '';
  const native = /BedsideFieldApp/.test(ua);
  const inApp = !native && /FBAN|FBAV|Instagram|Line\/|WhatsApp|Snapchat|TikTok|MicroMessenger|Twitter|; wv\)|GSA\//i.test(ua);
  let msg;
  if (native && (name === 'NotAllowedError' || name === 'SecurityError' || /permission|denied|not allowed/i.test(raw))) {
    msg = 'Android has not given this app the camera. Tap “Try the camera again” and choose Allow; if no prompt appears: Settings → Apps → Bedside Field → Permissions → Camera → “Allow only while using the app”.';
  } else if (/denied by system/i.test(raw)) {
    msg = 'Android itself is blocking the browser\u2019s camera. Settings → Apps → Chrome → Permissions → Camera → “Allow only while using the app”, and make sure the phone\u2019s Camera access privacy switch is on. Then reload this page.';
  } else if (/dismiss/i.test(raw)) {
    msg = 'The camera prompt was closed without tapping Allow, so Chrome treated it as a refusal (after a few of these it stops asking for a while). Reset the permission: tap the icon left of the address bar → Permissions → Camera → Allow (or Reset permissions), reload, then choose Allow when asked.';
  } else if (name === 'NotAllowedError' || name === 'SecurityError' || /permission|denied|not allowed/i.test(raw)) {
    msg = 'Camera permission was refused. Allow the camera for this site: in Chrome tap the icon left of the address bar (lock or sliders) → Permissions → Camera → Allow (or Reset permissions); in Safari tap aA → Website Settings → Camera → Allow. If it still fails, check Android Settings → Apps → Chrome → Permissions → Camera. Then reload this page.';
  } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    msg = 'No front camera was found on this device.';
  } else if (name === 'NotReadableError' || name === 'AbortError') {
    msg = 'The camera is busy. Close other apps or tabs that are using it (video calls, camera apps), then try again.';
  } else if (stage === 'model') {
    msg = 'The camera started but the face-tracking model could not load (' + raw + '). Check the connection once, then reload: after the first successful load it works offline.';
  } else if (/unavailable|HTTPS/i.test(raw)) {
    msg = 'This page cannot use the camera. It must be opened over HTTPS (or localhost) in a normal browser.';
  } else {
    msg = raw;
  }
  const installed = !!(window.matchMedia && window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches);
  if (installed) msg += ' You are using the installed app: if the camera keeps failing, open the site once in Chrome itself, allow the camera there, then reopen the app (also check Android Settings → Apps → Chrome → Permissions → Camera).';
  if (inApp) msg += ' This looks like an in-app browser (opened from another app), which often blocks the camera: open the link in Safari or Chrome instead.';
  // Android app: add the app's own check (permission, device policy, camera busy, native open test).
  if (native && stage === 'permission' && window.BedsideNative?.cameraReport) {
    try { msg += ' ' + window.BedsideNative.cameraReport(); } catch { /* bridge unavailable */ }
  }
  return { msg, raw, name, stage };
}

// Detection modes, tried in order whenever no face has been found for a couple of seconds, and kept once one works.
// 'zoom-out' shrinks the camera frame inside a grey margin before it reaches the model, which helps when the face is
// very close, cropped or only partly visible; landmarks are mapped back to the true frame afterwards.
export const STRATEGIES = [
  { name: 'normal', det: 0.15, trk: 0.3, scale: 1 },
  { name: 'sensitive', det: 0.05, trk: 0.05, scale: 1 },
  { name: 'zoom-out', det: 0.1, trk: 0.05, scale: 0.6 },
  { name: 'zoom-out far', det: 0.1, trk: 0.05, scale: 0.4 },
];

export class CameraGazeSource {
  constructor({ eyeMode = 'both', strategy = 0 } = {}) {
    this.eyeMode = eyeMode;
    this.strat = Math.max(0, Math.min(STRATEGIES.length - 1, strategy | 0));
    this.stratSince = 0; this.lastFaceT = 0; this.locked = false;
    this.onLock = null;       // (index, name) once a mode has produced a face
    this.sentScale = 1; this.pad = null; this.lightCv = null; this.light = null; this.lightN = 0;
    this.onSample = null;
    this.video = null;
    this.stream = null;
    this.fm = null;
    this.running = false;
    this.busy = false;
    this.lastSendT = 0;
    this.lastFeat = null;
    this.stats = { frames: 0, faces: 0, t0: 0 };
    this.frameW = 640;
    this.frameH = 480;
    this.sim = false;
    this.stage = 'idle'; // idle | permission | stream | play | model | ready: where start-up stopped, for diagnostics
    this.track = null;
    // MediaPipe runs the model on the GPU (WebGL) except on Apple devices. Some Android GPUs process the frames but
    // never find a face, so after two GPU modes without a face the model is moved to the CPU, and that is remembered.
    this.cpu = false; this.everFace = false;
    try { this.cpu = localStorage.getItem('bf.cpuInference') === '1'; } catch { /* storage blocked */ }
  }

  /** One-line facts for the on-screen camera read-out. */
  diagnostics() {
    const v = this.video, t = this.track;
    const st = t?.getSettings?.() || {};
    return {
      stage: this.stage, secure: window.isSecureContext, video: v ? `${v.videoWidth}×${v.videoHeight} ready ${v.readyState}${v.paused ? ' paused' : ''}` : '—',
      cam: t ? `${st.width || '?'}×${st.height || '?'} @ ${st.frameRate ? Math.round(st.frameRate) : '?'} fps ${t.readyState}${t.muted ? ' muted' : ''}` : '—',
      frames: this.stats.frames, faces: this.stats.faces, fps: +this.fps.toFixed(1),
      mode: STRATEGIES[this.strat].name + (this.cpu ? ' · CPU' : ''), light: this.light, label: t?.label || '',
    };
  }

  async start(videoEl) {
    if (!navigator.mediaDevices?.getUserMedia) { this.stage = 'permission'; const e = new Error('Camera API unavailable (needs HTTPS or localhost)'); e.stage = 'permission'; throw e; }
    this.video = videoEl;
    this.stage = 'permission';
    const tryConstraints = [
      { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 60 } }, audio: false },
      { video: true, audio: false },
    ];
    // Android app: a camera request that never answers would leave a blank screen, so give it a deadline.
    const native = /BedsideFieldApp/.test(navigator.userAgent || '');
    const gum = (c) => {
      const p = navigator.mediaDevices.getUserMedia(c);
      if (!native) return p;
      let late = false;
      p.then((s) => { if (late) s.getTracks().forEach((t) => t.stop()); }, () => {});
      return Promise.race([p, new Promise((_, rej) => setTimeout(() => {
        late = true;
        const e = new Error('The camera did not answer within 30 s'); e.name = 'TimeoutError'; rej(e);
      }, 30000))]);
    };
    // Android app: show each start-up step in the preview box, so a stall is visible.
    const info = (txt) => { if (!native) return; const el = videoEl.parentElement && videoEl.parentElement.querySelector('#cam-info'); if (el) el.textContent = txt; };
    info('Asking Android for the camera…');
    let err;
    for (const c of tryConstraints) {
      try { this.stream = await gum(c); err = null; break; } catch (e) { err = e; if (e.name === 'TimeoutError') break; }
    }
    if (err) { err.stage = 'permission'; throw err; }
    if (native) {
      try { await this._ensureFrontCamera(gum); } catch (e) { e.stage = 'permission'; throw e; }
    }
    info('Camera on, starting the picture…');
    this.stage = 'stream';
    this.track = this.stream.getVideoTracks()[0] || null;
    videoEl.srcObject = this.stream;
    videoEl.muted = true;
    videoEl.autoplay = true;
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('webkit-playsinline', '');
    this.stage = 'play';
    try { await videoEl.play(); } catch (e) { e.stage = 'play'; throw e; }
    // iPhones report the real size only once metadata has arrived; wait for it (briefly) before reading the frame size.
    if (!videoEl.videoWidth) {
      await new Promise((res) => {
        const done = () => { videoEl.removeEventListener('loadedmetadata', done); res(); };
        videoEl.addEventListener('loadedmetadata', done);
        setTimeout(done, 2500);
      });
    }
    this.frameW = videoEl.videoWidth || 640;
    this.frameH = videoEl.videoHeight || 480;
    if (native) this._startMirror();

    this.stage = 'model';
    info('Camera on · loading the face-tracking model…');
    try {
      if (!window.FaceMesh) await loadScript('vendor/mediapipe/face_mesh/face_mesh.js');
      this.fm = new window.FaceMesh({ locateFile: (f) => `vendor/mediapipe/face_mesh/${f}` });
      this.fm.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: STRATEGIES[this.strat].det, minTrackingConfidence: STRATEGIES[this.strat].trk, selfieMode: false, useCpuInference: this.cpu });
      this.fm.onResults((r) => this._onResults(r));
      const init = this.fm.initialize();
      if (native) {
        await Promise.race([init, new Promise((_, rej) => setTimeout(() => rej(new Error('the face-tracking model did not finish loading within 60 s')), 60000))]);
      } else await init;
    } catch (e) { e.stage = 'model'; throw e; }

    this.stage = 'ready';
    this.running = true;
    this.stats = { frames: 0, faces: 0, t0: performance.now() };
    this.stratSince = this.lastFaceT = performance.now();
    this._loop();
  }

  _loop() {
    if (!this.running) return;
    const next = () => {
      if (!this.running) return;
      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) this.video.requestVideoFrameCallback(() => this._tick());
      else requestAnimationFrame(() => this._tick());
    };
    this._next = next;
    next();
  }

  _setStrategy(i) {
    this.strat = i % STRATEGIES.length;
    const S = STRATEGIES[this.strat];
    try { this.fm.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: S.det, minTrackingConfidence: S.trk, selfieMode: false, useCpuInference: this.cpu }); } catch {}
    this.stratSince = performance.now();
    this.locked = false;
  }

  /** Frame brightness (centre vs border): tells "too dark" and "backlit" apart from a real detection failure. */
  _measureLight() {
    try {
      if (!this.lightCv) { this.lightCv = document.createElement('canvas'); this.lightCv.width = 32; this.lightCv.height = 24; }
      const c = this.lightCv.getContext('2d', { willReadFrequently: true });
      c.drawImage(this.video, 0, 0, 32, 24);
      const d = c.getImageData(0, 0, 32, 24).data;
      let cs = 0, cn = 0, es = 0, en = 0;
      for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
        const i = (y * 32 + x) * 4, L = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (x >= 8 && x < 24 && y >= 5 && y < 19) { cs += L; cn++; } else { es += L; en++; }
      }
      this.light = { centre: Math.round(cs / cn), edge: Math.round(es / en) };
    } catch { /* ignore */ }
  }

  async _tick() {
    if (!this.running) return;
    if (!this.busy && this.video.readyState >= 2) {
      this.busy = true;
      const now = performance.now();
      this.lastSendT = now;
      if ((this.lightN++ % 20) === 0) this._measureLight();
      // A switch back to the full-size frame that found no face within 1.5 s: return to the mode that worked.
      if (this.probe && now - this.probe.t > 1500) {
        if (!this.probe.ok) { this._setStrategy(this.probe.from); this.lastFaceT = now; this.noProbeUntil = now + 30000; }
        this.probe = null;
      }
      // No face for a couple of seconds: move on to the next, more tolerant detection mode (kept once it works).
      if (now - Math.max(this.lastFaceT, this.stratSince) > 2400) {
        if (!this.cpu && !this.everFace && this.strat >= 1) { this.cpu = true; this._setStrategy(0); } // GPU found nothing: use the CPU
        else this._setStrategy(this.strat + 1);
        this.lastFaceT = now;
      }
      const s = STRATEGIES[this.strat].scale;
      this.sentScale = s;
      let image = this.video;
      if (s !== 1) {
        const W = this.video.videoWidth || 640, H = this.video.videoHeight || 480;
        if (!this.pad || this.pad.width !== W || this.pad.height !== H) { this.pad = document.createElement('canvas'); this.pad.width = W; this.pad.height = H; }
        const c = this.pad.getContext('2d');
        c.fillStyle = '#7a7a7a'; c.fillRect(0, 0, W, H);
        c.drawImage(this.video, W * (1 - s) / 2, H * (1 - s) / 2, W * s, H * s);
        image = this.pad;
      }
      try { await this.fm.send({ image }); } catch (e) { /* drop frame */ }
      this.busy = false;
    }
    this._next();
  }

  _onResults(res) {
    const t = this.lastSendT;
    this.stats.frames++;
    let lm = res.multiFaceLandmarks && res.multiFaceLandmarks[0];
    const s = this.sentScale;
    if (lm && s !== 1) { // map the zoomed-out frame back to the true camera frame; a face reaching into the grey margin is not trusted
      const o = (1 - s) / 2;
      lm = lm.map((p) => ({ x: (p.x - o) / s, y: (p.y - o) / s, z: p.z / s }));
      const eyes = [33, 133, 159, 145, 362, 263, 386, 374, 468, 473];
      if (eyes.some((i) => !(lm[i].x > -0.02 && lm[i].x < 1.02 && lm[i].y > -0.02 && lm[i].y < 1.02))) lm = null;
    }
    const f = lm ? computeFeatures(lm, this.frameW, this.frameH) : null;
    this.lastFeat = f ? { ...f, lm } : null;
    if (f) {
      this.stats.faces++;
      this.lastFaceT = performance.now();
      if (!this.locked) { this.locked = true; this.onLock?.(this.strat, STRATEGIES[this.strat].name); }
      if (this.probe && t > this.probe.t) this.probe.ok = true;
      if (!this.everFace) {
        this.everFace = true;
        if (this.cpu) { try { localStorage.setItem('bf.cpuInference', '1'); } catch { /* storage blocked */ } }
      }
      // Found in a shrunken (zoom-out) frame, but the face would fit the full frame: the full-size frame gives
      // about twice the eye-movement resolution, so switch back to it (reverted above if it loses the face).
      if (s !== 1 && !this.probe && performance.now() > (this.noProbeUntil || 0)) {
        let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
        for (const p of lm) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
        if (x0 > 0.04 && x1 < 0.96 && y0 > 0.02 && y1 < 0.98 && x1 - x0 < 0.65) {
          const from = this.strat;
          this._setStrategy(0);
          this.probe = { from, t: performance.now(), ok: false };
        }
      }
    }
    const c = combine(f, this.eyeMode);
    this.onSample?.({ t, ...c, ipdPx: f?.ipdPx, open: f ? Math.min(f.r.open, f.l.open) : 0 });
  }

  get fps() {
    const dt = (performance.now() - this.stats.t0) / 1000;
    return dt > 0.5 ? this.stats.frames / dt : 0;
  }

  /** Android app: if the opened camera is not the front one (unlabelled tablet cameras), switch to the front camera. */
  async _ensureFrontCamera(gum) {
    const t = this.stream.getVideoTracks()[0];
    if (!t) return;
    const st = t.getSettings ? t.getSettings() : {};
    if (st.facingMode === 'user' || /front/i.test(t.label || '')) return;
    let devs = [];
    try { devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'); } catch { return; }
    let hint = '';
    try { hint = (window.BedsideNative && window.BedsideNative.frontCameraId && window.BedsideNative.frontCameraId()) || ''; } catch {}
    const front = devs.find((d) => /front/i.test(d.label))
      || (hint && devs.find((d) => new RegExp('camera2 ' + hint + '\\b').test(d.label)))
      || devs.find((d) => d.label && d.deviceId !== st.deviceId && !/back|rear|environment/i.test(d.label));
    if (!front || front.deviceId === st.deviceId) return;
    this.stream.getTracks().forEach((x) => x.stop());
    try {
      this.stream = await gum({ video: { deviceId: { exact: front.deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    } catch {
      this.stream = await gum({ video: true, audio: false }); // fall back to the camera that opened before
    }
  }

  /** Android app: draw the mirrored camera picture into #cam-mirror every frame, independent of the model. */
  _startMirror() {
    const cv = this.video.parentElement && this.video.parentElement.querySelector('#cam-mirror');
    if (!cv) return;
    cv.style.display = 'block';
    const ctx = cv.getContext('2d');
    const draw = () => {
      if (!this.stream || !this.video) return;
      const v = this.video, W = v.videoWidth, H = v.videoHeight;
      if (W && H && v.readyState >= 2) {
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        ctx.setTransform(-1, 0, 0, 1, W, 0);
        try { ctx.drawImage(v, 0, 0, W, H); } catch { /* frame not ready */ }
      }
      this._mirrorRaf = requestAnimationFrame(draw);
    };
    draw();
  }

  stop() {
    if (this._mirrorRaf) { cancelAnimationFrame(this._mirrorRaf); this._mirrorRaf = 0; }
    try { const cv = this.video && this.video.parentElement && this.video.parentElement.querySelector('#cam-mirror'); if (cv) cv.style.display = 'none'; } catch {}
    this.running = false;
    try { this.stream?.getTracks().forEach((t) => t.stop()); } catch {}
    if (this.video) this.video.srcObject = null;
    try { this.fm?.close?.(); } catch {}
    this.fm = null;
    this.stream = null;
  }
}

/** Draw eye outlines + iris on an overlay canvas that sits over the (mirrored) preview video. */
export function drawOverlay(ctx, feat, W, H, mirror = true, guide = false) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (guide) { // where the face should sit: both eyes inside this oval, face about this big
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    ctx.save();
    ctx.lineWidth = 3; ctx.setLineDash([9, 7]);
    ctx.strokeStyle = feat?.lm ? 'rgba(61,220,151,.85)' : 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(cw / 2, ch / 2, cw * 0.19, ch * 0.40, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  if (!feat?.lm) return;
  const sx = ctx.canvas.width / W, sy = ctx.canvas.height / H;
  const X = (x) => (mirror ? ctx.canvas.width - x * W * sx : x * W * sx);
  const Y = (y) => y * H * sy;
  ctx.lineWidth = 2;
  for (const e of [LM.R, LM.L]) {
    ctx.strokeStyle = 'rgba(61,220,151,.9)';
    ctx.beginPath();
    ctx.moveTo(X(feat.lm[e.a].x), Y(feat.lm[e.a].y));
    ctx.lineTo(X(feat.lm[e.up].x), Y(feat.lm[e.up].y));
    ctx.lineTo(X(feat.lm[e.b].x), Y(feat.lm[e.b].y));
    ctx.lineTo(X(feat.lm[e.lo].x), Y(feat.lm[e.lo].y));
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,207,51,.95)';
    ctx.beginPath();
    ctx.arc(X(feat.lm[e.iris].x), Y(feat.lm[e.iris].y), 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
