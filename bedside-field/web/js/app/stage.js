// The test stage (full-screen canvas used by the tracking check and the test): entering and leaving it, the
// examiner button bar, the hold-to-pause corner and pause menu, the tracking dot, and the gaze-ring marker.

import { $, el, show, toast, showPanel, hidePanel } from '../ui/dom.js';
import { Renderer } from '../ui/stimulus.js';
import { S, persist } from './state.js';
import { Geometry } from '../core/geometry.js';
import { clamp, sleep, escapeHtml as esc } from '../core/util.js';
import { isInstalledPwa } from '../platform.js';

function ensureRenderer() {
  if (!S.renderer) {
    S.renderer = new Renderer($('#stage'));
    wireStage();
  }
  S.renderer.configure({ style: S.settings.stimulus, flickerHz: S.settings.flickerHz });
  S.renderer.resize(innerWidth, innerHeight);
  S.renderer.start();
}

export async function enterStage() {
  const root = document.documentElement;
  show('s-test');
  // The browser's Fullscreen API is opt-in: on some Android browsers entering it drops the camera, and an installed
  // app is already full-screen. The stage size is also kept the same between the tracking check and the test.
  if (S.settings.fullscreen && !isInstalledPwa()) { try { await (root.requestFullscreen?.({ navigationUI: 'hide' }) ?? root.webkitRequestFullscreen?.()); } catch {} }
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

export async function leaveStage() {
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

export function setButtons(kind) {
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

export function openPause(msg = '') {
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

export function hudTracking(ok) {
  const d = $('#hud-dot');
  d.className = 'dot ' + (ok ? 'ok' : 'lost');
}

// The green ring: where the tracker thinks the eyes point. The 2D map (fitted at the tracking check) turns the
// iris features into degrees, a One-Euro filter steadies it at rest without lagging a saccade, and the dashed
// circle around it is the device's *measured* error radius, so the ring is never drawn more precisely than it is.
export function gazeMarker(tracker, geo, getUncDeg) {
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

export function makeUI() {
  return {
    progress: (d, t) => { $('#hud-prog').textContent = `${d}/${t}`; },
    hint: (txt) => { $('#hint').textContent = txt || ''; },
    buttons: setButtons,
  };
}
