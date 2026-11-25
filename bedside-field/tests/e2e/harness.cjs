// End-to-end harness: serves web/ exactly as the Android app does (https://appassets.androidplatform.net,
// same MIME types, BedsideFieldApp user agent, a stand-in BedsideNative bridge) and drives the real screens.
// Needs Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const HOST = 'https://appassets.androidplatform.net';
const MIME = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json',
  webmanifest: 'application/manifest+json', wasm: 'application/wasm', svg: 'image/svg+xml', png: 'image/png' };
const mimeOf = (p) => MIME[(p.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';

async function launch({ camera = 'fake', y4m = null } = {}) {
  const args = ['--use-fake-ui-for-media-stream'];
  if (camera === 'fake' || y4m) args.push('--use-fake-device-for-media-stream');
  if (y4m) args.push(`--use-file-for-fake-video-capture=${y4m}`);
  return chromium.launch({ args });
}

/**
 * New page on `web` with the native bridge mocked. `settings` are merged into stored settings before the app boots.
 * `gum` = 'deny' | 'hang' | null replaces getUserMedia.
 */
async function openApp(browser, web, { settings = {}, viewport = { width: 1280, height: 800 }, gum = null, report = 'App check: MOCK' } = {}) {
  const ctx = await browser.newContext({ viewport, screen: viewport, permissions: ['camera'],
    userAgent: 'Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 BedsideFieldApp/test' });
  await ctx.route(HOST + '/**', (route) => {
    let p = new URL(route.request().url()).pathname;
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(web, decodeURIComponent(p));
    if (!f.startsWith(path.resolve(web)) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: 'not found' });
    route.fulfill({ status: 200, contentType: mimeOf(p), body: fs.readFileSync(f) });
  });
  await ctx.route(/^(?!https:\/\/appassets\.androidplatform\.net).*/, (r) => r.abort()); // the app must never go online
  await ctx.addInitScript(({ settings, gum, report }) => {
    try {
      const k = 'bf.settings.v1';
      localStorage.setItem(k, JSON.stringify({ ...JSON.parse(localStorage.getItem(k) || '{}'), ...settings }));
    } catch {}
    window.__native = [];
    window.BedsideNative = {
      saveFile: (name, type, text) => window.__native.push({ call: 'saveFile', name, type, text }),
      print: () => window.__native.push({ call: 'print' }),
      cameraReport: () => report,
      frontCameraId: () => '',
    };
    if (gum === 'deny') navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }));
    if (gum === 'hang') navigator.mediaDevices.getUserMedia = () => new Promise(() => {});
  }, { settings, gum, report });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(HOST + '/index.html');
  await page.waitForSelector('#btn-start');
  return { ctx, page, errors };
}

const activeText = (page) => page.evaluate(() => (document.querySelector('.screen.active')?.innerText || '').replace(/\s+/g, ' '));
const panelText = (page) => page.evaluate(() => (document.querySelector('#panel-card')?.innerText || '').replace(/\s+/g, ' '));
const nativeCalls = (page) => page.evaluate(() => window.__native);

/** Clicks through a flow until `doneSel` is visible. `labels` = button texts (prefix match) allowed to be clicked. */
async function driveUntil(page, doneSel, labels, timeoutMs = 300000) {
  const re = new RegExp('^(' + labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')');
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await page.isVisible(doneSel).catch(() => false)) return true;
    if (await page.isVisible('#btn-guide-go').catch(() => false)) await page.click('#btn-guide-go').catch(() => {});
    const b = page.locator('.screen.active button:visible', { hasText: re }).first();
    if (await b.count()) await b.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
  return false;
}

/** Runs a whole simulated-patient session and returns what the results screen and exports show. */
async function demoSession(browser, web, { profile, method, includeDSS = true }) {
  const { ctx, page, errors } = await openApp(browser, web, { settings: { reps: 2, method, includeDSS } });
  await page.selectOption('#demo-profile', profile);
  await page.click('#btn-demo');
  const done = await driveUntil(page, '#res-csv', ['Continue', 'Start check', 'It follows', 'Start screening', 'Skip demo']);
  const out = { profile, method, done, errors };
  if (done) {
    await page.click('#res-csv'); await page.click('#res-json'); await page.click('#res-print');
    const calls = await nativeCalls(page);
    const json = calls.find((c) => c.call === 'saveFile' && c.name.endsWith('.json'));
    const csv = calls.find((c) => c.call === 'saveFile' && c.name.endsWith('.csv'));
    const session = json ? JSON.parse(json.text) : null;
    Object.assign(out, {
      calls: calls.map((c) => c.call + (c.name ? ':' + c.name.replace(/\d{4}-\d\d-\d\d-\d\d-\d\d/, 'DATE') : '') + (c.type ? ':' + c.type : '')),
      csvHeader: csv ? csv.text.split('\n')[0] : null,
      pattern: session?.summary?.pattern?.title || null,
      dss: session?.summary?.dss?.title || null,
      session,
      report: (await page.evaluate(() => document.querySelector('#report').innerText.replace(/\s+/g, ' '))).slice(0, 160),
    });
    await page.click('#res-back');
    await page.click('#go-hist');
    out.history = (await page.evaluate(() => document.querySelectorAll('#hist-list .hist-item').length));
  }
  await ctx.close();
  return out;
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

module.exports = { HOST, launch, openApp, activeText, panelText, nativeCalls, driveUntil, demoSession, pool };
