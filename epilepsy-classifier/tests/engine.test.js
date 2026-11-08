'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const V = require('../src/vocab.js');
const KB = require('../src/kb.js');
const EXAMPLES = require('../src/examples.js');

const SYN = E.parseKB(KB.TEXT);
const byId = (res, id) => res.find((r) => r.id === id);
const P = (o) => Object.assign({ onsetMonths: null, nowMonths: null, sex: null, findings: {}, reviewed: {}, mri: null, devOnset: null, devNow: null }, o);

/* ---------------- knowledge-base integrity ---------------- */
test('KB: 38 syndromes with unique ids, each with a @core mandatory criterion', () => {
  assert.equal(SYN.length, 38);
  assert.equal(new Set(SYN.map((s) => s.id)).size, SYN.length);
  SYN.forEach((s) => {
    assert.ok(s.criteria.some((c) => c.level === 'M' && c.core), s.id + ' lacks a core criterion');
    assert.ok(/^(zuberi2022|specchio2022|riney2022|hirsch2022)$/.test(s.source), s.id + ' bad source');
  });
});

test('KB: every finding id referenced exists in the vocabulary', () => {
  const known = V.allIds();
  const missing = [];
  SYN.forEach((s) => s.criteria.forEach((c) => {
    if (c.expr) E.collectIds(c.expr, new Set()).forEach((id) => { if (!known.has(id)) missing.push(s.id + ': ' + id); });
  }));
  assert.deepEqual(missing, []);
});

test('Vocabulary: no duplicate ids; every seizure id has a 2025 class', () => {
  const seen = new Set();
  V.SECTIONS.forEach((s) => s.groups.forEach((g) => g.items.forEach((i) => {
    assert.ok(!seen.has(i[0]), 'duplicate ' + i[0]);
    seen.add(i[0]);
  })));
  V.ALL_SEIZURE_IDS.forEach((id) => assert.ok(V.SEIZURE_CLASS[id], id));
});

/* ---------------- expression language ---------------- */
test('Expressions: tri-state logic and precedence', () => {
  const mk = (map, extra) => Object.assign({ get: (id) => (id in map ? map[id] : null), onsetMonths: null, nowMonths: null }, extra);
  const ev = (src, ctx) => E.evalNode(E.parseExpr(src), ctx);
  assert.equal(ev('a | b', mk({ a: true })), true);
  assert.equal(ev('a | b', mk({ a: false })), null);
  assert.equal(ev('a | b', mk({ a: false, b: false })), false);
  assert.equal(ev('a & b', mk({ a: false })), false);
  assert.equal(ev('a & b', mk({ a: true })), null);
  assert.equal(ev('!a', mk({})), null);
  assert.equal(ev('!a | b & c', mk({ a: true, b: true, c: true })), true); // & binds tighter than |
  assert.equal(ev('!(a | b)', mk({ a: false, b: false })), true);
});

test('Expressions: age predicates and units', () => {
  const ctx = (m, n) => ({ get: () => null, onsetMonths: m, nowMonths: n });
  const ev = (src, c) => E.evalNode(E.parseExpr(src), c);
  assert.equal(ev('age<2y', ctx(23, null)), true);
  assert.equal(ev('age<2y', ctx(24, null)), false);
  assert.equal(ev('age>13y', ctx(156, null)), false); // exactly 13.0 y is not ">13"
  assert.equal(ev('age>13y', ctx(157, null)), true);
  assert.equal(ev('age[2y,3y]', ctx(47, null)), true);  // "2–3 years" covers up to <4.0
  assert.equal(ev('age[2y,3y]', ctx(48, null)), false);
  assert.equal(ev('age>1m', ctx(0.2, null)), false);
  assert.equal(ev('age>=1d & age<24m', ctx(0.1, null)), true);
  assert.equal(ev('now>24m', ctx(1, 30)), true);
  assert.equal(ev('age<2y', ctx(null, null)), null); // unknown age -> unknown
});

