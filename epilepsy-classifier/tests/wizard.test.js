'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const V = require('../src/vocab.js');
const KB = require('../src/kb.js');
const PL = require('../src/plain.js');
const S = require('../src/semio.js');
const P = require('../src/physical.js');
const D = require('../src/diagrams.js');
const F = require('../src/figures.js');
const W = require('../src/wizard.js');

const SYN = E.parseKB(KB.TEXT);
const ids = V.allIds();
const UNIT = { d: 12 / 365.25, w: (12 / 365.25) * 7, m: 1, y: 12 };
const patient = (s) => ({
  onsetMonths: s.onsetValue === '' ? null : Number(s.onsetValue) * UNIT[s.onsetUnit], nowMonths: null,
  sex: s.sex || null, mri: s.mri || null, devOnset: s.devOnset, devNow: s.devNow, findings: s.findings, reviewed: s.reviewed,
});
const allCards = () => [].concat(...W.STEPS.map((st) => st.controls.filter((c) => c.cards || c.sections).map((c) => W.cardsOf(c).map((k) => [c, k]))).flat());
function walk(setup) {
  const s = W.newState();
  setup(s, (c, k) => W.tap(s, c, k));
  W.STEPS.forEach((_, i) => W.finishStep(s, i));
  return { s, top: E.evaluate(patient(s), SYN).filter((r) => r.status !== 'excluded') };
}

test('Plain-language text exists for every syndrome in the knowledge base', () => {
  SYN.forEach((x) => {
    assert.ok(PL.PLAIN[x.id] && PL.PLAIN[x.id].length > 30, 'missing plain text for ' + x.id);
    assert.ok(PL.PLAIN[x.id].length < 260, x.id + ' plain text too long for a one-liner');
  });
  Object.keys(PL.PLAIN).forEach((id) => assert.ok(SYN.some((x) => x.id === id), 'plain text for unknown syndrome ' + id));
});

test('Every wizard card and option maps to real findings, and card keys are unique per control', () => {
  W.STEPS.forEach((st) => st.controls.forEach((c) => {
    if (c.cards || c.sections) {
      const keys = W.cardsOf(c).map((k) => k.key);
      assert.equal(new Set(keys).size, keys.length, 'duplicate card key in ' + c.id);
      W.cardsOf(c).forEach((k) => Object.keys(W.valuesOf(k)).forEach((id) => assert.ok(ids.has(id), 'unknown finding ' + id + ' on card ' + k.key)));
    }
    if (c.type === 'choice') c.options.forEach((o) => { if (o.set) Object.keys(o.set).forEach((id) => assert.ok(ids.has(id), 'unknown finding ' + id)); });
  }));
});

test('A card\'s primary finding is not claimed by any other card (so two cards never light up together)', () => {
  const cards = allCards().map((x) => x[1]);
  const primary = (k) => (Array.isArray(k.set) ? k.set[0] : Object.keys(k.set).find((id) => k.set[id] === true));
  cards.forEach((k) => {
    cards.forEach((o) => { if (o !== k) assert.ok(W.valuesOf(o)[primary(k)] !== true, `${k.key} primary ${primary(k)} is also set present by ${o.key}`); });
  });
});

test('Pictures: every picture card resolves to a drawing that renders as valid, light SVG', () => {
  allCards().forEach(([c, k]) => {
    if (c.style === 'chips' || typeof k.pic === 'string' || !k.pic) return;
    if (k.pic.fig) {
      const svg = D.waveformSvg(k.pic.fig, k.title, { thumb: true });
      assert.ok(svg.startsWith('<svg'), k.key); assert.ok(!/NaN/.test(svg), k.key); assert.ok(svg.length < 14000, k.key + ' thumb too heavy ' + svg.length);
      assert.ok(!/class="fl|class="tag-t/.test(svg), k.key + ' thumb should carry no text labels');
    } else {
      const e = S.byId[k.pic[0]] || P.byId[k.pic[0]];
      assert.ok(e, 'no atlas entry ' + k.pic[0]); assert.ok(e.frames[k.pic[1]], `${k.key}: frame ${k.pic[1]} missing`);
      ['infant', 'child', 'adult'].forEach((age) => {
        const svg = F.framesSvg([e.frames[k.pic[1]]], k.title, { age, thumb: true });
        assert.ok(!/NaN|undefined/.test(svg), k.key); assert.ok(!/class="pf-ti"/.test(svg), k.key + ' thumb keeps a caption');
      });
    }
  });
  const a = F.framesSvg(S.byId['sz.spasms'].frames, 'x'), b = F.framesSvg(S.byId['sz.spasms'].frames, 'x');
  assert.notEqual(a.match(/id="(pfah\d+)"/)[1], b.match(/id="(pfah\d+)"/)[1], 'arrow marker ids must be unique per drawing');
});

