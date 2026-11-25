// About & limits.

import { $ } from '../ui/dom.js';

export function renderAbout() {
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
