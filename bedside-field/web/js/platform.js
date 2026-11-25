// Where the app is running and what it may use there. Two hosts are supported:
//   - a browser (PWA, served over HTTPS), and
//   - the Android app: a WebView that serves these files from the APK, adds "BedsideFieldApp" to the user agent and
//     exposes window.BedsideNative { saveFile(name, type, text), print(), cameraReport(), frontCameraId() }.
// Everything that differs between the two is decided here, so the rest of the code never sniffs the environment.

const IN_APP_BROWSER = /FBAN|FBAV|Instagram|Line\/|WhatsApp|Snapchat|TikTok|MicroMessenger|Twitter|; wv\)|GSA\//i;

const ua = () => (typeof navigator !== 'undefined' && navigator.userAgent) || '';
const bridge = () => (typeof window !== 'undefined' ? window.BedsideNative : undefined);

/** True inside the Bedside Field Android app (evaluated on every call). */
export function isAndroidApp() {
  return !!bridge() || /BedsideFieldApp/.test(ua());
}

/** Opened inside another app's built-in browser (Instagram, WhatsApp, …), which often blocks the camera. */
export function isInAppBrowser() {
  return !isAndroidApp() && IN_APP_BROWSER.test(ua());
}

/** Running as an installed PWA (home-screen app), as opposed to a browser tab. */
export function isInstalledPwa() {
  return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches);
}

/** getUserMedia exists and the page is a secure context (HTTPS, localhost, or the app's own origin). */
export function cameraApiAvailable() {
  return !!(typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) && !!(typeof window !== 'undefined' && window.isSecureContext);
}

/** Every file is available offline: the app carries them in the APK; a browser needs the service worker. */
export function isOfflineReady() {
  return isAndroidApp() || !!(typeof navigator !== 'undefined' && navigator.serviceWorker?.controller);
}

/** The service worker is for the browser PWA only; the Android app serves files from the APK. */
export const usesServiceWorker = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !isAndroidApp();

/**
 * How the camera is started. In the Android app a request that never answers would leave a blank screen, so it gets
 * deadlines and a step read-out; some tablets open the back camera first; some WebViews draw a live <video> as a black
 * box, so the preview is also painted into a canvas. Browsers keep the plain behaviour.
 */
export function cameraPolicy() {
  const app = isAndroidApp();
  return {
    requestTimeoutMs: app ? 30000 : 0,
    modelTimeoutMs: app ? 60000 : 0,
    ensureFrontCamera: app,
    canvasPreview: app,
    showSteps: app,
  };
}

/** Native diagnosis of a camera that would not start (Android app only), or ''. */
export function nativeCameraReport() {
  const b = bridge();
  if (!b?.cameraReport) return '';
  try { return b.cameraReport(); } catch { return ''; }
}

/** Camera2 id of the front camera according to Android (app only), or ''. */
export function nativeFrontCameraId() {
  const b = bridge();
  try { return (b && b.frontCameraId && b.frontCameraId()) || ''; } catch { return ''; }
}

/** Saves a text file: the Android app writes it to Download/BedsideField; a browser downloads it. */
export function saveTextFile(filename, text, type = 'application/json') {
  const b = bridge();
  if (b?.saveFile) { b.saveFile(filename, type, String(text)); return; }
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Prints the current page: Android's print dialog in the app, the browser's otherwise. */
export function printPage() {
  const b = bridge();
  if (b?.print) b.print(); else window.print();
}
