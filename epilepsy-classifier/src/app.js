/* UI for the epilepsy classifier. No network calls; no persistence of patient data. */
(function () {
  'use strict';
  const V = window.EpiVocab, E = window.EpiEngine, KB = window.EpiKB, EX = window.EpiExamples;
  const SYN = E.parseKB(KB.TEXT);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const IC = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;

  const SOURCES = {
    beniczky2025: 'Beniczky S, Trinka E, Wirrell E, et al. Updated classification of epileptic seizures: Position paper of the ILAE. Epilepsia 2025;66:1804–1823. doi:10.1111/epi.18338',
    scheffer2017: 'Scheffer IE, Berkovic S, Capovilla G, et al. ILAE classification of the epilepsies. Epilepsia 2017;58:512–521. doi:10.1111/epi.13709',
    wirrell2022: 'Wirrell EC, Nabbout R, Scheffer IE, et al. Methodology for classification and definition of epilepsy syndromes with list of syndromes. Epilepsia 2022;63:1333–1348. doi:10.1111/epi.17237',
    zuberi2022: 'Zuberi SM, Wirrell E, Yozawitz E, et al. ILAE classification and definition of epilepsy syndromes with onset in neonates and infants. Epilepsia 2022;63:1349–1397. doi:10.1111/epi.17239',
    specchio2022: 'Specchio N, Wirrell EC, Scheffer IE, et al. ILAE classification and definition of epilepsy syndromes with onset in childhood. Epilepsia 2022;63:1398–1442. doi:10.1111/epi.17241',
    riney2022: 'Riney K, Bogacz A, Somerville E, et al. ILAE classification and definition of epilepsy syndromes with onset at a variable age. Epilepsia 2022;63:1443–1474. doi:10.1111/epi.17240',
    hirsch2022: 'Hirsch E, French J, Scheffer IE, et al. ILAE definition of the idiopathic generalized epilepsy syndromes. Epilepsia 2022;63:1475–1499. doi:10.1111/epi.17236',
    specchio2026: 'Specchio N, Auvin S, Bisulli F, et al. How should etiology change the classification of the epilepsies? Report from the ILAE 2021–2025 Terminology Commission. Epilepsia 2026. doi:10.1002/epi.70467 (abstract reviewed)',
  };
  const SHORT_SRC = { zuberi2022: 'Zuberi 2022', specchio2022: 'Specchio 2022', riney2022: 'Riney 2022', hirsch2022: 'Hirsch 2022' };
  const UNIT_MONTHS = { d: 12 / 365.25, w: (12 / 365.25) * 7, m: 1, y: 12 };
  const UNIT_NAME = { d: 'days', w: 'weeks', m: 'months', y: 'years' };
  const LABELS = {};
  V.SECTIONS.forEach((s) => s.groups.forEach((g) => g.items.forEach((i) => { LABELS[i[0]] = i[1]; })));
  V.IMAGING_ITEMS.forEach((i) => { LABELS[i[0]] = 'MRI: ' + i[1]; });

  const fresh = () => ({ onsetValue: '', onsetUnit: 'y', nowValue: '', nowUnit: 'y', sex: '', mri: '', devOnset: null, devNow: null, findings: {}, reviewed: {}, ui: {} });
  let state = fresh();
  let lastShown = [];
  let dirty = false; // the checklist view is re-rendered lazily when the guided view changed the data
  const toggled = new Map(); // <details> open-state chosen by the user, preserved across live re-renders

  /* ---------- state <-> engine patient ---------- */
  const toMonths = (v, u) => (v === '' || v === null || Number.isNaN(Number(v)) ? null : Number(v) * UNIT_MONTHS[u]);
  const toPatient = () => ({
    onsetMonths: toMonths(state.onsetValue, state.onsetUnit), nowMonths: toMonths(state.nowValue, state.nowUnit),
    sex: state.sex || null, mri: state.mri || null, devOnset: state.devOnset, devNow: state.devNow,
    findings: state.findings, reviewed: state.reviewed,
  });
  function fromMonths(m) {
    if (m === null || m === undefined) return { v: '', u: 'y' };
    const r = (x) => String(Math.round(x * 10) / 10);
    if (m < 1) return { v: r(m * 365.25 / 12), u: 'd' };
    if (m < 24) return { v: r(m), u: 'm' };
    return { v: r(m / 12), u: 'y' };
  }
  function loadPatient(p) {
    state = fresh();
    const a = fromMonths(p.onsetMonths), b = fromMonths(p.nowMonths);
    Object.assign(state, { onsetValue: a.v, onsetUnit: a.u, nowValue: b.v, nowUnit: b.u, sex: p.sex || '', mri: p.mri || '', devOnset: p.devOnset, devNow: p.devNow });
    state.findings = Object.assign({}, p.findings); state.reviewed = Object.assign({}, p.reviewed);
  }

  /* ---------- form construction ---------- */
  const ROW_BTN = (id, v, cls, icon, title) =>
    `<label class="${cls}"><input type="radio" name="f:${id}" value="${v}"${v === 'u' ? ' checked' : ''}><span class="b">${IC(icon)}<span class="sr">${title}</span></span></label>`;
  function triRow(id, label, hint) {
    return `<div class="row" data-id="${id}" data-q="${esc((label + ' ' + (hint || '') + ' ' + id).toLowerCase())}">
      <span class="lbl" id="l-${id}">${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span>
      <div class="row-r">${window.EpiViews.hasMorph(id) ? `<button type="button" class="info-btn" data-morph="${id}" aria-label="About this EEG pattern: ${esc(label)}" title="What does this look like?">${IC(window.EpiViews.iconFor(id))}</button>` : ''}<div class="tri" role="radiogroup" aria-labelledby="l-${id}">${ROW_BTN(id, 'y', 't-y', 'check', 'Present')}${ROW_BTN(id, 'n', 't-n', 'x', 'Absent')}${ROW_BTN(id, 'u', 't-u', 'minus', 'Not assessed')}</div></div></div>`;
  }
  function buildForm() {
    $('#sections').innerHTML = V.SECTIONS.map((s, i) => `
      <details class="sec" data-sec="${s.key}"${i === 0 ? ' open' : ''}>
        <summary><span class="num-b">${i + 2}</span><h2>${esc(s.title)}</h2><span class="count" data-count="${s.key}" hidden></span>${IC('chevron', 'chev')}</summary>
        <div class="sec-body">
          <p class="blurb">${esc(s.blurb)}</p>
          <label class="review"><input type="checkbox" data-review="${s.key}"><span>${esc(s.reviewLabel)}</span></label>
          ${s.groups.map((g) => `<div class="group"><div class="grp">${esc(g.title)}</div>${g.items.map((it) => triRow(it[0], it[1], it[2])).join('')}</div>`).join('')}
        </div>
      </details>`).join('');
    $('#mri-items').innerHTML = V.IMAGING_ITEMS.map((it) => `<label><input type="checkbox" data-img="${it[0]}"><span>${esc(it[1])}</span></label>`).join('');
    ['devOnset', 'devNow'].forEach((k) => {
      $('#' + k).innerHTML = '<option value="">Not assessed</option>' + V.DEV_LEVELS.map((l) => `<option value="${l.v}">${esc(l.label)}</option>`).join('');
    });
    $('#example').insertAdjacentHTML('beforeend', EX.map((e) => `<option value="${e.id}">${esc(e.title)}</option>`).join(''));
    $('#sources').innerHTML = ['beniczky2025', 'scheffer2017', 'wirrell2022', 'zuberi2022', 'specchio2022', 'riney2022', 'hirsch2022', 'specchio2026'].map((k) => `<li>${esc(SOURCES[k])}</li>`).join('');
  }
  function markRow(id) {
    const row = $(`.row[data-id="${id}"]`); if (!row) return;
    row.classList.toggle('is-y', state.findings[id] === true);
    row.classList.toggle('is-n', state.findings[id] === false);
  }
  function syncForm() {
    $('#onset-v').value = state.onsetValue; $('#onset-u').value = state.onsetUnit;
    $('#now-v').value = state.nowValue; $('#now-u').value = state.nowUnit;
    const setRadio = (name, val) => { const el = $(`input[name="${name}"][value="${val}"]`); if (el) el.checked = true; };
    setRadio('sex', state.sex); setRadio('mri', state.mri);
    $('#devOnset').value = state.devOnset === null ? '' : String(state.devOnset);
    $('#devNow').value = state.devNow === null ? '' : String(state.devNow);
    $('#mri-detail').hidden = state.mri !== 'abnormal';
    $$('input[data-img]').forEach((c) => { c.checked = state.findings[c.dataset.img] === true; });
    V.SECTIONS.forEach((s) => s.groups.forEach((g) => g.items.forEach((it) => {
      const v = state.findings[it[0]]; setRadio('f:' + it[0], v === true ? 'y' : v === false ? 'n' : 'u'); markRow(it[0]);
    })));
    $$('input[data-review]').forEach((c) => { c.checked = !!state.reviewed[c.dataset.review]; });
    updateCounts();
  }
  function updateCounts() {
    V.SECTIONS.forEach((s) => {
      const n = [].concat(...s.groups.map((g) => g.items.map((it) => it[0]))).filter((id) => state.findings[id] === true || state.findings[id] === false).length;
      const el = $(`[data-count="${s.key}"]`);
      el.hidden = !n && !state.reviewed[s.key];
      el.textContent = n + ' entered' + (state.reviewed[s.key] ? ' · reviewed' : '');
    });
  }
  function applyFilter() {
    const q = $('#filter').value.trim().toLowerCase();
    $('#card-patient').hidden = !!q;
    let visible = 0;
    $$('details.sec').forEach((sec) => {
      let hits = 0;
      $$('.group', sec).forEach((g) => {
        let gh = 0;
        $$('.row', g).forEach((r) => { const show = !q || r.dataset.q.includes(q); r.hidden = !show; if (show) gh++; });
        g.hidden = !gh; hits += gh;
      });
      sec.hidden = !!q && !hits;
      if (q && hits) sec.open = true;
      visible += hits;
    });
    $('#nomatch').hidden = !q || visible > 0;
  }

  /* ---------- events ---------- */
  function onChange(e) {
    const t = e.target;
    if (t.name && t.name.startsWith('f:')) {
      const id = t.name.slice(2);
      if (t.value === 'u') delete state.findings[id]; else state.findings[id] = t.value === 'y';
      markRow(id);
    } else if (t.dataset.review) state.reviewed[t.dataset.review] = t.checked;
    else if (t.dataset.img) { if (t.checked) state.findings[t.dataset.img] = true; else delete state.findings[t.dataset.img]; }
    else if (t.name === 'sex') state.sex = t.value;
    else if (t.name === 'mri') { state.mri = t.value; $('#mri-detail').hidden = t.value !== 'abnormal'; }
    else if (t.id === 'devOnset' || t.id === 'devNow') state[t.id] = t.value === '' ? null : Number(t.value);
    else if (t.id === 'onset-u') state.onsetUnit = t.value;
    else if (t.id === 'now-u') state.nowUnit = t.value;
    else return;
    updateCounts(); render();
  }
  function onInput(e) {
    if (e.target.id === 'onset-v') state.onsetValue = e.target.value;
    else if (e.target.id === 'now-v') state.nowValue = e.target.value;
    else if (e.target.id === 'filter') { applyFilter(); return; }
    else return;
    render();
  }
  function loadExample(id) {
    const ex = EX.find((x) => x.id === id);
    if (!ex) return;
    loadPatient(ex.patient); $('#filter').value = ''; applyFilter(); syncForm(); toggled.clear(); render();
    $('#example').value = id;
    $$('details.sec').forEach((d) => { const c = $('[data-count]', d); d.open = !!c && !c.hidden; });
    if (document.body.dataset.view === 'guided') { window.EpiWizard.forget(); window.EpiWizard.go(window.EpiWizard.RESULT); }
    else if (window.matchMedia('(max-width: 1019px)').matches) $('#results').scrollIntoView({ behavior: 'smooth' });
  }

  /* ---------- results rendering ---------- */
  const STATUS = { met: ['check', 'Criteria met'], possible: ['help', 'Possible'], excluded: ['x', 'Not consistent'] };
  const pill = (s) => `<span class="pill ${s}">${IC(STATUS[s][0])}${STATUS[s][1]}</span>`;
  const STATE_UI = {
    M: { met: ['check', 'good', 'Met'], unmet: ['x', 'bad', 'Not met'], pending: ['help', 'warn', 'Needs data'], followup: ['clock', 'dim', 'Confirm on follow-up'], manual: ['square', 'dim', 'Verify manually'] },
    A: { alert: ['alert', 'warn', 'Alert present'], clear: ['check', 'dim', 'No alert'], unknown: ['help', 'dim', 'Not assessed'], manual: ['square', 'dim', 'Verify manually'] },
    E: { excluded: ['ban', 'bad', 'Exclusion present'], clear: ['check', 'dim', 'Not present'], unknown: ['help', 'dim', 'Not assessed'], manual: ['square', 'dim', 'Verify manually'] },
  };
  const LEVEL_TITLE = { M: 'Mandatory', A: 'Alerts', E: 'Exclusionary' };

  const cells = (r) => `<span class="bar-cells" role="img" aria-label="${r.counts.mandatoryMet} of ${r.counts.mandatoryTotal} mandatory criteria met">${r.rows.filter((x) => x.level === 'M' && x.expr && !x.follow)
    .map((x) => `<i class="${x.state === 'met' ? 'on' : x.state === 'unmet' ? 'off' : 'pend'}"></i>`).join('')}</span>`;

  function critBody(r) {
    const body = ['M', 'A', 'E'].map((lv) => {
      const rows = r.rows.filter((x) => x.level === lv);
      if (!rows.length) return '';
      const right = lv === 'M' ? `${r.counts.mandatoryMet}/${r.counts.mandatoryTotal} met`
        : `${rows.filter((x) => x.state === (lv === 'A' ? 'alert' : 'excluded')).length} present`;
      return `<div class="crit-h"><span>${LEVEL_TITLE[lv]}</span><span>${right}</span></div>` + rows.map((x) => {
        const ui = STATE_UI[lv][x.state];
        const links = x.expr ? [...E.collectIds(x.expr, new Set())].filter((id) => window.EpiViews.hasMorph(id)).slice(0, 3) : [];
        return `<div class="crit">${IC(ui[0], ui[1])}<span>${esc(x.text)}<span class="tag">${esc(E.DOMAIN_NAMES[x.domain] || x.domain)} · ${ui[2]}${x.core ? ' · defining' : ''}</span>${links.length ? `<span class="mlinks">${links.map((id) => `<button type="button" class="mlink" data-morph="${id}">${IC(window.EpiViews.iconFor(id))}${esc(window.EpiViews.morphName(id))}</button>`).join('')}</span>` : ''}</span></div>`;
      }).join('');
    }).join('');
    return `<div class="crit-body">${body}${r.notes.length ? `<p class="src">${r.notes.map(esc).join('<br>')}</p>` : ''}
      <p class="src">Source: ${esc(SHORT_SRC[r.source])}, ${esc(r.table)} · ${esc(r.group)} · ${esc(r.type)}</p></div>`;
  }
  const isOpen = (key, dflt) => (toggled.has(key) ? toggled.get(key) : dflt);

  function heroCard(r) {
    const c = r.counts;
    const todo = r.status === 'possible' && r.pending.length
      ? `<div class="todo"><b>To establish this diagnosis</b><ul>${r.pending.slice(0, 4).map((p) => `<li>${esc(p.text)}</li>`).join('')}</ul></div>` : '';
    return `<div class="hero ${r.status}"><div class="hero-in">
        <div class="hero-top"><span class="eyebrow">Best-fitting syndrome</span>${pill(r.status)}</div>
        <h4 class="hero-name">${esc(r.name)}<span class="abbr">${esc(r.abbr)}</span></h4>
        <p class="meta">${esc(r.group)} · ${esc(r.type)} · ${esc(SHORT_SRC[r.source])}, ${esc(r.table)}</p>
        <div class="stats">
          <div class="stat"><span class="stat-k">Mandatory met</span><span class="stat-v ${c.mandatoryMet === c.mandatoryTotal ? 'good' : 'warn'}">${c.mandatoryMet}/${c.mandatoryTotal}</span>${cells(r)}</div>
          <div class="stat"><span class="stat-k">Alerts present</span><span class="stat-v ${c.alerts ? 'warn' : 'good'}">${c.alerts}</span></div>
          <div class="stat"><span class="stat-k">Exclusions not yet checked</span><span class="stat-v ${c.unassessedExclusions ? 'warn' : 'good'}">${c.unassessedExclusions}</span></div>
        </div>${todo}<div class="onset-mini"><span class="eyebrow">Onset-age window (as encoded)</span>${window.EpiViews.onsetMini(r.id, toMonths(state.onsetValue, state.onsetUnit))}</div></div>
      <details class="crit-box" data-key="crit:${r.id}"${isOpen('crit:' + r.id, true) ? ' open' : ''}><summary><span>Criteria checklist</span>${IC('chevron', 'chev')}</summary>${critBody(r)}</details></div>`;
  }
  function candCard(r, excluded) {
    const sub = excluded ? `<span class="excl-note">${esc(r.reasons[0] || '')}</span>`
      : `${cells(r)}<span>${r.counts.mandatoryMet}/${r.counts.mandatoryTotal} mandatory · ${r.counts.alerts} alert${r.counts.alerts === 1 ? '' : 's'}</span>`;
    return `<details class="cand" data-key="cand:${r.id}"${isOpen('cand:' + r.id, false) ? ' open' : ''}><summary>
      <span class="cand-name">${esc(r.name)}<span class="abbr">${esc(r.abbr)}</span></span>${pill(r.status)}
      <span class="cand-sub">${sub}</span></summary>${critBody(r)}</details>`;
  }

  function patientLine() {
    const parts = [];
    if (state.onsetValue !== '') parts.push(`Onset ${esc(state.onsetValue)} ${UNIT_NAME[state.onsetUnit]}`);
    if (state.nowValue !== '') parts.push(`now ${esc(state.nowValue)} ${UNIT_NAME[state.nowUnit]}`);
    if (state.sex) parts.push(state.sex === 'F' ? 'Female' : 'Male');
    if (state.mri) parts.push('MRI ' + state.mri);
    const dl = (v) => (v === null ? null : (V.DEV_LEVELS.find((l) => l.v === v) || {}).label);
    if (dl(state.devOnset)) parts.push('Development at onset: ' + dl(state.devOnset).toLowerCase());
    if (dl(state.devNow)) parts.push('now: ' + dl(state.devNow).toLowerCase());
    return parts.join(' · ');
  }

  function renderWelcome() {
    $('#out').innerHTML = `<div class="welcome">
      <h2>Start an assessment</h2>
      <p>Enter what you know. The assessment updates live and shows exactly which ILAE criteria are met, missing or violated.</p>
      <ol class="how">
        <li><b>Patient</b> — age at seizure onset is the single most discriminating input.</li>
        <li><b>Findings</b> — seizure types, EEG, MRI, genetics. Leave unknowns as “not assessed”; they are never counted as absent.</li>
        <li><b>Read the ladder</b> — seizure type → epilepsy type → syndrome → etiology, with next investigations.</li>
      </ol>
      <div class="try"><h3>Or try a worked example</h3><div class="try-list">${EX.map((e) => `<button type="button" class="try-btn" data-ex="${e.id}"><span>${esc(e.title)}</span>${IC('arrow')}</button>`).join('')}</div></div>
    </div>`;
    $('#dock').hidden = true; $('#live').textContent = '';
  }

  function render() {
    const p = toPatient();
    const hasInput = p.onsetMonths !== null || Object.keys(p.findings).length || p.mri || p.devOnset !== null || p.devNow !== null;
    if (!hasInput) { renderWelcome(); return; }
    const results = E.evaluate(p, SYN);
    const sz = E.classifySeizures(p), et = E.epilepsyType(p), flags = E.clinicalFlags(p, results);
    const hints = E.etiologyHints(p, results), steps = E.nextSteps(p, results);
    const shown = results.filter((r) => r.status !== 'excluded'), excl = results.filter((r) => r.status === 'excluded');
    let h = `<div class="res-title"><h2>Assessment</h2><span>Updates as you type</span></div>`;
    h += flags.map((f) => `<div class="alertbox ${f.level}" role="${f.level === 'urgent' ? 'alert' : 'note'}">${IC(f.level === 'info' ? 'info' : 'alert')}<div><b>${f.level === 'urgent' ? 'Time-critical' : f.level === 'caution' ? 'Caution' : 'Note'}</b>${esc(f.text)}<small>${esc(f.src.replace(/\b(zuberi2022|specchio2022|riney2022|hirsch2022)\b/g, (k) => SHORT_SRC[k]))}</small></div></div>`).join('');

    h += '<ol class="ladder">';
    h += `<li class="step"><span class="num-b">1</span><h3>Seizure type <em>ILAE 2025</em></h3>`;
    h += sz.seizures.length ? `<div class="chips">${sz.seizures.map((s) => `<span class="chip ${s.cls === 'Epileptic spasms' ? 'spasm' : esc(s.cls)}">${esc(s.name)}</span>`).join('')}</div>` : '<p class="step-empty">No seizure types entered yet.</p>';
    if (sz.notes.length) h += `<ul class="notes">${sz.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`;
    h += `</li><li class="step"><span class="num-b">2</span><h3>Epilepsy type <em>ILAE 2017</em></h3><p class="value">${esc(et.type)}</p><ul class="notes">${et.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></li>`;
    h += `<li class="step"><span class="num-b">3</span><h3>Syndrome <em>ILAE 2022</em></h3>`;
    if (shown.length) {
      h += heroCard(shown[0]);
      if (shown.length > 1) h += `<div class="cands">${shown.slice(1).map((r) => candCard(r, false)).join('')}</div>`;
      h += `<div class="legend"><span>${IC('check', 'good')}met / clear</span><span>${IC('x', 'bad')}not met</span><span>${IC('help', 'warn')}needs data</span><span>${IC('alert', 'warn')}alert</span><span>${IC('ban', 'bad')}exclusion</span><span>${IC('clock', 'dim')}later course</span></div>`;
    } else h += `<p class="step-empty">No syndrome meets or approaches its defining criteria with the data entered. This is common early on, or when the epilepsy is not one of the ${SYN.length} syndromes with formal ILAE criteria (for example “focal epilepsy, syndrome not specified”) — the epilepsy type above is then the appropriate diagnostic level.</p>`;
    if (excl.length) h += `<div class="cands"><details class="cand excl" data-key="excl"${isOpen('excl', false) ? ' open' : ''}><summary><span class="cand-name">Considered but not consistent (${excl.length})</span>${IC('chevron', 'chev')}</summary><div class="crit-body"><div class="cands">${excl.map((r) => candCard(r, true)).join('')}</div></div></details></div>`;
    h += `</li><li class="step"><span class="num-b">4</span><h3>Etiology <em>ILAE 2017 · 2026</em></h3><ul class="etio">${hints.map((x) => `<li><b>${esc(x.cat)}:</b> ${esc(x.text)}</li>`).join('')}</ul></li></ol>`;

    if (steps.length) h += `<section class="res-sec"><h3>Suggested next steps</h3><ul class="steps">${steps.slice(0, 9).map((x) => `<li>${IC('arrow')}<span>${esc(x)}</span></li>`).join('')}</ul></section>`;

    const fids = Object.keys(p.findings).filter((id) => LABELS[id]);
    h += `<section class="res-sec"><h3>Findings entered</h3>`;
    const pl = patientLine(); if (pl) h += `<p class="pt-line">${pl}</p>`;
    const chipBtn = (id) => `<button type="button" class="fchip ${p.findings[id] ? 'y' : 'n'}" data-remove="${id}" title="Remove this finding" aria-label="Remove: ${esc(LABELS[id])} (${p.findings[id] ? 'present' : 'absent'})">${esc(LABELS[id])}${IC('x')}</button>`;
    const present = fids.filter((id) => p.findings[id]), absent = fids.filter((id) => !p.findings[id]);
    h += fids.length ? (present.length ? `<div class="fchips">${present.map(chipBtn).join('')}</div>` : '')
      + (absent.length ? `<details class="abs-box" data-key="absent"${isOpen('absent', false) ? ' open' : ''}><summary>${absent.length} marked absent${IC('chevron', 'chev')}</summary><div class="fchips">${absent.map(chipBtn).join('')}</div></details>` : '') : '<p class="muted">None yet.</p>';
    h += `</section><div class="actions"><button type="button" class="btn btn-primary" id="copy">${IC('copy')}Copy summary</button><button type="button" class="btn" id="print2">${IC('printer')}Print / PDF</button></div>`;
    h += `<p class="disc">Rule-based support derived from the published ILAE criteria. It does not diagnose; verify against the source papers and apply clinical judgement.</p>`;
    $('#out').innerHTML = h;

    lastShown = shown.map((r) => r.id);
    const top = shown[0];
    $('#dock-label').textContent = top ? `${top.abbr} — ${STATUS[top.status][1].toLowerCase()}` : 'No syndrome identified yet';
    $('#dock').hidden = false;
    $('#live').textContent = top ? `Best-fitting syndrome: ${top.name}, ${STATUS[top.status][1].toLowerCase()}.` : 'No syndrome identified yet.';
    const cb = $('#copy'); if (cb) cb.onclick = () => copyText(E.summarize(p, results), cb);
    const pb = $('#print2'); if (pb) pb.onclick = () => window.print();
  }

  function copyText(text, btn) {
    const done = () => { const o = btn.innerHTML; btn.innerHTML = IC('check') + 'Copied'; setTimeout(() => { btn.innerHTML = o; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea'); ta.value = text; ta.className = 'sr';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } ta.remove();
  }

  /* ---------- init ---------- */
  function hasInput() {
    const p = toPatient();
    return p.onsetMonths !== null || Object.keys(p.findings).length > 0 || !!p.mri || p.devOnset !== null || p.devNow !== null;
  }
  function doReset() {
    state = fresh(); toggled.clear(); $('#example').value = ''; $('#filter').value = ''; applyFilter(); syncForm(); render(); window.scrollTo({ top: 0 });
  }
  function flush() { if (dirty) { dirty = false; syncForm(); render(); } }
  // The guided assessment drives the same state; it renders the checklist lazily, only when that view is shown.
  window.EpiApp = {
    state: () => state,
    hasInput,
    hasFindings: () => Object.keys(state.findings).length > 0,
    evaluate() {
      const p = toPatient(), results = E.evaluate(p, SYN);
      return { p, results, sz: E.classifySeizures(p), et: E.epilepsyType(p), flags: E.clinicalFlags(p, results), hints: E.etiologyHints(p, results), steps: E.nextSteps(p, results) };
    },
    changed() { dirty = true; if (document.body.dataset.view === 'assess') flush(); },
    examples: () => EX,
    loadExample,
    reset: doReset,
    copy(btn) { const p = toPatient(); copyText(E.summarize(p, E.evaluate(p, SYN)), btn); },
    setLive(t) { $('#live').textContent = t; },
    syndromeCount: () => SYN.length,
  };
  window.EpiWizard.mount(window.EpiApp);
  window.EpiViews.init({
    onsetMonths: () => toMonths(state.onsetValue, state.onsetUnit), shown: () => lastShown,
    onView(v) { if (v !== 'guided') window.EpiWizard.leave(); if (v === 'assess') flush(); else if (v === 'guided') window.EpiWizard.show(); },
  });
  buildForm(); syncForm(); render();
  const out = $('#out');
  $('#form').addEventListener('submit', (e) => e.preventDefault());
  $('#form').addEventListener('change', onChange); $('#form').addEventListener('input', onInput);
  out.addEventListener('toggle', (e) => { const k = e.target.dataset && e.target.dataset.key; if (k) toggled.set(k, e.target.open); }, true);
  out.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove]'), ex = e.target.closest('[data-ex]');
    if (rm) { delete state.findings[rm.dataset.remove]; syncForm(); render(); }
    else if (ex) loadExample(ex.dataset.ex);
  });
  $('#reset').addEventListener('click', () => { window.EpiWizard.forget(); doReset(); if (document.body.dataset.view === 'guided') window.EpiWizard.go(0); });
  $('#example').addEventListener('change', (e) => loadExample(e.target.value));
  $('#print').addEventListener('click', () => window.print());
  let reopen = [];
  window.addEventListener('beforeprint', () => {
    $('#print-date').textContent = new Date().toLocaleString();
    // print the leading syndrome's full checklist and the ruled-out list (one line each); keep other candidates collapsed
    reopen = $$('details.crit-box, details.excl', out).filter((d) => !d.open); reopen.forEach((d) => { d.open = true; });
  });
  window.addEventListener('afterprint', () => { reopen.forEach((d) => { d.open = false; }); reopen = []; });
})();
