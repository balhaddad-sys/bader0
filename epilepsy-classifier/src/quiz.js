/*
 * Study engine (pure — no DOM, no storage): deck, question generators, puzzles, spaced repetition, XP.
 *
 * Everything about syndromes, EEG patterns, movements and signs is generated from kb.js / morph.js / semio.js /
 * physical.js, so the games can never disagree with the scorer. Hand-written content lives in bank.js.
 *
 * The Syndrome Detective is checked with the real rule engine: clues are the syndrome's own mandatory criteria,
 * ordered from least to most specific, and every wrong option is a syndrome the engine REJECTS for the full clue set —
 * so a fair question has exactly one defensible answer.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./vocab.js'), require('./engine.js'), require('./kb.js'), require('./bank.js'), require('./plain.js'), require('./morph.js'), require('./semio.js'), require('./physical.js'), require('./diagrams.js'), require('./figures.js'));
  } else {
    root.EpiQuiz = factory(root.EpiVocab, root.EpiEngine, root.EpiKB, root.EpiBank, root.EpiPlain, root.EpiMorph, root.EpiSemio, root.EpiPhysical, root.EpiDiagrams, root.EpiFigures);
  }
})(typeof self !== 'undefined' ? self : this, function (V, E, KB, B, PL, M, S, P, D, F) {
  'use strict';
  const SYN = E.parseKB(KB.TEXT);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ============================================================ random helpers */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const shuffle = (a, r) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  const sample = (a, n, r) => shuffle(a, r).slice(0, n);
  const uniq = (a) => Array.from(new Set(a));

  /* ============================================================ age formatting + onset windows */
  function fmtAge(m) {
    if (m < 1) return Math.max(1, Math.round(m * 30.44)) + ' days';
    if (m < 24) { const v = Math.round(m * 10) / 10; return (v % 1 === 0 ? v : v.toFixed(1)) + (v === 1 ? ' month' : ' months'); }
    const y = m / 12; return (Math.round(y * 10) / 10) % 1 === 0 ? Math.round(y) + ' years' : (Math.round(y * 10) / 10) + ' years';
  }
  function fmtRange(lo, hi) {
    const unitOf = (m) => (m < 1 ? 'd' : m < 24 ? 'm' : 'y'), uh = unitOf(hi), ul = unitOf(lo);
    const conv = (m, u) => (u === 'd' ? Math.round(m * 30.44) : u === 'm' ? Math.round(m * 10) / 10 : Math.round(m / 12 * 10) / 10);
    const name = { d: 'days', m: 'months', y: 'years' };
    const u = ul === uh ? uh : (uh === 'y' && ul === 'm' ? 'm' : uh);
    return `${conv(lo, u)}–${conv(hi, u)} ${name[u]}`;
  }
  function onsetSpan(s) { // [lo, hi] months over all windows, or null when the table sets no age criterion or any age is accepted
    const w = E.onsetWindows(s); if (w.none || !w.windows.length) return null;
    const lo = Math.min(...w.windows.map((x) => x[0])), hi = Math.max(...w.windows.map((x) => x[1]));
    if (hi - lo > 700) return null; // effectively any age
    return [lo, hi];
  }
  const geoMid = (lo, hi) => Math.sqrt(Math.max(lo, 0.05) * hi);

  /* ============================================================ deck */
  let DECK = null;
  function buildDeck() {
    if (DECK) return DECK;
    const c = [];
    B.FACTS.forEach((f) => c.push({ id: 'fact:' + f.id, topic: f.t, kind: 'fact', f }));
    B.ASM.forEach((a) => c.push({ id: 'asm:' + a.id, topic: 'asm', kind: 'asm', a }));
    B.GENES.forEach((g) => c.push({ id: 'gene:' + g.g, topic: 'gene', kind: 'gene', g }));
    SYN.forEach((s) => c.push({ id: 'syn:' + s.id, topic: 'syn', kind: 'syn', s }));
    M.ITEMS.forEach((m) => c.push({ id: 'eeg:' + m.id, topic: 'eeg', kind: 'pic', pic: 'eeg', m }));
    S.ITEMS.forEach((m) => c.push({ id: 'sem:' + m.id, topic: 'sem', kind: 'pic', pic: 'sem', m }));
    P.ITEMS.forEach((m) => c.push({ id: 'sign:' + m.id, topic: 'sign', kind: 'pic', pic: 'sign', m }));
    c.byId = {}; c.forEach((x) => { c.byId[x.id] = x; });
    return (DECK = c);
  }

  /* ---------- pictures (never carry the answer in a title or label) ---------- */
  function picHtml(card) {
    if (card.pic === 'eeg') return D.waveformSvg(card.m.fig, 'EEG pattern', { thumb: true });
    const frames = card.m.frames.slice(0, 3);
    return `<div class="pic-row">${frames.map((fr) => F.framesSvg([fr], 'Schematic drawing', { age: 'adult', thumb: true })).join('')}</div>`;
  }

  /* ---------- flashcard faces ---------- */
  const li = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const sources = (key) => B.SRC[key] || B.SRC.std;
  function face(card) {
    if (card.kind === 'fact') {
      const f = card.f;
      return { front: `<p class="fc-q">${esc(f.q)}</p>`, back: `<p class="fc-a">${esc(f.a)}</p><p class="fc-x">${esc(f.x)}</p>`, src: sources(f.s), v: f.v };
    }
    if (card.kind === 'asm') {
      const a = card.a;
      return { front: `<p class="fc-k">Antiseizure medication</p><p class="fc-q">${esc(a.name)}</p><p class="fc-hint">Mechanism? Signature toxicity? Where does it shine — and where does it hurt?</p>`,
        back: `<dl class="fc-dl"><dt>Mechanism</dt><dd>${esc(a.mech)}</dd><dt>Hallmarks</dt><dd>${li(a.tells)}</dd><dt>Adverse effects</dt><dd>${esc(a.tox)}</dd><dt>Pearl</dt><dd>${esc(a.pearl)}</dd></dl>`, src: B.SRC.std, v: 0 };
    }
    if (card.kind === 'gene') {
      const g = card.g, names = g.syn.map((id) => (SYN.find((s) => s.id === id) || {}).abbr).filter(Boolean);
      return { front: `<p class="fc-k">Gene</p><p class="fc-q">${esc(g.g)}</p><p class="fc-hint">Protein or pathway? Phenotype? Treatment implications?</p>`,
        back: `<dl class="fc-dl"><dt>Encodes / pathway</dt><dd>${esc(g.fn)}</dd>${names.length ? `<dt>Syndromes (ILAE 2022)</dt><dd>${esc(names.join(', '))}</dd>` : ''}<dt>Key points</dt><dd>${esc(g.pearl)}</dd><dt>Hallmark</dt><dd>${li(g.tells)}</dd></dl>`, src: B.SRC.std, v: 0 };
    }
    if (card.kind === 'syn') {
      const s = card.s, span = onsetSpan(s), mand = s.criteria.filter((c) => c.level === 'M' && !c.follow), al = s.criteria.filter((c) => c.level === 'A'), ex = s.criteria.filter((c) => c.level === 'E');
      return { front: `<p class="fc-k">${esc(s.group)} · ${esc(s.type)}</p><p class="fc-q">${esc(s.name)} <span class="abbr">${esc(s.abbr)}</span></p><p class="fc-hint">Onset? Mandatory features? What argues against it?</p>`,
        back: `<p class="fc-a">${esc(PL.PLAIN[s.id] || '')}</p><dl class="fc-dl"><dt>Onset</dt><dd>${span ? esc(fmtRange(span[0], span[1])) : 'No age criterion in the table'}</dd><dt>Mandatory</dt><dd>${li(mand.map((c) => c.text))}</dd>${al.length ? `<dt>Alerts</dt><dd>${li(al.slice(0, 4).map((c) => c.text))}</dd>` : ''}${ex.length ? `<dt>Exclusionary</dt><dd>${li(ex.slice(0, 5).map((c) => c.text))}</dd>` : ''}</dl>`, src: `ILAE 2022 · ${s.source}, ${s.table}`, v: 1 };
    }
    const m = card.m; // picture cards
    return { front: `<p class="fc-k">Name this ${card.pic === 'eeg' ? 'EEG pattern' : card.pic === 'sem' ? 'seizure movement' : 'sign'}</p>${picHtml(card)}`,
      back: `<p class="fc-q">${esc(m.name)}</p><p class="fc-a">${esc(m.summary)}</p><dl class="fc-dl">${m.features.slice(0, 3).map((f) => `<dt>${esc(f[0])}</dt><dd>${esc(f[1])}</dd>`).join('')}<dt>Pitfall</dt><dd>${esc(m.pitfall)}</dd></dl>`, src: m.basis, v: /standard|Standard/.test(m.basis) ? 0 : 1 };
  }

  /* ============================================================ multiple-choice questions */
  function mcq(r, o) {
    const wrong = uniq(o.wrong.filter((x) => x && x !== o.correct));
    if (wrong.length < 3) return null;
    const opts = shuffle([o.correct].concat(sample(wrong, 3, r)), r);
    return { id: o.id, card: o.card, topic: o.topic, type: o.pic ? 'pic' : 'mcq', stem: o.stem, picHtml: o.pic || '', options: opts, ans: opts.indexOf(o.correct), explain: o.explain || '', src: o.src || B.SRC.std, v: o.v === undefined ? 0 : o.v };
  }
  const BROAD = new Set(['EIDEE', 'IESS']);

  // returns every question variant a card supports
  function variants(card, r) {
    const out = [], id = (k) => card.id + '#' + k, base = { card: card.id, topic: card.topic };
    if (card.kind === 'fact') {
      const f = card.f, L = f.w.map((x) => x.length), avg = L.reduce((a, b) => a + b, 0) / L.length;
      // When the right answer is conspicuously the longest option, a multiple-choice would be a test-wiseness trap: ask for recall instead.
      if (f.a.length > Math.max(...L) && f.a.length > 1.6 * avg) out.push({ id: id('r'), card: card.id, topic: card.topic, type: 'recall', stem: f.q, answer: f.a, options: [], ans: -1, explain: f.x, src: sources(f.s), v: f.v });
      else out.push(mcq(r, Object.assign({}, base, { id: id('f'), stem: f.q, correct: f.a, wrong: f.w, explain: f.x, src: sources(f.s), v: f.v })));
    } else if (card.kind === 'asm') {
      const a = card.a, others = B.ASM.filter((x) => x.id !== a.id), same = others.filter((x) => x.bin === a.bin);
      out.push(mcq(r, Object.assign({}, base, { id: id('mech'), stem: `Which description fits the mechanism of ${a.name}?`, correct: a.mech, wrong: sample(same, 1, r).concat(sample(others, 6, r)).map((x) => x.mech), explain: a.pearl })));
      a.tells.forEach((t, i) => out.push(mcq(r, Object.assign({}, base, { id: id('tell' + i), stem: `Which antiseizure medication? — ${t}`, correct: a.name, wrong: sample(same, 2, r).concat(sample(others, 6, r)).map((x) => x.name), explain: `${a.name}: ${a.mech}. ${a.pearl}` }))));
    } else if (card.kind === 'gene') {
      const g = card.g, others = B.GENES.filter((x) => x.g !== g.g);
      g.tells.forEach((t, i) => out.push(mcq(r, Object.assign({}, base, { id: id('tell' + i), stem: `Which gene (or gene set)? — ${t}`, correct: g.g, wrong: others.map((x) => x.g), explain: g.pearl }))));
      out.push(mcq(r, Object.assign({}, base, { id: id('fn'), stem: `What does ${g.g} encode or regulate?`, correct: g.fn, wrong: sample(others, 7, r).map((x) => x.fn), explain: g.pearl })));
      g.syn.forEach((sid, i) => {
        const s = SYN.find((x) => x.id === sid); if (!s || BROAD.has(sid)) return; // EIDEE and IESS have many causes: a distractor could also be defensible
        out.push(mcq(r, Object.assign({}, base, { id: id('syn' + i), stem: `Which gene is associated with ${s.name} (${s.abbr})?`, correct: g.g, wrong: others.filter((x) => !x.syn.includes(sid)).map((x) => x.g), explain: `${g.g}: ${g.fn}. ${g.pearl}`, src: `${B.SRC.std}; syndrome per ILAE 2022` })));
      });
    } else if (card.kind === 'syn') {
      const s = card.s, others = SYN.filter((x) => x.id !== s.id), span = onsetSpan(s);
      if (span) out.push(mcq(r, Object.assign({}, base, { id: id('onset'), stem: `Typical seizure-onset age accepted by the ILAE 2022 criteria for ${s.name}?`, correct: fmtRange(span[0], span[1]),
        wrong: sample(others.map(onsetSpan).filter(Boolean).map((w) => fmtRange(w[0], w[1])), 12, r), explain: `${s.name} (${s.abbr}): ${fmtRange(span[0], span[1])} as encoded from ${s.source}, ${s.table}.`, src: `ILAE 2022 · ${s.source}, ${s.table}`, v: 1 })));
      out.push(mcq(r, Object.assign({}, base, { id: id('group'), stem: `${s.name} (${s.abbr}) belongs to which ILAE 2022 syndrome group?`, correct: s.group, wrong: ['Neonate–infant', 'Childhood', 'IGE', 'Variable age'], explain: `${s.abbr}: ${s.group} (${s.source}, ${s.table}).`, src: `ILAE 2022 · ${s.source}`, v: 1 })));
      out.push(mcq(r, Object.assign({}, base, { id: id('type'), stem: `ILAE 2022 epilepsy type of ${s.name} (${s.abbr})?`, correct: s.type, wrong: ['Focal', 'Generalized', 'Combined generalized and focal', 'Focal and/or generalized'], explain: `${s.abbr}: ${s.type}.`, src: `ILAE 2022 · ${s.source}`, v: 1 })));
      const mand = s.criteria.filter((c) => c.level === 'M' && c.expr && !c.follow), own = new Set(s.criteria.map((c) => c.text));
      const foreign = uniq([].concat(...others.map((o) => o.criteria.filter((c) => c.level === 'M' && c.expr && !c.follow).map((c) => c.text)))).filter((t) => !own.has(t));
      if (mand.length) out.push(mcq(r, Object.assign({}, base, { id: id('mand'), stem: `Which is a MANDATORY criterion of ${s.name} (${s.abbr})?`, correct: sample(mand, 1, r)[0].text, wrong: sample(foreign, 10, r), explain: `Mandatory criteria of ${s.abbr}: ${mand.map((c) => c.text).join(' · ')}`, src: `ILAE 2022 · ${s.source}, ${s.table}`, v: 1 })));
      const ex = s.criteria.filter((c) => c.level === 'E');
      if (ex.length && mand.length >= 3) out.push(mcq(r, Object.assign({}, base, { id: id('excl'), stem: `Which finding would argue AGAINST ${s.name} (${s.abbr})?`, correct: sample(ex, 1, r)[0].text, wrong: mand.map((c) => c.text), explain: `The other options are mandatory (supportive) features of ${s.abbr}.`, src: `ILAE 2022 · ${s.source}, ${s.table}`, v: 1 })));
    } else {
      const m = card.m, kind = card.pic, pool = (kind === 'eeg' ? M.ITEMS : kind === 'sem' ? S.ITEMS : P.ITEMS).filter((x) => x.id !== m.id), same = pool.filter((x) => x.group === m.group);
      const wrongNames = sample(same, 2, r).concat(sample(pool, 8, r)).map((x) => x.name);
      const noun = kind === 'eeg' ? 'EEG pattern' : kind === 'sem' ? 'seizure movement' : 'physical sign';
      out.push(mcq(r, Object.assign({}, base, { id: id('pic'), stem: `Which ${noun} is drawn?`, pic: picHtml(card), correct: m.name, wrong: wrongNames, explain: m.summary, src: m.basis, v: /standard|Standard/.test(m.basis) ? 0 : 1 })));
      out.push(mcq(r, Object.assign({}, base, { id: id('sum'), stem: `Which ${noun} matches this description? “${m.summary}”`, correct: m.name, wrong: wrongNames, explain: m.pitfall, src: m.basis, v: /standard|Standard/.test(m.basis) ? 0 : 1 })));
    }
    return out.filter(Boolean);
  }
  function questionFor(card, r) { const v = variants(card, r); return v.length ? v[Math.floor(r() * v.length)] : null; }
  function questionsFor(cards, n, r) {
    const out = [], seen = new Set();
    shuffle(cards, r).forEach((c) => { if (out.length < n && !seen.has(c.id)) { const q = questionFor(c, r); if (q) { out.push(q); seen.add(c.id); } } });
    return out;
  }
  // 10 mixed questions that are identical for everyone on a given day (round-robin over topics)
  function dailyQuestions(day) {
    const r = rng(hash('daily' + day)), deck = buildDeck(), topics = shuffle(B.TOPICS.map((t) => t.key), r), out = [], used = new Set();
    for (let k = 0; out.length < 10 && k < 60; k++) {
      const t = topics[k % topics.length], pool = deck.filter((c) => c.topic === t && !used.has(c.id)); if (!pool.length) continue;
      const card = pool[Math.floor(r() * pool.length)], q = questionFor(card, r); if (q) { out.push(q); used.add(card.id); }
    }
    return out;
  }

  /* ============================================================ Syndrome Detective */
  const DERIVED_TRUE = { 'img.normal': { mri: 'normal' }, 'img.lesion': { mri: 'abnormal', f: { 'img.lesion_other': true } }, 'img.abnormal_significant': { mri: 'abnormal' },
    'devo.normal': { devOnset: 0 }, 'devo.mild': { devOnset: 1 }, 'devo.any_impair': { devOnset: 1 }, 'devo.moderate_plus': { devOnset: 2 }, 'devo.severe_plus': { devOnset: 3 },
    'devn.normal': { devNow: 0 }, 'devn.mild': { devNow: 1 }, 'devn.any_impair': { devNow: 1 }, 'devn.moderate_plus': { devNow: 2 }, 'devn.severe_plus': { devNow: 3 },
    'pt.female': { sex: 'F' }, 'sz.focal_any': { f: { 'sz.focal_impaired': true } }, 'sz.gen_any': { f: { 'sz.gtc': true } }, 'sz.any': { f: { 'sz.gtc': true } }, 'sz.other_than_gtc': { f: { 'sz.myoclonic': true } } };
  // minimal assignment satisfying (want=true) or falsifying an expression; null when impossible
  function sat(n, want) {
    const merge = (a, b) => { if (!a || !b) return null; const o = Object.assign({}, a); for (const k of Object.keys(b)) { if (k in o && JSON.stringify(o[k]) !== JSON.stringify(b[k])) return null; o[k] = b[k]; } return o; };
    if (n.t === 'f') {
      if (DERIVED_TRUE[n.id]) return want ? { _d: DERIVED_TRUE[n.id] } : null;
      return { [n.id]: want };
    }
    if (n.t === 'not') return sat(n.a, !want);
    if (n.t === 'age') return {};
    if (n.t === 'and') return want ? merge(sat(n.a, true), sat(n.b, true)) : (sat(n.a, false) || sat(n.b, false));
    if (n.t === 'or') return want ? (sat(n.a, true) || sat(n.b, true)) : merge(sat(n.a, false), sat(n.b, false));
    return null;
  }
  function toPatient(parts, onset) {
    const p = { onsetMonths: onset === undefined ? null : onset, nowMonths: null, sex: null, mri: null, devOnset: null, devNow: null, findings: {}, reviewed: {} };
    parts.forEach((part) => Object.keys(part || {}).forEach((k) => {
      if (k === '_d') { const d = part._d; ['mri', 'devOnset', 'devNow', 'sex'].forEach((x) => { if (d[x] !== undefined) p[x] = d[x]; }); Object.assign(p.findings, d.f || {}); } else p.findings[k] = part[k];
    }));
    return p;
  }
  const statusOf = (s, p) => E.evaluateSyndrome(s, E.makeContext(p)).status;
  const excludedBy = (parts, onset, except) => SYN.filter((s) => s.id !== except && statusOf(s, toPatient(parts, onset)) === 'excluded');
  const DOMAIN = { sz: 'Seizures', sem: 'Semiology', ctx: 'Context', eeg: 'EEG', gen: 'Genetics', lab: 'Laboratory', neuro: 'Examination', dev: 'Development', img: 'MRI', onset: 'Onset', fh: 'Family history', course: 'Course', st: 'Status' };

  function detectiveFor(id, r) {
    const s = SYN.find((x) => x.id === id); if (!s) return null;
    const span = onsetSpan(s), onset = span ? geoMid(span[0], span[1]) : null;
    let clues = [];
    if (span) clues.push({ domain: 'Onset', text: `Seizures began at about ${fmtAge(onset)}`, part: null, onset });
    s.criteria.filter((c) => c.level === 'M' && c.expr && !c.follow).forEach((c) => {
      const a = sat(c.expr, true); if (a) clues.push({ domain: DOMAIN[c.domain] || c.domain, text: c.text, part: a, onset: null });
    });
    s.criteria.filter((c) => c.level === 'E' && c.expr).forEach((c) => {
      const a = sat(c.expr, false); if (a && Object.keys(a).length) clues.push({ domain: 'Not present', text: c.text, part: a, onset: null });
    });
    if (!clues.length) return null;
    const selfStatus = (parts) => statusOf(s, toPatient(parts, onset));
    const partsOf = (set) => set.map((c) => c.part).filter(Boolean);
    clues.forEach((c) => { c.spec = excludedBy(partsOf([c]), c.onset, s.id).length; });
    // greedy: the five clues that together reject the most other syndromes
    let chosen = [], pool = clues.slice();
    while (chosen.length < 5 && pool.length) {
      let best = null, bestN = -1;
      pool.forEach((c) => { const n = excludedBy(partsOf(chosen.concat(c)), onset, s.id).length; if (n > bestN) { bestN = n; best = c; } });
      chosen.push(best); pool = pool.filter((c) => c !== best);
    }
    chosen = chosen.sort((a, b) => a.spec - b.spec);
    const parts = partsOf(chosen);
    if (selfStatus(parts) === 'excluded') return null;
    const rejected = excludedBy(parts, onset, s.id);
    if (rejected.length < 3) return null;
    const opts = shuffle([s].concat(sample(rejected, Math.min(5, rejected.length), r)), r);
    return { id: s.id, name: s.name, abbr: s.abbr, clues: chosen.map((c) => ({ domain: c.domain, text: c.text })), options: opts.map((o) => ({ id: o.id, label: o.name, abbr: o.abbr })), ans: opts.findIndex((o) => o.id === s.id), plain: PL.PLAIN[s.id] || '', src: `ILAE 2022 · ${s.source}, ${s.table}`, check: { parts, onset } };
  }
  let DET_OK = null;
  function detectivePool() { // syndromes for which a fair case can be built
    if (DET_OK) return DET_OK;
    return (DET_OK = SYN.filter((s) => detectiveFor(s.id, rng(1))).map((s) => s.id));
  }

  /* ============================================================ puzzles */
  function ladder(r) { // order five syndromes by typical onset
    const cand = SYN.map((s) => ({ s, span: onsetSpan(s) })).filter((x) => x.span).map((x) => ({ id: x.s.id, name: x.s.name, abbr: x.s.abbr, span: x.span, mid: geoMid(x.span[0], x.span[1]) }));
    for (let tries = 0; tries < 400; tries++) {
      const pick = sample(cand, 5, r).sort((a, b) => a.mid - b.mid);
      if (pick.every((x, i) => i === 0 || x.mid / pick[i - 1].mid >= 1.7)) return { items: pick.map((x) => ({ id: x.id, label: x.name + ' (' + x.abbr + ')', range: fmtRange(x.span[0], x.span[1]) })), order: pick.map((x) => x.id) };
    }
    return null;
  }
  const BINSETS = {
    seizure: () => { const bins = ['Focal', 'Generalized', 'Unknown']; const items = []; D.TREE.forEach((c) => { if (!bins.includes(c.cls)) return; c.groups.forEach((g) => g.t.forEach((t) => items.push({ label: t, bin: c.cls }))); }); return { title: 'Sort the seizure types into ILAE 2025 classes', bins, items, src: 'beniczky2025' }; },
    asm: () => { const keys = ['na', 'sv2a', 'gaba', 'ca', 'glut', 'multi']; return { title: 'Sort the drugs by primary mechanism', bins: keys.map((k) => B.BINS_ASM[k]), items: B.ASM.filter((a) => keys.includes(a.bin)).map((a) => ({ label: a.name, bin: B.BINS_ASM[a.bin] })), src: 'std' }; },
    group: () => ({ title: 'Sort the syndromes into their ILAE 2022 groups', bins: ['Neonate–infant', 'Childhood', 'IGE', 'Variable age'], items: SYN.map((s) => ({ label: s.name + ' (' + s.abbr + ')', bin: s.group })), src: 'wirrell2022' }),
    type: () => ({ title: 'Sort the syndromes by epilepsy type', bins: ['Focal', 'Generalized', 'Combined generalized and focal'], items: SYN.filter((s) => ['Focal', 'Generalized', 'Combined generalized and focal'].includes(s.type)).map((s) => ({ label: s.name + ' (' + s.abbr + ')', bin: s.type })), src: 'wirrell2022' }),
  };
  function binPuzzle(kind, r, n) {
    const def = BINSETS[kind](), per = Math.max(2, Math.round((n || 8) / def.bins.length)), items = [];
    def.bins.forEach((b) => items.push(...sample(def.items.filter((x) => x.bin === b), per, r)));
    return { kind, title: def.title, bins: def.bins, items: shuffle(items, r).map((x, i) => Object.assign({ i }, x)), src: def.src };
  }
  function sequence(r, id) { const s = id ? B.SEQ.find((x) => x.id === id) : B.SEQ[Math.floor(r() * B.SEQ.length)]; return { id: s.id, title: s.title, topic: s.t, steps: s.steps, shuffled: shuffle(s.steps.map((t, i) => ({ t, i })), r), src: s.s }; }
  function matchSet(kind, r) {
    const pairs = [];
    if (kind === 'gene') {
      const used = new Set(); B.GENES.forEach((g) => { if (g.syn.length === 1 && !used.has(g.syn[0])) { used.add(g.syn[0]); const s = SYN.find((x) => x.id === g.syn[0]); pairs.push({ a: g.g, b: s.abbr }); } });
    } else if (kind === 'abbr') SYN.forEach((s) => pairs.push({ a: s.abbr, b: s.name }));
    else if (kind === 'onset') SYN.forEach((s) => { const sp = onsetSpan(s); if (sp) pairs.push({ a: s.abbr, b: fmtRange(sp[0], sp[1]) }); });
    const ok = (arr) => arr.filter((x, i) => arr.findIndex((y) => y.b === x.b) === i);
    const sel = sample(ok(pairs), 6, r);
    return { kind, title: { gene: 'Match each gene to its syndrome', abbr: 'Match each abbreviation to its syndrome', onset: 'Match each syndrome to its onset window' }[kind], pairs: sel };
  }
  function picMatch(kind, r) { // picture ↔ name pairs for the memory game
    const items = (kind === 'eeg' ? M.ITEMS : S.ITEMS), card = (m) => buildDeck().byId[(kind === 'eeg' ? 'eeg:' : 'sem:') + m.id];
    return { kind, title: kind === 'eeg' ? 'Match each EEG pattern to its name' : 'Match each movement to its name', pairs: sample(items, 6, r).map((m) => ({ name: m.name, html: picHtml(card(m)) })) };
  }

  /* ---------- 10–20 electrodes ---------- */
  const ELECTRODES = {
    Fp1: [-0.3, -0.88, 'left frontopolar'], Fp2: [0.3, -0.88, 'right frontopolar'], F7: [-0.78, -0.55, 'left anterior temporal'], F3: [-0.4, -0.52, 'left frontal'], Fz: [0, -0.5, 'midline frontal'], F4: [0.4, -0.52, 'right frontal'], F8: [0.78, -0.55, 'right anterior temporal'],
    T3: [-0.95, 0, 'left mid-temporal (T7)'], C3: [-0.48, 0, 'left central'], Cz: [0, 0, 'vertex'], C4: [0.48, 0, 'right central'], T4: [0.95, 0, 'right mid-temporal (T8)'],
    T5: [-0.78, 0.55, 'left posterior temporal (P7)'], P3: [-0.4, 0.52, 'left parietal'], Pz: [0, 0.5, 'midline parietal'], P4: [0.4, 0.52, 'right parietal'], T6: [0.78, 0.55, 'right posterior temporal (P8)'], O1: [-0.3, 0.88, 'left occipital'], O2: [0.3, 0.88, 'right occipital'],
  };
  const CHAINS = [['Fp1', 'F3', 'C3', 'P3', 'O1'], ['Fp2', 'F4', 'C4', 'P4', 'O2'], ['Fp1', 'F7', 'T3', 'T5', 'O1'], ['Fp2', 'F8', 'T4', 'T6', 'O2']];
  const CHAIN_NAME = ['left parasagittal', 'right parasagittal', 'left temporal', 'right temporal'];
  function electrodeQ(r) {
    const names = Object.keys(ELECTRODES), t = names[Math.floor(r() * names.length)], side = (n) => (/\d*[13579]$/.test(n) && !/z$/.test(n) ? 'L' : /z$/.test(n) ? 'M' : 'R');
    const near = names.filter((n) => n !== t && side(n) === side(t)), opts = shuffle([t].concat(sample(near.length >= 3 ? near : names.filter((n) => n !== t), 3, r)), r);
    const asLabel = r() < 0.5;
    return asLabel ? { id: 'elec:l:' + t, topic: 'eeg', type: 'electrode', target: t, stem: 'Which electrode is highlighted on the head (nose up)?', options: opts, ans: opts.indexOf(t), explain: `${t} sits over the ${ELECTRODES[t][2]} region. Odd numbers are left, even right, “z” midline.`, src: B.SRC.std, v: 0 }
      : { id: 'elec:d:' + t, topic: 'eeg', type: 'electrode', target: t, stem: `Which electrode lies over the ${ELECTRODES[t][2].replace(/ \(.*\)/, '')} region? Tap it on the head.`, options: opts, ans: opts.indexOf(t), tap: true, explain: `${t}: ${ELECTRODES[t][2]}.`, src: B.SRC.std, v: 0 };
  }
  // Negative-up bipolar chain: a negative focus at electrode j pushes channel (j-1) down and channel j up — the deflections point at each other.
  function phaseQ(r) {
    const ci = Math.floor(r() * CHAINS.length), chain = CHAINS[ci], j = Math.floor(r() * 5), ends = j === 0 || j === 4;
    const channels = [0, 1, 2, 3].map((k) => ({ name: chain[k] + '–' + chain[k + 1], dir: (j > 0 && k === j - 1) ? -1 : (j < 4 && k === j) ? 1 : 0 }));
    const opts = shuffle(chain.slice(), r);
    return { id: 'phase:' + ci + ':' + j, topic: 'eeg', type: 'phase', chain, channels, focus: j, stem: `Longitudinal bipolar montage, negativity up. A negative discharge: which electrode is the focus? (${CHAIN_NAME[ci]} chain)`, options: opts, ans: opts.indexOf(chain[j]),
      explain: ends ? `At the END of a chain only one channel deflects, so the maximum is the end electrode (${chain[j]}); there is no phase reversal to pinpoint it.` : `Negativity at ${chain[j]}: the channel ending at it deflects DOWN and the channel starting at it deflects UP — they point toward each other (phase reversal), and ${chain[j]} is the shared electrode.`, src: B.SRC.std, v: 0 };
  }

  /* ============================================================ spaced repetition (SM-2 variant) */
  const dayNumber = (t) => { const d = new Date(t === undefined ? Date.now() : t); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5); };
  const newState = (day) => ({ ef: 2.5, iv: 0, n: 0, due: day, lapses: 0, seen: day });
  function review(st, grade, day) { // grade: 0 again, 1 hard, 2 good, 3 easy
    const s = Object.assign({}, st);
    if (grade === 0) { s.lapses += 1; s.n = 0; s.iv = 0; s.ef = Math.max(1.3, s.ef - 0.2); s.due = day; s.relearn = true; return s; }
    s.relearn = false; s.n += 1;
    if (s.n === 1) s.iv = grade === 3 ? 4 : grade === 1 ? 1 : 1;
    else if (s.n === 2) s.iv = grade === 3 ? 7 : grade === 1 ? 2 : 4;
    else s.iv = Math.max(s.iv + 1, Math.round(s.iv * (grade === 1 ? 1.2 : grade === 3 ? s.ef * 1.3 : s.ef)));
    s.ef = Math.min(3, Math.max(1.3, s.ef + (grade === 3 ? 0.15 : grade === 1 ? -0.15 : 0)));
    s.due = day + s.iv; return s;
  }
  const nextLabels = (st, day) => [0, 1, 2, 3].map((g) => { const n = review(st || newState(day), g, day); return g === 0 ? 'again' : n.iv + (n.iv === 1 ? ' day' : ' days'); });
  const isMature = (st) => !!st && st.iv >= 21;
  function queue(profile, cards, day, opts) {
    const o = Object.assign({ newPerDay: 12 }, opts || {}), st = profile.cards || {};
    const due = cards.filter((c) => st[c.id] && st[c.id].due <= day).sort((a, b) => st[a.id].due - st[b.id].due);
    const left = Math.max(0, o.newPerDay - (profile.newToday && profile.newToday.day === day ? profile.newToday.n : 0));
    const fresh = cards.filter((c) => !st[c.id]).slice(0, left);
    return { due, fresh };
  }

  /* ============================================================ profile: XP, streaks, badges */
  const LEVELS = [[0, 'Medical student'], [100, 'Intern'], [250, 'Resident'], [450, 'Senior resident'], [700, 'Fellow'], [1000, 'Attending'], [1400, 'Epileptologist'], [1900, 'Professor'], [2500, 'Chair of neurology'], [3200, 'Living textbook'], [4000, 'Back of my hand']];
  function levelFor(xp) {
    let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
    const lo = LEVELS[i][0], hi = i + 1 < LEVELS.length ? LEVELS[i + 1][0] : lo + 1000;
    return { level: i + 1, title: LEVELS[i][1], lo, hi, frac: Math.min(1, (xp - lo) / (hi - lo)), next: i + 1 < LEVELS.length ? LEVELS[i + 1][1] : null };
  }
  const blankProfile = () => ({ v: 1, xp: 0, streak: 0, best: 0, last: null, cards: {}, topics: {}, counters: {}, badges: {}, daily: null, newToday: null });
  function touchDay(p, day) {
    if (p.last === day) return p;
    p.streak = p.last === day - 1 ? p.streak + 1 : 1; p.best = Math.max(p.best, p.streak); p.last = day; return p;
  }
  const bump = (p, k, n) => { p.counters[k] = (p.counters[k] || 0) + (n === undefined ? 1 : n); };
  function record(p, q, correct, day) { // one answered question
    touchDay(p, day); const t = p.topics[q.topic] || (p.topics[q.topic] = { c: 0, n: 0 });
    t.n += 1; if (correct) t.c += 1; bump(p, 'answered'); if (correct) bump(p, 'correct');
    if (q.card) { // a miss goes straight into tomorrow's review queue
      const st = p.cards[q.card];
      if (!correct) p.cards[q.card] = review(st || newState(day), 0, day), p.cards[q.card].due = day + 1;
      else if (st && st.due <= day) p.cards[q.card] = review(st, 2, day);
    }
    return p;
  }
  const mature = (p) => Object.keys(p.cards).filter((k) => isMature(p.cards[k])).length;
  const BADGES = [
    ['first', 'First rounds', 'Answer your first question', (p) => (p.counters.answered || 0) >= 1],
    ['streak3', 'On a roll', 'Study 3 days in a row', (p) => p.best >= 3],
    ['streak7', 'Week of rounds', 'Study 7 days in a row', (p) => p.best >= 7],
    ['streak30', 'Chief resident', 'Study 30 days in a row', (p) => p.best >= 30],
    ['perfect', 'Perfect round', 'Get every question right in a 10-question round', (p) => (p.counters.perfect || 0) >= 1],
    ['eeg20', 'Pattern spotter', '20 correct EEG answers', (p) => ((p.topics.eeg || {}).c || 0) >= 20],
    ['sem20', 'Semiologist', '20 correct semiology answers', (p) => ((p.topics.sem || {}).c || 0) >= 20],
    ['gene20', 'Gene genie', '20 correct genetics answers', (p) => ((p.topics.gene || {}).c || 0) >= 20],
    ['asm30', 'Pharmacist', '30 correct ASM answers', (p) => ((p.topics.asm || {}).c || 0) >= 30],
    ['syn30', 'Syndrome sleuth', '30 correct syndrome answers', (p) => ((p.topics.syn || {}).c || 0) >= 30],
    ['se15', 'Code-status hero', '15 correct status epilepticus answers', (p) => ((p.topics.se || {}).c || 0) >= 15],
    ['oneclue', 'One-clue wonder', 'Solve a Detective case on the first clue', (p) => (p.counters.oneClue || 0) >= 1],
    ['phase10', 'Phase reverser', '10 correct phase-reversal localisations', (p) => (p.counters.phase || 0) >= 10],
    ['mature25', 'Long-term memory', '25 cards in long-term memory (21+ day interval)', (p) => mature(p) >= 25],
    ['xp1000', 'Attending', 'Reach 1000 XP', (p) => p.xp >= 1000],
  ].map((b) => ({ id: b[0], name: b[1], desc: b[2], test: b[3] }));
  function newBadges(p, day) { const got = []; BADGES.forEach((b) => { if (!p.badges[b.id] && b.test(p)) { p.badges[b.id] = day; got.push(b); } }); return got; }
  function topicSummary(p) {
    const deck = buildDeck();
    return B.TOPICS.map((t) => { const cs = deck.filter((c) => c.topic === t.key), seen = cs.filter((c) => p.cards[c.id]).length, mat = cs.filter((c) => isMature(p.cards[c.id])).length, st = p.topics[t.key] || { c: 0, n: 0 };
      return { key: t.key, name: t.name, icon: t.icon, total: cs.length, seen, mature: mat, acc: st.n ? Math.round(100 * st.c / st.n) : null, answered: st.n }; });
  }

  return { SYN, rng, hash, shuffle, sample, fmtAge, fmtRange, onsetSpan, buildDeck, face, picHtml, variants, questionFor, questionsFor, dailyQuestions, detectiveFor, detectivePool, ladder, binPuzzle, BINSETS, sequence, matchSet, picMatch,
    ELECTRODES, CHAINS, electrodeQ, phaseQ, dayNumber, newState, review, nextLabels, isMature, queue, LEVELS, levelFor, blankProfile, touchDay, record, bump, newBadges, BADGES, topicSummary, mature, sat, toPatient, esc };
});
