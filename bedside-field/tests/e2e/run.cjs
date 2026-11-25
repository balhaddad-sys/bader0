#!/usr/bin/env node
// End-to-end characterization suite.
//   node tests/e2e/run.cjs            compare the app in web/ against tests/e2e/expected.json
//   node tests/e2e/run.cjs --record   (re)record expected.json and the session fixtures from the current app
// Simulated-patient outcomes are random by design, so the comparison is on what must not change: the screens
// reached, the clinical pattern called, the export/print calls and their formats.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const H = require('./harness.cjs');

const ROOT = path.resolve(__dirname, '../..');
const WEB = process.env.BF_WEB ? path.resolve(process.env.BF_WEB) : path.join(ROOT, 'web');
const OUT = path.join(ROOT, 'tests/out');
const EXPECTED = path.join(__dirname, 'expected.json');
const FIXTURES = path.join(ROOT, 'tests/fixtures/sessions');
const RECORD = process.argv.includes('--record');
fs.mkdirSync(OUT, { recursive: true });

const num = (s) => String(s ?? '').replace(/\d+(\.\d+)?/g, '#');

// A real face (NASA portrait, public domain) as a fake camera: raw YUV 4:2:0, 640x480, wrapped as a y4m clip.
function faceY4m() {
  const yuv = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'tests/fixtures/face-640x480.yuv.gz')));
  const f = path.join(OUT, 'face.y4m');
  const frames = [];
  for (let i = 0; i < 15; i++) frames.push(Buffer.from('FRAME\n'), yuv);
  fs.writeFileSync(f, Buffer.concat([Buffer.from('YUV4MPEG2 W640 H480 F30:1 Ip A1:1 C420jpeg\n'), ...frames]));
  return f;
}

async function smoke(browser) {
  const { ctx, page, errors } = await H.openApp(browser, WEB);
  const r = {};
  r.chips = await page.$$eval('.chip', (cs) => cs.map((c) => c.textContent.trim()));
  r.version = await page.textContent('#ver');
  r.demoProfiles = await page.$$eval('#demo-profile option', (os) => os.map((o) => o.value));
  await page.click('#go-cal');
  await page.fill('#cal-slider', '500');
  await page.dispatchEvent('#cal-slider', 'input');
  await page.click('#cal-save-card');
  r.calInfo = num(await page.textContent('#cal-info'));
  await page.click('#dist-plus');
  r.dist = await page.textContent('#dist-val');
  await page.click('#s-cal .back');
  r.chipsAfterCal = await page.$$eval('.chip', (cs) => cs.map((c) => c.textContent.trim()));
  await page.click('#go-settings');
  r.settingsRows = await page.$$eval('#settings-form .settings-row', (rs) => rs.map((x) => x.querySelector('div').firstChild.textContent));
  await page.click('#s-settings .back');
  await page.click('#go-about');
  r.aboutHeadings = await page.$$eval('#about-body h3', (hs) => hs.map((h) => h.textContent));
  await page.click('#s-about .back');
  await page.click('#go-hist');
  r.historyEmpty = await page.textContent('#hist-list');
  await page.click('#s-history .back');
  await page.click('input[name=method][value=examiner]');
  await page.click('#eyes button[data-v=right]');
  await page.click('#btn-start');
  r.guide = { dist: await page.textContent('#g-dist'), eye: await page.textContent('#g-eye'), camTip: await page.isVisible('#g-cam') };
  r.errors = errors;
  await ctx.close();
  return r;
}

async function phone(browser) {
  const { ctx, page, errors } = await H.openApp(browser, WEB, { viewport: { width: 915, height: 412 } });
  await page.click('input[name=method][value=examiner]');
  await page.click('#btn-start');
  const r = { guideDist: await page.textContent('#g-dist'), toast: await page.textContent('#toast'), errors };
  await ctx.close();
  return r;
}

