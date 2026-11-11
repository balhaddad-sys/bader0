/*
 * Study mode UI: hub, flashcards (spaced repetition), quiz rounds, Syndrome Detective, picture rounds, memory match,
 * sorting / ordering puzzles, EEG lab (10–20 electrodes, phase reversal) and cheat sheets.
 * Progress (card schedule, XP, streak, badges) is kept in this browser's local storage ONLY — never patient data,
 * never transmitted. All styling is class-based (strict CSP).
 */
(function (root, factory) {
  root.EpiStudy = factory(root.EpiQuiz, root.EpiBank);
})(typeof self !== 'undefined' ? self : this, function (Q, B) {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = Q.esc;
  const IC = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
  const KEY = 'epistudy.v1';
  let el, profile, canStore = true, run = null, setup = { topics: new Set(), n: 10, survival: false }, mode = '', arg = '';

  /* ------------------------------------------------------------ storage (guarded: private windows can throw) */
  function load() {
    try { const s = localStorage.getItem(KEY); if (s) { const p = JSON.parse(s); if (p && p.v === 1) return Object.assign(Q.blankProfile(), p); } } catch (e) { canStore = false; }
    return Q.blankProfile();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch (e) { canStore = false; } }
  const today = () => Q.dayNumber();
  function addXp(n) { const before = Q.levelFor(profile.xp).level; profile.xp += n; if (run) run.xp = (run.xp || 0) + n; const a = Q.levelFor(profile.xp).level; if (a > before && run) run.levelUp = Q.levelFor(profile.xp).title; return n; }

  function burst() { // CSS-only celebration; positions and delays come from the stylesheet
    if (!el || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const c = document.createElement('div'); c.className = 'confetti'; c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<i></i>'.repeat(28); document.body.appendChild(c); setTimeout(() => c.remove(), 3200);
  }
  /* ------------------------------------------------------------ small view helpers */
  const vbadge = (v) => (v ? '<span class="vb v1" title="Figure or statement checked against the cited paper’s abstract when this bank was built">checked source</span>' : '<span class="vb v0" title="Standard teaching — verify against the current guideline or label">standard teaching</span>');
  const bar = (label, v, max) => `<progress class="st-bar" max="${max}" value="${v}" aria-label="${esc(label)}"></progress>`;
  const back = (to) => `<a class="crumb" href="#/study${to ? '/' + to : ''}">${IC('arrow', 'flip')}${to ? 'Back' : 'Study hub'}</a>`;
  const stat = (icon, v, k) => `<div class="st-stat"><span class="st-si">${IC(icon)}</span><span><b>${v}</b><small>${k}</small></span></div>`;
  function frame(title, body, extra) {
    el.innerHTML = `<div class="st-top">${back(extra && extra.back)}<h2 class="st-h">${esc(title)}</h2></div>${body}`;
    const h = $('.st-h', el); if (h) { h.setAttribute('tabindex', '-1'); }
  }

  /* ============================================================ hub */
  const GAMES = [
    ['daily', 'trophy', 'Daily rounds', 'Ten mixed questions, the same for everyone today. Keeps your streak alive.'],
    ['flash', 'layers', 'Flashcards', 'Spaced repetition: the app schedules each card just before you would forget it.'],
    ['quiz', 'target', 'Quiz blitz', 'Pick topics, race through questions, or play survival with three lives.'],
    ['detective', 'search', 'Syndrome detective', 'Clues appear one at a time, narrowest last. Solve it with as few as you can.'],
    ['pictures', 'activity', 'Name that picture', 'EEG patterns, seizure movements and physical signs — drawings with no captions.'],
    ['match', 'grid', 'Memory match', 'Flip tiles to pair genes with syndromes, patterns with names, abbreviations with onset ages.'],
    ['puzzle', 'sort', 'Sort & order', 'Build the ILAE tree, sort drugs by mechanism, line syndromes up by onset age, order the SE algorithm.'],
    ['eeglab', 'zap', 'EEG lab', 'Name the 10–20 electrode, then find the focus from a phase reversal.'],
    ['#/library', 'book', 'Picture atlas', 'Annotated EEG traces, seizure movements and physical signs. Cover the labels to test yourself, and add your own notes.'],
    ['ref', 'table', 'Cheat sheets', 'Drug mechanism diagrams with memory hooks, genes, trials and the status epilepticus card.'],
  ];
  function hub() {
    const lv = Q.levelFor(profile.xp), day = today(), cards = Q.buildDeck(), q = Q.queue(profile, cards, day, { newPerDay: prefs().newPerDay });
    const dailyDone = profile.daily && profile.daily.day === day;
    const topics = Q.topicSummary(profile);
    const weak = topics.filter((t) => t.answered >= 3).sort((a, b) => a.acc - b.acc)[0];
    el.innerHTML = `
      <section class="st-hero">
        <div class="st-lv"><span class="st-lvn">${lv.level}</span><div><b>${esc(lv.title)}</b><small>${profile.xp} XP${lv.next ? ' · next: ' + esc(lv.next) : ''}</small>${bar('Progress to next level', Math.round(lv.frac * 100), 100)}</div></div>
        <div class="st-stats">${stat('flame', profile.streak, profile.streak === 1 ? 'day streak' : 'day streak')}${stat('layers', q.due.length, 'cards due')}${stat('star', Object.keys(profile.badges).length + '/' + Q.BADGES.length, 'badges')}</div>
      </section>
      ${canStore ? '' : '<p class="st-warn">This browser is blocking local storage, so progress will not be saved after you close the page.</p>'}
      <a class="st-daily${dailyDone ? ' done' : ''}" href="#/study/daily"><span class="st-di">${IC(dailyDone ? 'check' : 'trophy')}</span><span><b>${dailyDone ? 'Daily rounds complete — ' + profile.daily.score + '/10' : 'Today’s daily rounds'}</b><small>${dailyDone ? 'Come back tomorrow, or replay for practice.' : '10 mixed questions · +50 XP bonus · keeps your streak'}</small></span>${IC('arrow')}</a>
      ${q.due.length ? `<a class="st-daily alt" href="#/study/flash"><span class="st-di">${IC('layers')}</span><span><b>${q.due.length} card${q.due.length === 1 ? '' : 's'} due for review</b><small>${q.fresh.length ? q.fresh.length + ' new cards waiting too' : 'Reviewing now is what makes it stick.'}</small></span>${IC('arrow')}</a>` : ''}
      <details class="st-why"><summary>${IC('book')}Why this works: how the app is built to make it stick</summary><ul>
        <li><b>Retrieval practice.</b> Every game asks you to produce the answer before it shows it; “cover the labels” in the atlas does the same for pictures.</li>
        <li><b>Spacing.</b> Flashcards come back just before you would forget them; misses return tomorrow.</li>
        <li><b>Interleaving.</b> Daily rounds and quizzes mix topics instead of blocking them.</li>
        <li><b>Dual coding.</b> Drawings, EEG traces, head maps and synapse diagrams sit beside the words.</li>
        <li><b>Elaboration and concrete examples.</b> Each answer says why, and drugs and genes carry a vivid one-line memory hook.</li>
        <li><b>Game mechanics.</b> Streaks, XP, levels and badges are there to keep you coming back; the evidence for gamification is for engagement, not magic.</li></ul>
        <p class="st-fine">The first five follow Weinstein, Madan &amp; Sumeracki, <a href="https://link.springer.com/article/10.1186/s41235-017-0087-y" target="_blank" rel="noopener">Teaching the science of learning</a> (Cognitive Research: Principles and Implications, 2018). Picture mnemonics have limited independent evidence, so the hooks are an aid and not the whole method.</p></details>
      <h3 class="st-sub">Games</h3>
      <div class="st-games">${GAMES.map((g) => `<a class="st-game" href="${g[0][0] === '#' ? g[0] : '#/study/' + g[0]}"><span class="st-gi">${IC(g[1])}</span><b>${g[2]}</b><small>${g[3]}</small></a>`).join('')}</div>
      <h3 class="st-sub">Mastery map${weak ? ` <small class="st-weak">weakest so far: <a href="#/study/quiz/${weak.key}">${esc(weak.name)} (${weak.acc}%)</a></small>` : ''}</h3>
      <div class="st-topics">${topics.map((t) => `<a class="st-topic" href="#/study/quiz/${t.key}"><span class="st-ti">${IC(t.icon)}</span><b>${esc(t.name)}</b>${bar(t.name + ' mastered', t.mature, t.total)}<small>${t.seen}/${t.total} seen · ${t.mature} mastered${t.acc === null ? '' : ' · ' + t.acc + '% correct'}</small></a>`).join('')}</div>
      <h3 class="st-sub">Badges</h3>
      <div class="st-badges">${Q.BADGES.map((b) => `<div class="st-badge${profile.badges[b.id] ? ' on' : ''}" title="${esc(b.desc)}">${IC(profile.badges[b.id] ? 'star' : 'lock')}<b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div>
      <p><a class="btn" href="#/study/settings">${IC('reset')}Settings, backup &amp; reset</a></p>
      <p class="st-fine">Study content: ${B.FACTS.length} source-labelled facts, ${B.ASM.length} drugs, ${B.GENES.length} genes, plus every syndrome, EEG pattern, movement and sign in the app (${cards.length} cards). Facts marked <i>checked source</i> were verified against the cited paper’s abstract when the bank was built; the rest are standard teaching. Not for patient care: confirm doses and indications against current guidelines and labels.</p>`;
  }
  const prefs = () => Object.assign({ newPerDay: 12 }, profile.prefs || {});

  /* ============================================================ question runner (daily, quiz, pictures, electrodes, phase) */
  function runQuiz(cfg) {
    run = { cfg, i: 0, score: 0, streak: 0, best: 0, lives: cfg.lives || 0, xp: 0, missed: [], answered: false, picked: null, startLevel: Q.levelFor(profile.xp).level };
    drawQ();
  }
  function headSvg(q, reveal) {
    const cx = 110, cy = 120, Rr = 92, pos = (n) => [cx + Q.ELECTRODES[n][0] * Rr * 0.97, cy + Q.ELECTRODES[n][1] * Rr * 0.97];
    let s = `<svg class="head" viewBox="0 0 220 240" role="img" aria-label="Top view of the head with the 10–20 electrode positions, nose at the top"><circle class="hd" cx="${cx}" cy="${cy}" r="${Rr}"/><path class="hd" d="M102 ${cy - Rr + 2}L110 ${cy - Rr - 16}L118 ${cy - Rr + 2}"/><ellipse class="hd" cx="${cx - Rr - 4}" cy="${cy}" rx="5" ry="14"/><ellipse class="hd" cx="${cx + Rr + 4}" cy="${cy}" rx="5" ry="14"/>`;
    Object.keys(Q.ELECTRODES).forEach((n) => {
      const [x, y] = pos(n), hi = n === q.target && !q.tap, cls = 'el' + (hi ? ' hi' : '') + (q.tap && !reveal ? ' tap' : '') + (reveal && n === q.target ? ' ok' : '');
      s += `<g class="${cls}"${q.tap && !reveal ? ` data-el="${n}"` : ''}><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${hi || q.tap ? 9 : 6}"/>${reveal || (q.tap && false) ? `<text x="${x.toFixed(1)}" y="${(y + 3.2).toFixed(1)}" text-anchor="middle">${n}</text>` : ''}</g>`;
    });
    return s + '</svg>';
  }
  function phaseSvg(q, reveal) {
    const rnd = Q.rng(Q.hash(q.id)), W = 560, rowH = 50, g = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
    let s = `<svg class="phase" viewBox="0 0 ${W} ${rowH * 4 + 34}" role="img" aria-label="Four bipolar EEG channels with one discharge, negativity up">`;
    q.channels.forEach((ch, k) => {
      const y0 = 26 + k * rowH; let d = '';
      for (let x = 96; x <= 540; x += 4) { const amp = 30 * g(x, 330, 7) - 11 * g(x, 350, 17), y = y0 - ch.dir * amp + (rnd() - 0.5) * 3.2; d += (x === 96 ? 'M' : 'L') + x + ' ' + y.toFixed(1); }
      s += `<line class="gl" x1="96" x2="540" y1="${y0}" y2="${y0}"/><text class="cl" x="86" y="${y0 + 4}" text-anchor="end">${ch.name}</text><path class="tr" d="${d}"/>`;
    });
    return s + `<text class="cl sm" x="96" y="${rowH * 4 + 26}">negativity up · schematic</text></svg>`;
  }
  function visual(q) {
    if (q.type === 'pic') return `<div class="st-pic">${q.picHtml}</div>`;
    if (q.type === 'electrode') return `<div class="st-pic">${headSvg(q, run.answered)}</div>`;
    if (q.type === 'phase') return `<div class="st-pic wide">${phaseSvg(q, run.answered)}</div>`;
    return '';
  }
  function drawQ() {
    const qs = run.cfg.questions, q = qs[run.i], n = qs.length, hearts = run.cfg.lives ? `<span class="st-hearts" aria-label="${run.lives} lives left">${Array.from({ length: run.cfg.lives }, (_, k) => IC('heart', k < run.lives ? 'on' : 'off')).join('')}</span>` : '';
    if (q.type === 'recall') return drawRecall(q, n, hearts);
    const opts = q.options.map((o, i) => {
      const st = !run.answered ? '' : i === q.ans ? ' right' : i === run.picked ? ' wrong' : ' dim';
      return `<button type="button" class="st-opt${st}" data-act="pick" data-i="${i}"${run.answered ? ' disabled' : ''}><kbd>${i + 1}</kbd><span>${esc(o)}</span></button>`;
    }).join('');
    const fb = run.answered ? `<div class="st-exp ${run.picked === q.ans ? 'ok' : 'bad'}" role="status"><b>${run.picked === q.ans ? 'Correct' : 'Not quite — ' + esc(q.options[q.ans])}</b><p>${esc(q.explain)}</p><p class="st-src">${vbadge(q.v)} ${esc(q.src)}</p></div><div class="st-nav"><button type="button" class="btn btn-primary" data-act="next">${run.i + 1 >= n || (run.cfg.lives && run.lives <= 0) ? 'See results' : 'Next question'}${IC('arrow')}</button></div>` : '';
    frame(run.cfg.title, `<div class="st-hud"><span>${run.i + 1}<small>/${n}</small></span>${bar('Round progress', run.i + (run.answered ? 1 : 0), n)}<span class="st-score">${IC('star')}${run.score}</span><span class="st-streak">${IC('flame')}${run.streak}</span>${hearts}</div>
      <section class="st-card"><p class="st-stem">${esc(q.stem)}</p>${visual(q)}<div class="st-opts">${opts}</div>${fb}</section>`, { back: '' });
    const nb = $('[data-act=next]', el); if (nb) nb.focus({ preventScroll: true });
  }
  function drawRecall(q, n, hearts) {
    const body = !run.revealed ? `<p class="st-hint">Say the answer to yourself — then check.</p><div class="st-nav"><button type="button" class="btn btn-primary" data-act="rshow">Show answer</button></div>`
      : `<div class="st-exp ${run.answered ? (run.picked === 1 ? 'ok' : 'bad') : 'neutral'}"><b>${esc(q.answer)}</b><p>${esc(q.explain)}</p><p class="st-src">${vbadge(q.v)} ${esc(q.src)}</p></div>${run.answered ? `<div class="st-nav"><button type="button" class="btn btn-primary" data-act="next">${run.i + 1 >= n || (run.cfg.lives && run.lives <= 0) ? 'See results' : 'Next question'}${IC('arrow')}</button></div>` : `<div class="st-grades two"><button type="button" class="btn g0" data-act="rk" data-ok="0"><b>I missed it</b><small>review tomorrow</small></button><button type="button" class="btn g2" data-act="rk" data-ok="1"><b>I knew it</b><small>+XP</small></button></div>`}`;
    frame(run.cfg.title, `<div class="st-hud"><span>${run.i + 1}<small>/${n}</small></span>${bar('Round progress', run.i + (run.answered ? 1 : 0), n)}<span class="st-score">${IC('star')}${run.score}</span><span class="st-streak">${IC('flame')}${run.streak}</span>${hearts}</div><section class="st-card"><p class="st-tag">Recall</p><p class="st-stem">${esc(q.stem)}</p>${body}</section>`, { back: '' });
    const nb = $('[data-act=next]', el); if (nb) nb.focus({ preventScroll: true });
  }
  function answer(i, name) {
    if (run.answered) return;
    const q = run.cfg.questions[run.i];
    if (name !== undefined) i = q.options.indexOf(name); // an electrode tapped on the head map
    const ok = q.type === 'recall' ? i === 1 : i === q.ans;
    run.answered = true; run.picked = i; Q.record(profile, q, ok, today());
    if (ok) { run.score += 1; run.streak += 1; run.best = Math.max(run.best, run.streak); addXp(10 + Math.min(10, 2 * (run.streak - 1))); if (q.type === 'phase') Q.bump(profile, 'phase'); }
    else { run.streak = 0; run.missed.push(q); if (run.lives) run.lives -= 1; }
    save(); drawQ();
  }
  function nextQ() {
    const done = run.i + 1 >= run.cfg.questions.length || (run.cfg.lives && run.lives <= 0);
    if (done) return finishQuiz();
    run.i += 1; run.answered = false; run.picked = null; run.revealed = false; drawQ();
  }
  function finishQuiz() {
    const n = run.i + 1, perfect = run.score === run.cfg.questions.length && !run.cfg.lives;
    if (perfect) Q.bump(profile, 'perfect');
    if (run.cfg.daily) { const first = !(profile.daily && profile.daily.day === today()); profile.daily = { day: today(), score: run.score }; if (first) addXp(50); }
    const got = Q.newBadges(profile, today()); save();
    const r = run, total = r.cfg.questions.length;
    if (perfect || r.levelUp || got.length) burst();
    frame(r.cfg.title + ' — results', `<section class="st-card st-end"><p class="st-big">${r.score}<small>/${r.cfg.lives ? n : total}</small></p><p>${perfect ? 'Perfect round!' : r.score / n >= 0.7 ? 'Solid work.' : 'Every miss is now scheduled for review tomorrow.'}</p>
      <div class="st-stats">${stat('star', '+' + r.xp, 'XP earned')}${stat('flame', r.best, 'best streak')}${stat('flame', profile.streak, 'day streak')}</div>
      ${r.levelUp ? `<p class="st-levelup">${IC('trophy')}Level up — you are now <b>${esc(r.levelUp)}</b></p>` : ''}
      ${got.length ? `<p class="st-levelup">${IC('star')}New badge${got.length > 1 ? 's' : ''}: ${got.map((b) => '<b>' + esc(b.name) + '</b>').join(', ')}</p>` : ''}
      ${r.missed.length ? `<h3 class="st-sub">To review</h3><ul class="st-missed">${r.missed.map((q) => `<li><b>${esc(q.stem)}</b><span>${esc(q.type === 'recall' ? q.answer : q.options[q.ans])}</span><small>${esc(q.explain)}</small></li>`).join('')}</ul>` : ''}
      <div class="st-nav"><button type="button" class="btn btn-primary" data-act="again">${IC('reset')}Play again</button><a class="btn" href="#/study">Study hub</a></div></section>`, { back: '' });
  }

  /* ============================================================ modes */
  const deck = () => Q.buildDeck();
  function startDaily() { runQuiz({ key: 'daily', title: 'Daily rounds', questions: Q.dailyQuestions(today()), daily: true }); }
  function quizSetup() {
    if (arg && !setup.topics.size) setup.topics.add(arg);
    const chips = B.TOPICS.map((t) => `<button type="button" class="ct" data-act="topic" data-t="${t.key}" aria-pressed="${setup.topics.has(t.key)}">${IC(t.icon)}<span>${esc(t.name)}</span>${IC('check', 'tk')}</button>`).join('');
    frame('Quiz blitz', `<section class="st-card"><h3 class="st-sub first">Topics <small>none selected = everything</small></h3><div class="wz-chips">${chips}</div>
      <h3 class="st-sub">Length</h3><div class="wz-chips">${[10, 20, 30].map((n) => `<button type="button" class="ct" data-act="len" data-n="${n}" aria-pressed="${setup.n === n}">${n} questions</button>`).join('')}</div>
      <h3 class="st-sub">Mode</h3><div class="wz-chips"><button type="button" class="ct" data-act="surv" data-v="0" aria-pressed="${!setup.survival}">Practice</button><button type="button" class="ct" data-act="surv" data-v="1" aria-pressed="${setup.survival}">${IC('heart')}Survival — three lives</button></div>
      <div class="st-nav"><button type="button" class="btn btn-primary" data-act="startquiz">Start${IC('arrow')}</button></div></section>`);
  }
  function startQuiz() {
    const keys = setup.topics.size ? Array.from(setup.topics) : B.TOPICS.map((t) => t.key), r = Q.rng((Date.now() & 0xffffff) + 1);
    const cards = deck().filter((c) => keys.includes(c.topic)), qs = Q.questionsFor(cards, setup.survival ? 60 : setup.n, r);
    runQuiz({ key: 'quiz', title: setup.survival ? 'Quiz blitz — survival' : 'Quiz blitz', questions: qs, lives: setup.survival ? 3 : 0 });
  }
  function picturesSetup() {
    frame('Name that picture', `<section class="st-card"><p>Drawings only — no captions, no hints in the file names. Pick a set:</p><div class="st-games">${[['eeg', 'activity', 'EEG patterns', M_COUNT('eeg')], ['sem', 'figure', 'Seizure movements', M_COUNT('sem')], ['sign', 'user', 'Physical signs', M_COUNT('sign')], ['mix', 'shuffle', 'Mixed', 'all three']].map((g) => `<button type="button" class="st-game" data-act="pics" data-k="${g[0]}"><span class="st-gi">${IC(g[1])}</span><b>${g[2]}</b><small>${g[3]}${typeof g[3] === 'number' ? ' pictures' : ''}</small></button>`).join('')}</div></section>`);
  }
  const M_COUNT = (k) => deck().filter((c) => c.kind === 'pic' && c.pic === k).length;
  function startPictures(kind) {
    const r = Q.rng((Date.now() & 0xffffff) + 3), cards = deck().filter((c) => c.kind === 'pic' && (kind === 'mix' || c.pic === kind));
    const qs = []; Q.shuffle(cards, r).forEach((c) => { if (qs.length < 10) { const q = Q.variants(c, r).find((v) => v.id.endsWith('#pic')); if (q) qs.push(q); } });
    runQuiz({ key: 'pictures', title: 'Name that picture', questions: qs });
  }
  function eegLab() {
    frame('EEG lab', `<section class="st-card"><div class="st-games"><button type="button" class="st-game" data-act="lab" data-k="elec"><span class="st-gi">${IC('target')}</span><b>10–20 electrodes</b><small>Name the highlighted electrode, or tap the one that covers a region.</small></button><button type="button" class="st-game" data-act="lab" data-k="phase"><span class="st-gi">${IC('zap')}</span><b>Phase reversal</b><small>Four bipolar channels, one negative discharge: where is the focus?</small></button></div>
      <p class="st-fine">Conventions used here: nose up, odd numbers left, even right, negativity plotted upward. T3/T4/T5/T6 are the older names of T7/T8/P7/P8.</p></section>`);
  }
  function startLab(kind) {
    const r = Q.rng((Date.now() & 0xffffff) + 5), qs = []; const seen = new Set();
    for (let k = 0; qs.length < 10 && k < 60; k++) { const q = kind === 'phase' ? Q.phaseQ(r) : Q.electrodeQ(r); if (!seen.has(q.id)) { seen.add(q.id); qs.push(q); } }
    runQuiz({ key: 'lab', title: kind === 'phase' ? 'Phase reversal' : '10–20 electrodes', questions: qs });
  }

  /* ---------- flashcards ---------- */
  function startFlash() {
    const keys = arg ? [arg] : B.TOPICS.map((t) => t.key), cards = deck().filter((c) => keys.includes(c.topic)), q = Q.queue(profile, cards, today(), { newPerDay: prefs().newPerDay });
    const list = q.due.concat(q.fresh).slice(0, 40);
    if (!list.length) {
      frame('Flashcards', `<section class="st-card st-end"><p class="st-big">${IC('check')}</p><p><b>All caught up.</b> No cards are due${arg ? ' in this topic' : ''} and today’s new-card allowance is used.</p>
        <div class="st-nav"><a class="btn btn-primary" href="#/study/quiz">Play a quiz instead</a><a class="btn" href="#/study/settings">Allow more new cards</a></div></section>`); return;
    }
    run = { flash: true, list: list.map((c) => c.id), i: 0, shown: false, done: 0, xp: 0, lapsed: 0, startLevel: Q.levelFor(profile.xp).level };
    drawFlash();
  }
  function drawFlash() {
    if (run.i >= run.list.length) return finishFlash();
    const card = deck().byId[run.list[run.i]], f = Q.face(card), st = profile.cards[card.id], labels = Q.nextLabels(st, today());
    const isNew = !st;
    frame('Flashcards', `<div class="st-hud"><span>${run.i + 1}<small>/${run.list.length}</small></span>${bar('Session progress', run.i, run.list.length)}<span class="st-score">${IC('star')}${run.xp}</span></div>
      <section class="st-card fc${run.shown ? ' flipped' : ''}"><p class="st-tag">${esc((B.TOPICS.find((t) => t.key === card.topic) || {}).name || '')}${isNew ? ' · new' : ''}</p><div class="fc-front">${f.front}</div>
      ${run.shown ? `<div class="fc-back">${f.back}<p class="st-src">${vbadge(f.v)} ${esc(f.src)}</p></div><div class="st-grades">${['Again', 'Hard', 'Good', 'Easy'].map((g, k) => `<button type="button" class="btn g${k}" data-act="grade" data-g="${k}"><b>${g}</b><small>${labels[k]}</small></button>`).join('')}</div>`
        : `<div class="st-nav"><button type="button" class="btn btn-primary" data-act="show">Show answer</button></div>`}</section>`, { back: '' });
  }
  function grade(g) {
    const id = run.list[run.i], day = today(), prev = profile.cards[id], first = !prev;
    profile.cards[id] = Q.review(prev || Q.newState(day), g, day);
    if (first) profile.newToday = { day, n: ((profile.newToday && profile.newToday.day === day ? profile.newToday.n : 0) + 1) };
    Q.touchDay(profile, day); Q.bump(profile, 'reviews'); addXp([1, 3, 5, 6][g]); run.done += 1;
    if (g === 0) { run.list.push(id); run.lapsed += 1; }
    run.i += 1; run.shown = false; save(); drawFlash();
  }
  function finishFlash() {
    const got = Q.newBadges(profile, today()); save();
    frame('Flashcards — session complete', `<section class="st-card st-end"><p class="st-big">${run.done}<small> reviews</small></p><div class="st-stats">${stat('star', '+' + run.xp, 'XP earned')}${stat('flame', profile.streak, 'day streak')}${stat('layers', Q.mature(profile), 'in long-term memory')}</div>
      ${got.length ? `<p class="st-levelup">${IC('star')}New badge: ${got.map((b) => '<b>' + esc(b.name) + '</b>').join(', ')}</p>` : ''}<div class="st-nav"><a class="btn btn-primary" href="#/study">Study hub</a><button type="button" class="btn" data-act="again">Keep going</button></div></section>`, { back: '' });
  }

  /* ---------- detective ---------- */
  function startDetective() {
    const pool = Q.detectivePool(), r = Q.rng((Date.now() & 0xffffff) + 9), prev = run && run.det && run.det.id;
    let id = pool[Math.floor(r() * pool.length)]; if (id === prev && pool.length > 1) id = pool[(pool.indexOf(id) + 1) % pool.length];
    const det = Q.detectiveFor(id, r); run = Object.assign({}, run && run.dsum ? { dsum: run.dsum } : { dsum: { cases: 0, points: 0, xp: 0 } }, { det, shown: 1, wrong: new Set(), solved: false, xp: 0, startLevel: Q.levelFor(profile.xp).level });
    drawDetective();
  }
  const detPoints = () => Math.max(1, run.det.clues.length - (run.shown - 1) - run.wrong.size);
  function drawDetective() {
    const d = run.det, pts = detPoints();
    const clues = d.clues.map((c, i) => (i < run.shown ? `<li class="on"><span class="dom">${esc(c.domain)}</span>${esc(c.text)}</li>` : `<li class="off">${IC('lock')}Clue ${i + 1} hidden</li>`)).join('');
    const opts = d.options.map((o, i) => `<button type="button" class="st-opt${run.solved ? (i === d.ans ? ' right' : ' dim') : run.wrong.has(i) ? ' wrong' : ''}" data-act="dpick" data-i="${i}"${run.solved || run.wrong.has(i) ? ' disabled' : ''}><span>${esc(o.label)} <em>${esc(o.abbr)}</em></span></button>`).join('');
    frame('Syndrome detective', `<div class="st-hud"><span>Case ${run.dsum.cases + 1}</span><span class="st-score">${IC('star')}${run.dsum.points} pts</span><span class="st-pts">${IC('search')}worth ${run.solved ? run.gained : pts}</span></div>
      <section class="st-card det"><p class="st-tag">Case file · ${Math.min(run.shown, d.clues.length)} of ${d.clues.length} clues</p><ul class="clues">${clues}</ul><p class="st-stem">Which syndrome fits all the clues? <small>Every wrong option is rejected by the ILAE 2022 criteria once all clues are known.</small></p><div class="st-opts">${opts}</div>
      ${run.solved ? `<div class="st-exp ok"><b>${esc(d.name)} (${esc(d.abbr)})</b><p>${esc(d.plain)}</p><p class="st-src">${vbadge(1)} ${esc(d.src)}</p></div><div class="st-nav"><button type="button" class="btn btn-primary" data-act="nextcase">Next case${IC('arrow')}</button><a class="btn" href="#/study">Finish</a></div>`
        : `<div class="st-nav"><button type="button" class="btn" data-act="reveal"${run.shown >= d.clues.length ? ' hidden' : ''}>${IC('search')}Reveal next clue (−1 point)</button></div>`}</section>`, { back: '' });
  }
  function dpick(i) {
    const d = run.det;
    if (i === d.ans) {
      const first = run.wrong.size === 0, pts = detPoints(); run.solved = true; run.gained = pts; run.dsum.cases += 1; run.dsum.points += pts;
      Q.record(profile, { topic: 'syn', card: 'syn:' + d.id }, first, today()); addXp(8 * pts); if (first && run.shown === 1) { Q.bump(profile, 'oneClue'); burst(); }
      Q.newBadges(profile, today()); save();
    } else { run.wrong.add(i); }
    drawDetective();
  }

  /* ---------- memory match ---------- */
  function matchSetup() {
    frame('Memory match', `<section class="st-card"><div class="st-games">${[['gene', 'dna', 'Genes ↔ syndromes'], ['abbr', 'book', 'Abbreviations ↔ names'], ['onset', 'clock', 'Syndromes ↔ onset ages'], ['eeg', 'activity', 'EEG patterns ↔ names'], ['sem', 'figure', 'Movements ↔ names']].map((g) => `<button type="button" class="st-game" data-act="mset" data-k="${g[0]}"><span class="st-gi">${IC(g[1])}</span><b>${g[2]}</b><small>6 pairs · fewest moves wins</small></button>`).join('')}</div></section>`);
  }
  function startMatch(kind) {
    const r = Q.rng((Date.now() & 0xffffff) + 11), set = (kind === 'eeg' || kind === 'sem') ? Q.picMatch(kind, r) : Q.matchSet(kind, r), tiles = [];
    set.pairs.forEach((p, i) => { tiles.push({ pid: i, side: 'a', html: p.html ? p.html : esc(p.a) , pic: !!p.html }); tiles.push({ pid: i, side: 'b', html: p.html ? esc(p.name) : esc(p.b), pic: false }); });
    run = { match: set, kind, tiles: Q.shuffle(tiles, r).map((t, k) => Object.assign({ k, up: false, done: false }, t)), up: [], moves: 0, found: 0, lock: false, xp: 0, startLevel: Q.levelFor(profile.xp).level };
    drawMatch();
  }
  function drawMatch() {
    const m = run;
    frame(m.match.title, `<div class="st-hud"><span>${IC('grid')}${m.found}<small>/${m.match.pairs.length} pairs</small></span><span>${m.moves}<small> moves</small></span></div><section class="st-card"><div class="mt-grid">${m.tiles.map((t) => `<button type="button" class="mt${t.up ? ' up' : ''}${t.done ? ' done' : ''}${t.pic ? ' pic' : ''}" data-act="flip" data-k="${t.k}" aria-label="${t.up || t.done ? 'Tile' : 'Face-down tile'}"${t.done ? ' disabled' : ''}>${t.up || t.done ? `<span class="mt-f">${t.html}</span>` : `<span class="mt-b">${IC('help')}</span>`}</button>`).join('')}</div>
      ${m.found === m.match.pairs.length ? `<div class="st-exp ok"><b>Cleared in ${m.moves} moves</b><p>${m.moves <= 8 ? 'Photographic memory.' : m.moves <= 14 ? 'Nicely done.' : 'Try again — the layout changes every time.'}</p></div><div class="st-nav"><button type="button" class="btn btn-primary" data-act="mset" data-k="${m.kind}">New board</button><a class="btn" href="#/study">Study hub</a></div>` : ''}</section>`, { back: 'match' });
  }
  function flip(k) {
    const m = run; if (m.lock) return; const t = m.tiles[k]; if (t.up || t.done) return;
    t.up = true; m.up.push(t); drawMatch();
    if (m.up.length === 2) {
      m.moves += 1; const [a, b] = m.up;
      if (a.pid === b.pid && a.side !== b.side) { a.done = b.done = true; a.up = b.up = false; m.up = []; m.found += 1; if (m.found === m.match.pairs.length) { addXp(Math.max(10, 60 - 3 * m.moves)); Q.bump(profile, 'matchWins'); burst(); Q.touchDay(profile, today()); Q.newBadges(profile, today()); save(); } setTimeout(drawMatch, 350); }
      else { m.lock = true; setTimeout(() => { a.up = b.up = false; m.up = []; m.lock = false; if (run === m) drawMatch(); }, 900); }
    }
  }

  /* ---------- sort & order puzzles ---------- */
  function puzzleHub() {
    frame('Sort & order', `<section class="st-card"><div class="st-games">${[['seizure', 'figure', 'Build the ILAE 2025 tree', 'Focal, generalized or unknown-onset?'], ['asm', 'pill', 'Sort drugs by mechanism', 'Sodium channel, SV2A, GABA…'], ['group', 'layers', 'Syndromes by group', 'Neonate–infant, childhood, IGE, variable age'], ['type', 'target', 'Syndromes by epilepsy type', 'Focal, generalized or combined'], ['ladder', 'sort', 'Onset ladder', 'Line five syndromes up by age at onset'], ['seq', 'alert', 'Put it in order', 'SE algorithm, seizure evolution, surgical pathway…']].map((g) => `<button type="button" class="st-game" data-act="pz" data-k="${g[0]}"><span class="st-gi">${IC(g[1])}</span><b>${g[2]}</b><small>${g[3]}</small></button>`).join('')}</div></section>`);
  }
  function startPuzzle(kind) {
    const r = Q.rng((Date.now() & 0xffffff) + 13);
    if (kind === 'ladder') { const l = Q.ladder(r); run = { reorder: { title: 'Onset ladder — youngest onset first', hint: 'Order the syndromes by the age at which seizures typically begin.', items: Q.shuffle(l.items, r), correct: l.order, key: 'id', ladder: true, kind }, xp: 0, startLevel: Q.levelFor(profile.xp).level }; drawReorder(); }
    else if (kind === 'seq') { const s = Q.sequence(r); run = { reorder: { title: s.title, hint: 'Put the steps in the right order.', items: s.shuffled.map((x) => ({ id: x.i, label: x.t })), correct: s.steps.map((_, i) => i), key: 'id', src: s.src, kind }, xp: 0, startLevel: Q.levelFor(profile.xp).level }; drawReorder(); }
    else { const p = Q.binPuzzle(kind, r, 8); run = { sort: p, placed: {}, sel: null, checked: false, xp: 0, startLevel: Q.levelFor(profile.xp).level }; drawSort(); }
  }
  function drawSort() {
    const s = run.sort, tray = s.items.filter((x) => run.placed[x.i] === undefined);
    const item = (x, cls, act) => `<button type="button" class="srt-i${cls || ''}" data-act="${act}" data-i="${x.i}">${esc(x.label)}</button>`;
    const bins = s.bins.map((b) => `<div class="bin" data-bin="${esc(b)}"><button type="button" class="bin-h" data-act="place" data-bin="${esc(b)}">${esc(b)}</button><div class="slot">${s.items.filter((x) => run.placed[x.i] === b).map((x) => item(x, run.checked ? (x.bin === b ? ' ok' : ' bad') : '', run.checked ? 'noop' : 'unplace')).join('')}</div></div>`).join('');
    const wrong = run.checked ? s.items.filter((x) => run.placed[x.i] !== x.bin) : [];
    frame(s.title, `<section class="st-card"><p class="st-hint">Tap an item, then tap the group it belongs to. Tap a placed item to take it back.</p><div class="srt-tray">${tray.map((x) => item(x, run.sel === x.i ? ' sel' : '', 'sel')).join('') || '<span class="muted">All placed</span>'}</div><div class="bins">${bins}</div>
      ${run.checked ? `<div class="st-exp ${wrong.length ? 'bad' : 'ok'}"><b>${s.items.length - wrong.length} of ${s.items.length} correct</b>${wrong.length ? `<p>${wrong.map((x) => esc(x.label) + ' → ' + esc(x.bin)).join(' · ')}</p>` : '<p>Flawless.</p>'}<p class="st-src">${vbadge(s.src === 'std' ? 0 : 1)} ${esc(B.SRC[s.src] || s.src)}</p></div><div class="st-nav"><button type="button" class="btn btn-primary" data-act="pz" data-k="${s.kind}">New round</button><a class="btn" href="#/study/puzzle">Other puzzles</a></div>`
        : `<div class="st-nav"><button type="button" class="btn btn-primary" data-act="checksort"${tray.length ? ' disabled' : ''}>Check${IC('check')}</button></div>`}</section>`, { back: 'puzzle' });
  }
  function drawReorder() {
    const r = run.reorder, items = r.items;
    const rows = items.map((x, i) => { const right = run.checked && x[r.key] === r.correct[i];
      return `<li class="${run.checked ? (right ? 'ok' : 'bad') : ''}"><span class="n">${i + 1}</span><span class="t">${esc(x.label)}${run.checked && x.range ? `<small>${esc(x.range)}</small>` : ''}</span>${run.checked ? '' : `<span class="mv"><button type="button" class="btn" data-act="up" data-i="${i}" aria-label="Move earlier"${i === 0 ? ' disabled' : ''}>▲</button><button type="button" class="btn" data-act="down" data-i="${i}" aria-label="Move later"${i === items.length - 1 ? ' disabled' : ''}>▼</button></span>`}</li>`; }).join('');
    const nOk = run.checked ? items.filter((x, i) => x[r.key] === r.correct[i]).length : 0;
    frame(r.title, `<section class="st-card"><p class="st-hint">${esc(r.hint)}</p><ol class="ord">${rows}</ol>${run.checked ? `<div class="st-exp ${nOk === items.length ? 'ok' : 'bad'}"><b>${nOk} of ${items.length} in the right place</b>${nOk === items.length ? '' : '<p>Correct order: ' + r.correct.map((k) => esc((r.items.find((x) => x[r.key] === k) || {}).label)).join(' → ') + '</p>'}${r.src ? `<p class="st-src">${vbadge(r.src !== 'std')} ${esc(B.SRC[r.src] || r.src)}</p>` : ''}</div><div class="st-nav"><button type="button" class="btn btn-primary" data-act="pz" data-k="${r.kind}">Another</button><a class="btn" href="#/study/puzzle">Other puzzles</a></div>` : `<div class="st-nav"><button type="button" class="btn btn-primary" data-act="checkord">Check${IC('check')}</button></div>`}</section>`, { back: 'puzzle' });
  }
  function finishPuzzle(correct, total, counter) {
    const first = !run.paid; run.paid = true;
    if (first) { Q.touchDay(profile, today()); addXp(correct * 5 + (correct === total ? 15 : 0)); if (correct === total) Q.bump(profile, counter); Q.bump(profile, 'puzzles'); Q.newBadges(profile, today()); save(); }
  }

  /* ---------- cheat sheets ---------- */
  function reference() {
    const se = (id) => B.FACTS.find((f) => f.id === id).a, tab = arg || 'mech';
    const tabs = [['mech', 'Drug diagrams'], ['asm', 'Drugs'], ['gene', 'Genes'], ['trial', 'Trials'], ['se', 'Status epilepticus']];
    const table = (head, rows) => `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
    let body = '';
    if (tab === 'mech') body = `<div class="mech-grid">${Object.keys(B.BINS_ASM).concat(['other']).map((k) => `<figure class="mech-card">${Q.mechSvg(k)}<figcaption><b>${esc(Q.MECH[k][0])}</b><span>${esc(Q.MECH[k][1])}</span><ul>${B.ASM.filter((a) => a.bin === k).map((a) => `<li><b>${esc(a.name)}</b> ${esc(a.hook)}</li>`).join('')}</ul></figcaption></figure>`).join('')}</div>`;
    else if (tab === 'asm') body = table(['Drug', 'Mechanism', 'Adverse effects', 'Pearl and hook'], B.ASM.map((a) => `<tr data-q="${esc((a.name + ' ' + a.mech + ' ' + a.tox + ' ' + a.pearl).toLowerCase())}"><th>${esc(a.name)}</th><td>${esc(a.mech)}</td><td>${esc(a.tox)}</td><td>${esc(a.pearl)}<br><i>${esc(a.hook)}</i></td></tr>`));
    else if (tab === 'gene') body = table(['Gene', 'Encodes / pathway', 'Syndromes', 'Key points'], B.GENES.map((g) => `<tr data-q="${esc((g.g + ' ' + g.fn + ' ' + g.pearl).toLowerCase())}"><th>${esc(g.g)}</th><td>${esc(g.fn)}</td><td>${esc(g.syn.map((id) => (Q.SYN.find((s) => s.id === id) || {}).abbr).filter(Boolean).join(', ') || '—')}</td><td>${esc(g.pearl)}</td></tr>`));
    else if (tab === 'trial') body = table(['Trial', 'Year', 'Question', 'Result', 'Source'], B.TRIALS.map((t) => `<tr data-q="${esc((t[0] + ' ' + t[2] + ' ' + t[3]).toLowerCase())}"><th>${esc(t[0])}</th><td>${t[1]}</td><td>${esc(t[2])}</td><td>${esc(t[3])}</td><td class="src">${esc(B.SRC[t[4]] || '')}</td></tr>`));
    else body = `<div class="se-card"><ol class="ord static">${B.SEQ[0].steps.map((s, i) => `<li><span class="n">${i + 1}</span><span class="t">${esc(s)}</span></li>`).join('')}</ol>
      <h3 class="st-sub">Doses (AES 2016 guideline)</h3><dl class="fc-dl"><dt>IM midazolam (&gt;40 kg)</dt><dd>${esc(se('se3'))}</dd><dt>IV lorazepam</dt><dd>${esc(se('se4'))}</dd><dt>Second line — fosphenytoin / valproate / levetiracetam</dt><dd>${esc(se('se5'))}</dd></dl>
      <h3 class="st-sub">Definitions</h3><dl class="fc-dl"><dt>Convulsive SE (ILAE 2015)</dt><dd>${esc(se('se1'))}</dd><dt>Focal SE with impaired consciousness</dt><dd>${esc(se('se2'))}</dd><dt>Refractory</dt><dd>${esc(B.FACTS.find((f) => f.id === 'se8').a)}</dd><dt>NORSE</dt><dd>${esc(B.FACTS.find((f) => f.id === 'se9').a)}</dd></dl>
      <p class="st-src">${esc(B.SRC.glauser2016)}<br>${esc(B.SRC.trinka2015)}<br>${esc(B.SRC.kapur2019)}</p></div>`;
    frame('Cheat sheets', `<div class="gpills" role="group" aria-label="Sheet">${tabs.map((t) => `<a class="gpill${t[0] === tab ? ' on' : ''}" href="#/study/ref/${t[0]}">${t[1]}</a>`).join('')}</div>${tab === 'se' || tab === 'mech' ? '' : '<div class="search"><svg class="ic"><use href="#i-search"/></svg><input id="st-filter" type="search" placeholder="Filter this table…" aria-label="Filter table"></div>'}<section class="st-card">${body}<p class="st-fine">Sources are labelled per statement in the games; verify doses and indications against current guidelines and product labels.</p></section>`);
  }

  /* ---------- settings ---------- */
  function settings() {
    const p = prefs();
    frame('Settings, backup & reset', `<section class="st-card"><h3 class="st-sub first">New flashcards per day</h3><div class="wz-chips">${[5, 12, 20, 30].map((n) => `<button type="button" class="ct" data-act="newpd" data-n="${n}" aria-pressed="${p.newPerDay === n}">${n}</button>`).join('')}</div>
      <h3 class="st-sub">Back up or move your progress</h3><p class="st-hint">Your progress lives only in this browser. Copy the text below to keep a backup or move it to another device, and paste it back to restore.</p>
      <textarea id="st-json" class="st-json" rows="4" aria-label="Progress backup text">${esc(JSON.stringify(profile))}</textarea><div class="st-nav"><button type="button" class="btn" data-act="copyjson">${IC('copy')}Copy</button><button type="button" class="btn" data-act="importjson">Restore from text</button></div><p id="st-msg" class="st-hint" role="status"></p>
      <h3 class="st-sub">Reset</h3><button type="button" class="btn" data-act="reset">${IC('reset')}Erase all study progress</button></section>`);
  }

  /* ============================================================ events + routing */
  function onClick(e) {
    const t = e.target.closest('[data-act]');
    if (!t) {
      const tapped = e.target.closest('[data-el]'); // electrode on the head map
      if (tapped && run && run.cfg && run.cfg.questions[run.i].tap) answer(0, tapped.dataset.el);
      const bn = e.target.closest('.bin'); // empty part of a sorting bucket
      if (bn && run && run.sort && run.sel !== null && !run.checked) { run.placed[run.sel] = bn.dataset.bin; run.sel = null; drawSort(); }
      return;
    }
    const a = t.dataset.act, d = t.dataset;
    if (a === 'pick') answer(Number(d.i)); else if (a === 'next') nextQ();
    else if (a === 'rshow') { run.revealed = true; drawQ(); } else if (a === 'rk') answer(Number(d.ok));
    else if (a === 'again') { if (mode === 'flash') startFlash(); else if (mode === 'daily') startDaily(); else route(); }
    else if (a === 'topic') { setup.topics.has(d.t) ? setup.topics.delete(d.t) : setup.topics.add(d.t); quizSetup(); }
    else if (a === 'len') { setup.n = Number(d.n); quizSetup(); } else if (a === 'surv') { setup.survival = d.v === '1'; quizSetup(); } else if (a === 'startquiz') startQuiz();
    else if (a === 'pics') startPictures(d.k); else if (a === 'lab') startLab(d.k);
    else if (a === 'show') { run.shown = true; drawFlash(); } else if (a === 'grade') grade(Number(d.g));
    else if (a === 'reveal') { run.shown += 1; drawDetective(); } else if (a === 'dpick') dpick(Number(d.i)); else if (a === 'nextcase') startDetective();
    else if (a === 'mset') startMatch(d.k); else if (a === 'flip') flip(Number(d.k));
    else if (a === 'pz') startPuzzle(d.k);
    else if (a === 'sel') { run.sel = run.sel === Number(d.i) ? null : Number(d.i); drawSort(); }
    else if (a === 'place') { if (run.sel !== null) { run.placed[run.sel] = d.bin; run.sel = null; drawSort(); } }
    else if (a === 'unplace') { delete run.placed[Number(d.i)]; drawSort(); }
    else if (a === 'checksort') { run.checked = true; const ok = run.sort.items.filter((x) => run.placed[x.i] === x.bin).length; finishPuzzle(ok, run.sort.items.length, 'binWins'); drawSort(); }
    else if (a === 'up' || a === 'down') { const i = Number(d.i), j = a === 'up' ? i - 1 : i + 1, it = run.reorder.items; [it[i], it[j]] = [it[j], it[i]]; drawReorder(); }
    else if (a === 'checkord') { run.checked = true; const r = run.reorder, ok = r.items.filter((x, i) => x[r.key] === r.correct[i]).length; finishPuzzle(ok, r.items.length, r.ladder ? 'ladderWins' : 'seqWins'); drawReorder(); }
    else if (a === 'newpd') { profile.prefs = Object.assign(prefs(), { newPerDay: Number(d.n) }); save(); settings(); }
    else if (a === 'copyjson') { const ta = $('#st-json'); ta.select(); try { document.execCommand('copy'); $('#st-msg').textContent = 'Copied.'; } catch (x) { $('#st-msg').textContent = 'Select the text and copy it manually.'; } }
    else if (a === 'importjson') { try { const p = JSON.parse($('#st-json').value); if (!p || p.v !== 1 || typeof p.xp !== 'number' || typeof p.cards !== 'object') throw new Error('bad'); profile = Object.assign(Q.blankProfile(), p); save(); $('#st-msg').textContent = 'Progress restored.'; } catch (x) { $('#st-msg').textContent = 'That text is not a valid backup.'; } }
    else if (a === 'reset') { if (d.sure) { profile = Q.blankProfile(); save(); settings(); $('#st-msg').textContent = 'All study progress erased.'; } else { t.dataset.sure = '1'; t.textContent = 'Tap again to confirm erasing everything'; } }
  }
  function onKey(e) {
    if (document.body.dataset.view !== 'study') return;
    if (run && run.cfg && !e.target.matches('input,textarea,select')) {
      const q = run.cfg.questions[run.i];
      if (q.type === 'recall') { if (!run.revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); run.revealed = true; drawQ(); } else if (run.revealed && !run.answered && /^[12]$/.test(e.key)) answer(e.key === '1' ? 0 : 1); }
      else if (/^[1-4]$/.test(e.key) && !run.answered) answer(Number(e.key) - 1);
    }
    if (run && run.flash && !e.target.matches('input,textarea,select')) {
      if ((e.key === ' ' || e.key === 'Enter') && !run.shown) { e.preventDefault(); run.shown = true; drawFlash(); }
      else if (run.shown && /^[1-4]$/.test(e.key)) grade(Number(e.key) - 1);
    }
  }
  function onInput(e) {
    if (e.target.id === 'st-filter') { const q = e.target.value.trim().toLowerCase(); $$('tbody tr', el).forEach((r) => { r.hidden = !!q && !r.dataset.q.includes(q); }); }
  }

  function route() {
    const m = /^#\/study(?:\/(\w+))?(?:\/([\w.]+))?/.exec(location.hash) || [];
    mode = m[1] || ''; arg = m[2] || ''; run = null;
    if (!mode) return hub();
    ({ daily: startDaily, flash: startFlash, quiz: quizSetup, detective: startDetective, pictures: picturesSetup, match: matchSetup, puzzle: puzzleHub, eeglab: eegLab, ref: reference, settings }[mode] || hub)();
  }
  function mount() {
    el = $('#st-root'); profile = load();
    el.addEventListener('click', onClick); el.addEventListener('input', onInput); document.addEventListener('keydown', onKey);
  }
  const note = (id) => ((profile && profile.notes) || {})[id] || '';
  function setNote(id, text) { profile.notes = profile.notes || {}; if (text.trim()) profile.notes[id] = text.slice(0, 2000); else delete profile.notes[id]; save(); }
  return { mount, show: route, note, setNote, _profile: () => profile };
});
