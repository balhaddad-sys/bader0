'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const V = require('../src/vocab.js');
const KB = require('../src/kb.js');
const M = require('../src/morph.js');
const D = require('../src/diagrams.js');

const SYN = E.parseKB(KB.TEXT);
const byAbbr = (id) => SYN.find((s) => s.id === id);

test('Atlas: every morphology maps to a real EEG finding and a defined figure', () => {
  const ids = V.allIds();
  M.ITEMS.forEach((m) => {
    assert.ok(ids.has(m.id) && m.id.startsWith('eeg.'), m.id);
    assert.ok(D.FIG_KEYS.includes(m.fig), m.id + ' fig ' + m.fig);
    assert.ok(m.summary && m.summary.length > 25 && m.pitfall && m.basis, m.id);
    assert.ok(m.features.length >= 2 && M.GROUPS.includes(m.group), m.id);
  });
  assert.equal(new Set(M.ITEMS.map((m) => m.id)).size, M.ITEMS.length);
  assert.ok(M.ITEMS.length >= 22);
});

test('Atlas: every pattern is used by at least one syndrome criterion (derived from the KB)', () => {
  M.ITEMS.forEach((m) => {
    const used = SYN.filter((s) => s.criteria.some((c) => c.expr && E.collectIds(c.expr, new Set()).has(m.id)));
    // Reference-only patterns: used for epilepsy-type inference / teaching but not scored by any ILAE syndrome table
    // (MTLE-HS has no mandatory EEG finding; the tables score only the LOW-flash-rate photoparoxysmal response).
    if (!['eeg.temporal_spikes', 'eeg.ppr'].includes(m.id)) assert.ok(used.length >= 1, m.id + ' unused by any syndrome');
  });
});

test('Waveforms: all figures render valid, deterministic, reasonably small SVG', () => {
  D.FIG_KEYS.forEach((k) => {
    const a = D.waveformSvg(k, k), b = D.waveformSvg(k, k);
    assert.equal(a, b, k + ' not deterministic');
    assert.ok(a.startsWith('<svg') && a.endsWith('</svg>'), k);
    assert.ok(!/NaN|undefined|Infinity/.test(a), k + ' has invalid numbers');
    assert.ok((a.match(/class="fw"/g) || []).length >= 8, k + ' too few traces');
    assert.ok(a.length < 100000, k + ' too large: ' + a.length);
  });
});

test('Waveforms: schematic is labelled as such and has accessible name', () => {
  const s = D.waveformSvg('gsw3', '3 Hz generalized spike-wave');
  assert.match(s, /schematic/);
  assert.match(s, /role="img" aria-label="Schematic EEG: 3 Hz generalized spike-wave"/);
});

test('Onset windows are derived from the criteria (CAE 2–13 y, JAE 8–20 y, SeLNE ≤1 mo)', () => {
  const near = (x, y, tol) => Math.abs(x - y) / y <= (tol || 0.04);
  const cae = E.onsetWindows(byAbbr('CAE')).windows;
  assert.equal(cae.length, 1); assert.ok(near(cae[0][0], 24) && near(cae[0][1], 156), JSON.stringify(cae));
  const jae = E.onsetWindows(byAbbr('JAE')).windows;
  assert.ok(near(jae[0][0], 96) && near(jae[0][1], 240), JSON.stringify(jae));
  const selne = E.onsetWindows(byAbbr('SELNE')).windows;
  assert.ok(selne[0][0] <= 0.04 && near(selne[0][1], 1, 0.08), JSON.stringify(selne));
  const swas = E.onsetWindows(byAbbr('SWAS')).windows;
  assert.ok(near(swas[0][0], 12) && near(swas[0][1], 144), JSON.stringify(swas));
});

test('Onset windows: alerts, sex-dependent union (PCDH19) and syndromes with no age criterion', () => {
  const jme = E.onsetWindows(byAbbr('JME'));
  assert.ok(jme.alerts.length === 2, 'JME alert windows 8–9 y and 25–40 y: ' + JSON.stringify(jme.alerts));
  const pc = E.onsetWindows(byAbbr('PCDH19')).windows;
  assert.ok(pc[0][0] < 2 && pc[0][1] > 90, JSON.stringify(pc)); // union of F 1.5–60 mo and M 5–96 mo
  assert.equal(E.onsetWindows(byAbbr('FMTLE')).none, true);
});

test('Windows agree with the scorer: onset inside the window is not excluded by age, outside is', () => {
  ['CAE', 'JAE', 'SELECTS', 'LGS'].forEach((id) => {
    const s = byAbbr(id), w = E.onsetWindows(s).windows[0];
    const mid = Math.sqrt(w[0] * w[1]);
    const ctx = (m) => E.makeContext({ onsetMonths: m, findings: {}, reviewed: {} });
    const ageFail = (m) => E.evaluateSyndrome(s, ctx(m)).rows.some((r) => r.domain === 'onset' && (r.state === 'excluded' || r.state === 'unmet'));
    assert.equal(ageFail(mid), false, id + ' inside window');
    assert.equal(ageFail(w[1] * 1.15 + 1), true, id + ' beyond upper edge');
  });
});

test('Seizure tree lists the 21 ILAE 2025 seizure types', () => {
  const n = D.TREE.reduce((a, c) => a + c.groups.reduce((b, g) => b + g.t.length, 0), 0) + 1; // + unclassified
  assert.equal(n, 21);
  assert.match(D.seizureTreeHtml(), /Negative myoclonus/);
});

test('Timeline and flow diagrams render', () => {
  const rows = SYN.map((s) => { const w = E.onsetWindows(s); return { abbr: s.abbr, group: s.group, windows: w.windows, alerts: w.alerts, none: w.none }; });
  const t = D.timelineSvg(rows, { marker: 84, label: 'x' });
  assert.ok(t.includes('tl-bar') && t.includes('tl-mark') && !/NaN/.test(t));
  assert.match(D.scoringFlowSvg(), /Mandatory criteria met/);
});

test('Alert windows never extend outside the syndrome\'s allowed onset window', () => {
  SYN.forEach((s) => {
    const w = E.onsetWindows(s);
    w.alerts.forEach((a) => assert.ok(w.windows.some((x) => a[0] >= x[0] * 0.999 && a[1] <= x[1] * 1.001), s.id + ' alert ' + JSON.stringify(a) + ' outside ' + JSON.stringify(w.windows)));
  });
});

test('Atlas usage is polarity-aware (MEI alert fires when 3 Hz spike-wave is ABSENT; JAE counts it as mandatory)', () => {
  const E2 = require('../src/engine.js');
  const walk = (n, neg, cb) => { if (!n) return; if (n.t === 'f') cb(n.id, neg); else if (n.t === 'not') walk(n.a, !neg, cb); else { walk(n.a, neg, cb); walk(n.b, neg, cb); } };
  const find = (abbr, id) => { const out = []; SYN.find((s) => s.abbr === abbr).criteria.forEach((c) => c.expr && walk(c.expr, false, (i, neg) => { if (i === id) out.push((neg ? 'n' : '') + c.level); })); return out; };
  assert.ok(find('MEI', 'eeg.gsw_3hz').includes('nA'));
  assert.ok(find('JAE', 'eeg.gsw_3hz').includes('M'));
  assert.ok(E2.parseExpr('!(a | !b)') );
});
