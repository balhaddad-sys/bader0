import { $, $$, el, clamp, median, escapeHtml as esc, downloadBlob, uid, sleep, mulberry32, NATIVE } from './util.js';
import { Geometry, pxPerMmFromDiagonal, estimatePxPerMm, CARD_W_MM, CARD_H_MM } from './geometry.js';
import { Renderer } from './stimulus.js';
import { CameraGazeSource, drawOverlay, estimateDistanceCm, explainCameraError } from './gaze.js';
import { fitCalibration } from './detect.js';
import { fitMapping, validateMapping, eyeAgreement, GazeTracker, ACC } from './mapper.js';
import { TestRunner } from './engine.js';
import { summarize, dssEligible } from './analysis.js';
import { reportHTML, csvOf } from './report.js';
import { VirtualPatient, SimGazeSource, DEMO_PROFILES } from './sim.js';
import { DEFAULTS, VERSION, loadSettings, saveSettings, loadSessions, saveSession, deleteSession, clearAll } from './store.js';

const S = {
  settings: loadSettings(),
  geo: null,
  renderer: null,
  runner: null,
  source: null,
  cal: null,
  demo: null,          // { key, patient, sim }
  session: null,
  wake: null,
  deferredInstall: null,
  stageLive: false,
  stageSize: null,
  ctx: null,           // { only: 'dss' } when running just the DSS block
};
window.__bf = S; // handy for debugging / automated tests

// ======================= helpers =======================
function show(id) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  window.scrollTo(0, 0);
}
let toastT;
function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), ms);
}
const persist = () => saveSettings(S.settings);

function showPanel(html, { bottom = false, compact = false } = {}) {
  const p = $('#panel');
  $('#panel-card').classList.toggle('compact', compact);
  $('#panel-card').innerHTML = html;
  p.classList.toggle('bottom', bottom);
  p.classList.add('show');
  return $('#panel-card');
}
const hidePanel = () => $('#panel').classList.remove('show');

// ======================= home =======================
function renderHome() {
  const s = S.settings;
  $('#in-label').value = s.label || '';
  $$('input[name=method]').forEach((r) => (r.checked = r.value === s.method));
  $$('#eyes button').forEach((b) => b.classList.toggle('on', b.dataset.v === s.eye));
  $('#in-dss').checked = !!s.includeDSS;
  $('#ver').textContent = `Bedside Field v${VERSION} · works offline once installed`;

  const cal = $('#chip-cal');
  const calOk = s.pxPerMm && s.calSource !== 'estimate';
  cal.textContent = calOk ? `Screen calibrated · ${s.distanceCm} cm` : s.pxPerMm ? `Screen size estimated · ${s.distanceCm} cm` : 'Screen size not set · will estimate';
  cal.className = 'chip ' + (calOk ? 'ok' : 'warn');
  const camOk = !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;
  const inApp = !NATIVE && /FBAN|FBAV|Instagram|Line\/|WhatsApp|Snapchat|TikTok|MicroMessenger|Twitter|; wv\)|GSA\//i.test(navigator.userAgent);
  $('#cam-note').hidden = !((!camOk && s.method === 'camera') || inApp);
  if (inApp) $('#cam-note').textContent = 'This page looks like it was opened inside another app. In-app browsers often block the camera: open the link in Safari or Chrome instead.';
  const cam = $('#chip-cam');
  cam.textContent = camOk ? 'Camera available' : 'Camera unavailable';
  cam.className = 'chip ' + (camOk ? 'ok' : 'warn');
  const off = $('#chip-off');
  const controlled = NATIVE || !!navigator.serviceWorker?.controller; // the Android app carries every file inside the APK
  off.textContent = controlled ? 'Offline ready' : 'Not cached yet';
  off.className = 'chip ' + (controlled ? 'ok' : 'warn');
}

function wireHome() {
  $('#in-label').addEventListener('input', (e) => { S.settings.label = e.target.value; persist(); });
  $$('input[name=method]').forEach((r) => r.addEventListener('change', () => { S.settings.method = r.value; persist(); renderHome(); }));
  $$('#eyes button').forEach((b) => b.addEventListener('click', () => { S.settings.eye = b.dataset.v; persist(); renderHome(); }));
  $('#in-dss').addEventListener('change', (e) => { S.settings.includeDSS = e.target.checked; persist(); });
  $('#btn-start').addEventListener('click', () => beginFlow(null));
  $('#btn-demo').addEventListener('click', () => beginFlow($('#demo-profile').value));
  $('#go-cal').addEventListener('click', () => goCal());
  $('#go-hist').addEventListener('click', () => goHistory());
  $('#go-settings').addEventListener('click', () => goSettings());
  $('#go-about').addEventListener('click', () => { renderAbout(); show('s-about'); });
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => { renderHome(); show('s-' + b.dataset.go); }));
  const sel = $('#demo-profile');
  for (const [k, v] of Object.entries(DEMO_PROFILES)) sel.append(el('option', { value: k }, v.label));
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    S.deferredInstall = e;
    if (!$('#btn-install')) {
      const b = el('button', { id: 'btn-install', class: 'link' }, 'Install app on this device ', el('span', {}, '＋'));
      b.addEventListener('click', async () => { S.deferredInstall.prompt(); await S.deferredInstall.userChoice; b.remove(); });
      $('.links').prepend(b);
    }
  });
}

// ======================= calibration =======================
function updateCalInfo() {
  const s = S.settings;
  $('#dist-val').textContent = s.distanceCm;
  const box = $('#cal-info');
  if (!s.pxPerMm) { box.textContent = 'Not calibrated yet.'; return; }
  const geo = new Geometry({ pxPerMm: s.pxPerMm, distanceCm: s.distanceCm, width: innerWidth, height: innerHeight });
  const e = geo.halfExtentDeg();
  box.innerHTML = `<b>${s.pxPerMm.toFixed(2)} px/mm</b> (${esc(s.calSource || '')}). In the current window (${innerWidth}×${innerHeight}px) at ${s.distanceCm} cm the testable field is about <b>±${e.h.toFixed(0)}° horizontally</b> and <b>±${e.v.toFixed(0)}° vertically</b>. A 3° stimulus is ${geo.sizePx(3).toFixed(0)} px wide.`;
}
function setCardBox() {
  const w = +$('#cal-slider').value;
  const box = $('#cardbox');
  box.style.width = w + 'px';
  box.style.height = (w * CARD_H_MM) / CARD_W_MM + 'px';
}
function goCal() {
  const s = S.settings;
  if (s.pxPerMm) $('#cal-slider').value = clamp(Math.round(s.pxPerMm * CARD_W_MM), 120, 1200);
  setCardBox(); updateCalInfo();
  show('s-cal');
}
function wireCal() {
  $('#cal-slider').addEventListener('input', setCardBox);
  $('#cal-save-card').addEventListener('click', () => {
    S.settings.pxPerMm = +$('#cal-slider').value / CARD_W_MM;
    S.settings.calSource = 'bank-card match';
    persist(); updateCalInfo(); toast('Screen calibrated');
  });
  $('#cal-save-diag').addEventListener('click', () => {
    const d = parseFloat($('#cal-diag').value);
    if (!(d >= 4 && d <= 20)) return toast('Enter the screen diagonal in inches (e.g. 12.9)');
    const w = Math.max(screen.width, screen.height), h = Math.min(screen.width, screen.height);
    S.settings.pxPerMm = pxPerMmFromDiagonal(d, w, h);
    S.settings.calSource = `${d}" diagonal`;
    persist(); updateCalInfo(); toast('Screen calibrated');
  });
  const step = (n) => { S.settings.distanceCm = clamp(S.settings.distanceCm + n, 15, 60); persist(); updateCalInfo(); };
  $('#dist-minus').addEventListener('click', () => step(-1));
  $('#dist-plus').addEventListener('click', () => step(+1));
}

