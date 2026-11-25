// Front camera + MediaPipe Face Mesh (iris refinement) -> one gaze sample per processed frame.
// The MediaPipe runtime and model are vendored in /vendor so this works fully offline.

import { cameraPolicy, nativeFrontCameraId } from '../platform.js';
import { computeFeatures, combine } from './features.js';

// Detection modes, tried in order whenever no face has been found for a couple of seconds, and kept once one works.
// 'zoom-out' shrinks the camera frame inside a grey margin before it reaches the model, which helps when the face is
// very close, cropped or only partly visible; landmarks are mapped back to the true frame afterwards.
export const STRATEGIES = [
  { name: 'normal', det: 0.15, trk: 0.3, scale: 1 },
  { name: 'sensitive', det: 0.05, trk: 0.05, scale: 1 },
  { name: 'zoom-out', det: 0.1, trk: 0.05, scale: 0.6 },
  { name: 'zoom-out far', det: 0.1, trk: 0.05, scale: 0.4 },
];

const NO_FACE_ADVANCE_MS = 2400; // no face for this long: try the next detection mode
const PROBE_MS = 1500;           // a switch back to full size must find the face within this
const NO_PROBE_AFTER_FAIL_MS = 30000;
const CPU_KEY = 'bf.cpuInference'; // remembered once the CPU (not the GPU) is what found a face
const EYE_LANDMARKS = [33, 133, 159, 145, 362, 263, 386, 374, 468, 473];
const VENDOR = 'vendor/mediapipe/face_mesh/';

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error('Could not load ' + src));
    document.head.append(s);
  });
}

/** Rejects with `makeError()` if `p` has not settled within `ms` (0 = no deadline). */
function withDeadline(p, ms, makeError) {
  if (!ms) return p;
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(makeError()), ms))]);
}

export class CameraGazeSource {
  constructor({ eyeMode = 'both', strategy = 0, policy = cameraPolicy() } = {}) {
    this.eyeMode = eyeMode;
    this.policy = policy;
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
    this.probe = null;   // { from, t, ok } while a switch back to the full-size frame is being tried
    this.noProbeUntil = 0;
    // MediaPipe runs the model on the GPU (WebGL) except on Apple devices. Some Android GPUs process the frames but
    // never find a face, so after two GPU modes without a face the model is moved to the CPU, and that is remembered.
    this.cpu = false; this.everFace = false;
    try { this.cpu = localStorage.getItem(CPU_KEY) === '1'; } catch { /* storage blocked */ }
  }