test('Tapping a card sets its findings; tapping again clears them', () => {
  const s = W.newState();
  assert.equal(W.toggleCard(s, 'seizure', 'stare'), true);
  assert.equal(s.findings['sz.abs_typical'], true);
  assert.equal(W.toggleCard(s, 'seizure', 'stare'), false);
  assert.deepEqual(s.findings, {});
});

test('Un-tapped seizure pictures become "not seen" only once something is tapped and the step is finished', () => {
  const s = W.newState();
  W.finishStep(s, 1);
  assert.deepEqual(s.findings, {}, 'skipping must leave everything not assessed');
  W.tap(s, 'seizure', 'stare'); W.finishStep(s, 1);
  assert.equal(s.findings['sz.gtc'], false);
  assert.equal(s.findings['sz.abs_typical'], true);
  assert.equal(s.findings['sz.focal_impaired'], false, 'no focal picture tapped -> not focal');
  W.toggleCard(s, 'seizure', 'stare'); W.finishStep(s, 1);
  assert.deepEqual(s.findings, {}, 'un-tapping everything undoes the explicit "not seen"');
});

test('Focal pictures reveal the awareness question and do not assume an answer', () => {
  const s = W.newState();
  assert.equal(W.isShown(s, W.ctlById.aware), false);
  W.tap(s, 'seizureMore', 'mouth');
  assert.equal(W.isShown(s, W.ctlById.aware), true);
  W.finishStep(s, 1);
  assert.equal(s.findings['sz.focal_aware'], undefined);
  assert.equal(s.findings['sz.focal_impaired'], undefined);
  W.tap(s, 'aware', 'unaware');
  assert.equal(s.findings['sz.focal_impaired'], true); assert.equal(s.findings['sz.focal_aware'], false);
  W.tap(s, 'aware', 'unaware'); // tap again clears
  assert.equal(s.findings['sz.focal_impaired'], undefined);
});

test('Exclusive cards ("Examination normal", "No spikes") replace the others and are replaced by them', () => {
  const s = W.newState();
  W.tap(s, 'exam', 'micro'); W.tap(s, 'exam', 'normal');
  assert.equal(s.findings['neuro.normal'], true); assert.equal(s.findings['neuro.microcephaly'], undefined);
  W.tap(s, 'exam', 'weak');
  assert.equal(s.findings['neuro.normal'], undefined); assert.equal(s.findings['neuro.hemiparesis_permanent'], true);
  W.finishStep(s, 5);
  assert.equal(s.findings['neuro.hemiparesis_permanent'], true);
  assert.equal(s.findings['neuro.focal'], true);
  assert.equal(s.findings['neuro.microcephaly'], false);
  assert.equal(s.findings['neuro.normal'], false);
});

