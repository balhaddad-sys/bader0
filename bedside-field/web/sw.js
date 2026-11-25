// Offline-first service worker. App shell and the vendored MediaPipe runtime/model are
// precached at install so the camera mode works with no network at the bedside.
const VERSION = '1.4.3';
const SHELL_CACHE = `bf-shell-${VERSION}`;
const VENDOR_CACHE = 'bf-vendor-1';   // big and rarely changes: kept across app updates

const SHELL = [
  './', 'index.html', 'camera-test.html', 'styles.css', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'js/app/flow.js', 'js/app/stage.js', 'js/app/state.js', 'js/camera/diagnostics.js', 'js/camera/errors.js', 'js/camera/features.js',
  'js/camera/overlay.js', 'js/camera/source.js', 'js/core/analysis.js', 'js/core/calibration.js',
  'js/core/detect.js', 'js/core/engine.js', 'js/core/geometry.js', 'js/core/mapper.js', 'js/core/report.js',
  'js/core/sim.js', 'js/core/store.js', 'js/core/util.js', 'js/main.js', 'js/platform.js', 'js/screens/about.js',
  'js/screens/calibrate.js', 'js/screens/check.js', 'js/screens/guide.js', 'js/screens/history.js',
  'js/screens/home.js', 'js/screens/results.js', 'js/screens/settings.js', 'js/ui/dom.js', 'js/ui/stimulus.js',
];
const V = 'vendor/mediapipe/face_mesh/';
const VENDOR = [
  'face_mesh.js', 'face_mesh.binarypb',
  'face_mesh_solution_packed_assets.data', 'face_mesh_solution_packed_assets_loader.js',
  'face_mesh_solution_simd_wasm_bin.js', 'face_mesh_solution_simd_wasm_bin.wasm', 'face_mesh_solution_simd_wasm_bin.data',
  'face_mesh_solution_wasm_bin.js', 'face_mesh_solution_wasm_bin.wasm',
].map((f) => V + f);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(SHELL);
    const vendor = await caches.open(VENDOR_CACHE);
    await Promise.all(VENDOR.map(async (u) => { if (!(await vendor.match(u))) { try { await vendor.add(u); } catch (e) { /* retried lazily on first use */ } } }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== SHELL_CACHE && k !== VENDOR_CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  event.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) {
        const cache = await caches.open(url.pathname.includes('/vendor/') ? VENDOR_CACHE : SHELL_CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      if (req.mode === 'navigate') return (await caches.match('index.html')) || (await caches.match('./'));
      throw e;
    }
  })());
});