// ======================= guide =======================
function guideSVG(dist, eye) {
  const cover = eye === 'both' ? '' : `
    <g transform="translate(470,200)"><circle r="22" fill="#1a232d" stroke="#ffb703" stroke-width="3"/><path d="M-12 0 Q0 -10 12 0 Q0 10 -12 0Z" fill="none" stroke="#e8eef4" stroke-width="2"/><line x1="-18" y1="14" x2="18" y2="-14" stroke="#ffb703" stroke-width="4"/></g>
    <text x="500" y="196" fill="#ffb703" font-size="15" font-weight="700">Cover the patient’s ${eye === 'right' ? 'LEFT' : 'RIGHT'} eye</text>
    <text x="500" y="216" fill="#8fa1b3" font-size="13">(open eye = ${eye.toUpperCase()}; centre the tablet on it)</text>`;
  return `<svg viewBox="0 0 700 260" role="img" aria-label="Positioning diagram">
    <rect width="700" height="260" rx="14" fill="#0e141b"/>
    <circle cx="150" cy="120" r="72" fill="#1a232d" stroke="#3b4a5a" stroke-width="3"/>
    <path d="M214 122 l22 16 l-22 6z" fill="#1a232d" stroke="#3b4a5a" stroke-width="3"/>
    <circle cx="196" cy="108" r="10" fill="#e8eef4"/><circle cx="200" cy="108" r="5" fill="#0b0f14"/>
    <rect x="460" y="30" width="18" height="190" rx="7" fill="#1a232d" stroke="#5c7186" stroke-width="3"/>
    <circle cx="469" cy="42" r="3.5" fill="#3ddc97"/>
    <line x1="208" y1="108" x2="460" y2="108" stroke="#ffb703" stroke-width="2" stroke-dasharray="6 6"/>
    <circle cx="460" cy="108" r="6" fill="#ffb703"/>
    <line x1="214" y1="184" x2="458" y2="184" stroke="#8fa1b3" stroke-width="2"/>
    <path d="M214 184l10-6v12zM458 184l-10-6v12z" fill="#8fa1b3"/>
    <text x="336" y="176" text-anchor="middle" fill="#e8eef4" font-size="18" font-weight="700">≈ ${dist} cm</text>
    <text x="300" y="98" text-anchor="middle" fill="#ffb703" font-size="13">screen centre level with the eyes</text>
    <text x="469" y="244" text-anchor="middle" fill="#3ddc97" font-size="12">camera</text>
    ${cover}</svg>`;
}
function renderGuide() {
  const s = S.settings;
  $('#guide-art').innerHTML = guideSVG(s.distanceCm, s.eye);
  $('#g-dist').textContent = s.distanceCm;
  $('#g-eye').textContent = s.eye === 'both' ? 'Centre the tablet on the patient’s nose.' : `Cover the patient’s ${s.eye === 'right' ? 'left' : 'right'} eye (patch or card) and centre the tablet on the open ${s.eye} eye.`;
  $('#g-cam').style.display = s.method === 'camera' ? '' : 'none';
}

// ======================= flow =======================
function newSession() {
  const s = S.settings;
  return {
    id: uid(), createdAt: Date.now(), appVersion: VERSION,
    label: (S.demo ? 'DEMO · ' + DEMO_PROFILES[S.demo.key].label : s.label) || '',
    method: s.method, eye: s.eye, demo: !!S.demo,
    calSource: s.calSource, stimulus: s.stimulus, flickerHz: s.flickerHz, windowMs: s.windowMs, reps: s.reps,
    geo: null, cal: null, trials: [], notes: '',
  };
}

async function beginFlow(demoKey, ctx = null) {
  S.ctx = ctx;
  S.settings.label = $('#in-label').value;
  persist();
  S.demo = null;
  if (demoKey) {
    const patient = new VirtualPatient(DEMO_PROFILES[demoKey], null);
    S.demo = { key: demoKey, patient, sim: new SimGazeSource(patient) };
    // The simulated patient has simulated eyes, so it can show eye-movement scoring even where no camera exists.
    if (S.cameraFallback && S.settings.method === 'examiner') S.settings.method = 'camera';
  } else if (!S.settings.pxPerMm) {
    // Don't block the first run on calibration: estimate from the screen size and say so.
    S.settings.pxPerMm = estimatePxPerMm();
    S.settings.calSource = 'estimate';
    persist();
    toast('Using an estimated screen size. For accurate angles, match a bank card under Calibrate.', 5200);
  }
  // Phone-sized screen: at 30 cm it spans only about ±14° by ±6°, too small for camera eye tracking. Use 20 cm (once;
  // a distance the user sets later is kept).
  if (!S.demo && S.settings.pxPerMm && S.settings.distanceCm === 30 && !S.settings.phoneDist) {
    const wMm = Math.max(innerWidth, innerHeight) / S.settings.pxPerMm;
    if (wMm < 170) {
      S.settings.distanceCm = 20; S.settings.phoneDist = 1; persist();
      toast('Phone-sized screen: viewing distance set to 20 cm. Hold the phone that close (change it under Screen & distance).', 6500);
    }
  }
  if (S.settings.method === 'camera' && !S.demo && !(navigator.mediaDevices?.getUserMedia && window.isSecureContext)) {
    toast('Camera needs HTTPS or localhost. Switching to examiner scoring.', 4200);
    S.settings.method = 'examiner'; persist(); renderHome();
  }
  renderGuide();
  show('s-guide');
}