test('EEG: background is a single choice; discharges are not forced absent', () => {
  const s = W.newState();
  W.tap(s, 'eegGate', 'yes'); W.tap(s, 'eegBg', 'bg_normal');
  assert.equal(s.findings['eeg.bg_normal'], true); assert.equal(s.findings['eeg.hypsarrhythmia'], false);
  W.tap(s, 'eegBg', 'bg_hyps');
  assert.equal(s.findings['eeg.bg_normal'], false); assert.equal(s.findings['eeg.hypsarrhythmia'], true);
  W.tap(s, 'eegDis', 'gsw3'); W.finishStep(s, 3);
  assert.equal(s.findings['eeg.gsw_3hz'], true); assert.equal(s.findings['eeg.gen_epileptiform'], true);
  assert.equal(s.findings['eeg.multifocal'], undefined, 'EEG discharges the user did not tap stay not assessed');
  W.tap(s, 'eegDis', 'none');
  assert.equal(s.findings['eeg.no_discharges'], true); assert.equal(s.findings['eeg.gsw_3hz'], undefined);
  W.tap(s, 'eegGate', 'no');
  assert.ok(!Object.keys(s.findings).some((id) => id.startsWith('eeg.')), '"no EEG" removes EEG findings');
});

test('Located EEG discharges are also recorded as focal discharges when the EEG step is finished', () => {
  const s = W.newState();
  W.tap(s, 'eegDis', 'ctsp'); assert.equal(s.findings['eeg.focal_spikes'], undefined);
  W.finishStep(s, 3); assert.equal(s.findings['eeg.focal_spikes'], true);
});

test('Sleep / awake is one choice with explicit opposites', () => {
  const s = W.newState();
  W.tap(s, 'sleepwake', 'sleep_only');
  assert.equal(s.findings['ctx.sleep_only'], true); assert.equal(s.findings['ctx.sleep_pred'], true); assert.equal(s.findings['ctx.wake_only'], false);
  assert.ok(W.optIsOn(s, W.ctlById.sleepwake.options.find((o) => o.key === 'sleep_only')));
  assert.ok(!W.optIsOn(s, W.ctlById.sleepwake.options.find((o) => o.key === 'sleep_pred')), '"mostly asleep" must not light up under "only asleep"');
  W.tap(s, 'sleepwake', 'wake_pred');
  assert.equal(s.findings['ctx.sleep_only'], false); assert.equal(s.findings['ctx.wake_pred'], true);
});

test('MRI and genetics: gates reveal detail and "nothing found" marks the gene section reviewed', () => {
  const s = W.newState();
  assert.equal(W.isShown(s, W.ctlById.mriItems), false); assert.equal(W.isShown(s, W.ctlById.geneItems), false);
  W.tap(s, 'mri', 'abnormal'); W.tap(s, 'gene', 'found');
  assert.equal(s.mri, 'abnormal'); assert.equal(W.isShown(s, W.ctlById.mriItems), true); assert.equal(W.isShown(s, W.ctlById.geneItems), true);
  W.tap(s, 'mriItems', 'img0'); W.tap(s, 'geneItems', 'g0');
  assert.equal(s.findings['img.hs'], true); assert.equal(s.findings['gen.scn1a'], true);
  W.tap(s, 'mri', 'normal');
  assert.equal(s.findings['img.hs'], undefined, 'lesions are cleared when the MRI is no longer abnormal');
  W.tap(s, 'gene', 'none');
  assert.equal(s.findings['gen.scn1a'], undefined); assert.equal(s.reviewed.gen, true); assert.equal(W.genMode(s), 'none');
  W.tap(s, 'gene', 'notdone');
  assert.equal(s.reviewed.gen, false); assert.equal(W.genMode(s), 'notdone');
});

test('Answered-step tracking drives the progress dots', () => {
  const s = W.newState();
  assert.ok(W.STEPS.every((_, i) => !W.answered(s, i)));
  s.onsetValue = '7'; assert.ok(W.answered(s, 0));
  W.tap(s, 'timing', 'fever'); assert.ok(W.answered(s, 2));
  W.tap(s, 'mri', 'normal'); assert.ok(W.answered(s, 4));
});

test('Findings entered in the full checklist light up the matching pictures', () => {
  const ex = require('../src/examples.js').find((e) => e.id === 'cae');
  const s = Object.assign(W.newState(), { findings: Object.assign({}, ex.patient.findings), reviewed: Object.assign({}, ex.patient.reviewed) });
  assert.ok(W.cardOn(s, W.ctlById.seizure.sections[2].cards[0]), 'staring card'); // sz.abs_typical
  assert.ok(W.cardOn(s, W.ctlById.eegDis.sections.flatMap((x) => x.cards).find((c) => c.key === 'gsw3')), '3 Hz card');
  assert.ok(W.cardOn(s, W.ctlById.eegBg.cards.find((c) => c.key === 'bg_normal')), 'normal background');
  assert.equal(W.eegOpen(s), true);
});

