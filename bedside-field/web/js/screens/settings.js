// Settings: stimulus, timing and tracking options, restore defaults, delete everything.

import { $, el, show, toast } from '../ui/dom.js';
import { S, persist } from '../app/state.js';
import { DEFAULTS, loadSettings, clearAll } from '../core/store.js';
import { clamp } from '../core/util.js';

export function goSettings() {
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
