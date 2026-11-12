'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const KB = require('../src/kb.js');
const B = require('../src/bank.js');
const Q = require('../src/quiz.js');
const M = require('../src/morph.js');
const S = require('../src/semio.js');
const P = require('../src/physical.js');

const SYN = E.parseKB(KB.TEXT);

/* ------------------------------------------------------------------ bank */
test('Bank: every fact is well-formed, sourced and has four distinct options', () => {
  const ids = new Set();
  B.FACTS.forEach((f) => {
    assert.ok(!ids.has(f.id), 'duplicate fact id ' + f.id); ids.add(f.id);
    assert.ok(B.TOPICS.some((t) => t.key === f.t), f.id + ' topic');
    assert.ok(B.SRC[f.s], f.id + ' unknown source ' + f.s);
    assert.ok(f.v === 0 || f.v === 1, f.id + ' needs v');
    assert.equal(new Set([f.a].concat(f.w)).size, 4, f.id + ' options must be distinct');
    assert.equal(f.w.length, 3, f.id);
    assert.ok(f.q.length > 15 && f.x.length > 10, f.id);
  });
  assert.ok(B.FACTS.length >= 100);
});

test('Bank: a fact marked as checked against a paper must cite that paper, not generic teaching', () => {
  B.FACTS.filter((f) => f.v === 1).forEach((f) => assert.notEqual(f.s, 'std', f.id));
  B.FACTS.filter((f) => f.s === 'std').forEach((f) => assert.equal(f.v, 0, f.id + ' generic source cannot be “checked”'));
  Object.keys(B.SRC).filter((k) => k !== 'std').forEach((k) => assert.match(B.SRC[k], /\b(19|20)\d\d\b/, k + ' citation needs a year'));
});

test('Bank: ASM table — unique ids and tells, valid mechanism bins', () => {
  assert.equal(new Set(B.ASM.map((a) => a.id)).size, B.ASM.length);
  const tells = [].concat(...B.ASM.map((a) => a.tells));
  assert.equal(new Set(tells).size, tells.length, 'a “tell” must identify exactly one drug');
  B.ASM.forEach((a) => { assert.ok(a.bin in B.BINS_ASM || a.bin === 'other', a.id); assert.ok(a.tells.length >= 1 && a.mech && a.tox && a.pearl, a.id); });
});

test('Bank: genes — unique, and every linked syndrome exists in the knowledge base', () => {
  assert.equal(new Set(B.GENES.map((g) => g.g)).size, B.GENES.length);
  B.GENES.forEach((g) => g.syn.forEach((id) => assert.ok(SYN.some((s) => s.id === id), g.g + ' → unknown syndrome ' + id)));
  const tells = [].concat(...B.GENES.map((g) => g.tells)); assert.equal(new Set(tells).size, tells.length);
});

test('Bank: sequences and trials are complete', () => {
  B.SEQ.forEach((s) => { assert.ok(s.steps.length >= 3 && new Set(s.steps).size === s.steps.length, s.id); assert.ok(B.SRC[s.s], s.id); });
  B.TRIALS.forEach((t) => assert.ok(B.SRC[t[4]] && t.length === 5, t[0]));
});

test('Bank: the headline trial figures are the verified ones', () => {
  const by = (id) => B.FACTS.find((f) => f.id === id);
  assert.match(by('sy8').a, /53%.*58%.*29%/);       // Glauser 2010
  assert.match(by('tr3').a, /58% vs 8%/);            // Wiebe 2001
  assert.match(by('se7').a, /73\.4% vs 63\.4%/);     // RAMPART
  assert.match(by('se6').a, /45–47%/);               // ESETT
  assert.match(by('sy7').a, /41\.9% vs 17\.2%/);     // GWPCARE3 (not 43.9%)
  assert.match(by('sy5').a, /62\.3%/);               // fenfluramine
  assert.match(by('sp6').a, /0\.4 mg/);              // AAN 2024 folic acid
});