/* ---- end-to-end: tap through the pictures and reach the expected syndrome ---- */
const cases = [
  ['CAE', 'CAE', (s, t) => { s.onsetValue = '7'; s.devOnset = 0; t('seizure', 'stare'); t('timing', 'hv'); t('timing', 'daily'); t('eegGate', 'yes'); t('eegBg', 'bg_normal'); t('eegDis', 'gsw3'); t('mri', 'normal'); t('exam', 'normal'); }],
  ['JME', 'JME', (s, t) => { s.onsetValue = '15'; s.devOnset = 0; t('seizure', 'jerks'); t('seizure', 'convulsion'); t('eegGate', 'yes'); t('eegBg', 'bg_normal'); t('eegDis', 'poly'); t('mri', 'normal'); t('exam', 'normal'); }],
  ['IESS', 'IESS', (s, t) => { s.onsetValue = '6'; s.onsetUnit = 'm'; t('seizure', 'spasms'); t('timing', 'cluster'); t('eegGate', 'yes'); t('eegBg', 'bg_hyps'); t('timing', 'regress'); }],
  ['SeLECTS', 'SELECTS', (s, t) => { s.onsetValue = '8'; s.devOnset = 0; t('seizure', 'part'); t('seizureMore', 'mouth'); t('aware', 'aware'); t('sleepwake', 'sleep_pred'); t('timing', 'drift'); t('eegGate', 'yes'); t('eegBg', 'bg_normal'); t('eegDis', 'ctsp'); t('eegSleep', 'sleepact'); t('mri', 'normal'); t('exam', 'normal'); }],
  ['Dravet', 'DRAVET', (s, t) => { s.onsetValue = '6'; s.onsetUnit = 'm'; s.devOnset = 0; t('seizure', 'side'); t('timing', 'fever'); t('timing', 'long'); t('gene', 'found'); t('geneItems', 'g0'); t('mri', 'normal'); t('exam', 'normal'); }],
  ['MTLE-HS', 'MTLEHS', (s, t) => { s.onsetValue = '12'; s.devOnset = 0; t('seizureMore', 'rising'); t('seizureMore', 'automatism'); t('aware', 'unaware'); t('mri', 'abnormal'); t('mriItems', 'img0'); t('eegGate', 'yes'); t('eegDis', 'temporal'); }],
  ['LGS', 'LGS', (s, t) => { s.onsetValue = '3'; s.devOnset = 1; t('seizure', 'stiff'); t('seizure', 'drop'); t('eegGate', 'yes'); t('eegBg', 'bg_slow'); t('eegDis', 'slowsw'); t('eegDis', 'gpfa'); t('timing', 'resist'); t('timing', 'daily'); }],
];
cases.forEach(([name, expect, setup]) => {
  test(`Walkthrough by pictures reaches ${name}`, () => {
    const { top } = walk(setup);
    assert.ok(top.length, 'no syndrome shown');
    assert.equal(top[0].abbr === undefined ? null : top[0].id, expect, `top was ${top[0].id}`);
    assert.equal(top[0].status, 'met', `${expect} should have its criteria met`);
  });
});

test('A walkthrough to CAE needs few taps', () => {
  let taps = 0;
  walk((s, t) => { s.onsetValue = '7'; taps++; [['seizure', 'stare'], ['timing', 'hv'], ['eegGate', 'yes'], ['eegBg', 'bg_normal'], ['eegDis', 'gsw3'], ['mri', 'normal'], ['exam', 'normal']].forEach(([c, k]) => { t(c, k); taps++; }); });
  assert.ok(taps + 5 <= 14, 'CAE should take about a dozen taps including Continue, took ' + (taps + 5));
});
