// Small pure helpers: maths, randomness, formatting. No DOM and no platform code (see ui/dom.js, platform.js).

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const deg2rad = (d) => (d * Math.PI) / 180;
export const rad2deg = (r) => (r * 180) / Math.PI;
export const sum = (a) => a.reduce((s, v) => s + v, 0);
export const mean = (a) => (a.length ? sum(a) / a.length : NaN);

export function median(a) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function std(a) {
  if (a.length < 2) return NaN;
  const m = mean(a);
  return Math.sqrt(sum(a.map((v) => (v - m) ** 2)) / (a.length - 1));
}

// Seedable RNG so tests are reproducible. Pass nothing in production.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const rand = (lo, hi, rng = Math.random) => lo + (hi - lo) * rng();
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const fmtMs = (v) => (Number.isFinite(v) ? `${Math.round(v)} ms` : '—');
export const fmtPct = (v) => (Number.isFinite(v) ? `${Math.round(v * 100)}%` : '—');
export const fmtDeg = (v, d = 0) => (Number.isFinite(v) ? `${v.toFixed(d)}°` : '—');

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
