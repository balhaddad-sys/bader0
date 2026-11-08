'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const V = require('../src/vocab.js');
const KB = require('../src/kb.js');
const P = require('../src/physical.js');
const S = require('../src/semio.js');
const F = require('../src/figures.js');
const SYN = E.parseKB(KB.TEXT);
const pt = (o) => Object.assign({ onsetMonths: null, nowMonths: null, sex: null, findings: {}, reviewed: {}, mri: null, devOnset: null, devNow: null }, o);

test('Physical signs: ids/aliases are real findings; content complete; frames render', () => {
  const ids = V.allIds();
  P.ITEMS.forEach((m) => {
    [m.id].concat(m.alias || []).forEach((id) => assert.ok(ids.has(id), 'unknown finding ' + id));
    assert.ok(P.GROUPS.includes(m.group) && m.summary.length > 40 && m.pitfall.length > 20 && m.basis.length > 20, m.id);
    assert.ok(m.features.length >= 3 && m.frames.length >= 1 && m.frames.length <= 3, m.id);
    const svg = F.framesSvg(m.frames, m.name);
    assert.ok(svg.startsWith('<svg') && !/NaN|undefined|Infinity/.test(svg) && svg.length < 80000, m.id);
  });
  assert.equal(new Set(P.ITEMS.map((m) => m.id)).size, P.ITEMS.length);
  assert.ok(P.ITEMS.length >= 11);
});

test('Physical signs do not collide with movement or EEG ids', () => {
  P.ITEMS.forEach((m) => assert.equal(S.byId[m.id], undefined, m.id));
});

test('Skin-sign entries cite the consensus criteria, not the ILAE papers', () => {
  ['neuro.hypopigmented_macules', 'neuro.angiofibromas'].forEach((id) => assert.ok(P.byId[id].refs.some((r) => /Northrup H.*Pediatr Neurol 2021;123:50/.test(r)), id));
  assert.ok(P.byId['neuro.cafe_au_lait'].refs.some((r) => /Legius E.*Genet Med 2021;23:1506/.test(r)));
  ['neuro.hypopigmented_macules', 'neuro.angiofibromas', 'neuro.cafe_au_lait'].forEach((id) => assert.match(P.byId[id].basis, /Not described in the ILAE syndrome papers/));
});

test('ILAE-grounded statements are present (SWS V1 alert, GLUT1 testing with microcephaly, MEI dysmorphism)', () => {
  assert.match(P.byId['neuro.facial_angioma_v1'].features.map((f) => f[1]).join(' '), /absence of a facial capillary malformation in the V1 distribution is an alert/);
  assert.match(P.byId['neuro.microcephaly'].features.map((f) => f[1]).join(' '), /SLC2A1/);
  assert.match(P.byId['neuro.dysmorphism'].features.map((f) => f[1]).join(' '), /exclusionary/);
});

test('Knowledge base actually uses the physical findings it describes', () => {
  const used = (id) => SYN.filter((s) => s.criteria.some((c) => c.expr && E.collectIds(c.expr, new Set()).has(id))).map((s) => s.id);
  assert.ok(used('neuro.facial_angioma_v1').includes('SWS'));
  assert.ok(used('neuro.dysmorphism').includes('MEI'));
  assert.ok(used('neuro.hypotonia').includes('HHGS'));
  assert.ok(used('neuro.visual_field_deficit').includes('COVE'));
  assert.ok(used('neuro.movement_disorder').includes('GLUT1DS'));
});

test('Etiology clues and next steps respond to the new physical findings', () => {
  const skin = pt({ onsetMonths: 6, findings: { 'sz.spasms': true, 'neuro.hypopigmented_macules': true } });
  const hints = E.etiologyHints(skin, E.evaluate(skin, SYN));
  assert.ok(hints.some((h) => /Neurocutaneous/.test(h.cat) && /tuberous sclerosis/i.test(h.text)));
  const micro = pt({ onsetMonths: 30, findings: { 'sz.abs_typical': true, 'neuro.microcephaly': true } });
  assert.ok(E.nextSteps(micro, E.evaluate(micro, SYN)).some((s) => /GLUT1/.test(s)));
  const dys = pt({ findings: { 'neuro.dysmorphism': true } });
  assert.ok(E.nextSteps(dys, []).some((s) => /chromosomal microarray/.test(s)));
  const sws = pt({ findings: { 'neuro.facial_angioma_v1': true } });
  assert.ok(E.etiologyHints(sws, []).some((h) => /Sturge–Weber/.test(h.text)));
});

test('Body proportions: infant/child/adult scale about the ground line; head grows relatively', () => {
  const a = F.body({ age: 'adult' }), c = F.body({ age: 'child' }), i = F.body({ age: 'infant' });
  assert.match(a, /scale\(1\)/); assert.match(c, /scale\(0\.86\)/); assert.match(i, /scale\(0\.7\)/);
  assert.match(i, /r="29"/); assert.match(c, /r="21"/); assert.match(a, /r="17"/);
  assert.notEqual(F.framesSvg([{ kind: 'body', title: 't', spec: {} }], 'x', { age: 'child' }), F.framesSvg([{ kind: 'body', title: 't', spec: {} }], 'x', { age: 'adult' }));
  // an explicit age on a frame overrides the page-level body size
  assert.equal(F.framesSvg([{ kind: 'body', title: 't', spec: { age: 'infant' } }], 'x', { age: 'adult' }), F.framesSvg([{ kind: 'body', title: 't', spec: { age: 'infant' } }], 'x', { age: 'child' }));
  assert.equal(F.body({ infant: true }), F.body({ age: 'infant' })); // backward-compatible alias
});

test('Per-limb scaling shortens an atrophic limb', () => {
  assert.notEqual(F.body({ limbScale: { armR: 0.7 } }), F.body({}));
});

test('Custom diagrams render', () => {
  ['headsizes', 'visualfield'].forEach((k) => { const s = F.custom(k); assert.ok(s.length > 100 && !/NaN/.test(s), k); });
});