  get fps() {
    const dt = (performance.now() - this.stats.t0) / 1000;
    return dt > 0.5 ? this.stats.frames / dt : 0;
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

  // ------------------------------------------------------------------ start-up

  async start(videoEl) {
    if (!navigator.mediaDevices?.getUserMedia) { this.stage = 'permission'; const e = new Error('Camera API unavailable (needs HTTPS or localhost)'); e.stage = 'permission'; throw e; }
    this.video = videoEl;
    this.stage = 'permission';
    this._step('Asking Android for the camera…');
    await this._openStream();
    this._step('Camera on, starting the picture…');
    this.stage = 'stream';
    this.track = this.stream.getVideoTracks()[0] || null;
    await this._playVideo(videoEl);
    if (this.policy.canvasPreview) this._startCanvasPreview();

    this.stage = 'model';
    this._step('Camera on · loading the face-tracking model…');
    try { await this._loadModel(); } catch (e) { e.stage = 'model'; throw e; }

    this.stage = 'ready';
    this.running = true;
    this.stats = { frames: 0, faces: 0, t0: performance.now() };
    this.stratSince = this.lastFaceT = performance.now();
    this._loop();
  }

  /** Start-up step shown in the preview box (Android app), so a stall is visible. */
  _step(txt) {
    if (!this.policy.showSteps) return;
    const el = this.video?.parentElement && this.video.parentElement.querySelector('#cam-info');
    if (el) el.textContent = txt;
  }

  _getUserMedia(constraints) {
    const p = navigator.mediaDevices.getUserMedia(constraints);
    const ms = this.policy.requestTimeoutMs;
    if (!ms) return p;
    let late = false;
    p.then((s) => { if (late) s.getTracks().forEach((t) => t.stop()); }, () => {}); // a stream that arrives too late is closed
    return withDeadline(p, ms, () => {
      late = true;
      const e = new Error(`The camera did not answer within ${Math.round(ms / 1000)} s`); e.name = 'TimeoutError';
      return e;
    });
  }

  async _openStream() {
    const tryConstraints = [
      { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 60 } }, audio: false },
      { video: true, audio: false },
    ];
    let err;
    for (const c of tryConstraints) {
      try { this.stream = await this._getUserMedia(c); err = null; break; } catch (e) { err = e; if (e.name === 'TimeoutError') break; }
    }
    if (err) { err.stage = 'permission'; throw err; }
    if (this.policy.ensureFrontCamera) {
      try { await this._ensureFrontCamera(); } catch (e) { e.stage = 'permission'; throw e; }
    }
  }

  /** If the opened camera is not the front one (unlabelled tablet cameras), switch to the front camera. */
  async _ensureFrontCamera() {
    const t = this.stream.getVideoTracks()[0];
    if (!t) return;
    const st = t.getSettings ? t.getSettings() : {};
    if (st.facingMode === 'user' || /front/i.test(t.label || '')) return;
    let devs = [];
    try { devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'); } catch { return; }
    const hint = nativeFrontCameraId();
    const front = devs.find((d) => /front/i.test(d.label))
      || (hint && devs.find((d) => new RegExp('camera2 ' + hint + '\\b').test(d.label)))
      || devs.find((d) => d.label && d.deviceId !== st.deviceId && !/back|rear|environment/i.test(d.label));
    if (!front || front.deviceId === st.deviceId) return;
    this.stream.getTracks().forEach((x) => x.stop());
    try {
      this.stream = await this._getUserMedia({ video: { deviceId: { exact: front.deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    } catch {
      this.stream = await this._getUserMedia({ video: true, audio: false }); // fall back to the camera that opened before
    }
  }

  async _playVideo(videoEl) {
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
  }

  _modelOptions() {
    const S = STRATEGIES[this.strat];
    return { maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: S.det, minTrackingConfidence: S.trk, selfieMode: false, useCpuInference: this.cpu };
  }

  async _loadModel() {
    if (!window.FaceMesh) await loadScript(VENDOR + 'face_mesh.js');
    this.fm = new window.FaceMesh({ locateFile: (f) => VENDOR + f });
    this.fm.setOptions(this._modelOptions());
    this.fm.onResults((r) => this._onResults(r));
    const ms = this.policy.modelTimeoutMs;
    await withDeadline(this.fm.initialize(), ms, () => new Error(`the face-tracking model did not finish loading within ${Math.round(ms / 1000)} s`));
  }

  /** Paints the mirrored camera picture into #cam-mirror every frame, independent of the model. */
  _startCanvasPreview() {
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
      this._previewRaf = requestAnimationFrame(draw);
    };
    draw();
  }

  // ------------------------------------------------------------------ frame loop

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
    try { this.fm.setOptions(this._modelOptions()); } catch {}
    this.stratSince = performance.now();
    this.locked = false;
  }

  /** Detection-mode housekeeping before a frame is sent: end a probe, or move on after a while without a face. */
  _stepDetectionMode(now) {
    // A switch back to the full-size frame that found no face in time: return to the mode that worked.
    if (this.probe && now - this.probe.t > PROBE_MS) {
      if (!this.probe.ok) { this._setStrategy(this.probe.from); this.lastFaceT = now; this.noProbeUntil = now + NO_PROBE_AFTER_FAIL_MS; }
      this.probe = null;
    }
    // No face for a couple of seconds: move on to the next, more tolerant detection mode (kept once it works).
    if (now - Math.max(this.lastFaceT, this.stratSince) > NO_FACE_ADVANCE_MS) {
      if (!this.cpu && !this.everFace && this.strat >= 1) { this.cpu = true; this._setStrategy(0); } // GPU found nothing: use the CPU
      else this._setStrategy(this.strat + 1);
      this.lastFaceT = now;
    }
  }

  /**
   * The image sent to the model: the video itself, a canvas copy of the frame (policy.canvasFrames), or (zoom-out
   * modes) the frame shrunk inside a grey margin.
   */
  _frameImage(scale) {
    if (scale === 1 && !this.policy.canvasFrames) return this.video;
    const W = this.video.videoWidth || 640, H = this.video.videoHeight || 480;
    if (!this.pad || this.pad.width !== W || this.pad.height !== H) { this.pad = document.createElement('canvas'); this.pad.width = W; this.pad.height = H; }
    const c = this.pad.getContext('2d');
    if (scale === 1) { c.drawImage(this.video, 0, 0, W, H); return this.pad; }
    c.fillStyle = '#7a7a7a'; c.fillRect(0, 0, W, H);
    c.drawImage(this.video, W * (1 - scale) / 2, H * (1 - scale) / 2, W * scale, H * scale);
    return this.pad;
  }

  async _tick() {
    if (!this.running) return;
    if (!this.busy && this.video.readyState >= 2) {
      this.busy = true;
      const now = performance.now();
      this.lastSendT = now;
      if ((this.lightN++ % 20) === 0) this._measureLight();
      this._stepDetectionMode(now);
      const s = STRATEGIES[this.strat].scale;
      this.sentScale = s;
      const image = this._frameImage(s);
      try { await this.fm.send({ image }); } catch (e) { /* drop frame */ }
      this.busy = false;
    }
    this._next();
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

  /** Landmarks of the sent frame mapped back to the true camera frame (null if a zoomed face reaches the margin). */
  _unzoom(lm, s) {
    if (!lm || s === 1) return lm;
    const o = (1 - s) / 2;
    const out = lm.map((p) => ({ x: (p.x - o) / s, y: (p.y - o) / s, z: p.z / s }));
    return EYE_LANDMARKS.some((i) => !(out[i].x > -0.02 && out[i].x < 1.02 && out[i].y > -0.02 && out[i].y < 1.02)) ? null : out;
  }

  /**
   * Found in a shrunken (zoom-out) frame, but the face would fit the full frame: the full-size frame gives about
   * twice the eye-movement resolution, so switch back to it (reverted in _stepDetectionMode if it loses the face).
   */
  _maybeProbeFullSize(lm, s) {
    if (s === 1 || this.probe || performance.now() <= this.noProbeUntil) return;
    let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
    for (const p of lm) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
    if (x0 > 0.04 && x1 < 0.96 && y0 > 0.02 && y1 < 0.98 && x1 - x0 < 0.65) {
      const from = this.strat;
      this._setStrategy(0);
      this.probe = { from, t: performance.now(), ok: false };
    }
  }

  _onResults(res) {
    const t = this.lastSendT;
    this.stats.frames++;
    const s = this.sentScale;
    const lm = this._unzoom(res.multiFaceLandmarks && res.multiFaceLandmarks[0], s);
    const f = lm ? computeFeatures(lm, this.frameW, this.frameH) : null;
    this.lastFeat = f ? { ...f, lm } : null;
    if (f) {
      this.stats.faces++;
      this.lastFaceT = performance.now();
      if (!this.locked) { this.locked = true; this.onLock?.(this.strat, STRATEGIES[this.strat].name); }
      if (this.probe && t > this.probe.t) this.probe.ok = true;
      if (!this.everFace) {
        this.everFace = true;
        if (this.cpu) { try { localStorage.setItem(CPU_KEY, '1'); } catch { /* storage blocked */ } }
      }
      this._maybeProbeFullSize(lm, s);
    }
    const c = combine(f, this.eyeMode);
    this.onSample?.({ t, ...c, ipdPx: f?.ipdPx, open: f ? Math.min(f.r.open, f.l.open) : 0 });
  }

  stop() {
    if (this._previewRaf) { cancelAnimationFrame(this._previewRaf); this._previewRaf = 0; }
    try { const cv = this.video && this.video.parentElement && this.video.parentElement.querySelector('#cam-mirror'); if (cv) cv.style.display = 'none'; } catch {}
    this.running = false;
    try { this.stream?.getTracks().forEach((t) => t.stop()); } catch {}
    if (this.video) this.video.srcObject = null;
    try { this.fm?.close?.(); } catch {}
    this.fm = null;
    this.stream = null;
  }
}
