// A plain-text camera report the examiner can save and send when no face is found. Device and camera facts only:
// never the patient label or any session data.

import { VERSION } from '../core/store.js';
import { isAndroidApp, cameraPolicy } from '../platform.js';

export function cameraReportText(src, { settings, width, height, now = new Date() }) {
  const d = src.diagnostics ? src.diagnostics() : {};
  const L = d.light;
  return [
    'Bedside Field camera report',
    `time: ${now.toISOString()}`,
    `app: ${VERSION} (${isAndroidApp() ? 'Android app' : 'browser'})`,
    `browser engine: ${(typeof navigator !== 'undefined' && navigator.userAgent) || '-'}`,
    `screen: ${width}×${height} CSS px · viewing distance set to ${settings.distanceCm} cm · eye(s): ${settings.eye}`,
    `camera start-up step: ${d.stage ?? '-'}`,
    `camera: ${d.cam ?? '-'} · label: ${d.label || '-'}`,
    `video: ${d.video ?? '-'}`,
    `frames processed: ${d.frames ?? '-'} · faces found: ${d.faces ?? '-'} · ${d.fps ?? '-'} fps`,
    `detection mode: ${d.mode ?? '-'}`,
    `light (centre/edge, 0-255): ${L ? `${L.centre}/${L.edge}` : '-'}`,
    `camera policy: ${JSON.stringify(cameraPolicy())}`,
  ].join('\n') + '\n';
}
