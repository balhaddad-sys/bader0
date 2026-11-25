// A screening session from start to results: guide -> stage -> tracking check (camera) -> trial blocks -> save.

import { $, show, toast, askPanel, hidePanel } from '../ui/dom.js';
import { S, persist } from './state.js';
import { enterStage, leaveStage, makeUI, hudTracking, gazeMarker } from './stage.js';
import { uid, sleep, mulberry32 } from '../core/util.js';
import { estimatePxPerMm } from '../core/geometry.js';
import { VirtualPatient, SimGazeSource, DEMO_PROFILES } from '../core/sim.js';
import { VERSION, saveSession } from '../core/store.js';
import { TestRunner } from '../core/engine.js';
import { summarize, dssEligible } from '../core/analysis.js';
import { GazeTracker } from '../core/mapper.js';
import { sessionCalSummary } from '../core/calibration.js';
import { cameraApiAvailable } from '../platform.js';
import { renderHome, goHome } from '../screens/home.js';
import { renderGuide } from '../screens/guide.js';
import { runCheck } from '../screens/check.js';
import { showResults } from '../screens/results.js';

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

export async function beginFlow(demoKey, ctx = null) {
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
  if (S.settings.method === 'camera' && !S.demo && !cameraApiAvailable()) {
    toast('Camera needs HTTPS or localhost. Switching to examiner scoring.', 4200);
    S.settings.method = 'examiner'; persist(); renderHome();
  }
  renderGuide();
  show('s-guide');
}

/** The camera is not used (tracking too coarse, or examiner scoring chosen): say so before the first target. */
async function examinerNotice() {
  await askPanel(`<h3>You score this test</h3>
          <p>The camera is <b>not</b> used now (its tracking was not accurate enough on this device, or you chose examiner scoring).</p>
          <p>After each target appears, watch the patient’s eyes and tap <b>Seen</b> if they looked toward it, or <b>Missed</b> if not.</p>
          <div class="btns"><button class="primary" id="x-ok">Start examiner scoring</button></div>`, { '#x-ok': true });
  hidePanel();
}

export async function startTests() {
  await enterStage();
  const s = S.settings;
  let method = s.method;
  let cal = null;

  if (method === 'camera') {
    const r = await runCheck();
    if (r === null) { await leaveStage(); return goHome(); }
    if (r === 'examiner') { method = 'examiner'; await examinerNotice(); }
    else cal = r.cal;
  }

  const session = S.ctx?.session || newSession();
  session.method = method;
  S.session = session;
  session.geo = S.geo.summary(s.stimDeg);
  session.cal = cal ? sessionCalSummary(cal) : session.cal;

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

export function runDssNow(session) {
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