function ensureRenderer() {
  if (!S.renderer) {
    S.renderer = new Renderer($('#stage'));
    wireStage();
  }
  S.renderer.configure({ style: S.settings.stimulus, flickerHz: S.settings.flickerHz });
  S.renderer.resize(innerWidth, innerHeight);
  S.renderer.start();
}

const installedApp = () => !!(window.matchMedia && window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches);

async function enterStage() {
  const root = document.documentElement;
  show('s-test');
  // The browser's Fullscreen API is opt-in: on some Android browsers entering it drops the camera, and an installed
  // app is already full-screen. The stage size is also kept the same between the tracking check and the test.
  if (S.settings.fullscreen && !installedApp()) { try { await (root.requestFullscreen?.({ navigationUI: 'hide' }) ?? root.webkitRequestFullscreen?.()); } catch {} }
  try { await screen.orientation?.lock?.('landscape'); } catch {}
  try { S.wake = await navigator.wakeLock?.request('screen'); } catch {}
  if (innerWidth < innerHeight) {
    $('#rotate').classList.add('show');
    await new Promise((res) => {
      const f = () => { if (innerWidth >= innerHeight) { removeEventListener('resize', f); res(); } };
      addEventListener('resize', f);
    });
    $('#rotate').classList.remove('show');
    await sleep(350);
  }
  await sleep(150);
  ensureRenderer();
  const s = S.settings;
  S.geo = new Geometry({ pxPerMm: s.pxPerMm || 3.78, distanceCm: s.distanceCm, width: innerWidth, height: innerHeight });
  S.stageSize = { w: innerWidth, h: innerHeight };
  S.stageLive = true;
  S.renderer.setAnchor({ on: false });
}

async function leaveStage() {
  S.stageLive = false;
  try { S.source?.stop(); } catch {}
  try { S.demo?.sim.stop(); } catch {}
  S.source = null;
  $('#preview').classList.remove('show');
  S.renderer?.setAnchor({ on: false });
  S.renderer?.clearTargets();
  S.renderer?.setGaze(null);
  S.gazeMarker = null;
  try { await S.wake?.release(); } catch {}
  S.wake = null;
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
  try { screen.orientation?.unlock?.(); } catch {}
  setButtons('none'); hidePanel();
}

// ---------- examiner button bar / hot corner / stage input ----------
function setButtons(kind) {
  const bar = $('#exbar');
  bar.innerHTML = '';
  bar.classList.remove('center');
  const B = (label, code, cls = '') => el('button', { class: cls, onclick: () => S.runner?.onExaminer(code) }, label);
  if (kind === 'seen-missed') bar.append(B('Seen', 'seen', 'seen'), B('Missed', 'missed', 'missed'));
  else if (kind === 'dss4') bar.append(B('Both', 'both', 'seen'), el('div', { class: 'mid' }, B('Left only', 'left'), B('Right only', 'right')), B('Neither', 'none', 'missed'));
  else if (kind === 'present') { bar.classList.add('center'); bar.append(B('Present anyway', 'present')); }
  else if (kind === 'skip') { bar.classList.add('center'); bar.append(B('Skip demo', 'skip')); }
}

function wireStage() {
  const stage = $('#stage');
  stage.addEventListener('pointerdown', (e) => { e.preventDefault(); S.runner?.onPointer(e.clientX, e.clientY, performance.now()); });
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  const hot = $('#hot');
  let timer = null;
  const cancel = () => { clearTimeout(timer); hot.classList.remove('holding'); };
  hot.addEventListener('pointerdown', (e) => {
    e.preventDefault(); hot.classList.add('holding');
    timer = setTimeout(() => { cancel(); openPause(); }, 900);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => hot.addEventListener(t, cancel));
  addEventListener('resize', () => {
    if (!S.stageLive || !S.runner || S.runner.paused || S.runner.finished) return;
    const z = S.stageSize;
    if (z && (Math.abs(innerWidth - z.w) > 40 || Math.abs(innerHeight - z.h) > 40)) openPause('Screen size changed. Restore the original window / orientation, then resume.');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && S.stageLive && S.runner && !S.runner.paused && !S.runner.finished) openPause('The app went to the background.');
  });
}

function openPause(msg = '') {
  const r = S.runner;
  if (!r) return;
  r.requestPause();
  const card = showPanel(`<h3>Paused</h3>${msg ? `<p>${esc(msg)}</p>` : ''}<p>${r.done} of ${r.total} trials done.</p>
    <div class="btns"><button class="primary" id="p-resume">Resume</button>
    ${S.gazeMarker ? `<button id="p-gaze">${S.renderer.gazeFn ? 'Hide' : 'Show'} gaze marker</button>` : ''}
    <button id="p-finish">Finish now &amp; view results</button>
    <button class="danger" id="p-abort">Discard &amp; exit</button></div>`);
  $('#p-resume', card).onclick = () => {
    const z = S.stageSize;
    if (Math.abs(innerWidth - z.w) > 40 || Math.abs(innerHeight - z.h) > 40) return toast('Window size differs from the start of the test');
    hidePanel(); r.resume();
  };
  $('#p-gaze', card) && ($('#p-gaze', card).onclick = (e) => {
    const on = !S.renderer.gazeFn;
    S.renderer.setGaze(on ? S.gazeMarker : null);
    S.settings.showGaze = on ? 1 : 0; persist();
    e.target.textContent = `${on ? 'Hide' : 'Show'} gaze marker`;
  });
  $('#p-finish', card).onclick = () => { hidePanel(); r.finish(); };
  $('#p-abort', card).onclick = () => { hidePanel(); r.abort(); };
}

// ======================= tracking check (camera) =======================
function hudTracking(ok) {
  const d = $('#hud-dot');
  d.className = 'dot ' + (ok ? 'ok' : 'lost');
}

// The green ring: where the tracker thinks the eyes point. The 2D map (fitted at the tracking check) turns the
// iris features into degrees, a One-Euro filter steadies it at rest without lagging a saccade, and the dashed
// circle around it is the device's *measured* error radius, so the ring is never drawn more precisely than it is.
function gazeMarker(tracker, geo, getUncDeg) {
  return () => {
    const g = tracker.current(performance.now(), 500); // slower tablets deliver a frame every 150-300 ms
    if (!g) return null;
    const p = geo.pointFromDeg(g.gx, -g.gy);
    const unc = getUncDeg();
    return {
      x: clamp(p.x, 20, geo.width - 20), y: clamp(p.y, 20, geo.height - 20),
      r: 14,
      unc: Number.isFinite(unc) ? Math.max(geo.sizePx(2 * unc) / 2, 18) : 0,
    };
  };
}