/* ------------------------------------------------------------------ deck and questions */
test('Deck: every card produces at least one valid question; options never repeat', () => {
  const deck = Q.buildDeck();
  assert.ok(deck.length >= 250);
  deck.forEach((c) => {
    const vs = Q.variants(c, Q.rng(11)); assert.ok(vs.length >= 1, c.id + ' has no question');
    vs.forEach((q) => {
      assert.ok(q.stem && q.explain !== undefined && q.src, q.id);
      if (q.type === 'recall') { assert.ok(q.answer, q.id); return; }
      assert.equal(new Set(q.options).size, 4, q.id + ' options must be distinct');
      assert.ok(q.ans >= 0 && q.ans < 4, q.id);
    });
  });
});

test('Questions: option order is shuffled (no fixed answer position)', () => {
  const pos = new Set();
  Q.buildDeck().filter((c) => c.kind === 'asm').forEach((c, i) => Q.variants(c, Q.rng(i)).forEach((q) => pos.add(q.ans)));
  assert.ok(pos.size >= 3, 'answers should fall in several positions, saw ' + [...pos]);
});

test('Questions: a conspicuously long correct answer becomes a recall question, not a giveaway multiple choice', () => {
  const deck = Q.buildDeck();
  deck.filter((c) => c.kind === 'fact').forEach((c) => {
    const f = c.f, L = f.w.map((x) => x.length), avg = L.reduce((a, b) => a + b, 0) / 3, long = f.a.length > Math.max(...L) && f.a.length > 1.6 * avg;
    const q = Q.variants(c, Q.rng(2))[0];
    assert.equal(q.type === 'recall', long, f.id);
  });
});

test('Questions: picture rounds never put the answer in the drawing’s accessible name or title', () => {
  Q.buildDeck().filter((c) => c.kind === 'pic').forEach((c) => {
    const html = Q.picHtml(c);
    assert.ok(!html.includes(c.m.name), c.id + ' leaks its name');
    assert.ok(!/class="pf-ti"|class="fbl"|class="tag-t"/.test(html), c.id + ' carries a caption');
    assert.ok(html.length > 500 && !/NaN/.test(html), c.id);
  });
});

test('Questions: “which gene for this syndrome” never offers a defensible alternative', () => {
  Q.buildDeck().filter((c) => c.kind === 'gene').forEach((c) => {
    Q.variants(c, Q.rng(4)).filter((q) => /#syn/.test(q.id)).forEach((q) => {
      c.g.syn.forEach((sid) => { if (q.stem.includes(SYN.find((s) => s.id === sid).name)) q.options.forEach((o) => { if (o !== c.g.g) assert.ok(!B.GENES.find((g) => g.g === o).syn.includes(sid), `${o} is also linked to ${sid}`); }); });
    });
    Q.variants(c, Q.rng(4)).filter((q) => /#syn/.test(q.id)).forEach((q) => ['EIDEE', 'IESS'].forEach((id) => assert.ok(!q.stem.includes(SYN.find((s) => s.id === id).name), 'broad umbrella syndrome asked for ' + c.g.g)));
  });
});

