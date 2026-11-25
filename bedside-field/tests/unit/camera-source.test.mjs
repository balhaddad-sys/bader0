// camera/source.js state machine (no camera needed): detection-mode probing, GPU -> CPU fallback, request deadlines.
import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.window = globalThis;
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Mozilla/5.0 Chrome/131' }, configurable: true, writable: true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillStyle: '', fillRect() {}, drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(32 * 24 * 4) }) }) }) };

const { CameraGazeSource, STRATEGIES } = await import('../../web/js/camera/source.js');
const { cameraPolicy } = await import('../../web/js/platform.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A synthetic face in TRUE frame coordinates: all 478 points inside a box, eye landmarks placed sensibly.
function face(cx = 0.5, cy = 0.5, w = 0.3) {
  const lm = Array.from({ length: 478 }, (_, i) => ({ x: cx - w / 2 + w * ((i * 37) % 100) / 100, y: cy - w / 2 + w * ((i * 53) % 100) / 100, z: 0 }));
  const set = (i, x, y) => { lm[i] = { x: cx + x * w, y: cy + y * w, z: 0 }; };
  set(33, -0.35, -0.1); set(133, -0.12, -0.1); set(159, -0.235, -0.14); set(145, -0.235, -0.06); set(468, -0.235, -0.1);
  set(362, 0.12, -0.1); set(263, 0.35, -0.1); set(386, 0.235, -0.14); set(374, 0.235, -0.06); set(473, 0.235, -0.1);
  return lm;
}
const toPadded = (lm, s) => lm.map((p) => ({ x: (1 - s) / 2 + s * p.x, y: (1 - s) / 2 + s * p.y, z: p.z }));

function makeSrc(strat, policy = cameraPolicy()) {
  const src = new CameraGazeSource({ strategy: strat, policy });
  src.optionsSent = [];
  src.fm = { setOptions: (o) => src.optionsSent.push(o), send: async () => {} };
  src.video = { readyState: 2, videoWidth: 640, videoHeight: 480 };
  src.frameW = 640; src.frameH = 480; src.running = true; src._next = () => {};
  src.stratSince = src.lastFaceT = performance.now();
  return src;
}
const result = (src, lm, scale) => { src.sentScale = scale; src.lastSendT = performance.now(); src._onResults({ multiFaceLandmarks: lm ? [lm] : [] }); };

test('face found in a zoom-out mode that fits the full frame: full size is tried, and reverted if it loses the face', async () => {
  store.clear();
  const src = makeSrc(3);
  result(src, toPadded(face(), 0.4), 0.4);
  assert.equal(src.strat, 0);
  assert.equal(src.probe.from, 3);
  await sleep(1600);
  result(src, null, 1);
  await src._tick();
  assert.equal(src.strat, 3, 'back to the mode that worked');
  assert.ok(src.noProbeUntil > performance.now() + 25000, 'no new probe for 30 s');
  result(src, toPadded(face(), 0.4), 0.4);
  assert.equal(src.strat, 3, 'no flip-flop');
});

test('full size finds the face: it stays at full size', async () => {
  const src = makeSrc(2);
  result(src, toPadded(face(), 0.6), 0.6);
  assert.equal(src.strat, 0);
  await sleep(5);
  result(src, face(), 1);
  assert.equal(src.probe.ok, true);
  await sleep(1600);
  result(src, face(), 1);
  await src._tick();
  assert.equal(src.strat, 0);
  assert.equal(src.probe, null);
});

test('a face filling the frame keeps the zoom-out mode; a zoomed face touching the margin is not trusted', () => {
  const src = makeSrc(2);
  result(src, toPadded(face(0.5, 0.5, 0.95), 0.6), 0.6);
  assert.equal(src.strat, 2);
  assert.equal(src.probe, null);
  const edge = makeSrc(3); let last = null; edge.onSample = (s) => { last = s; };
  const lm = toPadded(face(), 0.4); lm[33] = { x: 0.01, y: 0.5, z: 0 };   // eye corner in the grey margin
  result(edge, lm, 0.4);
  assert.equal(last.ok, false);
});

test('eye features are identical whichever mode produced them', () => {
  const src = makeSrc(3); const got = [];
  src.onSample = (s) => got.push(s);
  result(src, toPadded(face(), 0.4), 0.4);
  src.lastSendT += 1; result(src, face(), 1);
  assert.equal(got.length, 2);
  assert.ok(got.every((g) => g.ok));
  assert.ok(Math.abs(got[0].x - got[1].x) < 1e-9);
});

test('GPU finds no face in two modes: the model moves to the CPU, and that is remembered', () => {
  store.clear();
  const src = makeSrc(0);
  // Synthetic clock well ahead of performance.now(), which _setStrategy() also reads.
  const t0 = performance.now() + 1e6;
  src.stratSince = src.lastFaceT = t0;
  src._stepDetectionMode(t0 + 2500);
  assert.deepStrictEqual([src.strat, src.cpu], [1, false], 'first: the next GPU mode');
  src._stepDetectionMode(t0 + 5000);
  assert.deepStrictEqual([src.strat, src.cpu], [0, true], 'then: the CPU, from the first mode');
  assert.equal(src.optionsSent.at(-1).useCpuInference, true);
  assert.equal(src.diagnostics ? STRATEGIES[src.strat].name : '', 'normal');
  assert.equal(store.get('bf.cpuInference'), undefined, 'not remembered until the CPU actually finds a face');
  result(src, face(), 1);
  assert.equal(store.get('bf.cpuInference'), '1');
  assert.equal(new CameraGazeSource({}).cpu, true, 'next session starts on the CPU');
});

test('once the GPU has found a face, losing it later never moves the model to the CPU', () => {
  store.clear();
  const src = makeSrc(0);
  result(src, face(), 1);
  const t0 = performance.now() + 1e6;
  src.stratSince = src.lastFaceT = t0;
  src._stepDetectionMode(t0 + 2500); src._stepDetectionMode(t0 + 5000); src._stepDetectionMode(t0 + 7500);
  assert.equal(src.cpu, false);
  assert.equal(src.strat, 3);
});

test('Android app policy: a camera request that never answers fails with TimeoutError, and a late stream is closed', async () => {
  let resolveLate;
  navigator.mediaDevices = { getUserMedia: () => new Promise((r) => { resolveLate = r; }) };
  const src = makeSrc(0, { ...cameraPolicy(), requestTimeoutMs: 40 });
  await assert.rejects(src._getUserMedia({ video: true }), (e) => e.name === 'TimeoutError' && /did not answer within 0 s/.test(e.message));
  let stopped = false;
  resolveLate({ getTracks: () => [{ stop: () => { stopped = true; } }] });
  await sleep(5);
  assert.equal(stopped, true);
  const browser = makeSrc(0, { ...cameraPolicy(), requestTimeoutMs: 0 });
  const p = browser._getUserMedia({ video: true });
  assert.equal(await Promise.race([p.then(() => 'answered'), sleep(60).then(() => 'still waiting')]), 'still waiting', 'browsers keep waiting for the prompt');
  delete navigator.mediaDevices;
});

test('start() without a camera API fails at the permission step with the message the error panel explains', async () => {
  const src = new CameraGazeSource({});
  await assert.rejects(src.start({}), (e) => e.stage === 'permission' && /Camera API unavailable/.test(e.message));
});

test('Android app: the model gets a canvas copy of each full-size frame; browsers send the video itself', () => {
  const drawn = [];
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillStyle: '', fillRect: (...a) => drawn.push(['fill', ...a]), drawImage: (img, ...a) => drawn.push(['draw', ...a]) }) }) };
  const app = makeSrc(0, { ...cameraPolicy(), canvasFrames: true });
  const img = app._frameImage(1);
  assert.notStrictEqual(img, app.video);
  assert.deepStrictEqual(drawn, [['draw', 0, 0, 640, 480]], 'whole frame, no grey margin');
  assert.deepStrictEqual([img.width, img.height], [640, 480]);
  drawn.length = 0;
  app._frameImage(0.4);
  assert.deepStrictEqual(drawn, [['fill', 0, 0, 640, 480], ['draw', 192, 144, 256, 192]], 'zoom-out modes unchanged');
  const browser = makeSrc(0, { ...cameraPolicy(), canvasFrames: false });
  assert.strictEqual(browser._frameImage(1), browser.video);
});