// Calibration grid (fits the map) and validation dots (never used in the fit) in screen-right / screen-DOWN degrees.
const gridDots = (dx, dy) => [[0, 0], [dx, 0], [dx, dy], [0, dy], [-dx, dy], [-dx, 0], [-dx, -dy], [0, -dy], [dx, -dy]];
const valDots = (dx, dy) => [[0.5 * dx, -0.5 * dy], [-0.5 * dx, -0.5 * dy], [-0.5 * dx, 0.5 * dy], [0.5 * dx, 0.5 * dy], [0, 0.5 * dy]];

async function runCheck(retried = false) {
  const s = S.settings;
  const R = S.renderer;
  const geo = S.geo;
  const src = S.demo ? S.demo.sim : new CameraGazeSource({ eyeMode: s.eye });
  S.source = src;
  const buf = [];
  let live = null; // GazeTracker, once the map is fitted
  src.onSample = (smp) => {
    buf.push(smp);
    if (buf.length > 600) buf.splice(0, buf.length - 450);
    hudTracking(smp.ok);
    live?.push(smp);
  };

  const prev = $('#preview');
  // The preview box must be on screen *before* the camera starts: iPhones do not decode video inside a display:none element.
  if (!S.demo) prev.classList.add('show', 'big');
  try {
    await src.start($('#cam'));
  } catch (e) {
    prev.classList.remove('show', 'big');
    try { src.stop(); } catch {}
    if (!retried && document.fullscreenElement) { // some Android browsers drop the camera in full screen: leave it and try once more
      try { await document.exitFullscreen(); } catch {}
      await sleep(700);
      S.source = null;
      return runCheck(true);
    }
    const why = explainCameraError(e, e?.stage || src.stage);
    const choice = await new Promise((resolve) => {
      const card = showPanel(`<h3>Camera not available</h3><p>${esc(why.msg)}</p>
        <p class="dim fine">Technical detail: ${esc(why.name || 'error')} at step “${esc(why.stage || '?')}”: ${esc(why.raw)} · <a href="camera-test.html" style="color:#58a6ff">camera test page</a> (shows exactly what the browser answers)</p>
        <div class="startbar"><div class="btns"><button class="primary" id="c-retry">Try the camera again</button>
        <div class="btns3"><button id="c-ex">Use examiner scoring</button><button id="c-back" class="ghost">Back</button></div></div></div>`);
      $('#c-retry', card).onclick = () => resolve('retry');
      $('#c-ex', card).onclick = () => resolve('examiner');
      $('#c-back', card).onclick = () => resolve(null);
    });
    hidePanel();
    S.source = null;
    if (choice === 'retry') { try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {} return runCheck(true); }
    return choice;
  }
  R.setAnchor({ on: true, x: geo.cx, y: geo.cy, r: Math.max(geo.sizePx(1.8) / 2, 18), style: s.anchor });
  const ov = $('#cam-ov').getContext('2d');
  let raf = 0;
  const drawLoop = () => {
    drawOverlay(ov, src.lastFeat, src.frameW, src.frameH, true, prev.classList.contains('big'));
    raf = requestAnimationFrame(drawLoop);
  };
  if (!S.demo) drawLoop();

  const recentOk = () => {
    const now = performance.now();
    const w = buf.filter((x) => x.t > now - 600);
    return w.length >= 5 && w.filter((x) => x.ok).length / w.length >= 0.8;
  };

  let result;
  for (;;) {
    // ---- A: positioning ----
    const outcome = await new Promise((resolve) => {
      prev.classList.toggle('big', !S.demo);
      const card = showPanel(`<div class="chk-text"><div id="chk-live" class="dim">Looking for a face…</div>
        <div class="tip">Both eyes inside the oval · face the light · <b>mask below the nose</b>. Then follow the dot.</div></div>
        <div class="btns"><button class="primary" id="c-start" disabled>Start check</button><button id="c-ex">Examiner scoring</button></div>`, { bottom: true, compact: true });
      const live = $('#chk-live', card), start = $('#c-start', card);
      const iv = setInterval(() => {
        const ok = recentOk();
        start.disabled = !ok;
        const dEst = src.lastFeat?.ipdPx ? estimateDistanceCm(src.lastFeat.ipdPx, src.frameW) : NaN;
        const dTxt = Number.isFinite(dEst) ? ` · distance ≈ ${Math.round(dEst)} cm (rough; set ${s.distanceCm})` : '';
        let why = 'Looking for a face and open eyes…';
        if (!S.demo && !ok && src.diagnostics) {
          const d = src.diagnostics();
          const L = d.light;
          const lightTxt = L ? (L.centre < 8 && L.edge < 8 ? ' The camera picture is <b>completely black</b>: check that Android’s <b>Camera access</b> switch (Quick Settings) is on and nothing covers the front camera.' : L.centre < 45 ? ' It is <b>too dark</b>: face a light.' : (L.edge - L.centre > 50 ? ' The room behind is much brighter than the face (<b>backlit</b>): turn so the light falls on the face.' : '')) : '';
          if (d.frames === 0) why = `Camera is on (${d.cam}) but the tracking model has not produced a frame yet… <small>video ${d.video}</small>`;
          else if (d.faces === 0) why = `Camera is on, ${d.frames} frames seen, <b>no face found</b>.${lightTxt || ' Hold the phone at arm’s length with the face inside the oval, both eyes visible.'} <small>mode: ${d.mode} · ${d.video}${L ? ` · light ${L.centre}/${L.edge}` : ''}${d.label ? ` · ${esc(d.label)}` : ''}</small>`;
          else why = `Face seen (${d.faces}/${d.frames} frames) but not steadily: hold still, open both eyes fully.${lightTxt} <small>mode: ${d.mode} · ${d.fps} fps${L ? ` · light ${L.centre}/${L.edge}` : ''}</small>`;
        }
        live.innerHTML = S.demo ? 'Simulated patient — camera not used.' : ok ? `<span style="color:#3ddc97">Face tracked</span>${dTxt} · ${src.fps.toFixed(0)} fps` : why;
        $('#cam-info').textContent = ok ? 'tracking' : 'no face';
        if (S.demo) start.disabled = false;
      }, 200);
      start.onclick = () => { clearInterval(iv); resolve('go'); };
      $('#c-ex', card).onclick = () => { clearInterval(iv); resolve('examiner'); };
    });
    if (outcome === 'examiner') { result = 'examiner'; break; }

    // ---- B: 9 calibration dots, then 5 validation dots the map has never seen ----
    hidePanel();
    prev.classList.remove('big');
    const e = geo.halfExtentDeg();
    const dx = +clamp(0.7 * e.h, 8, 18).toFixed(1), dy = +clamp(0.6 * e.v, 5, 9).toFixed(1);
    const calDots = gridDots(dx, dy), valD = valDots(dx, dy);
    const total = calDots.length + valD.length;
    const dwell = async (px, py, n) => {
      const q = geo.pointFromDeg(px, -py);
      R.setAnchor({ on: true, x: q.x, y: q.y });
      $('#hint').textContent = `Follow the dot  ${n}/${total}`;
      $('#hud-prog').textContent = `${n}/${total}`;
      src.followDot?.(px, py);
      const t0 = performance.now();
      await sleep(1400);
      // 650 ms after the dot jumps the eyes have landed and settled; keep everything until it moves again
      const frames = buf.filter((x) => x.t >= t0 + 650 && x.t <= t0 + 1400 && x.ok)
        .map((x) => ({ x: x.x, y: x.y, hx: x.hx, hy: x.hy, xr: x.xr, xl: x.xl, yr: x.yr, yl: x.yl }));
      return { dx: px, dy: py, frames };
    };
    const rawCal = [], rawVal = [];
    if (!S.demo && 'eyeMode' in src) src.eyeMode = s.eye; // a repeated check starts again from both eyes
    let n = 0;
    for (const [px, py] of calDots) rawCal.push(await dwell(px, py, ++n));
    for (const [px, py] of valD) rawVal.push(await dwell(px, py, ++n));
    $('#hint').textContent = ''; $('#hud-prog').textContent = '';
    R.setAnchor({ x: geo.cx, y: geo.cy });

    // A camera at the side of the screen (phones in landscape) sees the far eye at a steep angle, and averaging it in
    // can spoil the map. Fit both eyes, the right eye and the left eye; track a single eye only when its fit is clearly
    // better on the fit's own leave-one-dot-out error, so the 5 validation dots below stay unseen. Eyes move together,
    // so with both eyes open one eye is enough to see a saccade.
    const asEye = (raw, eye) => eye === 'both' ? raw : raw.map((p) => ({ ...p,
      frames: p.frames.filter((f) => Number.isFinite(eye === 'right' ? f.xr : f.xl) && Number.isFinite(eye === 'right' ? f.yr : f.yl))
        .map((f) => ({ ...f, x: eye === 'right' ? f.xr : f.xl, y: eye === 'right' ? f.yr : f.yl })) }));
    const fitOpts = { distanceMm: s.distanceCm * 10, headComp: !!s.headComp };
    let trackEye = s.eye, calPts = rawCal, valPts = rawVal;
    let fit = fitMapping(rawCal, fitOpts);
    if (s.eye === 'both' && !S.demo) {
      let one = null;
      for (const eye of ['right', 'left']) {
        const pts = asEye(rawCal, eye), f1 = fitMapping(pts, fitOpts);
        if (f1.ok && (!one || f1.cv.total < one.fit.cv.total)) one = { eye, pts, fit: f1 };
      }
      if (one && (!fit.ok || one.fit.cv.total < 0.85 * fit.cv.total)) {
        trackEye = one.eye; fit = one.fit; calPts = one.pts; valPts = asEye(rawVal, one.eye);
        src.eyeMode = one.eye;
      }
    }

    // legacy per-axis fit on the five axis dots: still supplies the saccade detector's thresholds and the sanity gate
    const axisPts = calPts.filter((p) => p.dx === 0 || p.dy === 0)
      .map((p) => ({ dx: p.dx, dy: p.dy, xs: p.frames.map((f) => f.x), ys: p.frames.map((f) => f.y) }));
    const cal = fitCalibration(axisPts);
    cal.dx = dx; cal.dy = dy;
    cal.fps = +src.fps.toFixed(1);
    cal.camMode = src.diagnostics ? src.diagnostics().mode : null;
    cal.trackEye = trackEye;

    const val = fit.ok ? validateMapping(fit.M, valPts) : null;
    if (fit.ok && val?.ok) {
      cal.M = fit.M;
      cal.val = val; cal.fit = fit;
      cal.acc = val.acc; cal.accX = val.accX; cal.accY = val.accY; cal.grade = val.grade;
      cal.prec = Math.hypot(val.precision.x, val.precision.y);
      // measured accuracy has to clear the limits, not just the response being monotonic
      if (cal.okX && val.accX > ACC.GATE_X) { cal.okX = false; cal.ok = false; cal.reason = `Measured horizontal accuracy ${val.accX.toFixed(1)}° is too coarse for left/right scoring (limit ${ACC.GATE_X}°)`; }
      else if (cal.okY && val.accY > ACC.GATE_Y) { cal.okY = false; cal.reason = `Measured vertical accuracy ${val.accY.toFixed(1)}° is too coarse (limit ${ACC.GATE_Y}°): left/right scoring only`; }
    } else {
      cal.fitReason = (!fit.ok ? fit.reason : val?.reason) || 'accuracy could not be measured';
    }
    cal.agree = eyeAgreement(rawCal);

    // ---- C0: follow test. The ring shows where the tracker thinks the eyes point; a slim bar keeps the stage clear ----
    let follow = 'ok';
    let tracker = null;
    if (cal.okX && cal.M) {
      tracker = new GazeTracker(cal.M, { okY: cal.okY });
      live = tracker;
      R.setGaze(gazeMarker(tracker, geo, () => cal.acc));
    }
    if (tracker) {
      let scan = 0;
      if (S.demo) {
        const tour = [[9, 0], [-9, 0], [0, 4], [0, -4], [0, 0]];
        let i = 0;
        src.followDot?.(...tour[i++ % tour.length]);
        scan = setInterval(() => src.followDot?.(...tour[i++ % tour.length]), 1500);
      }
      let fIv = 0;
      follow = await new Promise((resolve) => {
        const card = showPanel(`<p><b style="color:#3ddc97">Look around the screen.</b> The green ring should follow the eyes${cal.okY ? '' : ' left and right'}${S.demo ? ' (simulated eyes)' : ''}. The dashed circle is the measured error (about ±${(cal.acc || 0).toFixed(1)}°).</p>
          ${S.demo ? '' : '<p class="dim fine"><b>Keep the head still and move only the eyes</b> (turning the head is not tracked). Prop the tablet up rather than holding it.</p><p class="dim fine" id="f-live"></p>'}
          <div class="btns"><button class="primary" id="f-ok">It follows</button><button id="f-ctr">Eyes on centre dot: re-centre</button><button id="f-redo">Repeat check</button></div>`, { bottom: true, compact: true });
        const fLive = $('#f-live', card);
        fIv = fLive ? setInterval(() => {
          const d = src.diagnostics ? src.diagnostics() : {};
          const on = !!tracker.current(performance.now(), 500);
          const slow = src.fps > 0 && src.fps < 8 ? ` · <b>slow on this tablet, so the ring lags</b>` : '';
          fLive.innerHTML = `${on ? 'Ring tracking' : '<b>Ring hidden: eyes not tracked right now</b>'} · ${src.fps.toFixed(0)} fps${slow} · detection: ${esc(d.mode || '?')} · steadiness ±${Number.isFinite(cal.prec) ? cal.prec.toFixed(1) : '?'}°`;
        }, 300) : 0;
        $('#f-ok', card).onclick = () => resolve('ok');
        $('#f-ctr', card).onclick = () => {
          R.setAnchor({ on: true, x: geo.cx, y: geo.cy });
          if (tracker.recenter()) toast('Ring re-centred (marker only; scoring is unchanged)');
          else toast('Hold the eyes on the centre dot, then press again');
        };
        $('#f-redo', card).onclick = () => resolve('redo');
      });
      clearInterval(scan);
      clearInterval(fIv);
      R.setGaze(null);
      live = null;
      hidePanel();
      if (follow === 'redo') continue;
      cal.markerOff = { x: +tracker.off.x.toFixed(2), y: +tracker.off.y.toFixed(2) };
    }

    // ---- C: verdict ----
    const verdict = await new Promise((resolve) => {
      const good = cal.okX;
      const g = cal.grade;
      const pill = !good ? '<span class="pill bad">Tracking poor</span>'
        : g === 'fair' ? '<span class="pill warn">Tracking fair</span>'
        : !cal.okY ? '<span class="pill warn">Left/right only</span>'
        : '<span class="pill ok">Tracking good</span>';
      const accRow = cal.val
        ? `<b>Accuracy</b><span>${cal.acc.toFixed(1)}° mean error · ${esc(g)} <small>(H ${cal.accX.toFixed(1)}° · V ${cal.accY.toFixed(1)}°, worst ${cal.val.worst.toFixed(1)}° on ${cal.val.n} unseen dots)</small></span>
           <b>Steadiness</b><span>±${cal.prec.toFixed(1)}° per frame while holding a dot <small>(before the ring smooths it)</small></span>
           <b>Map</b><span>${esc({ diag: 'per-axis', lin: 'linear 2×2', quad: 'curved' }[cal.M.model] || cal.M.model)}${cal.M.useHead ? ' + head-movement correction' : ''}</span>`
        : `<b>Accuracy</b><span>not measured: ${esc(cal.fitReason || 'fit failed')}</span>`;
      const eyeRow = (cal.agree && !cal.agree.ok
        ? `<b>Eyes</b><span>the two eyes respond differently (${esc(cal.agree.weaker)} eye weaker): possible eye misalignment or a poor view of one eye</span>` : '')
        + (s.eye === 'both' && cal.trackEye && cal.trackEye !== 'both'
          ? `<b>Tracking</b><span>${esc(cal.trackEye)} eye only: the camera sees it clearly better (both eyes still tested)</span>` : '');
      const card = showPanel(`<h3>Tracking check ${pill}</h3>
        <div class="kv">${accRow}${eyeRow}</div>
        ${cal.reason ? `<p>${esc(cal.reason)}</p>` : ''}
        <details><summary>Details</summary><div class="kv">
        <b>Horizontal</b><span>${cal.okX ? 'reliable' : 'not reliable'} · noise ±${(cal.noiseDegX || 0).toFixed(1)}° · fit R² ${(cal.r2x || 0).toFixed(2)}</span>
        <b>Vertical</b><span>${cal.okY ? 'reliable' : 'not used (hemifield scoring only)'} · noise ±${(cal.noiseDegY || 0).toFixed(1)}°</span>
        <b>Frame rate</b><span>${cal.fps} fps</span>${cal.flipped ? '<b>Camera</b><span>mirrored stream detected, handled automatically</span>' : ''}</div></details>
        ${good ? '<p class="dim fine">Measured on dots the map was not fitted to, so this is the device&rsquo;s real error, not a fit statistic. A screening aid, not a clinical eye tracker.</p>' : '<p>Try better light facing the face, remove reflective glasses, move closer, hold the head still, or use examiner scoring.</p>'}
        <div class="startbar"><div class="btns">${good ? '<button class="primary" id="v-go">Start screening</button>' : '<button class="primary" id="v-ex">Use examiner scoring</button>'}
        <div class="btns3"><button id="v-redo">Repeat check</button>${good ? '<button id="v-ex">Examiner scoring</button>' : ''}<button id="v-back" class="ghost">Cancel</button></div></div></div>`);
      $('#v-go', card) && ($('#v-go', card).onclick = () => resolve({ cal }));
      $('#v-redo', card).onclick = () => resolve('redo');
      $('#v-ex', card) && ($('#v-ex', card).onclick = () => resolve('examiner'));
      $('#v-back', card).onclick = () => resolve(null);
    });
    if (verdict === 'redo') continue;
    result = verdict;
    break;
  }
  cancelAnimationFrame(raf);
  prev.classList.remove('show');
  hidePanel();
  if (result === 'examiner' || result === null) { try { src.stop(); } catch {} S.source = null; }
  return result;
}

