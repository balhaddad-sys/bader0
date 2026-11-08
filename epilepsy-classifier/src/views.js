/* Views: EEG atlas, diagrams page, morphology dialog and hash router. No network, no storage. */
(function () {
  'use strict';
  const E = window.EpiEngine, KB = window.EpiKB, M = window.EpiMorph, D = window.EpiDiagrams;
  const SYN = E.parseKB(KB.TEXT);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const IC = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
  const LV = { M: 'Mandatory', A: 'Alert', E: 'Exclusionary' };
  let ctx = { onsetMonths: () => null, shown: () => [] };

  /* Which syndromes use each pattern, and how — derived from the knowledge base, never hand-listed.
     Polarity matters: "lack of generalized spike-wave" is an alert when the pattern is ABSENT. */
  const USAGE = {};
  const walk = (n, neg, cb) => { if (!n) return; if (n.t === 'f') cb(n.id, neg); else if (n.t === 'not') walk(n.a, !neg, cb); else { walk(n.a, neg, cb); walk(n.b, neg, cb); } };
  SYN.forEach((s) => s.criteria.forEach((c) => {
    if (!c.expr) return;
    walk(c.expr, false, (id, neg) => {
      const u = USAGE[id] || (USAGE[id] = {});
      const k = (neg ? 'n' : '') + c.level;
      (u[k] || (u[k] = new Set())).add(s.abbr);
    });
  }));
  const USE_LABEL = { M: 'Counts toward a mandatory criterion', A: 'Alert when present', E: 'Exclusionary when present', nM: 'Mandatory: must be absent', nA: 'Alert when absent', nE: 'Exclusionary when absent' };
  const usageHtml = (id) => {
    const u = USAGE[id], keys = ['M', 'A', 'E', 'nM', 'nA', 'nE'].filter((k) => u && u[k] && u[k].size);
    if (!keys.length) return '<p class="muted small">Reference pattern: not scored by any ILAE syndrome table (it informs epilepsy-type inference and teaching only).</p>';
    return keys.map((k) => `<div class="use"><span class="use-l ${k.slice(-1)}">${USE_LABEL[k]}</span>${[...u[k]].map((a) => `<span class="chip sm">${esc(a)}</span>`).join('')}</div>`).join('')
      + '<p class="muted small">Many criteria accept this pattern as one of several alternatives (“or”); the criteria checklist shows each exact rule.</p>';
  };

  function morphBody(m, withFig) {
    return `${withFig ? `<div class="fig" data-fig="${m.fig}" data-label="${esc(m.name)}"></div>` : ''}
      <dl class="feat">${m.features.map((f) => `<div><dt>${esc(f[0])}</dt><dd>${esc(f[1])}</dd></div>`).join('')}</dl>
      <div class="used"><h5>Used by syndrome criteria</h5>${usageHtml(m.id)}</div>
      <div class="pit">${IC('alert')}<p><b>Pitfall.</b> ${esc(m.pitfall)}</p></div>
      <p class="src">Basis: ${esc(m.basis)}</p>`;
  }
  const fillFigs = (root) => $$('.fig:not([data-done])', root).forEach((el) => { el.innerHTML = D.waveformSvg(el.dataset.fig, el.dataset.label); el.dataset.done = '1'; });

  /* ---------- EEG atlas ---------- */
  let atlasBuilt = false;
  function buildAtlas() {
    if (atlasBuilt) return; atlasBuilt = true;
    $('#atlas-groups').innerHTML = `<button type="button" class="gpill on" data-g="">All (${M.ITEMS.length})</button>` + M.GROUPS.map((g) => `<button type="button" class="gpill" data-g="${esc(g)}">${esc(g)} (${M.ITEMS.filter((m) => m.group === g).length})</button>`).join('');
    $('#atlas-list').innerHTML = M.ITEMS.map((m, i) => `<details class="morph" id="m-${m.id.replace(/\./g, '-')}" data-id="${m.id}" data-g="${esc(m.group)}" data-q="${esc((m.name + ' ' + m.summary + ' ' + m.group + ' ' + m.features.map((f) => f[1]).join(' ')).toLowerCase())}"${i === 0 ? ' open' : ''}>
      <summary><span class="m-g">${esc(m.group)}</span><span class="m-n">${esc(m.name)}</span><span class="m-s">${esc(m.summary)}</span>${IC('chevron', 'chev')}</summary>
      <div class="m-body">${morphBody(m, true)}</div></details>`).join('');
    fillFigs($('#atlas-list'));
    $('#atlas-list').addEventListener('toggle', (e) => { if (e.target.open) fillFigs(e.target); }, true);
    const apply = () => {
      const q = $('#atlas-filter').value.trim().toLowerCase(), g = ($('.gpill.on') || {}).dataset ? $('.gpill.on').dataset.g : '';
      let n = 0;
      $$('#atlas-list .morph').forEach((d) => { const show = (!q || d.dataset.q.includes(q)) && (!g || d.dataset.g === g); d.hidden = !show; if (show) n++; });
      $('#atlas-none').hidden = n > 0; $('#atlas-count').textContent = n + ' of ' + M.ITEMS.length + ' patterns';
    };
    $('#atlas-filter').addEventListener('input', apply);
    $('#atlas-groups').addEventListener('click', (e) => { const b = e.target.closest('.gpill'); if (!b) return; $$('.gpill').forEach((x) => x.classList.toggle('on', x === b)); apply(); });
    apply();
  }
  function showMorphInAtlas(id) {
    buildAtlas();
    $('#atlas-filter').value = ''; $$('.gpill').forEach((x, i) => x.classList.toggle('on', i === 0)); $('#atlas-filter').dispatchEvent(new Event('input'));
    const d = $('#m-' + id.replace(/\./g, '-')); if (!d) return;
    d.open = true; fillFigs(d); d.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- dialog ---------- */
  function openMorph(id) {
    const m = M.byId[id]; if (!m) return;
    $('#md-body').innerHTML = `<header class="dlg-h"><div><span class="m-g">${esc(m.group)}</span><h3 id="md-title">${esc(m.name)}</h3><p>${esc(m.summary)}</p></div>
      <button type="button" class="btn dlg-x" data-close aria-label="Close">${IC('x')}</button></header><div class="dlg-b">${morphBody(m, true)}
      <p class="dlg-f"><button type="button" class="btn" data-atlas="${m.id}">${IC('book')}Open in EEG atlas</button></p></div>`;
    fillFigs($('#md-body'));
    const dlg = $('#morph-dialog'); if (!dlg.open) dlg.showModal();
  }
  function wireDialog() {
    const dlg = $('#morph-dialog');
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
      const a = e.target.closest('[data-atlas]'); if (a) { dlg.close(); location.hash = '#/atlas'; setTimeout(() => showMorphInAtlas(a.dataset.atlas), 60); }
    });
    document.addEventListener('click', (e) => { const b = e.target.closest('[data-morph]'); if (b) openMorph(b.dataset.morph); });
  }

  /* ---------- diagrams page ---------- */
  function renderDiagrams() {
    const onset = ctx.onsetMonths(), shown = new Set(ctx.shown());
    const order = ['Neonate–infant', 'Childhood', 'IGE', 'Variable age'];
    const rows = SYN.slice().sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group)).map((s) => { const w = E.onsetWindows(s); return { abbr: s.abbr, group: s.group, windows: w.windows, alerts: w.alerts, none: w.none, hi: shown.has(s.id), dim: shown.size > 0 && !shown.has(s.id) }; });
    $('#dg-onset').innerHTML = D.timelineSvg(rows, { width: 820, labelW: 92, rowH: 18, marker: onset, label: 'Age at seizure onset for each of the 38 syndromes, as encoded from the ILAE criteria' });
    $('#dg-tree').innerHTML = D.seizureTreeHtml();
    $('#dg-flow').innerHTML = D.scoringFlowSvg();
    $('#dg-onset-note').textContent = onset === null ? 'Enter an onset age on the Assess tab to see where it falls.' : (shown.size ? 'Highlighted: syndromes currently meeting or approaching their criteria.' : 'Your onset age is marked; no syndrome is highlighted yet.');
  }

  /* ---------- router ---------- */
  function route() {
    const m = /^#\/(\w+)/.exec(location.hash), v = m && ['assess', 'atlas', 'diagrams'].includes(m[1]) ? m[1] : (m ? 'assess' : (document.body.dataset.view || 'assess'));
    document.body.dataset.view = v;
    ['assess', 'atlas', 'diagrams'].forEach((k) => { $('#view-' + k).hidden = k !== v; });
    $$('.tab').forEach((t) => { if (t.dataset.view === v) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
    if (v === 'atlas') buildAtlas();
    if (v === 'diagrams') renderDiagrams();
    if (m) window.scrollTo({ top: 0 });
  }

  window.EpiViews = {
    init(c) { ctx = c; wireDialog(); window.addEventListener('hashchange', route); route(); },
    hasMorph: (id) => !!M.byId[id],
    morphName: (id) => (M.byId[id] || {}).name,
    onsetMini(id, onsetMonths) {
      const s = SYN.find((x) => x.id === id); if (!s) return '';
      const w = E.onsetWindows(s);
      if (w.none) return '<p class="muted small">No age-at-onset criterion in the ILAE table for this syndrome.</p>';
      return D.timelineSvg([{ abbr: s.abbr, group: s.group, windows: w.windows, alerts: w.alerts, hi: false }], { width: 470, labelW: 6, rowH: 24, marker: onsetMonths, label: 'Age at onset window for ' + s.name });
    },
  };
})();
