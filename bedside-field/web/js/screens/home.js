// Home screen: patient label, response method, eye(s), status chips, and the links to the other screens.

import { $, $$, el, show } from '../ui/dom.js';
import { S, persist } from '../app/state.js';
import { VERSION } from '../core/store.js';
import { DEMO_PROFILES } from '../core/sim.js';
import { cameraApiAvailable, isInAppBrowser, isOfflineReady } from '../platform.js';
import { beginFlow } from '../app/flow.js';
import { goCal } from './calibrate.js';
import { goHistory } from './history.js';
import { goSettings } from './settings.js';
import { renderAbout } from './about.js';

export function renderHome() {
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
  const camOk = cameraApiAvailable();
  const inApp = isInAppBrowser();
  $('#cam-note').hidden = !((!camOk && s.method === 'camera') || inApp);
  if (inApp) $('#cam-note').textContent = 'This page looks like it was opened inside another app. In-app browsers often block the camera: open the link in Safari or Chrome instead.';
  const cam = $('#chip-cam');
  cam.textContent = camOk ? 'Camera available' : 'Camera unavailable';
  cam.className = 'chip ' + (camOk ? 'ok' : 'warn');
  const off = $('#chip-off');
  const controlled = isOfflineReady(); // the Android app carries every file inside the APK
  off.textContent = controlled ? 'Offline ready' : 'Not cached yet';
  off.className = 'chip ' + (controlled ? 'ok' : 'warn');
}

export function wireHome() {
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

export function goHome() { renderHome(); show('s-home'); }