async function cameraDenied(browser) {
  const { ctx, page, errors } = await H.openApp(browser, WEB, { gum: 'deny' });
  await page.click('input[name=method][value=camera]');
  await page.click('#btn-start'); await page.click('#btn-guide-go');
  await page.waitForSelector('#c-retry', { timeout: 20000 });
  const r = { panel: num(await H.panelText(page)), errors };
  await page.click('#c-ex');
  await page.waitForSelector('#x-ok', { timeout: 5000 });
  r.notice = await H.panelText(page);
  await page.click('#x-ok');
  await page.waitForFunction(() => document.querySelector('#exbar button'), null, { timeout: 15000 });
  r.exbar = await page.$$eval('#exbar button', (bs) => bs.map((b) => b.textContent));
  r.dot = await page.getAttribute('#hud-dot', 'class');
  await ctx.close();
  return r;
}

async function cameraNoFace(browser) {
  const { ctx, page, errors } = await H.openApp(browser, WEB, { settings: { label: 'Bed 14 / MRN 5521' } });
  await page.click('input[name=method][value=camera]');
  await page.click('#btn-start'); await page.click('#btn-guide-go');
  await page.waitForSelector('#chk-live', { timeout: 30000 });
  await page.waitForFunction(() => /no face found/.test(document.querySelector('#chk-live')?.textContent || ''), null, { timeout: 30000 });
  const r = {
    status: num(await page.textContent('#chk-live')).replace(/mode: [a-z -]+(· CPU)?/, 'mode: X').replace(/· [^·]*fake[^·]*$/, '').slice(0, 80),
    startDisabled: await page.isDisabled('#c-start'),
    mirror: await page.evaluate(() => getComputedStyle(document.querySelector('#cam-mirror')).display),
    errors,
  };
  // No face for 10 s: the "Save a camera report" button appears and saves a text report through the bridge.
  r.reportHiddenAtFirst = await page.isHidden('#c-report');
  await page.waitForSelector('#c-report', { state: 'visible', timeout: 25000 });
  await page.click('#c-report');
  const saved = (await H.nativeCalls(page)).find((c) => c.call === 'saveFile');
  r.report = saved && { name: saved.name.replace(/\d{4}-\d\d-\d\d-\d\d-\d\d/, 'DATE'), type: saved.type, firstLine: saved.text.split('\n')[0],
    lines: saved.text.trim().split('\n').map((l) => l.split(':')[0]), noLabel: !/Bed 14|5521/.test(saved.text) }; // the patient label must never be in the report
  await ctx.close();
  return r;
}