// ======================= run =======================
function makeUI() {
  return {
    progress: (d, t) => { $('#hud-prog').textContent = `${d}/${t}`; },
    hint: (txt) => { $('#hint').textContent = txt || ''; },
    buttons: setButtons,
  };
}

async function startTests() {
  await enterStage();
  const s = S.settings;
  let method = s.method;
  let cal = null;

  if (method === 'camera') {
    const r = await runCheck();
    if (r === null) { await leaveStage(); return goHome(); }
    if (r === 'examiner') {
      method = 'examiner';
      await new Promise((resolve) => {
        const card = showPanel(`<h3>You score this test</h3>
          <p>The camera is <b>not</b> used now (its tracking was not accurate enough on this device, or you chose examiner scoring).</p>
          <p>After each target appears, watch the patient’s eyes and tap <b>Seen</b> if they looked toward it, or <b>Missed</b> if not.</p>
          <div class="btns"><button class="primary" id="x-ok">Start examiner scoring</button></div>`);
        $('#x-ok', card).onclick = () => resolve();
      });
      hidePanel();
    }
    else cal = r.cal;
  }

  const session = S.ctx?.session || newSession();
  session.method = method;
  S.session = session;
  session.geo = S.geo.summary(s.stimDeg);
  session.cal = cal ? {
    okX: cal.okX, okY: cal.okY, noiseDegX: cal.noiseDegX, noiseDegY: cal.noiseDegY, kx: cal.kx, ky: cal.ky, fps: cal.fps, flipped: cal.flipped,
    acc: cal.acc != null ? +cal.acc.toFixed(2) : null, accX: cal.accX != null ? +cal.accX.toFixed(2) : null, accY: cal.accY != null ? +cal.accY.toFixed(2) : null,
    prec: cal.prec != null ? +cal.prec.toFixed(2) : null, grade: cal.grade || null,
    model: cal.M ? cal.M.model : null, headCorr: cal.M ? !!cal.M.useHead : null, eyesAgree: cal.agree ? !!cal.agree.ok : null,
    markerOff: cal.markerOff || null, camMode: cal.camMode || null, trackEye: cal.trackEye || null,
  } : session.cal;

  const runner = new TestRunner({
    renderer: S.renderer, geo: S.geo, settings: { ...s }, method, eyeMode: s.eye, cal, ui: makeUI(),
    rng: S.demo ? mulberry32((Date.now() & 0xffff) + 7) : Math.random,
  });
  S.runner = runner;
  const tracker = method === 'camera' && cal?.M ? new GazeTracker(cal.M, { okY: cal.okY, off: cal.markerOff }) : null;
  if (S.source) S.source.onSample = (smp) => { runner.pushSample(smp); hudTracking(smp.ok); tracker?.push(smp); };
  S.gazeMarker = tracker ? gazeMarker(tracker, S.geo, () => cal.acc) : null;
  S.renderer.setGaze(s.showGaze ? S.gazeMarker : null);
  if (S.demo) S.demo.sim.attach(runner);
  $('#hud-dot').className = 'dot ' + (method === 'camera' ? 'lost' : '');

  let aborted = false;
  const blocks = S.ctx?.only === 'dss' ? ['dss'] : ['quad', ...(s.includeDSS ? ['dss'] : [])];
  for (const b of blocks) {
    if (b === 'dss' && blocks[0] === 'quad') {
      const sum = summarize({ ...session, trials: runner.trials });
      if (!dssEligible(sum)) { toast('A hemifield was missed — skipping double simultaneous stimulation', 4200); break; }
      await sleep(900);
    }
    const res = await runner.run([{ type: b }]);
    if (res.aborted) { aborted = true; break; }
    if (res.finishedEarly) break;
  }
  S.runner = null;
  await leaveStage();
  if (aborted) { toast('Test discarded'); return goHome(); }
  session.trials = S.ctx?.session ? [...session.trials, ...runner.trials] : runner.trials;
  saveSession(session);
  S.ctx = null;
  showResults(session, { fresh: true });
}

