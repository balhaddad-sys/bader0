'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const V = require('../src/vocab.js');
const S = require('../src/semio.js');
const F = require('../src/figures.js');

test('Movements: every entry id/alias is a real finding and has complete content', () => {
  const ids = V.allIds();
  S.ITEMS.forEach((m) => {
    [m.id].concat(m.alias || []).forEach((id) => assert.ok(ids.has(id), 'unknown finding id ' + id));
    assert.ok(S.GROUPS.includes(m.group), m.id);
    assert.ok(m.summary.length > 30 && m.pitfall.length > 20 && m.basis.length > 20, m.id);
    assert.ok(m.features.length >= 2 && m.features.every((f) => f[0] && f[1].length > 15), m.id);
    assert.ok(m.frames.length >= 1 && m.frames.length <= 3, m.id);
    m.frames.forEach((f) => assert.ok(f.title && ['body', 'face'].includes(f.kind), m.id + ' frame'));
  });
  assert.equal(new Set(S.ITEMS.map((m) => m.id)).size, S.ITEMS.length);
  assert.ok(S.ITEMS.length >= 24);
});

test('Movements: aliases resolve to the same entry', () => {
  assert.equal(S.byId['sz.clonic'], S.byId['sz.gtc']);
  assert.equal(S.byId['sem.behavioral_arrest'], S.byId['sz.abs_typical']);
});

test('Figures: every entry renders valid, bounded SVG with an accessible name', () => {
  S.ITEMS.forEach((m) => {
    const svg = F.framesSvg(m.frames, m.name);
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), m.id);
    assert.ok(!/NaN|undefined|Infinity/.test(svg), m.id + ' has invalid numbers');
    assert.ok(svg.length < 60000, m.id + ' too large ' + svg.length);
    assert.match(svg, /role="img" aria-label="Schematic: /, m.id);
  });
});

test('Inverse kinematics keeps limbs the right length and never over-reaches', () => {
  const S0 = [74, 74], l1 = 40, l2 = 36;
  [[200, 200], [60, 60], [74, 80], [10, 10], [150, 74]].forEach((t) => {
    const r = F.ik(S0, t, l1, l2, 'out');
    assert.ok(Math.abs(Math.hypot(r.E[0] - S0[0], r.E[1] - S0[1]) - l1) < 0.01);
    assert.ok(Math.abs(Math.hypot(r.T[0] - r.E[0], r.T[1] - r.E[1]) - l2) < 0.01);
  });
  const far = F.ik(S0, [500, 500], l1, l2, 'out'); // clamped to reach
  assert.ok(Math.hypot(far.T[0] - S0[0], far.T[1] - S0[1]) <= l1 + l2);
});

test('Movement descriptors feed the classification: focal-only postures imply the focal class', () => {
  const t = (id) => E.epilepsyType({ findings: { [id]: true }, reviewed: {} }).type;
  ['sem.fencing', 'sem.dystonic', 'sem.automatism', 'sem.ictal_paresis'].forEach((id) => assert.equal(t(id), 'Focal epilepsy', id));
  assert.notEqual(t('sem.figure4'), 'Focal epilepsy'); // occurs in the tonic phase of a tonic–clonic seizure; no class implied
  assert.equal(t('sz.neg_myoclonus'), 'Generalized epilepsy');
});

test('Lateralizing claims in the atlas cite the verified studies', () => {
  const f4 = S.byId['sem.figure4'], dy = S.byId['sem.dystonic'];
  assert.match(f4.features.map((f) => f[1]).join(' '), /35 of 39/);
  assert.ok(f4.refs.some((r) => /Kotagal P.*Epilepsia 2000;41:457/.test(r)));
  assert.match(dy.features.map((f) => f[1]).join(' '), /92%/);
  assert.ok(dy.refs.some((r) => /Bleasel A.*Epilepsia 1997;38:168/.test(r)));
});
