/* UI for the epilepsy classifier. No network calls; no persistence of patient data. */
(function () {
  'use strict';
  const V = window.EpiVocab, E = window.EpiEngine, KB = window.EpiKB, EX = window.EpiExamples;
  const SYN = E.parseKB(KB.TEXT);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
  const fresh = () => ({ onsetValue: '', onsetUnit: 'y', nowValue: '', nowUnit: 'y', sex: '', mri: '', devOnset: null, devNow: null, findings: {}, reviewed: {} });
  let state = fresh();

  /* ---------- state <-> engine patient ---------- */
  const toMonths = (v, u) => (v === '' || v === null || Number.isNaN(Number(v)) ? null : Number(v) * UNIT_MONTHS[u]);
  function toPatient() {
    return {
      onsetMonths: toMonths(state.onsetValue, state.onsetUnit), nowMonths: toMonths(state.nowValue, state.nowUnit),
      sex: state.sex || null, mri: state.mri || null, devOnset: state.devOnset, devNow: state.devNow,
      findings: state.findings, reviewed: state.reviewed,
    };
  }
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
  function triRow(id, label, hint) {
    const nm = 'f:' + id;
    const r = (v, t, title) => `<label title="${title}"><input type="radio" name="${nm}" value="${v}"${v === 'u' ? ' checked' : ''}><span>${t}</span></label>`;
    return `<div class="row"><span class="lbl" id="l-${id}">${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span>
      <div class="tri" role="radiogroup" aria-labelledby="l-${id}">${r('y', 'Yes', 'Present')}${r('n', 'No', 'Absent')}${r('u', '?', 'Not assessed')}</div></div>`;
  }
  function buildForm() {
    $('#sections').innerHTML = V.SECTIONS.map((s, i) => `
      <details class="sec" data-sec="${s.key}"${i === 0 ? ' open' : ''}>
        <summary>${esc(s.title)}<span class="count" data-count="${s.key}" hidden></span></summary>
        <div class="sec-body">
          <p class="blurb">${esc(s.blurb)}</p>
          <label class="review"><input type="checkbox" data-review="${s.key}"><span>${esc(s.reviewLabel)}</span></label>
          ${s.groups.map((g) => `<div class="grp">${esc(g.title)}</div>${g.items.map((it) => triRow(it[0], it[1], it[2])).join('')}`).join('')}
        </div>
      </details>`).join('');
    $('#mri-items').innerHTML = V.IMAGING_ITEMS.map((it) => `<label><input type="checkbox" data-img="${it[0]}"><span>${esc(it[1])}</span></label>`).join('');
    ['devOnset', 'devNow'].forEach((k) => {
      $('#' + k).insertAdjacentHTML('beforeend',
        `<label><input type="radio" name="${k}" value="" checked><span>Not assessed</span></label>` +
        V.DEV_LEVELS.map((l) => `<label><input type="radio" name="${k}" value="${l.v}"><span>${esc(l.label)}</span></label>`).join(''));
    });
    $('#example').insertAdjacentHTML('beforeend', EX.map((e) => `<option value="${e.id}">${esc(e.title)}</option>`).join(''));
    $('#sources').innerHTML = ['beniczky2025', 'scheffer2017', 'wirrell2022', 'zuberi2022', 'specchio2022', 'riney2022', 'hirsch2022', 'specchio2026'].map((k) => `<li>${esc(SOURCES[k])}</li>`).join('');
  }
  function syncForm() {
    $('#onset-v').value = state.onsetValue; $('#onset-u').value = state.onsetUnit;
    $('#now-v').value = state.nowValue; $('#now-u').value = state.nowUnit;
    const setRadio = (name, val) => { const el = $(`input[name="${name}"][value="${val}"]`); if (el) el.checked = true; };
    setRadio('sex', state.sex); setRadio('mri', state.mri);
    setRadio('devOnset', state.devOnset === null ? '' : state.devOnset); setRadio('devNow', state.devNow === null ? '' : state.devNow);
    $('#mri-detail').hidden = state.mri !== 'abnormal';
    $$('input[data-img]').forEach((c) => { c.checked = state.findings[c.dataset.img] === true; });
    V.SECTIONS.forEach((s) => s.groups.forEach((g) => g.items.forEach((it) => {
      const v = state.findings[it[0]]; setRadio('f:' + it[0], v === true ? 'y' : v === false ? 'n' : 'u');
    })));
    $$('input[data-review]').forEach((c) => { c.checked = !!state.reviewed[c.dataset.review]; });
    updateCounts();
  }
  function updateCounts() {
    V.SECTIONS.forEach((s) => {
      const ids = []; s.groups.forEach((g) => g.items.forEach((it) => ids.push(it[0])));
      const n = ids.filter((id) => state.findings[id] === true || state.findings[id] === false).length;
      const el = $(`[data-count="${s.key}"]`);
      el.hidden = !n && !state.reviewed[s.key];
      el.textContent = n + ' entered' + (state.reviewed[s.key] ? ' · reviewed' : '');
    });
  }

  /* ---------- events ---------- */
  function onChange(e) {
    const t = e.target;
    if (t.name && t.name.startsWith('f:')) {
      const id = t.name.slice(2);
      if (t.value === 'u') delete state.findings[id]; else state.findings[id] = t.value === 'y';
    } else if (t.dataset.review) state.reviewed[t.dataset.review] = t.checked;
    else if (t.dataset.img) { if (t.checked) state.findings[t.dataset.img] = true; else delete state.findings[t.dataset.img]; }
    else if (t.name === 'sex') state.sex = t.value;
    else if (t.name === 'mri') { state.mri = t.value; $('#mri-detail').hidden = t.value !== 'abnormal'; }
    else if (t.name === 'devOnset' || t.name === 'devNow') state[t.name] = t.value === '' ? null : Number(t.value);
    else if (t.id === 'onset-u') state.onsetUnit = t.value;
    else if (t.id === 'now-u') state.nowUnit = t.value;
    updateCounts(); render();
  }
  function onInput(e) {
    if (e.target.id === 'onset-v') state.onsetValue = e.target.value;
    else if (e.target.id === 'now-v') state.nowValue = e.target.value;
    else return;
    render();
  }

  /* ---------- results ---------- */
  const STATE_UI = {
    M: { met: ['✓', 'good', 'Met'], unmet: ['✗', 'bad', 'Not met'], pending: ['?', 'warn', 'Needs data'], followup: ['⏳', 'dim', 'Confirm on follow-up'], manual: ['☐', 'dim', 'Verify manually'] },
    A: { alert: ['⚠', 'warn', 'Alert present'], clear: ['✓', 'dim', 'No alert'], unknown: ['?', 'dim', 'Not assessed'], manual: ['☐', 'dim', 'Verify manually'] },
    E: { excluded: ['⛔', 'bad', 'Exclusion present'], clear: ['✓', 'dim', 'Not present'], unknown: ['?', 'dim', 'Not assessed'], manual: ['☐', 'dim', 'Verify manually'] },
  };
  const LEVEL_TITLE = { M: 'Mandatory criteria', A: 'Alerts (rethink the diagnosis if present)', E: 'Exclusionary criteria' };
  const STATUS_TEXT = { met: 'Mandatory criteria met', possible: 'Possible — data missing', excluded: 'Not consistent' };

  function synCard(r, open) {
    const c = r.counts;
    const sub = r.status === 'excluded' ? esc(r.reasons[0] || '')
      : [c.alerts ? `${c.alerts} alert${c.alerts > 1 ? 's' : ''}` : 'no alerts', c.pending ? `${c.pending} mandatory item${c.pending > 1 ? 's' : ''} to establish` : '',
        c.unassessedExclusions ? `${c.unassessedExclusions} exclusion${c.unassessedExclusions > 1 ? 's' : ''} not yet assessed` : ''].filter(Boolean).join(' · ');
    const body = ['M', 'A', 'E'].map((lv) => {
      const rows = r.rows.filter((x) => x.level === lv);
      if (!rows.length) return '';
      return `<h3>${LEVEL_TITLE[lv]}</h3>` + rows.map((x) => {
        const ui = STATE_UI[lv][x.state];
        return `<div class="crit"><span class="ic ${ui[1]}" title="${ui[2]}" aria-label="${ui[2]}">${ui[0]}</span><span>${esc(x.text)}<span class="dom">${esc(E.DOMAIN_NAMES[x.domain] || x.domain)} · ${ui[2]}${x.core ? ' · defining' : ''}</span></span></div>`;
      }).join('');
    }).join('');
    const reasons = r.status === 'excluded' && r.reasons.length > 1 ? `<ul class="tight">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    return `<details class="syn"${open ? ' open' : ''}><summary>
      <div class="syn-head"><span class="syn-name">${esc(r.name)}<small>${esc(r.abbr)}</small></span><span class="pill ${r.status}">${STATUS_TEXT[r.status]}</span></div>
      <div class="syn-sub">${sub}</div></summary>
      <div class="syn-body">${reasons}${body}
        ${r.notes.length ? `<p class="ref">${r.notes.map(esc).join('<br>')}</p>` : ''}
        <p class="ref">Source: ${esc(SHORT_SRC[r.source])}, ${esc(r.table)} · ${esc(r.group)} · ${esc(r.type)}</p></div></details>`;
  }

  function render() {
    const p = toPatient();
    const hasInput = p.onsetMonths !== null || Object.keys(p.findings).length || p.mri;
    const out = $('#out');
    if (!hasInput) {
      out.innerHTML = `<h2>Results</h2><div class="empty">Enter the age at seizure onset and the seizure types, EEG and imaging findings on the left — or load an example case. Results update as you type.</div>`;
      return;
    }
    const results = E.evaluate(p, SYN);
    const sz = E.classifySeizures(p);
    const et = E.epilepsyType(p);
    const flags = E.clinicalFlags(p, results);
    const hints = E.etiologyHints(p, results);
    const steps = E.nextSteps(p, results);
    const shown = results.filter((r) => r.status !== 'excluded');
    const excl = results.filter((r) => r.status === 'excluded');
    let h = '';
    h += flags.map((f) => `<div class="alertbox ${f.level}" role="${f.level === 'urgent' ? 'alert' : 'note'}"><b>${f.level === 'urgent' ? 'Time-critical' : f.level === 'caution' ? 'Caution' : 'Note'}</b>${esc(f.text)}<small>${esc(f.src.replace(/\b(zuberi2022|specchio2022|riney2022|hirsch2022)\b/g, (k) => SHORT_SRC[k]))}</small></div>`).join('');
    h += `<h2>1 · Seizure type <span class="muted">(ILAE 2025)</span></h2>`;
    h += sz.seizures.length ? sz.seizures.map((s) => `<span class="chip ${esc(s.cls)}">${esc(s.name)}</span>`).join('') : '<p class="muted">No seizure types entered yet.</p>';
    if (sz.notes.length) h += `<ul class="tight">${sz.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`;
    h += `<h2>2 · Epilepsy type <span class="muted">(ILAE 2017)</span></h2><div class="big">${esc(et.type)}</div><ul class="tight">${et.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    h += `<h2>3 · Syndrome candidates <span class="muted">(ILAE 2022)</span></h2>`;
    if (shown.length) {
      h += shown.map((r, i) => synCard(r, i === 0)).join('');
      h += `<p class="legend">✓ met / clear · ✗ not met · ? needs data · ⚠ alert · ⛔ exclusion · ⏳ depends on later course · ☐ verify manually</p>`;
    } else h += `<div class="empty">No syndrome meets or approaches the defining criteria with the data entered. This is common early on, or when the epilepsy is not one of the ${SYN.length} syndromes with formal ILAE criteria (e.g. “focal epilepsy, syndrome not specified” or “genetic generalized epilepsy, syndrome not specified”).</div>`;
    if (excl.length) h += `<details class="syn"><summary><div class="syn-head"><span class="syn-name">Considered but not consistent (${excl.length})</span></div><div class="syn-sub">Why these were ruled out</div></summary><div class="syn-body">${excl.map((r) => synCard(r, false)).join('')}</div></details>`;
    h += `<h2>4 · Etiology clues <span class="muted">(ILAE 2017 · 2026 report)</span></h2><ul class="tight">${hints.map((x) => `<li><b>${esc(x.cat)}:</b> ${esc(x.text)}</li>`).join('')}</ul>`;
    if (steps.length) h += `<h2>5 · Suggested next steps</h2><ul class="tight">${steps.slice(0, 9).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    h += `<button type="button" class="btn copy" id="copy">Copy summary</button>`;
    out.innerHTML = h;
    const cb = $('#copy');
    if (cb) cb.onclick = () => copyText(E.summarize(p, results), cb);
  }
  function copyText(text, btn) {
    const done = () => { const o = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(() => { btn.textContent = o; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } ta.remove();
  }

  /* ---------- init ---------- */
  buildForm(); syncForm(); render();
  const form = $('#form');
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('change', onChange); form.addEventListener('input', onInput);
  $('#reset').addEventListener('click', () => { state = fresh(); $('#example').value = ''; syncForm(); render(); });
  $('#example').addEventListener('change', (e) => {
    const ex = EX.find((x) => x.id === e.target.value);
    if (!ex) return;
    loadPatient(ex.patient); syncForm(); render();
    $$('details.sec').forEach((d) => { d.open = true; });
    if (window.matchMedia('(max-width: 999px)').matches) location.hash = '#results';
  });
})();
