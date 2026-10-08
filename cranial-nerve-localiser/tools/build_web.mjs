#!/usr/bin/env node
// Builds the static website (Vercel's build step): web/index.html, inlined from src/
// exactly as tools/build_html.py does for the APK, the install files from site/ (manifest,
// icons and an offline service worker), and the newest APK from releases/ for download.
import { createHash } from 'node:crypto';
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

// Install files. The service worker's cache name changes whenever the page does.
const site = new URL('site/', root);
for (const name of readdirSync(site)) {
  if (name === 'sw.js') continue;
  copyFileSync(new URL(name, site), new URL(name, out));
}
const { versionName } = JSON.parse(readFileSync(new URL('android/version.json', root), 'utf8'));
const stamp = `${versionName}-${createHash('sha256').update(html).digest('hex').slice(0, 10)}`;
writeFileSync(new URL('sw.js', out), readFileSync(new URL('sw.js', site), 'utf8').replace("'cnl-__VERSION__'", `'cnl-${stamp}'`));

const releases = new URL('releases/', root);
const byVersion = (a, b) => a.localeCompare(b, 'en', { numeric: true });
const apk = existsSync(releases) ? readdirSync(releases).filter(f => f.endsWith('.apk')).sort(byVersion).pop() : null;
if (apk) copyFileSync(new URL(apk, releases), new URL('cranial-nerve-localiser.apk', out));
console.log(`web/index.html (${Buffer.byteLength(html).toLocaleString()} bytes)${apk ? ` and ${apk}` : ''}`);
