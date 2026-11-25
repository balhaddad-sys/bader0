// Tracking check (camera mode), run on the test stage before the first trial:
//   start the camera -> A: position the face -> B: 9 calibration + 5 validation dots -> score (core/calibration.js)
//   -> C0: "does the green ring follow the eyes?" -> C: verdict card.
// Resolves with { cal } to start camera screening, 'examiner' to switch to examiner scoring, or null to cancel.

import { $, toast, showPanel, hidePanel, askPanel } from '../ui/dom.js';
import { S } from '../app/state.js';
import { gazeMarker, hudTracking } from '../app/stage.js';
import { CameraGazeSource } from '../camera/source.js';
import { drawOverlay } from '../camera/overlay.js';
import { estimateDistanceCm } from '../camera/features.js';
import { explainCameraError } from '../camera/errors.js';
import { cameraReportText } from '../camera/diagnostics.js';
import { saveTextFile } from '../platform.js';
import { GazeTracker } from '../core/mapper.js';
import { gridDots, valDots, dotExtent, collectDot, scoreCheck, MAP_NAMES } from '../core/calibration.js';
import { sleep, escapeHtml as esc } from '../core/util.js';

export async function runCheck(retried = false) {
  const s = S.settings;
  const src = S.demo ? S.demo.sim : new CameraGazeSource({ eyeMode: s.eye });
  S.source = src;
  const buf = [];
  const live = { tracker: null }; // GazeTracker feeding the green ring, once the map is fitted
  src.onSample = (smp) => {
    buf.push(smp);
    if (buf.length > 600) buf.splice(0, buf.length - 450);
    hudTracking(smp.ok);
    live.tracker?.push(smp);
  };

  const prev = $('#preview');
  // The preview box must be on screen *before* the camera starts: iPhones do not decode video inside a display:none element.
  if (!S.demo) prev.classList.add('show', 'big');
  try {
    await src.start($('#cam'));
  } catch (e) {
    return cameraFailed(e, src, prev, retried);
  }
  S.renderer.setAnchor({ on: true, x: S.geo.cx, y: S.geo.cy, r: Math.max(S.geo.sizePx(1.8) / 2, 18), style: s.anchor });
  const ov = $('#cam-ov').getContext('2d');
  let raf = 0;
  const drawLoop = () => {
    drawOverlay(ov, src.lastFeat, src.frameW, src.frameH, true, prev.classList.contains('big'));
    raf = requestAnimationFrame(drawLoop);
  };
  if (!S.demo) drawLoop();

  let result;
  for (;;) {
    if (await positionFace(src, buf, prev) === 'examiner') { result = 'examiner'; break; }
    const cal = await runDots(src, buf, prev);
    if (await followRing(src, cal, live) === 'redo') continue;
    const verdict = await verdictCard(cal);
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

/** The camera did not start: explain why, then retry, switch to examiner scoring, or go back. */
async function cameraFailed(e, src, prev, retried) {
  prev.classList.remove('show', 'big');
  try { src.stop(); } catch {}
  if (!retried && document.fullscreenElement) { // some Android browsers drop the camera in full screen: leave it and try once more
    try { await document.exitFullscreen(); } catch {}
    await sleep(700);
    S.source = null;
    return runCheck(true);
  }
  const why = explainCameraError(e, e?.stage || src.stage);
  const choice = await askPanel(`<h3>Camera not available</h3><p>${esc(why.msg)}</p>
        <p class="dim fine">Technical detail: ${esc(why.name || 'error')} at step “${esc(why.stage || '?')}”: ${esc(why.raw)} · <a href="camera-test.html" style="color:#58a6ff">camera test page</a> (shows exactly what the browser answers)</p>
        <div class="startbar"><div class="btns"><button class="primary" id="c-retry">Try the camera again</button>
        <div class="btns3"><button id="c-ex">Use examiner scoring</button><button id="c-back" class="ghost">Back</button></div></div></div>`,
  { '#c-retry': 'retry', '#c-ex': 'examiner', '#c-back': null });
  hidePanel();
  S.source = null;
  if (choice === 'retry') { try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {} return runCheck(true); }
  return choice;
}

// ---------------------------------------------------------------- A: positioning

/** Live read-out while the face is being positioned: why "Start check" is not available yet. */
function positioningStatus(src, ok) {
  const s = S.settings;
  if (S.demo) return 'Simulated patient — camera not used.';
  if (ok) {
    const dEst = src.lastFeat?.ipdPx ? estimateDistanceCm(src.lastFeat.ipdPx, src.frameW) : NaN;
    const dTxt = Number.isFinite(dEst) ? ` · distance ≈ ${Math.round(dEst)} cm (rough; set ${s.distanceCm})` : '';
    const edge = faceAtEdge(src.lastFeat?.lm) ? ' · <b>the face touches the edge of the camera picture</b>: tilt or move the tablet so the whole face is in view' : '';
    return `<span style="color:#3ddc97">Face tracked</span>${dTxt} · ${src.fps.toFixed(0)} fps${edge}`;
  }
  if (!src.diagnostics) return 'Looking for a face and open eyes…';
  const d = src.diagnostics();
  const L = d.light;
  const lightTxt = L ? (L.centre < 8 && L.edge < 8 ? ' The camera picture is <b>completely black</b>: check that Android’s <b>Camera access</b> switch (Quick Settings) is on and nothing covers the front camera.' : L.centre < 45 ? ' It is <b>too dark</b>: face a light.' : (L.edge - L.centre > 50 ? ' The room behind is much brighter than the face (<b>backlit</b>): turn so the light falls on the face.' : '')) : '';
  if (d.frames === 0) return `Camera is on (${d.cam}) but the tracking model has not produced a frame yet… <small>video ${d.video}</small>`;
  if (d.faces === 0) return `Camera is on, ${d.frames} frames seen, <b>no face found</b>.${lightTxt || ' Hold the phone at arm’s length with the face inside the oval, both eyes visible.'} <small>mode: ${d.mode} · ${d.video}${L ? ` · light ${L.centre}/${L.edge}` : ''}${d.label ? ` · ${esc(d.label)}` : ''}</small>`;
  return `Face seen (${d.faces}/${d.frames} frames) but not steadily: hold still, open both eyes fully.${lightTxt} <small>mode: ${d.mode} · ${d.fps} fps${L ? ` · light ${L.centre}/${L.edge}` : ''}</small>`;
}

/** The face reaches the border of the camera frame (it is then easily lost when the eyes or head move). */
function faceAtEdge(lm) {
  if (!lm) return false;
  let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
  for (const p of lm) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
  return x0 < 0.03 || x1 > 0.97 || y0 < 0.02 || y1 > 0.98;
}

/** At least 80 % of the last 600 ms of frames had a usable face. */
function recentlyTracked(buf) {
  const now = performance.now();
  const w = buf.filter((x) => x.t > now - 600);
  return w.length >= 5 && w.filter((x) => x.ok).length / w.length >= 0.8;
}

const REPORT_AFTER_MS = 10000; // no face for this long: offer the camera report

/** Waits until the face is tracked and the examiner presses "Start check" ('go'), or picks examiner scoring. */
function positionFace(src, buf, prev) {
  prev.classList.toggle('big', !S.demo);
  return askPanel(`<div class="chk-text"><div id="chk-live" class="dim">Looking for a face…</div>
        <div class="tip">Both eyes inside the oval · face the light · <b>mask below the nose</b>. Then follow the dot.</div></div>
        <div class="btns"><button class="primary" id="c-start" disabled>Start check</button><button id="c-ex">Examiner scoring</button><button id="c-report" class="ghost" hidden>Save a camera report</button></div>`,
  { '#c-start': 'go', '#c-ex': 'examiner' },
  {
    bottom: true, compact: true,
    onShow: (card) => {
      const liveEl = $('#chk-live', card), start = $('#c-start', card), report = $('#c-report', card);
      let lastTracked = performance.now();
      report.onclick = () => {
        const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        saveTextFile(`camera-report-${stamp}.txt`, cameraReportText(src, { settings: S.settings, width: innerWidth, height: innerHeight }), 'text/plain');
      };
      const iv = setInterval(() => {
        const ok = recentlyTracked(buf);
        start.disabled = !ok;
        liveEl.innerHTML = positioningStatus(src, ok);
        $('#cam-info').textContent = ok ? 'tracking' : 'no face';
        if (S.demo) start.disabled = false;
        if (ok) lastTracked = performance.now();
        report.hidden = S.demo || performance.now() - lastTracked < REPORT_AFTER_MS;
      }, 200);
      return () => clearInterval(iv);
    },
  });
}

// ---------------------------------------------------------------- B: dots + scoring

/** Shows the 9 calibration and 5 validation dots, records the gaze on each, and scores the check. */
async function runDots(src, buf, prev) {
  const s = S.settings, R = S.renderer, geo = S.geo;
  hidePanel();
  prev.classList.remove('big');
  const { dx, dy } = dotExtent(geo);
  const calDots = gridDots(dx, dy), valD = valDots(dx, dy);
  const total = calDots.length + valD.length;
  const dwell = async (px, py, n) => {
    const q = geo.pointFromDeg(px, -py);
    R.setAnchor({ on: true, x: q.x, y: q.y });
    $('#hint').textContent = `Follow the dot  ${n}/${total}`;
    $('#hud-prog').textContent = `${n}/${total}`;
    src.followDot?.(px, py);
    const t0 = performance.now();
    const frames = await collectDot(buf, t0, {
      now: () => performance.now(), sleep,
      onShort: () => { $('#hint').textContent = recentlyTracked(buf) ? `Follow the dot  ${n}/${total}` : 'Face lost: keep the face in the camera picture'; },
    });
    return { dx: px, dy: py, frames };
  };
  const rawCal = [], rawVal = [];
  if (!S.demo && 'eyeMode' in src) src.eyeMode = s.eye; // a repeated check starts again from both eyes
  let n = 0;
  for (const [px, py] of calDots) rawCal.push(await dwell(px, py, ++n));
  for (const [px, py] of valD) rawVal.push(await dwell(px, py, ++n));
  $('#hint').textContent = ''; $('#hud-prog').textContent = '';
  R.setAnchor({ x: geo.cx, y: geo.cy });

  const cal = scoreCheck({
    rawCal, rawVal, eye: s.eye, distanceCm: s.distanceCm, headComp: s.headComp, allowSingleEye: !S.demo,
    dx, dy, fps: +src.fps.toFixed(1), camMode: src.diagnostics ? src.diagnostics().mode : null,
  });
  if (cal.trackEye !== s.eye) src.eyeMode = cal.trackEye; // track the eye the camera sees clearly better
  return cal;
}

// ---------------------------------------------------------------- C0: follow test

/**
 * The ring shows where the tracker thinks the eyes point; the examiner confirms it follows ('ok') or repeats the check
 * ('redo'). Skipped (resolves 'ok') when horizontal tracking failed, since then there is no map to draw from.
 */
async function followRing(src, cal, live) {
  if (!(cal.okX && cal.M)) return 'ok';
  const R = S.renderer, geo = S.geo;
  const tracker = new GazeTracker(cal.M, { okY: cal.okY });
  live.tracker = tracker;
  R.setGaze(gazeMarker(tracker, geo, () => cal.acc));
  let scan = 0;
  if (S.demo) {
    const tour = [[9, 0], [-9, 0], [0, 4], [0, -4], [0, 0]];
    let i = 0;
    src.followDot?.(...tour[i++ % tour.length]);
    scan = setInterval(() => src.followDot?.(...tour[i++ % tour.length]), 1500);
  }
  const follow = await askPanel(`<p><b style="color:#3ddc97">Look around the screen.</b> The green ring should follow the eyes${cal.okY ? '' : ' left and right'}${S.demo ? ' (simulated eyes)' : ''}. The dashed circle is the measured error (about ±${(cal.acc || 0).toFixed(1)}°).</p>
          ${S.demo ? '' : '<p class="dim fine"><b>Keep the head still and move only the eyes</b> (turning the head is not tracked). Prop the tablet up rather than holding it.</p><p class="dim fine" id="f-live"></p>'}
          <div class="btns"><button class="primary" id="f-ok">It follows</button><button id="f-ctr">Eyes on centre dot: re-centre</button><button id="f-redo">Repeat check</button></div>`,
  { '#f-ok': 'ok', '#f-redo': 'redo' },
  {
    bottom: true, compact: true,
    onShow: (card) => {
      $('#f-ctr', card).onclick = () => {
        R.setAnchor({ on: true, x: geo.cx, y: geo.cy });
        if (tracker.recenter()) toast('Ring re-centred (marker only; scoring is unchanged)');
        else toast('Hold the eyes on the centre dot, then press again');
      };
      const fLive = $('#f-live', card);
      const fIv = fLive ? setInterval(() => {
        const d = src.diagnostics ? src.diagnostics() : {};
        const on = !!tracker.current(performance.now(), 500);
        const slow = src.fps > 0 && src.fps < 8 ? ` · <b>slow on this tablet, so the ring lags</b>` : '';
        fLive.innerHTML = `${on ? 'Ring tracking' : '<b>Ring hidden: eyes not tracked right now</b>'} · ${src.fps.toFixed(0)} fps${slow} · detection: ${esc(d.mode || '?')} · steadiness ±${Number.isFinite(cal.prec) ? cal.prec.toFixed(1) : '?'}°`;
      }, 300) : 0;
      return () => clearInterval(fIv);
    },
  });
  clearInterval(scan);
  R.setGaze(null);
  live.tracker = null;
  hidePanel();
  if (follow === 'ok') cal.markerOff = { x: +tracker.off.x.toFixed(2), y: +tracker.off.y.toFixed(2) };
  return follow;
}

// ---------------------------------------------------------------- C: verdict

/** The result card: { cal } to start screening, 'examiner', 'redo', or null (cancel). */
function verdictCard(cal) {
  const s = S.settings;
  const good = cal.okX;
  const g = cal.grade;
  const pill = !good ? '<span class="pill bad">Tracking poor</span>'
    : g === 'fair' ? '<span class="pill warn">Tracking fair</span>'
    : !cal.okY ? '<span class="pill warn">Left/right only</span>'
    : '<span class="pill ok">Tracking good</span>';
  const accRow = cal.val
    ? `<b>Accuracy</b><span>${cal.acc.toFixed(1)}° mean error · ${esc(g)} <small>(H ${cal.accX.toFixed(1)}° · V ${cal.accY.toFixed(1)}°, worst ${cal.val.worst.toFixed(1)}° on ${cal.val.n} unseen dots)</small></span>
           <b>Steadiness</b><span>±${cal.prec.toFixed(1)}° per frame while holding a dot <small>(before the ring smooths it)</small></span>
           <b>Map</b><span>${esc(MAP_NAMES[cal.M.model] || cal.M.model)}${cal.M.useHead ? ' + head-movement correction' : ''}</span>`
    : `<b>Accuracy</b><span>not measured: ${esc(cal.fitReason || 'fit failed')}</span>`;
  const eyeRow = (cal.agree && !cal.agree.ok
    ? `<b>Eyes</b><span>the two eyes respond differently (${esc(cal.agree.weaker)} eye weaker): possible eye misalignment or a poor view of one eye</span>` : '')
    + (s.eye === 'both' && cal.trackEye && cal.trackEye !== 'both'
      ? `<b>Tracking</b><span>${esc(cal.trackEye)} eye only: the camera sees it clearly better (both eyes still tested)</span>` : '');
  return askPanel(`<h3>Tracking check ${pill}</h3>
        <div class="kv">${accRow}${eyeRow}</div>
        ${cal.reason ? `<p>${esc(cal.reason)}</p>` : ''}
        <details><summary>Details</summary><div class="kv">
        <b>Horizontal</b><span>${cal.okX ? 'reliable' : 'not reliable'} · noise ±${(cal.noiseDegX || 0).toFixed(1)}° · fit R² ${(cal.r2x || 0).toFixed(2)}</span>
        <b>Vertical</b><span>${cal.okY ? 'reliable' : 'not used (hemifield scoring only)'} · noise ±${(cal.noiseDegY || 0).toFixed(1)}°</span>
        <b>Frame rate</b><span>${cal.fps} fps</span>${cal.flipped ? '<b>Camera</b><span>mirrored stream detected, handled automatically</span>' : ''}</div></details>
        ${good ? '<p class="dim fine">Measured on dots the map was not fitted to, so this is the device&rsquo;s real error, not a fit statistic. A screening aid, not a clinical eye tracker.</p>' : '<p>Try better light facing the face, remove reflective glasses, move closer, hold the head still, or use examiner scoring.</p>'}
        <div class="startbar"><div class="btns">${good ? '<button class="primary" id="v-go">Start screening</button>' : '<button class="primary" id="v-ex">Use examiner scoring</button>'}
        <div class="btns3"><button id="v-redo">Repeat check</button>${good ? '<button id="v-ex">Examiner scoring</button>' : ''}<button id="v-back" class="ghost">Cancel</button></div></div></div>`,
  { '#v-go': { cal }, '#v-redo': 'redo', '#v-ex': 'examiner', '#v-back': null });
}
