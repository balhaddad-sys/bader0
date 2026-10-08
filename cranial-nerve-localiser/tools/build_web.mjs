#!/usr/bin/env node
// Builds the static website (Vercel's build step): web/index.html, inlined from src/
// exactly as tools/build_html.py does for the APK, plus the newest APK from releases/
// so the site can offer the Android app for download.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const out = new URL('web/', root);

function include(_, name) {
  const text = readFileSync(new URL(`src/${name}`, root), 'utf8');
  if (name.endsWith('.js') && /<\/script/i.test(text)) throw new Error(`${name} contains "</script", which would end the inline script early`);
  return text;
}
const html = readFileSync(new URL('src/index.html', root), 'utf8').replace(/\{\{([A-Za-z0-9_.-]+)\}\}/g, include);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
writeFileSync(new URL('index.html', out), html);

const releases = new URL('releases/', root);
const byVersion = (a, b) => a.localeCompare(b, 'en', { numeric: true });
const apk = existsSync(releases) ? readdirSync(releases).filter(f => f.endsWith('.apk')).sort(byVersion).pop() : null;
if (apk) copyFileSync(new URL(apk, releases), new URL('cranial-nerve-localiser.apk', out));
console.log(`web/index.html (${Buffer.byteLength(html).toLocaleString()} bytes)${apk ? ` and ${apk}` : ''}`);