/* ---------------- worked examples ---------------- */
EXAMPLES.forEach((ex) => {
  test('Example "' + ex.title + '" -> ' + ex.expectTop, () => {
    const res = E.evaluate(ex.patient, SYN);
    assert.ok(res.length > 0, 'no candidates');
    assert.equal(res[0].id, ex.expectTop, 'top was ' + res[0].id + ' (' + res.map((r) => r.id + ':' + r.status).join(', ') + ')');
    assert.notEqual(res[0].status, 'excluded');
  });
});

test('Examples: the fully-entered cases reach "criteria met" with no alerts', () => {
  ['cae', 'jme', 'dravet', 'selects', 'selne', 'mtlehs', 'lgs'].forEach((id) => {
    const ex = EXAMPLES.find((e) => e.id === id);
    const top = E.evaluate(ex.patient, SYN)[0];
    assert.equal(top.status, 'met', id + ' status ' + top.status + ' pending=' + top.pending.map((p) => p.text));
    assert.equal(top.counts.alerts, 0, id + ' alerts: ' + top.alerts.map((a) => a.text));
  });
});

/* ---------------- discrimination between related syndromes ---------------- */
test('CAE vs JAE: age at onset 7y excludes JAE, keeps CAE', () => {
  const res = E.evaluate(EXAMPLES.find((e) => e.id === 'cae').patient, SYN);
  assert.equal(byId(res, 'CAE').status, 'met');
  assert.equal(byId(res, 'JAE').status, 'excluded');
  assert.match(byId(res, 'JAE').reasons.join(' '), /<8 or >20/);
});

test('JME patient: GTCA excluded by myoclonic seizures; CAE excluded by age', () => {
  const res = E.evaluate(EXAMPLES.find((e) => e.id === 'jme').patient, SYN);
  assert.equal(byId(res, 'JME').status, 'met');
  assert.equal(byId(res, 'GTCA').status, 'excluded');
  // CAE is not even a plausible differential here (no typical absence) -> absent from results
  assert.equal(byId(res, 'CAE'), undefined);
  assert.match(byId(res, 'GTCA').reasons.join(' '), /other seizure type/i);
});

test('JME: onset age 8–9 raises the age alert; onset 7 excludes', () => {
  const base = EXAMPLES.find((e) => e.id === 'jme').patient;
  const a = E.evaluate(Object.assign({}, base, { onsetMonths: 8.5 * 12 }), SYN);
  assert.equal(byId(a, 'JME').status, 'met');
  assert.equal(byId(a, 'JME').counts.alerts, 1);
  const b = E.evaluate(Object.assign({}, base, { onsetMonths: 7 * 12 }), SYN);
  assert.equal(byId(b, 'JME').status, 'excluded');
});

test('SeLNE neonate: KCNQ2-DEE is not met without encephalopathy', () => {
  const res = E.evaluate(EXAMPLES.find((e) => e.id === 'selne').patient, SYN);
  assert.equal(byId(res, 'SELNE').status, 'met');
  assert.equal(byId(res, 'KCNQ2DEE').status, 'excluded');
});

test('SeLNE: onset after the first month is exclusionary', () => {
  const base = EXAMPLES.find((e) => e.id === 'selne').patient;
  const res = E.evaluate(Object.assign({}, base, { onsetMonths: 2 }), SYN);
  assert.equal(byId(res, 'SELNE').status, 'excluded');
});

test('PCDH19: sex-dependent onset window', () => {
  const p = (sex, m) => P({ onsetMonths: m, sex, findings: { 'gen.pcdh19': true, 'sz.focal_impaired': true, 'ctx.cluster': true }, reviewed: { sz: true } });
  assert.equal(byId(E.evaluate(p('F', 20), SYN), 'PCDH19').status, 'met');
  assert.equal(byId(E.evaluate(p('M', 3), SYN), 'PCDH19').status, 'excluded'); // males start >=5 months
  assert.equal(byId(E.evaluate(p('M', 20), SYN), 'PCDH19').status, 'met');
  assert.equal(byId(E.evaluate(p(null, 20), SYN), 'PCDH19').status, 'possible'); // sex unknown -> pending
});