// ======================= results / history =======================
function showResults(session, { fresh = false, readonly = false } = {}) {
  S.session = session;
  const summary = summarize(session);
  $('#report').innerHTML = reportHTML(session, summary);
  const notes = $('#res-notes');
  notes.value = session.notes || '';
  notes.onchange = () => { session.notes = notes.value; saveSession(session); $('#report').innerHTML = reportHTML(session, summary); };
  const acts = $('#res-actions');
  acts.innerHTML = '';
  if (!readonly && summary.hasQuad && !summary.hasDss) {
    const ok = dssEligible(summary);
    acts.append(el('button', { class: ok ? 'primary' : '', onclick: () => runDssNow(session) }, ok ? 'Run double simultaneous block' : 'Run double simultaneous block anyway'));
    if (!ok) acts.append(el('span', { class: 'hint' }, 'A hemifield was missed: extinction can only be judged where single stimuli are seen.'));
  }
  if (!readonly) acts.append(el('button', { onclick: () => { renderHome(); show('s-home'); } }, 'New test'));
  show('s-results');
}

function runDssNow(session) {
  S.settings.method = session.method;
  S.settings.eye = session.eye;
  persist();
  S.ctx = { only: 'dss', session };
  beginFlowResume(session);
}
function beginFlowResume(session) {
  S.demo = session.demo ? (() => { const key = Object.keys(DEMO_PROFILES).find((k) => session.label.includes(DEMO_PROFILES[k].label)) || 'rhh'; const patient = new VirtualPatient(DEMO_PROFILES[key]); return { key, patient, sim: new SimGazeSource(patient) }; })() : null;
  renderGuide();
  show('s-guide');
}

