// Shared app state for the current visit (not persisted except S.settings, via persist()).

import { loadSettings, saveSettings } from '../core/store.js';

export const S = {
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
  gazeMarker: null,
  cameraFallback: false,
};
window.__bf = S; // handy for debugging / automated tests

export const persist = () => saveSettings(S.settings);