/* ---------------- missing information is never treated as absence ---------------- */
test('Tri-state: unassessed items leave the syndrome "possible", not "met"', () => {
  const res = E.evaluate(P({ onsetMonths: 7 * 12, findings: { 'sz.abs_typical': true } }), SYN);
  const cae = byId(res, 'CAE');
  assert.equal(cae.status, 'possible');
  assert.ok(cae.pending.some((r) => r.domain === 'eeg'));
  assert.ok(cae.counts.unassessedExclusions > 0);
});

test('Tri-state: marking a section reviewed turns unticked items into absent', () => {
  const p = P({ onsetMonths: 84, findings: { 'sz.abs_typical': true, 'eeg.gsw_3hz': true } });
  const loose = byId(E.evaluate(p, SYN), 'CAE');
  assert.ok(loose.counts.unassessedExclusions > 0);
  const strict = byId(E.evaluate(Object.assign({}, p, { reviewed: { sz: true, eeg: true } }), SYN), 'CAE');
  assert.ok(strict.counts.unassessedExclusions < loose.counts.unassessedExclusions);
});

test('Explicit seizure exclusion works even without a reviewed flag', () => {
  const p = P({ onsetMonths: 84, findings: { 'sz.abs_typical': true, 'sz.myoclonic': true, 'eeg.gsw_3hz': true } });
  assert.equal(byId(E.evaluate(p, SYN), 'CAE').status, 'excluded');
});

/* ---------------- follow-up criteria do not block an early diagnosis ---------------- */
test('Dravet at 8 months is "met" although drug resistance/ID cannot yet be known', () => {
  const top = E.evaluate(EXAMPLES.find((e) => e.id === 'dravet').patient, SYN)[0];
  assert.equal(top.id, 'DRAVET');
  assert.equal(top.status, 'met');
  assert.ok(top.counts.followup >= 2);
});

test('PME needs demonstrated progression (not just JME-like onset features)', () => {
  const res = E.evaluate(EXAMPLES.find((e) => e.id === 'jme').patient, SYN);
  const pme = byId(res, 'PME');
  assert.ok(!pme || pme.status === 'excluded'); // JME example documents no progression
  const noReview = E.evaluate(P({ onsetMonths: 180, mri: 'normal', devOnset: 0, findings: { 'sz.myoclonic': true, 'eeg.gen_epileptiform': true, 'neuro.normal': true } }), SYN);
  assert.equal(byId(noReview, 'PME').status, 'possible');
});

/* ---------------- seizure + epilepsy type + flags ---------------- */
test('Epilepsy type (ILAE 2017) from seizure types', () => {
  const t = (f) => E.epilepsyType(P({ findings: f })).type;
  assert.equal(t({ 'sz.abs_typical': true }), 'Generalized epilepsy');
  assert.equal(t({ 'sz.focal_impaired': true }), 'Focal epilepsy');
  assert.equal(t({ 'sz.focal_impaired': true, 'sz.tonic': true }), 'Combined generalized and focal epilepsy');
  assert.match(t({ 'sz.spasms': true }), /^Unknown/);
  assert.equal(t({}), 'Not determined');
});

test('Seizure classification (ILAE 2025) names classes and notes', () => {
  const r = E.classifySeizures(P({ findings: { 'sz.focal_impaired': true, 'sz.gtc': true, 'sz.spasms': true } }));
  assert.deepEqual(r.seizures.map((s) => s.cls).sort(), ['Epileptic spasms', 'Focal', 'Generalized']);
  assert.ok(r.notes.length >= 2);
});

