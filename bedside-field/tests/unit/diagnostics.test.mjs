// camera/diagnostics.js: the camera report the examiner can save when no face is found.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Mozilla/5.0 (Linux; Android 14; wv) Chrome/131 BedsideFieldApp/1.4.2' }, configurable: true, writable: true });
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { cameraReportText } = await import('../../web/js/camera/diagnostics.js');

test('the report lists device and camera facts', () => {
  const src = { diagnostics: () => ({ stage: 'ready', cam: '640×480 @ 30 fps live', label: 'camera2 1, facing front', video: '640×480 ready 4', frames: 120, faces: 0, fps: 14.2, mode: 'normal · CPU', light: { centre: 96, edge: 80 } }) };
  const txt = cameraReportText(src, { settings: { distanceCm: 20, eye: 'both', label: 'Bed 14' }, width: 915, height: 412, now: new Date('2026-11-25T10:00:00Z') });
  assert.match(txt, /^Bedside Field camera report\n/);
  for (const part of ['time: 2026-11-25T10:00:00.000Z', '(Android app)', 'BedsideFieldApp/1.4.2', '915×412 CSS px', '20 cm', 'camera2 1, facing front',
    'frames processed: 120 · faces found: 0 · 14.2 fps', 'detection mode: normal · CPU', 'light (centre/edge, 0-255): 96/80', '"canvasFrames":true']) assert.ok(txt.includes(part), part);
});

test('the report never contains the patient label', () => {
  const txt = cameraReportText({ diagnostics: () => ({}) }, { settings: { distanceCm: 30, eye: 'right', label: 'Bed 14 / MRN 5521' }, width: 1280, height: 800 });
  assert.ok(!/Bed 14|MRN|5521/.test(txt));
  assert.match(txt, /frames processed: - · faces found: - · - fps/);
});