async function cameraFace(browser, y4m) {
  const { ctx, page, errors } = await H.openApp(browser, WEB, { settings: { pxPerMm: 4.7, calSource: 'test' } });
  await page.click('input[name=method][value=camera]');
  await page.click('#btn-start'); await page.click('#btn-guide-go');
  await page.waitForFunction(() => document.querySelector('#c-start') && !document.querySelector('#c-start').disabled, null, { timeout: 40000 });
  const r = { tracked: num(await page.textContent('#chk-live')).replace(/distance ≈ # cm \(rough; set #\) · /, '') };
  await page.click('#c-start');
  const hints = new Set();
  const t0 = Date.now();
  while (!(await page.isVisible('#v-redo').catch(() => false)) && Date.now() - t0 < 90000) {
    if (await page.isVisible('#f-ok').catch(() => false)) { r.follow = num(await H.panelText(page)).slice(0, 200); await page.click('#f-ok'); }
    const h = await page.textContent('#hint').catch(() => '');
    if (h) hints.add(num(h));
    await page.waitForTimeout(300);
  }
  r.hints = [...hints];
  r.verdictTitle = await page.evaluate(() => document.querySelector('#panel-card h3')?.innerText.replace(/\s+/g, ' '));
  r.verdictButtons = await page.$$eval('#panel-card button', (bs) => bs.map((b) => b.textContent));
  // Rows that are always on the card (optional rows such as "Tracking: right eye only" depend on camera noise).
  const ALWAYS = ['Accuracy', 'Horizontal', 'Vertical', 'Frame rate'];
  r.verdictRows = (await page.$$eval('#panel-card .kv > b', (bs) => bs.map((b) => b.textContent))).filter((x) => ALWAYS.includes(x));
  r.errors = errors;
  await ctx.close();
  return r;
}

// The double-simultaneous block runs only if each half of the field had >= 50 % of targets seen. A demo patient
// sitting right at that cut-off (right superior quadrantanopia: one blind and one seeing quadrant on the right) runs
// it or not by chance, so there the check is that the rule was applied, not which way it went.
function dssOutcome(d, session) {
  const h = session?.summary?.hemi;
  if (!h || !session.summary.hasQuad || d.includeDSS === false) return d.dss;
  const nearCut = [h.L.rate, h.R.rate].some((r) => Number.isFinite(r) && Math.abs(r - 0.5) < 0.13);
  if (!nearCut) return d.dss;
  const eligible = h.L.rate >= 0.5 && h.R.rate >= 0.5;
  return (d.dss != null) === eligible ? 'at the 50% cut-off: rule applied' : `at the 50% cut-off: RULE VIOLATED (ran=${d.dss != null}, L=${h.L.rate}, R=${h.R.rate})`;
}

const DEMOS = [
  { profile: 'rhh', method: 'camera' },
  { profile: 'lhh', method: 'examiner' },
  { profile: 'rsq', method: 'camera' },
  { profile: 'normal', method: 'touch' },
  { profile: 'neglect', method: 'camera' },
  { profile: 'rhh', method: 'touch', includeDSS: false },
];

(async () => {
  const t0 = Date.now();
  const browser = await H.launch();
  const faceBrowser = await H.launch({ y4m: faceY4m() });
  const [smk, ph, denied, noface, face, demos] = await Promise.all([
    smoke(browser), phone(browser), cameraDenied(browser), cameraNoFace(browser), cameraFace(faceBrowser, null),
    H.pool(DEMOS, 3, (d) => H.demoSession(browser, WEB, d)),
  ]);
  await browser.close(); await faceBrowser.close();

  if (RECORD) {
    fs.mkdirSync(FIXTURES, { recursive: true });
    demos.forEach((d) => { if (d.session) fs.writeFileSync(path.join(FIXTURES, `${d.profile}-${d.method}.json`), JSON.stringify(d.session, null, 1)); });
  }
  const result = {
    smoke: smk, phone: ph, cameraDenied: denied, cameraNoFace: noface, cameraFace: face,
    demos: demos.map(({ session, report, ...d }) => ({ ...d, dss: dssOutcome(d, session), reportStart: num(report).replace(/[A-Z][a-z]{2} #, # · #:# [AP]M/, 'DATE') })),
  };
  fs.writeFileSync(path.join(OUT, 'e2e-result.json'), JSON.stringify(result, null, 2));
  if (RECORD) { fs.writeFileSync(EXPECTED, JSON.stringify(result, null, 2)); console.log(`recorded ${EXPECTED} in ${Math.round((Date.now() - t0) / 1000)} s`); return; }

  const expected = JSON.parse(fs.readFileSync(EXPECTED, 'utf8'));
  const diffs = [];
  const cmp = (a, b, p) => {
    if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) return diffs.push(`${p}: ${JSON.stringify(b)} → ${JSON.stringify(a)}`);
    if (a && typeof a === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) cmp(a[k], b[k], `${p}.${k}`); return; }
    if (a !== b) diffs.push(`${p}: ${JSON.stringify(b)} → ${JSON.stringify(a)}`);
  };
  cmp(result, expected, 'e2e');
  console.log(diffs.length ? `E2E: ${diffs.length} difference(s)\n  ` + diffs.join('\n  ') : 'E2E: identical to the recorded behaviour');
  console.log(`(${Math.round((Date.now() - t0) / 1000)} s)`);
  process.exit(diffs.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