test('Flags: spasms and super-refractory SE are urgent; Dravet raises sodium-channel caution', () => {
  const sp = EXAMPLES.find((e) => e.id === 'iess').patient;
  const fl = E.clinicalFlags(sp, E.evaluate(sp, SYN));
  assert.ok(fl.some((f) => f.level === 'urgent' && /spasms/i.test(f.text)));
  const dr = EXAMPLES.find((e) => e.id === 'dravet').patient;
  const fd = E.clinicalFlags(dr, E.evaluate(dr, SYN));
  assert.ok(fd.some((f) => f.level === 'caution' && /sodium-channel/i.test(f.text)));
  const se = P({ findings: { 'st.superrefractory_se': true } });
  assert.ok(E.clinicalFlags(se, []).some((f) => f.level === 'urgent'));
});

test('Next steps prompt for missing EEG / MRI and for genetics in early-onset disease', () => {
  const steps = E.nextSteps(P({ onsetMonths: 6, findings: { 'sz.spasms': true } }), E.evaluate(P({ onsetMonths: 6, findings: { 'sz.spasms': true } }), SYN));
  assert.ok(steps.some((s) => /EEG not yet entered/.test(s)));
  assert.ok(steps.some((s) => /MRI brain not yet entered/.test(s)));
  assert.ok(steps.some((s) => /Genetic testing/.test(s)));
});

test('Etiology hints reflect imaging, genetics and syndrome-defined etiologies', () => {
  const ex = EXAMPLES.find((e) => e.id === 'mtlehs').patient;
  const hints = E.etiologyHints(ex, E.evaluate(ex, SYN));
  assert.ok(hints.some((h) => h.cat === 'Structural' && /Hippocampal sclerosis/.test(h.text)));
  const none = E.etiologyHints(P({}), []);
  assert.equal(none[0].cat, 'Unknown');
});

test('Excluded list is limited to plausible differentials (>= 2 mandatory criteria matched)', () => {
  const res = E.evaluate(EXAMPLES.find((e) => e.id === 'jme').patient, SYN);
  res.filter((r) => r.status === 'excluded').forEach((r) => assert.ok(r.counts.mandatoryMet >= 2, r.id));
});

test('Every syndrome can be evaluated against an empty patient without error', () => {
  const res = E.evaluate(P({}), SYN);
  assert.deepEqual(res, []); // nothing relevant -> nothing suggested
});

test('Focal semiology implies the focal class (ILAE 2025) for epilepsy type and seizure list', () => {
  const p = P({ findings: { 'sem.hemiclonic': true } });
  assert.equal(E.epilepsyType(p).type, 'Focal epilepsy');
  const c = E.classifySeizures(p);
  assert.ok(c.seizures.some((s) => s.cls === 'Focal'));
  assert.ok(c.notes.some((n) => /consciousness/i.test(n)));
});

test('Familial syndromes only appear when the family history is actually reported', () => {
  const base = EXAMPLES.find((e) => e.id === 'selects').patient;
  assert.equal(byId(E.evaluate(base, SYN), 'FFEVF'), undefined);
  const fam = Object.assign({}, base, { findings: Object.assign({}, base.findings, { 'fh.variable_foci': true }) });
  assert.ok(byId(E.evaluate(fam, SYN), 'FFEVF'));
});

test('SeLNE outranks SeLFNIE for a KCNQ2 neonate once SCN2A is reported negative', () => {
  const res = E.evaluate(EXAMPLES.find((e) => e.id === 'selne').patient, SYN);
  assert.equal(res[0].id, 'SELNE');
  assert.ok(byId(res, 'SELFNIE').counts.alerts >= 1); // "lack of SCN2A" alert fires
});

test('IGE syndromes add a presumed-genetic etiology hint', () => {
  const ex = EXAMPLES.find((e) => e.id === 'cae').patient;
  const hints = E.etiologyHints(ex, E.evaluate(ex, SYN));
  assert.ok(hints.some((h) => /presumed/.test(h.cat)));
});