function goHistory() {
  const list = $('#hist-list');
  list.innerHTML = '';
  const all = loadSessions();
  if (!all.length) list.append(el('p', { class: 'dim' }, 'No saved tests yet.'));
  for (const s of all) {
    const sum = summarize(s);
    const when = new Date(s.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const item = el('div', { class: 'hist-item' },
      el('div', { class: 'grow', onclick: () => showResults(s, { readonly: true }) },
        el('div', { class: 't1' }, s.label || 'Unlabelled'),
        el('div', { class: 't2' }, `${when} · ${s.method} · ${s.eye}${s.demo ? ' · DEMO' : ''}`),
        el('div', { class: 't2' }, [sum.pattern?.title, sum.dss?.title].filter(Boolean).join(' · ') || '—')),
      el('button', { class: 'danger', onclick: (e) => { e.stopPropagation(); if (e.currentTarget.dataset.arm) { deleteSession(s.id); goHistory(); } else { e.currentTarget.dataset.arm = 1; e.currentTarget.textContent = 'Confirm'; } } }, 'Delete'));
    list.append(item);
  }
  show('s-history');
}

// Sandboxed preview views refuse file downloads, so there the export goes to the clipboard instead.
function copyOut(name, text) {
  const fail = () => toast('This view blocks copying too. Use the hosted app to export.', 4200);
  try { navigator.clipboard.writeText(text).then(() => toast(`${name} copied. Paste it into Notes or an email.`, 4200), fail); } catch { fail(); }
}

function wireResults() {
  $('#res-back').addEventListener('click', () => { renderHome(); show('s-home'); });
  $('#res-print').addEventListener('click', () => (window.BedsideNative?.print ? window.BedsideNative.print() : window.print()));
  const stem = () => `field-${new Date(S.session.createdAt).toISOString().slice(0, 16).replace(/[:T]/g, '-')}`;
  const save = (name, text, type) => (window.__BF_PREVIEW ? copyOut(name, text) : downloadBlob(name, text, type));
  $('#res-csv').addEventListener('click', () => save(stem() + '.csv', csvOf(S.session), 'text/csv'));
  $('#res-json').addEventListener('click', () => save(stem() + '.json', JSON.stringify({ ...S.session, summary: summarize(S.session) }, null, 2)));
}

function goHome() { renderHome(); show('s-home'); }

// ======================= settings / about =======================
function goSettings() {
  const f = $('#settings-form');
  f.innerHTML = '';
  const s = S.settings;
  const row = (label, hint, input) => f.append(el('div', { class: 'settings-row' }, el('div', {}, label, hint ? el('small', {}, hint) : null), input));
  const sel = (key, opts) => { const x = el('select', { onchange: (e) => { s[key] = isNaN(+e.target.value) ? e.target.value : +e.target.value; persist(); } }, opts.map(([v, l]) => el('option', { value: v, selected: String(s[key]) === String(v) }, l))); return x; };
  const num = (key, min, max, step = 1) => el('input', { type: 'number', min, max, step, value: s[key], onchange: (e) => { s[key] = clamp(+e.target.value || DEFAULTS[key], min, max); e.target.value = s[key]; persist(); } });
  row('Target style', 'Looming flickering disc, or counter-phase Gabor patch', sel('stimulus', [['disc', 'Flicker disc'], ['gabor', 'Gabor patch']]));
  row('Full-screen browser mode', 'Off by default: on some Android browsers full screen takes the camera away. For a full-screen view, install the app to the home screen instead (browser menu → Add to Home screen).', sel('fullscreen', [[0, 'Off'], [1, 'On']]));
  row('Head-movement correction', 'Subtracts the effect of the head sliding sideways or up/down while the eyes are tracked. It cannot correct head turning (yaw/pitch). Leave on unless the accuracy check says otherwise.', sel('headComp', [[1, 'On'], [0, 'Off']]));
  row('Gaze marker during the test', 'Green ring follows the eyes, for the examiner. Off by default: patients tend to chase it. Toggle it any time from the pause menu.', sel('showGaze', [[0, 'Off'], [1, 'On']]));
  row('Fixation anchor', 'Pulsing circle or cartoon face', sel('anchor', [['pulse', 'Pulsing circle'], ['face', 'Smiley face']]));
  row('Target size (°)', 'Visual angle; larger is easier to see', num('stimDeg', 2, 6, 0.5));
  row('Repeats per location', 'More = steadier result, longer test', num('reps', 2, 5));
  row('Target on-time (ms)', 'Eye-movement modes', num('stimMs', 400, 2500, 100));
  row('Response window (ms)', 'Eye-movement modes', num('windowMs', 1000, 4000, 100));
  row('Gap before target (ms)', '0 = anchor stays on (overlap); 200 = gap paradigm, faster reflexive saccades', num('gapMs', 0, 400, 50));
  row('Touch time-out (ms)', 'Touch mode: target stays until tapped or this elapses', num('touchTimeoutMs', 3000, 15000, 500));
  row('Touch practice', 'Wordless demo + 2 practice targets', sel('practice', [['true', 'On'], ['false', 'Off']]));
  f.querySelectorAll('select').forEach((x) => { if (x.options.length === 2 && x.options[0].value === 'true') x.onchange = (e) => { s.practice = e.target.value === 'true'; persist(); }; });
  f.append(el('div', { class: 'row' },
    el('button', { onclick: () => { Object.assign(S.settings, { stimulus: DEFAULTS.stimulus, anchor: DEFAULTS.anchor, stimDeg: DEFAULTS.stimDeg, reps: DEFAULTS.reps, stimMs: DEFAULTS.stimMs, windowMs: DEFAULTS.windowMs, gapMs: DEFAULTS.gapMs, touchTimeoutMs: DEFAULTS.touchTimeoutMs, practice: true }); persist(); goSettings(); toast('Defaults restored'); } }, 'Restore defaults'),
    el('button', { class: 'danger', onclick: (e) => { if (e.currentTarget.dataset.arm) { clearAll(); S.settings = loadSettings(); goSettings(); toast('All saved tests and settings deleted'); } else { e.currentTarget.dataset.arm = 1; e.currentTarget.textContent = 'Tap again to delete everything'; } } }, 'Delete all saved tests')));
  show('s-settings');
}

function renderAbout() {
  $('#about-body').innerHTML = `
    <h3>What this is</h3>
    <p>A bedside screening aid for visual field defects in patients who cannot follow verbal instructions (global, Wernicke’s or severe Broca’s aphasia). It replaces “look at my nose and tell me when…” with responses that need no language.</p>
    <h3>Paradigms</h3>
    <ul>
      <li><b>Saccadic (gaze-shift):</b> a pulsing anchor holds fixation; once steady, a flickering, looming target appears in one of four quadrants. A patient with an intact pathway looks toward it reflexively. Scored from the front camera, or by you watching the eyes.</li>
      <li><b>Touch-to-target:</b> a wordless finger-tap demo, then glowing circles to tap. A shrinking ring leads the gaze back to the centre between targets.</li>
      <li><b>Double simultaneous stimulation:</b> left/right pairs, with single-side controls, to separate extinction (parietal inattention) from a true field cut. Offered only where both hemifields were seen on single stimuli.</li>
      <li><b>Catch trials</b> (no stimulus) estimate spontaneous responses; unusable trials are re-queued, never scored as misses.</li>
    </ul>
    <h3>Limits you should know</h3>
    <ul>
      <li>Not equivalent to Humphrey/automated perimetry: no luminance calibration, no head fixation, viewing distance set by hand. It is a digital confrontation test.</li>
      <li>Tested area is limited by the tablet (about ±20–25° horizontally, ±14–18° vertically at 30 cm): it will catch hemianopias and quadrantanopias, not the far temporal crescent.</li>
      <li>Camera gaze comes from face-landmark iris tracking, sampled at ~30 fps. Direction of a gaze shift is reliable; latencies are approximate (camera + processing delay) and good for left-versus-right comparison, not as absolute saccade latencies. Vertical tracking is noisier than horizontal and is switched off automatically when it fails the check.</li>
      <li>Frontal-eye-field lesions, tonic gaze deviation, drowsiness, neglect and poor engagement all reduce responses without a field cut. The report flags what it can; the examiner decides.</li>
      <li>Wrong-way or late responses are counted as misses/delayed; a hemianopic patient who scans can still find a touch target — that appears as a delayed response.</li>
    </ul>
    <h3>Privacy</h3>
    <p>Everything stays in this browser. No network requests are made after installation; the camera image is processed on the device and never stored or sent. Use a bed number or the last digits of an MRN rather than a name.</p>
    <h3>Install</h3>
    <p>iPad/iPhone: Safari → Share → Add to Home Screen. Android/Chrome: menu → Install app. Open it once while online so everything caches, then it runs offline.</p>`;
}

// ======================= boot =======================
function wireGuide() {
  $('#btn-guide-go').addEventListener('click', () => startTests());
}

function boot() {
  // No camera here (no HTTPS, or a sandboxed view): open on examiner scoring instead of a mode that cannot start.
  if (S.settings.method === 'camera' && !(navigator.mediaDevices?.getUserMedia && window.isSecureContext)) { S.settings.method = 'examiner'; S.cameraFallback = true; }
  wireHome(); wireCal(); wireGuide(); wireResults();
  renderHome();
  if ('serviceWorker' in navigator && !NATIVE) {
    navigator.serviceWorker.register('sw.js').then(() => {
      navigator.serviceWorker.ready.then(() => renderHome());
    }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => { renderHome(); });
  }
  const f = new URLSearchParams(location.search);
  if (f.get('screen') === 'cal') goCal();
}
boot();
