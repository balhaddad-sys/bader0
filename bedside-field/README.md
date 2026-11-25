# Bedside Field

Offline-first PWA for **qualitative bedside visual-field screening in patients who cannot follow verbal instructions** (aphasia, neglect, encephalopathy). It never asks the patient to "say when you see it". Instead it uses reflexive eye movements, a wordless touch task, or the examiner's own observation.

> **Not a medical device.** It documents and screens. It is not Humphrey-equivalent, it has not been clinically validated, and it must not be used to diagnose or exclude a field defect. Confirm anything that matters with confrontation testing and formal perimetry.

---

## 1. Run it

The camera (`getUserMedia`) and service workers only work in a **secure context**: `https://…` or `http://localhost`. Opening `index.html` from disk, or `http://192.168.x.x` from a tablet, will not give you the camera.

**On a computer, to try it:**

```bash
cd bedside-field/web
python3 -m http.server 8765        # or: npx serve .
# open http://localhost:8765
```

**On the tablet (the real use):** host the folder anywhere that serves HTTPS. GitHub Pages, Netlify, Cloudflare Pages and Vercel are all fine; it is plain static files with no build step.

1. Open the HTTPS URL once on the tablet, on Wi-Fi. The service worker precaches the app shell and the eye-tracking model (about 17 MB in total).
2. Allow the camera when asked.
3. Add to Home Screen (iPad: Share → Add to Home Screen; Android/Chrome: ⋮ → Install app). It then opens full screen and works with no network.
4. When you ship an edit, bump `VERSION` in `web/sw.js` (and `web/js/core/store.js`) so installed copies pick up the new files.

### Camera troubleshooting