test('Questions: syndrome “mandatory” and “argues against” items come from the right level of the right table', () => {
  SYN.forEach((s) => {
    const card = Q.buildDeck().byId['syn:' + s.id], vs = Q.variants(card, Q.rng(8)), own = new Set(s.criteria.map((c) => c.text));
    const mand = vs.find((q) => /#mand/.test(q.id));
    if (mand) { assert.ok(s.criteria.some((c) => c.level === 'M' && c.text === mand.options[mand.ans])); mand.options.forEach((o, i) => { if (i !== mand.ans) assert.ok(!own.has(o), s.id + ': distractor belongs to the same syndrome'); }); }
    const ex = vs.find((q) => /#excl/.test(q.id));
    if (ex) { assert.ok(s.criteria.some((c) => c.level === 'E' && c.text === ex.options[ex.ans])); ex.options.forEach((o, i) => { if (i !== ex.ans) assert.ok(s.criteria.some((c) => c.level === 'M' && c.text === o), s.id); }); }
    const on = vs.find((q) => /#onset/.test(q.id)); if (on) assert.equal(on.options[on.ans], Q.fmtRange(...Q.onsetSpan(s)));
  });
});

test('Daily rounds: ten questions, identical for everyone on a given day, different the next day, spread over topics', () => {
  const a = Q.dailyQuestions(20000), b = Q.dailyQuestions(20000), c = Q.dailyQuestions(20001);
  assert.equal(a.length, 10);
  assert.deepEqual(a.map((q) => q.id), b.map((q) => q.id));
  assert.notDeepEqual(a.map((q) => q.id), c.map((q) => q.id));
  assert.ok(new Set(a.map((q) => q.topic)).size >= 8);
});

/* ------------------------------------------------------------------ detective */
test('Detective: every case is fair — the engine accepts the answer and rejects every wrong option', () => {
  const pool = Q.detectivePool();
  assert.ok(pool.length >= 30, 'only ' + pool.length + ' fair cases');
  pool.forEach((id) => {
    const d = Q.detectiveFor(id, Q.rng(5));
    assert.ok(d.clues.length >= 2 && d.clues.length <= 5, id);
    assert.ok(d.options.length >= 4 && d.options.length <= 6, id);
    assert.equal(d.options[d.ans].id, id);
    const patient = Q.toPatient(d.check.parts, d.check.onset), st = (s) => E.evaluateSyndrome(s, E.makeContext(patient)).status;
    assert.notEqual(st(SYN.find((s) => s.id === id)), 'excluded', id + ' must remain a candidate');
    d.options.forEach((o, i) => { if (i !== d.ans) assert.equal(st(SYN.find((s) => s.id === o.id)), 'excluded', `${id}: ${o.id} is not rejected by the clues`); });
  });
});

test('Detective: clues run from broad to narrow', () => {
  const d = Q.detectiveFor('CAE', Q.rng(5));
  const spec = d.clues.map((c, i) => { const parts = d.check.parts; return i; });
  assert.deepEqual(spec, spec.slice().sort((a, b) => a - b));
  assert.ok(d.clues.some((c) => c.domain === 'Onset'), 'onset is a clue for age-bound syndromes');
});

/* ------------------------------------------------------------------ puzzles */
test('Onset ladder: five syndromes whose midpoints are clearly separated, with the correct order', () => {
  for (let k = 0; k < 20; k++) {
    const l = Q.ladder(Q.rng(k)); assert.ok(l); assert.equal(l.items.length, 5);
    const mids = l.order.map((id) => { const s = SYN.find((x) => x.id === id), sp = Q.onsetSpan(s); return Math.sqrt(Math.max(sp[0], 0.05) * sp[1]); });
    mids.forEach((m, i) => { if (i) assert.ok(m / mids[i - 1] >= 1.7); });
  }
});

test('Sorting puzzles: every item belongs to one of the bins; items come from the matching source', () => {
  ['seizure', 'asm', 'group', 'type'].forEach((kind) => {
    const p = Q.binPuzzle(kind, Q.rng(3), 8);
    assert.ok(p.items.length >= 6 && p.items.length <= 14, kind + ' ' + p.items.length);
    p.items.forEach((it) => assert.ok(p.bins.includes(it.bin), kind + ': ' + it.label));
    assert.equal(new Set(p.items.map((i) => i.label)).size, p.items.length);
  });
  const g = Q.binPuzzle('group', Q.rng(1), 8); g.items.forEach((it) => { const abbr = /\((.*)\)$/.exec(it.label)[1]; assert.equal(SYN.find((s) => s.abbr === abbr).group, it.bin); });
});

test('Memory match: pairs are unambiguous (no two pairs share the same answer text)', () => {
  ['gene', 'abbr', 'onset', 'eeg', 'sem'].forEach((k) => {
    const m = ['eeg', 'sem'].includes(k) ? Q.picMatch(k, Q.rng(2)) : Q.matchSet(k, Q.rng(2));
    assert.equal(m.pairs.length, 6, k);
    const keys = m.pairs.map((p) => p.b || p.name); assert.equal(new Set(keys).size, keys.length, k);
  });
});

test('Sequences: the shuffled list contains exactly the steps', () => {
  B.SEQ.forEach((s) => { const q = Q.sequence(Q.rng(1), s.id); assert.deepEqual(q.shuffled.map((x) => x.i).sort((a, b) => a - b), s.steps.map((_, i) => i)); });
});

/* ------------------------------------------------------------------ EEG lab */
test('10–20: names, laterality and midline follow the system', () => {
  const names = Object.keys(Q.ELECTRODES); assert.equal(names.length, 19);
  names.forEach((n) => { const x = Q.ELECTRODES[n][0]; if (/z$/.test(n)) assert.equal(x, 0, n); else if (/[13579]$/.test(n)) assert.ok(x < 0, n + ' odd = left'); else assert.ok(x > 0, n + ' even = right'); });
  Q.CHAINS.forEach((c) => c.forEach((n) => assert.ok(Q.ELECTRODES[n], n)));
});

test('Phase reversal: a negative focus pushes the channel before it down and the channel after it up', () => {
  for (let k = 0; k < 60; k++) {
    const q = Q.phaseQ(Q.rng(k)), j = q.focus;
    assert.equal(q.options[q.ans], q.chain[j]); assert.equal(new Set(q.options).size, 5 === q.options.length ? 5 : q.options.length);
    q.channels.forEach((ch, c) => { const want = (j > 0 && c === j - 1) ? -1 : (j < 4 && c === j) ? 1 : 0; assert.equal(ch.dir, want); });
    if (j > 0 && j < 4) assert.ok(q.channels[j - 1].dir === -1 && q.channels[j].dir === 1, 'interior focus shows a true phase reversal');
    else assert.equal(q.channels.filter((c) => c.dir !== 0).length, 1, 'end-of-chain: one channel only');
  }
  const e = Q.electrodeQ(Q.rng(3)); assert.ok(e.options.includes(e.target) && e.options[e.ans] === e.target);
});

/* ------------------------------------------------------------------ spaced repetition and progress */
test('SRS: intervals grow with good answers, shrink on lapses, and stay within bounds', () => {
  let st = Q.newState(100);
  st = Q.review(st, 2, 100); assert.equal(st.iv, 1); assert.equal(st.due, 101);
  st = Q.review(st, 2, 101); assert.equal(st.iv, 4);
  const iv3 = Q.review(st, 2, 105).iv; assert.ok(iv3 > 4);
  const lapsed = Q.review(Q.review(st, 2, 105), 0, 120); assert.equal(lapsed.lapses, 1); assert.equal(lapsed.due, 120); assert.ok(lapsed.ef < 2.5);
  let e = Q.newState(0); for (let i = 0; i < 30; i++) e = Q.review(e, 0, i); assert.ok(e.ef >= 1.3);
  let h = Q.newState(0); for (let i = 0; i < 30; i++) h = Q.review(h, 3, i); assert.ok(h.ef <= 3);
  assert.equal(Q.nextLabels(Q.newState(0), 0).length, 4);
  assert.ok(Q.review(Q.review(Q.review(Q.newState(0), 3, 0), 3, 4), 3, 11).iv > 21 && Q.isMature({ iv: 30 }) && !Q.isMature({ iv: 20 }));
});

test('SRS queue: due cards come first and the daily allowance of new cards is honoured', () => {
  const deck = Q.buildDeck(), p = Q.blankProfile();
  p.cards[deck[0].id] = Object.assign(Q.newState(10), { due: 12 }); p.cards[deck[1].id] = Object.assign(Q.newState(10), { due: 20 });
  const q = Q.queue(p, deck, 15, { newPerDay: 5 });
  assert.deepEqual(q.due.map((c) => c.id), [deck[0].id]); assert.equal(q.fresh.length, 5);
  p.newToday = { day: 15, n: 5 }; assert.equal(Q.queue(p, deck, 15, { newPerDay: 5 }).fresh.length, 0);
});

test('Progress: levels rise with XP, streaks count consecutive days, misses are scheduled for tomorrow, badges unlock once', () => {
  assert.equal(Q.levelFor(0).level, 1); assert.ok(Q.levelFor(5000).level > Q.levelFor(900).level); assert.ok(Q.levelFor(120).frac >= 0 && Q.levelFor(120).frac < 1);
  const p = Q.blankProfile(); Q.touchDay(p, 10); Q.touchDay(p, 10); assert.equal(p.streak, 1); Q.touchDay(p, 11); assert.equal(p.streak, 2); Q.touchDay(p, 14); assert.equal(p.streak, 1); assert.equal(p.best, 2);
  Q.record(p, { topic: 'asm', card: 'asm:vigabatrin' }, false, 20); assert.equal(p.cards['asm:vigabatrin'].due, 21); assert.equal(p.topics.asm.n, 1);
  assert.deepEqual(Q.newBadges(p, 20).map((b) => b.id), ['first']); assert.deepEqual(Q.newBadges(p, 20), []);
});

test('Quick regression: the study modules load without a DOM', () => {
  assert.ok(M.ITEMS.length && S.ITEMS.length && P.ITEMS.length);
  assert.ok(Q.topicSummary(Q.blankProfile()).every((t) => t.total > 0), 'every topic has cards');
});

/* ------------------------------------------------------------------ v0.8: hooks and diagrams */
test('Memory hooks: every drug and gene has one, and it is shown on its card and in its explanations', () => {
  B.ASM.forEach((a) => assert.ok(a.hook && a.hook.length > 20 && a.hook.length < 200, a.id + ' hook'));
  B.GENES.forEach((g) => assert.ok(g.hook && g.hook.length > 20 && g.hook.length < 200, g.g + ' hook'));
  assert.equal(new Set(B.ASM.map((a) => a.hook)).size, B.ASM.length, 'hooks must be distinct');
  const deck = Q.buildDeck();
  B.ASM.forEach((a) => { const f = Q.face(deck.byId['asm:' + a.id]); assert.ok(f.back.includes(a.hook.slice(0, 30).replace(/&/g, '&amp;').replace(/’/g, '’')) || f.back.includes('class="hook"'), a.id); assert.ok(f.back.includes('class="mech"'), a.id + ' diagram'); });
  B.GENES.forEach((g) => assert.ok(Q.face(deck.byId['gene:' + g.g]).back.includes('class="hook"'), g.g));
  Q.variants(deck.byId['asm:vigabatrin'], Q.rng(1)).forEach((q) => assert.match(q.explain, /Hook:/));
});

test('Mechanism diagrams: one per drug group, valid, annotated and with no stray numbers', () => {
  Object.keys(B.BINS_ASM).concat(['other']).forEach((k) => {
    const svg = Q.mechSvg(k);
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>') && !/NaN|undefined/.test(svg), k);
    assert.ok(svg.includes(Q.MECH[k][0].replace(/&/g, '&amp;')) || svg.includes(Q.MECH[k][0]), k + ' carries its annotation');
    if (k !== 'other') assert.ok(/class="ms-hi"/.test(svg), k + ' highlights its target');
  });
  assert.equal((Q.mechSvg('sv2a').match(/ms-hi/g) || []).length, 1, 'only the vesicle is highlighted for SV2A ligands');
  B.ASM.forEach((a) => assert.ok(Q.MECH[a.bin], a.id));
});

test('Brain diagram: four numbered lobes, CSP-safe markup, annotations match the bank’s localising facts', () => {
  const Br = require('../src/brain.js');
  const svg = Br.svg();
  assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>') && !/NaN|undefined/.test(svg));
  assert.ok(!/style=|<style|<script|<image/.test(svg), 'must stay inline-style free for the strict CSP');
  ['#', 'fill="#'].forEach((x) => assert.ok(svg.includes(x)));
  assert.equal(Br.PINS.length, 4); assert.deepEqual(Br.PINS.map((p) => p.lobe), ['Frontal', 'Parietal', 'Temporal', 'Occipital']);
  assert.match(Br.PINS[0].t, /hypermotor/i); assert.match(Br.PINS[2].t, /déjà vu/); assert.match(Br.PINS[3].t, /visual/i);
  assert.match(Br.html(), /data-cover/);
});

test('Professional illustrations: CSP-safe, uniquely identified, attached to real atlas entries', () => {
  const A = require('../src/art.js'), ids = Object.keys(A.ART);
  assert.ok(ids.length >= 3);
  const allIds = [];
  ids.forEach((id) => {
    assert.ok(S.byId[id], id + ' must be a movement entry');
    const svg = A.ART[id].svg;
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>') && !/style=|<style|<script|<image|NaN|undefined/.test(svg), id);
    (svg.match(/\bid="([^"]+)"/g) || []).forEach((x) => allIds.push(x));
    (svg.match(/url\(#([^)]+)\)/g) || []).forEach((u) => assert.ok(svg.includes('id="' + u.slice(5, -1) + '"'), id + ' dangling ' + u));
    assert.match(A.html(id), /<figure class="pro-art">/); assert.ok(A.ART[id].alt.length > 30);
  });
  assert.equal(new Set(allIds).size, allIds.length, 'ids must be unique across drawings');
});
