// Plain-language explanation of a camera start-up failure: what the person should do, plus the raw error.

import { isAndroidApp, isInAppBrowser, isInstalledPwa, nativeCameraReport } from '../platform.js';

/** Plain-language reason for a camera start-up failure (what the person should do), keeping the raw error for diagnostics. */
export function explainCameraError(e, stage) {
  const name = e?.name || '';
  const raw = e?.message || String(e);
  const native = isAndroidApp();
  const inApp = isInAppBrowser();
  let msg;
  if (native && (name === 'NotAllowedError' || name === 'SecurityError' || /permission|denied|not allowed/i.test(raw))) {
    msg = 'Android has not given this app the camera. Tap “Try the camera again” and choose Allow; if no prompt appears: Settings → Apps → Bedside Field → Permissions → Camera → “Allow only while using the app”.';
  } else if (/denied by system/i.test(raw)) {
    msg = 'Android itself is blocking the browser\u2019s camera. Settings → Apps → Chrome → Permissions → Camera → “Allow only while using the app”, and make sure the phone\u2019s Camera access privacy switch is on. Then reload this page.';
  } else if (/dismiss/i.test(raw)) {
    msg = 'The camera prompt was closed without tapping Allow, so Chrome treated it as a refusal (after a few of these it stops asking for a while). Reset the permission: tap the icon left of the address bar → Permissions → Camera → Allow (or Reset permissions), reload, then choose Allow when asked.';
  } else if (name === 'NotAllowedError' || name === 'SecurityError' || /permission|denied|not allowed/i.test(raw)) {
    msg = 'Camera permission was refused. Allow the camera for this site: in Chrome tap the icon left of the address bar (lock or sliders) → Permissions → Camera → Allow (or Reset permissions); in Safari tap aA → Website Settings → Camera → Allow. If it still fails, check Android Settings → Apps → Chrome → Permissions → Camera. Then reload this page.';
  } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    msg = 'No front camera was found on this device.';
  } else if (name === 'NotReadableError' || name === 'AbortError') {
    msg = 'The camera is busy. Close other apps or tabs that are using it (video calls, camera apps), then try again.';
  } else if (stage === 'model') {
    msg = 'The camera started but the face-tracking model could not load (' + raw + '). Check the connection once, then reload: after the first successful load it works offline.';
  } else if (/unavailable|HTTPS/i.test(raw)) {
    msg = 'This page cannot use the camera. It must be opened over HTTPS (or localhost) in a normal browser.';
  } else {
    msg = raw;
  }
  if (isInstalledPwa()) msg += ' You are using the installed app: if the camera keeps failing, open the site once in Chrome itself, allow the camera there, then reopen the app (also check Android Settings → Apps → Chrome → Permissions → Camera).';
  if (inApp) msg += ' This looks like an in-app browser (opened from another app), which often blocks the camera: open the link in Safari or Chrome instead.';
  // Android app: add the app's own check (permission, device policy, camera busy, native open test).
  if (native && stage === 'permission') {
    const report = nativeCameraReport();
    if (report) msg += ' ' + report;
  }
  return { msg, raw, name, stage };
}
