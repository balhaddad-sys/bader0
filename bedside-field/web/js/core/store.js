// Local-only persistence. Nothing ever leaves the device. Falls back to memory if storage is blocked.

export const VERSION = '1.4.3';

export const DEFAULTS = {
  // screening
  method: 'camera',      // camera | examiner | touch
  eye: 'both',           // both | right | left (the eye that is UNCOVERED)
  includeDSS: true,
  label: '',
  // geometry
  pxPerMm: null,
  calSource: null,       // 'card' | 'diagonal'
  distanceCm: 30,
  // stimulus
  stimulus: 'disc',      // disc | gabor
  fullscreen: 0,         // 1 = also use the browser Fullscreen API on the test stage (off: it can drop the camera on some Android browsers)
  headComp: 1,           // 1 = correct for head translation in the gaze map (rotation is not corrected)
  showGaze: 0,           // 1 = draw the green gaze ring during camera tests (examiner use)
  anchor: 'pulse',       // pulse | face
  stimDeg: 3,
  flickerHz: 12,
  // timing
  reps: 3,
  stimMs: 1000,
  windowMs: 1800,
  gapMs: 0,
  touchTimeoutMs: 6000,
  delayedMs: 2500,
  practice: true,
};

const K = { settings: 'bf.settings.v1', sessions: 'bf.sessions.v1' };
const mem = {};

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return key in mem ? mem[key] : fallback; }
}
function write(key, val) {
  mem[key] = val;
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage full/blocked: memory only */ }
}

export function loadSettings() {
  return { ...DEFAULTS, ...read(K.settings, {}) };
}
export function saveSettings(s) {
  write(K.settings, s);
}

export function loadSessions() {
  return read(K.sessions, []);
}
export function saveSession(sess) {
  const all = loadSessions();
  const i = all.findIndex((x) => x.id === sess.id);
  if (i >= 0) all[i] = sess; else all.unshift(sess);
  write(K.sessions, all.slice(0, 150));
}
export function deleteSession(id) {
  write(K.sessions, loadSessions().filter((s) => s.id !== id));
}
export function clearAll() {
  write(K.sessions, []);
  try { localStorage.removeItem(K.settings); } catch {}
  delete mem[K.settings];
}