The camera works only on a page served over **HTTPS** (or `http://localhost` on the same device), opened in a **normal browser** (Safari or Chrome), not inside another app's built-in browser and not in Claude's preview. Deploy the *folder* (so that `index.html` sits at the top of the site), for example by dragging it onto Netlify Drop; a `_headers` file is included for Netlify. Camera permission: if the camera is refused, open `camera-test.html` on the same site (a stand-alone page with none of the app's code): it asks the browser directly and reports the exact answer (blocked, prompt dismissed, blocked by Android, camera busy…) with the fix. Full-screen: the app no longer forces the browser's full-screen mode (some Android browsers drop the camera in it); to get a full-screen view, use the browser menu → *Add to Home screen* and open it from there (Settings has an opt-in *Full-screen browser mode*). On the tracking-check screen the app now says what it sees: whether the camera is on, how many frames the model processed, whether a face was found, and, if the camera cannot start, the plain-language reason (permission refused, camera busy, no camera, model files missing) with a *Try the camera again* button. Check the version line at the bottom of the home screen (v1.3.1 or later) to be sure you are not looking at an older cached copy.

## 2. First-run checklist

1. **Calibrate the screen** (Home → *Calibrate*; recommended, but not required to start). Either hold a bank card against the screen and match its width, or enter the screen diagonal. This gives pixels per mm, which is what turns "3° at 30 cm" into a real size on your glass. If you skip it, *Start screening* estimates pixels per mm from the screen size (good to roughly ±10 %), says so in a message, and marks the report "estimate".
2. **Set the distance** (default 30 cm). The guide screen shows how to position the tablet: landscape, eyes level with the screen centre, face centred.
3. Choose how the patient will respond, then the eye(s) to test. For monocular testing, the app shows a picture prompt to cover the other eye.
4. For camera mode, run the **tracking check** (about 20 s). A dot visits **9 calibration positions** (a 3×3 grid) and the app fits the relationship between iris position and gaze angle for this tablet, this face and this lighting. It then shows **5 more dots the fit has never seen** and measures how far the predicted gaze is from each: that out-of-sample error is the **accuracy** reported on the verdict card and in the report (grades: excellent ≤ 1°, good ≤ 2°, fair ≤ 3.5°, otherwise limited). Horizontal tracking is switched off if its measured error exceeds 4° and vertical if it exceeds 3.5°; if vertical fails only left/right is scored.

4. **Check that it follows the eyes.** After the dot sequence a slim bar appears and a **green ring** shows where the tracker thinks the eyes are pointing. Ask the person to look around the screen: the ring should track them left, right, up and down (left and right only if vertical tracking failed). If it lags, jumps or sticks, tap *Repeat check* before starting. The dashed circle around the ring is the error radius measured for this device, so the ring is never drawn more precisely than it really is. If the person is plainly looking at the centre dot but the ring sits off to one side, tap *re-centre*: that shifts the ring only and never changes how trials are scored.

**How the gaze estimate works.** Each eye gives an iris offset from its eye corners, divided by eye width (so it does not depend on how far the face is from the camera). The map from those two numbers to gaze degrees is a small model fitted on the 9 grid dots: per-axis, a 2×2 matrix (removes horizontal↔vertical cross-talk caused by camera angle and eyelid position) or a curved model, whichever predicts held-out dots best (leave-one-dot-out cross-validation; a bigger model must win by a clear margin, so noise alone does not buy extra terms). The model is fitted *forward* (features from degrees) and then inverted, which avoids the under-estimation that regressing degrees on noisy features causes. A **head-movement correction** uses the eye-corner midpoints, which move with the head but not with the eyes, to subtract the part of the iris shift that comes from the head sliding sideways or up/down (`atan(Δhead / distance)`); cross-validation can switch it off if the data say it hurts. A One-Euro filter steadies the ring at rest without lagging a saccade.

Press and hold the **top-left corner** (the faint glow) for just under a second at any time to pause. The menu offers *Resume*, *Show/Hide gaze marker* (camera mode), *Finish now & view results* and *Discard & exit*. The gaze ring is off during the test by default because patients tend to chase it; turn it on under Settings → *Gaze marker during the test* when you want to watch the tracking live.

## 3. The three response modes

### Eye movement, camera (saccadic perimetry)
A pulsing amber anchor sits at the centre. The front camera tracks the iris (MediaPipe Face Mesh with iris refinement). Only when the eye has been steady near the anchor for 600 ms does a target appear in one quadrant of the field. A person who sees it makes a reflexive saccade toward it, usually 150–400 ms later. The app looks for a gaze shift toward that quadrant.

Why it is built this way:
- **Baseline-relative detection.** Webcam gaze has no trustworthy absolute origin, because camera offset and anatomy shift it. So the app measures the change from the eye position just before the target, not where the eye "is" in absolute terms.
- **Per-device gain.** The tracking check fits `feature = a + k·degrees`. The sign and size of `k` come from the data, which also makes a mirrored camera stream work automatically.
- **Invalid is not missed.** Blinks, lost tracking and drifting fixation make a trial *invalid*. It is re-queued and never counted as a miss, so poor tracking cannot masquerade as a field defect.
- **Catch trials** (nothing shown) estimate how often the detector or the patient moves anyway. A high false-alarm rate lowers the reliability grade.
- **Delayed** means the first response was later than 900 ms or was not the first shift. It is reported separately from seen and missed.

### Eye movement, examiner scores
For when the camera cannot track (ptosis, glare, glasses, a patient who will not stay in frame). The app shows targets in randomized order. You watch the patient's eyes over the tablet edge and tap **Seen** or **Missed** on the button bar. Reaction time is logged from target onset to your tap, so treat it as examiner-limited.

### Touch the target ("pop the bubble")
A wordless demo shows a finger tapping a glowing circle for 3 seconds, then two practice trials. After each tap a shrinking ring draws the eyes back to the centre. Hit boxes are large: radius = max(1.8 × stimulus radius, 64 px). It needs a usable hand and sustained attention, so it is a poor fit for hemiparesis of the dominant hand, apraxia or severe neglect. Use camera or examiner mode there.

### Double simultaneous stimulation (extinction)
Offered only after the individual quadrants have been cleared, because extinction can only be read when each side is seen on its own. The unilateral and bilateral trials are interleaved. Consistent loss of one side on bilateral trials, with that side intact alone, is reported as extinction toward that side.

## 4. Geometry and stimuli

- Viewing distance about 25–30 cm. The testable field depends on screen size and distance; the calibration screen prints it (about ±24° horizontal and ±17° vertical on a 12.9" tablet at 30 cm).
- Targets are **3°** discs (flicker about 10–15 Hz with slight looming) or a counter-phasing Gabor patch (Settings → Target style). The anchor is a 1.8° pulsing circle, or a 3° smiley face if you want something more engaging for a confused patient. Settings also lets you change the repeats per location (2–5) and set a gap before the target: 0 ms keeps the anchor on (overlap), and about 200 ms gives the gap paradigm, which tends to speed up reflexive saccades.
- Eight locations: an inner ring (0.4 of the available extent) and an outer ring (0.75) in each quadrant, equally often, with no immediate repeat of a quadrant.
- Angles are in the **patient's field**: right is positive, up is positive.

## 5. Reading the results

The results screen shows a four-quadrant map, per-quadrant seen / delayed / missed counts and latency, and a pattern line.

- **Pattern** recognises right or left homonymous hemianopia, quadrantanopias (superior/inferior), altitudinal defects, a diagonal pattern, extensive loss, a peripheral pattern (outer target missed, inner seen), or no clear defect. Anatomical hints are deliberately soft ("fits a left parietal or cuneus lesion"), not localisation.
- A quadrant needs at least 3 valid trials to be classed: ≥ 75 % seen is intact, ≤ 25 % is defective, and anything between is *equivocal*. Equivocal is never promoted to a defect.
- **Macular sparing** is flagged when the inner target was seen and the outer missed in a defective quadrant. Only two eccentricities are sampled, so this is indicative.
- **Flags**: slower responses toward one side (a Welch-style comparison that needs enough trials and a real gap), and a tonic gaze deviation at rest, which matters because a gaze-deviated patient may not be looking at the anchor at all.
- **Reliability** (good / fair / poor) is built from the fraction of invalid trials, catch-trial false alarms and tracking quality. Read the pattern in that light.

Export as **CSV** (one row per trial) or **JSON**, or print the report. Sessions are kept in this browser's local storage only.

## 6. Known limits (read these)

- **Webcam gaze is coarse.** Expect roughly 1–3° of error in good conditions, more in poor light, with glasses glare, with ptosis or with a large head turn; vertical is weaker than horizontal and can fail, so upper/lower calls are less certain than left/right. Your device's real number is the **accuracy** shown after the tracking check; trust that, not this paragraph. It is measured at the start of the session only and does not update if the patient shifts afterwards.
- **Head rotation is not corrected.** Head translation (sliding sideways or up/down) is; turning or tilting the head (yaw, pitch, roll) is not, and shifts the estimate. Steady the head or support it.
- **The two eyes are averaged.** If they respond differently (misalignment, one eye poorly seen) the verdict card says so; choose *Eye(s) tested → right or left* on the home screen to track a single eye (cover the other).
- **Latency is approximate.** A 30 fps camera has about 33 ms frame steps, and the app adds a 2-frame sustain and a 70 ms floor. Do not interpret absolute reaction times as FEF latency measurements; the relative left-versus-right comparison is the more meaningful use.
- **Chance level in a quadrant task is 25 %.** Catch trials and the reliability grade are there to expose guessing and noisy tracking, but they do not remove the problem.
- **A 3° target is large** compared with the Goldmann III/V stimuli used in formal perimetry, so mild or relative defects will be missed.
- **Tonic gaze deviation and FEF lesions** can produce a saccade pattern that looks like a field defect. The app flags a resting deviation, but you must interpret it clinically.
- It tests with both eyes open unless you choose monocular, and it has no blind-spot mapping.
- Validated only against a simulated patient and synthetic and still-image camera input. It has **not** been tested on real patients, real faces moving in front of a real camera, or a real tablet. Accuracy figures from the demo/simulator are circular (the simulator is built from the same model), so ignore them; the number from a real tracking check on your device is the one that means something.

## 7. Privacy

Nothing leaves the device. There is no analytics, no server and no account. The camera frames are processed in the browser and never stored. Patient labels are free text, so use a bed number or the last digits of an MRN rather than a name.

## 8. Demo mode

*Try with a simulated patient* on the home screen runs the whole flow with a **virtual patient** (right or left hemianopia, right superior quadrantanopia, left neglect, or normal) driving the camera, examiner and touch channels. Results are watermarked **SIMULATED DEMO PATIENT — not real data** and are saved to history with that label. Use it to learn the screens and to see what each pattern looks like before using it on a ward.

## 9. Project layout

```
web/                    the app: plain static files, deploy this folder as-is (no build step)
  index.html, styles.css, manifest.webmanifest, sw.js, camera-test.html, NOTICE
  js/main.js            entry point: wires the screens, registers the service worker (browser only)
  js/platform.js        browser PWA vs Android app: environment checks, camera policy, the BedsideNative bridge
  js/core/              pure logic, no DOM (unit-tested)
    geometry.js           pixels ⇄ degrees, target locations
    detect.js             detection maths: calibration fit, fixation gate, saccade scoring
    mapper.js             2D iris→gaze map: fit, model selection, head correction, validation, smoothing
    calibration.js        tracking-check dots and scoring (which eye to track, accuracy gates)
    engine.js             trial scheduling and the camera / examiner / touch trial flows
    analysis.js           quadrant classes, patterns, DSS, flags, reliability
    report.js             field map SVG, report HTML, CSV
    store.js              localStorage settings and sessions
    sim.js                virtual patient for the demo and tests
    util.js               maths, randomness, formatting
  js/camera/            front camera + MediaPipe → gaze samples
    source.js             camera start-up, detection modes, GPU→CPU fallback, frame loop
    features.js           iris features from face landmarks
    errors.js             plain-language camera error messages
    overlay.js            eye outlines on the preview
  js/ui/                DOM helpers, toast and panels (dom.js), stimulus canvas renderer (stimulus.js)
  js/app/               shared state, the test stage (pause, buttons, gaze ring), the session flow
  js/screens/           one module per screen: home, calibrate, guide, check, results, history, settings, about
  vendor/               MediaPipe Face Mesh (Apache-2.0), see NOTICE
android/                Android app: a WebView wrapper around web/ (see android/README.md)
tests/
  unit/                 node --test: pure modules, calibration scoring, camera state machine, platform, golden lock
  golden/               behaviour lock: snapshot of every pure module's outputs on fixed inputs
  e2e/                  Playwright: drives the real screens the way the Android app serves them
  fixtures/             recorded sessions and a face frame for the fake camera
```

Plain ES modules, no build step, no runtime dependencies. From this folder:

```bash
npm test                 # unit + golden tests (Node 18+)
npm run test:e2e         # end-to-end, needs Playwright with Chromium (about 4 minutes)
npm run serve            # http://localhost:8765
npm run apk              # Android APK (see android/README.md)
```

When you ship an edit, bump `VERSION` in `web/sw.js` and `web/js/core/store.js` so installed copies pick up the new
files, and add any new JS file to the `SHELL` list in `web/sw.js` so it works offline.
