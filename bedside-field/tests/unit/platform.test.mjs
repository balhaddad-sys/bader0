// platform.js: host detection and the Android bridge wrappers.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: '' }, configurable: true, writable: true });
const P = await import('../../web/js/platform.js');
const ua = (s) => { navigator.userAgent = s; };

test('the Android app is recognised by its user-agent token or by the bridge', () => {
  ua('Mozilla/5.0 (Linux; Android 14) Chrome/131'); delete globalThis.BedsideNative;
  assert.equal(P.isAndroidApp(), false);
  ua('Mozilla/5.0 (Linux; Android 14; wv) Chrome/131 BedsideFieldApp/1.4.1');
  assert.equal(P.isAndroidApp(), true);
  ua('Mozilla/5.0 Chrome/131'); globalThis.BedsideNative = {};
  assert.equal(P.isAndroidApp(), true);
  delete globalThis.BedsideNative;
});

test('in-app browsers are flagged, but never the Bedside Field app itself (also a WebView)', () => {
  ua('Mozilla/5.0 (Linux; Android 14; wv) Instagram 300'); assert.equal(P.isInAppBrowser(), true);
  ua('Mozilla/5.0 (Linux; Android 14; wv) Chrome/131 WhatsApp'); assert.equal(P.isInAppBrowser(), true);
  ua('Mozilla/5.0 (Linux; Android 14; wv) Chrome/131 BedsideFieldApp/1.4.1'); assert.equal(P.isInAppBrowser(), false);
  ua('Mozilla/5.0 (Linux; Android 14) Chrome/131'); assert.equal(P.isInAppBrowser(), false);
});

test('camera policy: deadlines, front-camera check, canvas preview and step read-out only in the app', () => {
  ua('Mozilla/5.0 Chrome/131');
  assert.deepStrictEqual(P.cameraPolicy(), { requestTimeoutMs: 0, modelTimeoutMs: 0, ensureFrontCamera: false, canvasPreview: false, showSteps: false });
  ua('Mozilla/5.0 Chrome/131 BedsideFieldApp/1.4.1');
  assert.deepStrictEqual(P.cameraPolicy(), { requestTimeoutMs: 30000, modelTimeoutMs: 60000, ensureFrontCamera: true, canvasPreview: true, showSteps: true });
});

test('exports and printing go through the bridge in the app', () => {
  const calls = [];
  globalThis.BedsideNative = { saveFile: (...a) => calls.push(['save', ...a]), print: () => calls.push(['print']) };
  P.saveTextFile('a.csv', 'x,y', 'text/csv');
  P.saveTextFile('b.json', { toString: () => '{}' });
  P.printPage();
  assert.deepStrictEqual(calls, [['save', 'a.csv', 'text/csv', 'x,y'], ['save', 'b.json', 'application/json', '{}'], ['print']]);
  delete globalThis.BedsideNative;
});

test('native camera report and front-camera id are safe when the bridge is missing or throws', () => {
  delete globalThis.BedsideNative;
  assert.equal(P.nativeCameraReport(), '');
  assert.equal(P.nativeFrontCameraId(), '');
  globalThis.BedsideNative = { cameraReport: () => { throw new Error('x'); }, frontCameraId: () => { throw new Error('y'); } };
  assert.equal(P.nativeCameraReport(), '');
  assert.equal(P.nativeFrontCameraId(), '');
  globalThis.BedsideNative = { cameraReport: () => 'App check: ok', frontCameraId: () => '1' };
  assert.equal(P.nativeCameraReport(), 'App check: ok');
  assert.equal(P.nativeFrontCameraId(), '1');
  delete globalThis.BedsideNative;
});

test('offline readiness and service worker use', () => {
  ua('Mozilla/5.0 Chrome/131'); navigator.serviceWorker = { controller: null };
  assert.equal(P.isOfflineReady(), false);
  assert.equal(P.usesServiceWorker(), true);
  navigator.serviceWorker.controller = {};
  assert.equal(P.isOfflineReady(), true);
  ua('Mozilla/5.0 Chrome/131 BedsideFieldApp/1.4.1'); navigator.serviceWorker.controller = null;
  assert.equal(P.isOfflineReady(), true, 'the app carries every file');
  assert.equal(P.usesServiceWorker(), false);
  delete navigator.serviceWorker;
});
