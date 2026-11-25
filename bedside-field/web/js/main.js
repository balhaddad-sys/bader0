// Entry point: wires the screens, renders home, and (browser only) registers the offline service worker.
//
//   platform.js   where the app runs (browser PWA or the Android app) and what it may use there
//   core/         pure logic, no DOM: geometry, eye-gaze maths, detection, analysis, report, trial engine, storage
//   camera/       front camera + MediaPipe face mesh -> gaze samples; error messages; preview overlay
//   ui/           DOM helpers, toast and panels, the stimulus renderer
//   app/          shared state, the test stage, and the session flow
//   screens/      one module per screen

import { S } from './app/state.js';
import { cameraApiAvailable, usesServiceWorker } from './platform.js';
import { renderHome, wireHome } from './screens/home.js';
import { goCal, wireCal } from './screens/calibrate.js';
import { wireGuide } from './screens/guide.js';
import { wireResults } from './screens/results.js';

function boot() {
  // No camera here (no HTTPS, or a sandboxed view): open on examiner scoring instead of a mode that cannot start.
  if (S.settings.method === 'camera' && !cameraApiAvailable()) { S.settings.method = 'examiner'; S.cameraFallback = true; }
  wireHome(); wireCal(); wireGuide(); wireResults();
  renderHome();
  if (usesServiceWorker()) {
    navigator.serviceWorker.register('sw.js').then(() => {
      navigator.serviceWorker.ready.then(() => renderHome());
    }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => { renderHome(); });
  }
  const f = new URLSearchParams(location.search);
  if (f.get('screen') === 'cal') goCal();
}
boot();
