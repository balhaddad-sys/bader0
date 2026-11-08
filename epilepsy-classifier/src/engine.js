/*
 * Rule engine for the ILAE-based epilepsy classifier.
 *
 * Pure functions, no DOM. Works in the browser (window.EpiEngine) and Node.
 *
 * Every finding is TRI-STATE: true (present), false (absent), null (not
 * assessed). Missing information never counts as "absent" unless the user
 * explicitly marks that section as reviewed.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./vocab.js'));
  } else root.EpiEngine = factory(root.EpiVocab);
})(typeof self !== 'undefined' ? self : this, function (V) {
  /* ------------------------------------------------------------------ */
  /* Expression language                                                  */
  /*   ident            finding id, e.g. sz.abs_typical                   */
  /*   !x  x & y  x | y  ( )                                              */
  /*   age<2y  age>=1m  age[2y,3y]   (age at onset)                       */
  /*   now>4m                         (current age)                       */
  /* Units: d=days w=weeks m=months y=years. age[a,b] is inclusive of the */
  /* whole unit of b, i.e. [a, b+1 unit) — "2–3 years" means 2.0 to <4.0. */
  /* ------------------------------------------------------------------ */
  const UNIT_MONTHS = { d: 12 / 365.25, w: (12 / 365.25) * 7, m: 1, y: 12 };

  function parseQuantity(s) {
    const m = /^(\d+(?:\.\d+)?)([dwmy])$/.exec(s);
    if (!m) throw new Error('Bad quantity: ' + s);
    return { months: parseFloat(m[1]) * UNIT_MONTHS[m[2]], unitMonths: UNIT_MONTHS[m[2]] };
  }

  function parseExpr(src) {
    let i = 0;
    const peek = () => src[i];
    const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
    function parseOr() {
      let left = parseAnd(); ws();
      while (peek() === '|') { i++; const right = parseAnd(); left = { t: 'or', a: left, b: right }; ws(); }
      return left;
    }
    function parseAnd() {
      let left = parseNot(); ws();
      while (peek() === '&') { i++; const right = parseNot(); left = { t: 'and', a: left, b: right }; ws(); }
      return left;
    }
    function parseNot() {
      ws();
      if (peek() === '!') { i++; return { t: 'not', a: parseNot() }; }
      return parseAtom();
    }
    function parseAtom() {
      ws();
      if (peek() === '(') {
        i++; const e = parseOr(); ws();
        if (peek() !== ')') throw new Error('Expected ) in: ' + src);
        i++; return e;
      }
      const rest = src.slice(i);
      let m = /^(age|now)\s*(<=|>=|<|>)\s*(\d+(?:\.\d+)?[dwmy])/.exec(rest);
      if (m) { i += m[0].length; return { t: 'age', which: m[1], op: m[2], v: parseQuantity(m[3]).months }; }
      m = /^(age|now)\s*\[\s*(\d+(?:\.\d+)?[dwmy])\s*,\s*(\d+(?:\.\d+)?[dwmy])\s*\]/.exec(rest);
      if (m) {
        i += m[0].length; const lo = parseQuantity(m[2]); const hi = parseQuantity(m[3]);
        return { t: 'range', which: m[1], lo: lo.months, hi: hi.months + hi.unitMonths };
      }
      m = /^[a-z][a-z0-9_.]*/.exec(rest);
      if (m) { i += m[0].length; return { t: 'f', id: m[0] }; }
      throw new Error('Cannot parse expression at "' + rest.slice(0, 20) + '" in: ' + src);
    }
    const ast = parseOr(); ws();
    if (i < src.length) throw new Error('Trailing input in: ' + src);
    return ast;
  }

  const tNot = (a) => (a === null ? null : !a);
  const tAnd = (a, b) => (a === false || b === false ? false : a === null || b === null ? null : true);
  const tOr = (a, b) => (a === true || b === true ? true : a === null || b === null ? null : false);

  function evalNode(n, ctx) {
    switch (n.t) {
      case 'f': return ctx.get(n.id);
      case 'not': return tNot(evalNode(n.a, ctx));
      case 'and': return tAnd(evalNode(n.a, ctx), evalNode(n.b, ctx));
      case 'or': return tOr(evalNode(n.a, ctx), evalNode(n.b, ctx));
      case 'age': {
        const a = n.which === 'age' ? ctx.onsetMonths : ctx.nowMonths;
        if (a === null || a === undefined || Number.isNaN(a)) return null;
        return n.op === '<' ? a < n.v : n.op === '<=' ? a <= n.v : n.op === '>' ? a > n.v : a >= n.v;
      }
      case 'range': {
        const a = n.which === 'age' ? ctx.onsetMonths : ctx.nowMonths;
        if (a === null || a === undefined || Number.isNaN(a)) return null;
        return a >= n.lo && a < n.hi;
      }
      default: throw new Error('Unknown node ' + n.t);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Knowledge-base text parser                                           */
  /* ------------------------------------------------------------------ */
  const DOMAIN_NAMES = {
    sz: 'Seizures', eeg: 'EEG', onset: 'Age at onset', dev: 'Development', neuro: 'Neurological exam',
    img: 'Imaging', gen: 'Genetics / other tests', course: 'Course of illness', ctx: 'Context',
  };

  function parseKB(text) {
    const syndromes = [];
    let cur = null;
    text.split('\n').forEach((raw, ln) => {
      const line = raw.trim();
      if (!line || line.startsWith('#!') || line.startsWith('//')) return;
      if (line.startsWith('## ')) {
        const p = line.slice(3).split('|').map((x) => x.trim());
        cur = { id: p[0], name: p[1], abbr: p[2], group: p[3], source: p[4], table: p[5], type: p[6], criteria: [], notes: [], flags: [] };
        syndromes.push(cur);
        return;
      }
      if (!cur) throw new Error('KB line ' + (ln + 1) + ' before any syndrome header');
      if (line.startsWith('> ')) { cur.notes.push(line.slice(2)); return; }
      if (line.startsWith('! ')) {
        const m = /^!\s*(urgent|caution|info)\s*\|\s*(.+)$/.exec(line);
        if (!m) throw new Error('Bad flag at KB line ' + (ln + 1));
        cur.flags.push({ level: m[1], text: m[2] });
        return;
      }
      const m = /^([MAE])\s+(\w+)\s*\|\s*(.+?)\s*::\s*(.+?)((?:\s+@\w+)*)\s*$/.exec(line);
      if (!m) throw new Error('Bad KB line ' + (ln + 1) + ': ' + line);
      const flags = (m[5].match(/@\w+/g) || []).map((x) => x.slice(1));
      const exprSrc = m[4].trim();
      let expr = null;
      try { expr = exprSrc === '-' ? null : parseExpr(exprSrc); } catch (e) { throw new Error('KB line ' + (ln + 1) + ': ' + e.message); }
      cur.criteria.push({
        level: m[1], domain: m[2], text: m[3], exprSrc, expr,
        core: flags.includes('core'), follow: flags.includes('follow'),
      });
    });
    return syndromes;
  }

  function collectIds(node, out) {
    if (!node) return out;
    if (node.t === 'f') out.add(node.id);
    if (node.a) collectIds(node.a, out);
    if (node.b) collectIds(node.b, out);
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Patient -> resolver                                                  */
  /*   patient = { onsetMonths, nowMonths, sex: 'F'|'M'|null,             */
  /*               findings: {id: true|false}, reviewed: {section: bool}, */
  /*               mri: null|'normal'|'abnormal',                         */
  /*               devOnset: null|0..3, devNow: null|0..3 }               */
  /* ------------------------------------------------------------------ */
  function makeContext(p) {
    const f = p.findings || {};
    const rev = p.reviewed || {};
    const cache = {};
    const num = (x) => (x === null || x === undefined || x === '' || Number.isNaN(Number(x)) ? null : Number(x));

    const base = (id) => {
      const v = f[id];
      if (v === true || v === false) return v;
      const sec = V.sectionOf(id);
      if (sec && rev[sec]) return false;
      return null;
    };
    const anyOf = (ids) => ids.reduce((acc, id) => tOr(acc, get(id)), false);
    const level = (lv, test) => (lv === null || lv === undefined ? null : test(lv));

    function compute(id) {
      switch (id) {
        case 'sz.focal_any': return anyOf(V.FOCAL_IDS.concat(V.FOCAL_SEMIOLOGY_IDS));
        case 'sz.gen_any': return anyOf(V.GENERALIZED_IDS);
        case 'sz.any': return anyOf(V.ALL_SEIZURE_IDS);
        case 'sz.other_than_gtc': return anyOf(V.ALL_SEIZURE_IDS.filter((x) => x !== 'sz.gtc'));
        case 'img.normal': return p.mri === 'normal' ? true : p.mri === 'abnormal' ? false : null;
        case 'img.abnormal_significant': return p.mri === 'abnormal' ? true : p.mri === 'normal' ? false : null;
        case 'img.lesion': {
          if (p.mri === 'normal') return false;
          const any = V.CAUSAL_LESIONS.some((x) => f[x] === true);
          return any ? true : p.mri === 'abnormal' ? false : null;
        }
        case 'devo.normal': return level(p.devOnset, (x) => x === 0);
        case 'devo.mild': return level(p.devOnset, (x) => x === 1);
        case 'devo.any_impair': return level(p.devOnset, (x) => x >= 1);
        case 'devo.moderate_plus': return level(p.devOnset, (x) => x >= 2);
        case 'devo.severe_plus': return level(p.devOnset, (x) => x >= 3);
        case 'devn.normal': return level(p.devNow, (x) => x === 0);
        case 'devn.mild': return level(p.devNow, (x) => x === 1);
        case 'devn.any_impair': return level(p.devNow, (x) => x >= 1);
        case 'devn.moderate_plus': return level(p.devNow, (x) => x >= 2);
        case 'devn.severe_plus': return level(p.devNow, (x) => x >= 3);
        case 'pt.female': return p.sex === 'F' ? true : p.sex === 'M' ? false : null;
        default: break;
      }
      if (id.startsWith('img.')) {
        if (p.mri === 'normal') return false;
        if (f[id] === true) return true;
        return p.mri === 'abnormal' ? false : null;
      }
      return base(id);
    }
    function get(id) {
      if (!(id in cache)) cache[id] = compute(id);
      return cache[id];
    }
    return { get, onsetMonths: num(p.onsetMonths), nowMonths: num(p.nowMonths) };
  }

  /* ------------------------------------------------------------------ */
  /* Syndrome evaluation                                                  */
  /* ------------------------------------------------------------------ */
  function evaluateSyndrome(s, ctx) {
    const rows = s.criteria.map((c) => {
      let state; let value = null;
      if (c.expr === null) state = 'manual';
      else {
        value = evalNode(c.expr, ctx);
        if (c.level === 'M') {
          if (value === true) state = 'met';
          else if (c.follow) state = 'followup';
          else state = value === false ? 'unmet' : 'pending';
        } else if (c.level === 'A') state = value === true ? 'alert' : value === false ? 'clear' : 'unknown';
        else state = value === true ? 'excluded' : value === false ? 'clear' : 'unknown';
      }
      return Object.assign({}, c, { value, state });
    });

    const mRows = rows.filter((r) => r.level === 'M');
    const coreRows = mRows.filter((r) => r.core);
    const relevant = coreRows.some((r) => r.state === 'met');
    const exclusions = rows.filter((r) => r.level === 'E' && r.state === 'excluded');
    const unmet = mRows.filter((r) => r.state === 'unmet');
    const pending = mRows.filter((r) => r.state === 'pending');
    const alerts = rows.filter((r) => r.level === 'A' && r.state === 'alert');
    const unkE = rows.filter((r) => r.level === 'E' && r.state === 'unknown');
    const manual = rows.filter((r) => r.state === 'manual' && r.level === 'M');
    const followup = mRows.filter((r) => r.state === 'followup');
    const mTested = mRows.filter((r) => r.expr && !r.follow);
    const mMet = mTested.filter((r) => r.state === 'met').length;

    let status;
    if (exclusions.length || unmet.length) status = 'excluded';
    else if (pending.length === 0) status = 'met';
    else status = 'possible';

    const reasons = [];
    exclusions.forEach((r) => reasons.push('Exclusionary: ' + r.text));
    unmet.forEach((r) => reasons.push('Mandatory criterion not met: ' + r.text));

    let score = 0;
    if (status === 'met') score = 1000 - alerts.length * 60 - unkE.length * 3 - manual.length * 5;
    else if (status === 'possible') score = 500 + (mTested.length ? (mMet / mTested.length) * 200 : 0) - alerts.length * 30 - pending.length * 4;

    return {
      id: s.id, name: s.name, abbr: s.abbr, group: s.group, source: s.source, table: s.table, type: s.type,
      notes: s.notes, flags: s.flags, rows, relevant, status, reasons, score,
      counts: { alerts: alerts.length, unassessedExclusions: unkE.length, pending: pending.length, manual: manual.length, followup: followup.length, mandatoryMet: mMet, mandatoryTotal: mTested.length },
      pending, alerts, unkE, manual,
    };
  }

  function evaluate(patient, syndromes) {
    const ctx = makeContext(patient);
    const all = syndromes.map((s) => evaluateSyndrome(s, ctx))
      .filter((r) => r.relevant && (r.status !== 'excluded' || r.counts.mandatoryMet >= 2));
    const rank = { met: 0, possible: 1, excluded: 2 };
    all.sort((a, b) => rank[a.status] - rank[b.status] || b.score - a.score);
    return all;
  }

  /* ------------------------------------------------------------------ */
  /* Seizure classification (ILAE 2025) and epilepsy type (ILAE 2017)     */
  /* ------------------------------------------------------------------ */
  function classifySeizures(patient) {
    const ctx = makeContext(patient);
    const out = [];
    Object.keys(V.SEIZURE_CLASS).forEach((id) => {
      if (ctx.get(id) === true) out.push({ id, cls: V.SEIZURE_CLASS[id][0], name: V.SEIZURE_CLASS[id][1] });
    });
    const notes = [];
    if (!out.some((s) => s.cls === 'Focal') && V.FOCAL_SEMIOLOGY_IDS.some((id) => ctx.get(id) === true)) {
      out.push({ id: 'sz.focal_implied', cls: 'Focal', name: 'Focal seizure (implied by the focal semiology entered)' });
      notes.push('Specify whether consciousness was preserved or impaired (awareness + responsiveness) to complete the ILAE 2025 focal classification.');
    }
    if (ctx.get('sz.gtc') === true && ctx.get('sz.focal_btc') !== true && ctx.get('sz.mtc') !== true) {
      notes.push('If onset was not witnessed and neither EEG nor imaging establishes focal vs generalized, ILAE 2025 classes this as "bilateral tonic–clonic, unknown whether focal or generalized".');
    }
    if (ctx.get('sz.spasms') === true) {
      notes.push('Epileptic spasms are a classifier only within the generalized class; in focal / unknown seizures they are a descriptor. Establish focal vs generalized with EEG and MRI (ILAE 2025, Fig. 3).');
    }
    if (ctx.get('sz.focal_aware') === true || ctx.get('sz.focal_impaired') === true) {
      notes.push('Consciousness is a classifier for focal seizures (ILAE 2025): defined by recall (awareness) and responsiveness. If either is impaired, classify as impaired consciousness.');
    }
    return { seizures: out, notes };
  }

  function epilepsyType(patient) {
    const ctx = makeContext(patient);
    const t = (id) => ctx.get(id) === true;
    const gen = V.GENERALIZED_IDS.filter(t);
    const foc = V.FOCAL_IDS.filter(t);
    // ILAE 2025: colloquial terms such as "focal clonic/tonic" refer to focal seizures; focal-only semiology implies the focal class
    if (!foc.length && V.FOCAL_SEMIOLOGY_IDS.some(t)) foc.push('implied');
    const eegGen = ['eeg.gen_epileptiform', 'eeg.gsw_3hz', 'eeg.gsw_3_55', 'eeg.gsw_2_6', 'eeg.gsw_slow'].some(t);
    const eegFoc = ['eeg.focal_spikes', 'eeg.ctsp', 'eeg.occipital', 'eeg.temporal_spikes', 'eeg.unilateral_consistent', 'eeg.single_focus'].some(t);
    const lesion = t('img.lesion');
    const reasons = [];
    let type; let basis;
    if (gen.length && foc.length) {
      type = 'Combined generalized and focal epilepsy';
      reasons.push('Both generalized and focal seizure types are present.');
      if (eegGen) reasons.push('Generalized epileptiform EEG activity supports a generalized component.');
      if (eegFoc) reasons.push('Focal epileptiform EEG activity supports a focal component.');
      basis = 'seizures';
    } else if (gen.length) {
      type = 'Generalized epilepsy';
      reasons.push('Generalized seizure types without focal seizures.');
      if (eegGen) reasons.push('Generalized spike-wave on EEG supports this.');
      else reasons.push('ILAE 2017 expects generalized spike-wave on EEG to confirm a generalized epilepsy — not yet documented.');
      if (eegFoc) reasons.push('Focal discharges are also present: reconsider (combined generalized and focal?).');
      basis = eegGen ? 'seizures + EEG' : 'seizures';
    } else if (foc.length) {
      type = 'Focal epilepsy';
      reasons.push('Focal seizure types without generalized seizures.');
      if (eegFoc) reasons.push('Focal epileptiform activity on EEG supports this.');
      if (lesion) reasons.push('A structural lesion on MRI supports a focal epilepsy.');
      if (eegGen) reasons.push('Generalized EEG activity is also present: reconsider (combined?).');
      basis = eegFoc || lesion ? 'seizures + EEG/MRI' : 'seizures';
    } else if (t('sz.spasms')) {
      type = 'Unknown (epileptic spasms only)';
      reasons.push('Epileptic spasms alone do not establish focal vs generalized onset.');
      if (lesion || eegFoc) reasons.push('Focal MRI/EEG findings raise the possibility of a focal origin — important for surgical evaluation.');
      basis = 'seizures';
    } else if (eegGen || eegFoc) {
      type = 'Not yet determinable from seizure types';
      reasons.push('No classifiable seizure types entered, although EEG shows ' + (eegGen ? 'generalized' : 'focal') + ' epileptiform activity.');
      basis = 'EEG only';
    } else {
      type = 'Not determined';
      reasons.push('Enter the seizure types observed to determine the epilepsy type.');
      basis = 'none';
    }
    return { type, reasons, basis };
  }

  function etiologyHints(patient, results) {
    const ctx = makeContext(patient);
    const t = (id) => ctx.get(id) === true;
    const out = [];
    const lesions = V.IMAGING_ITEMS.filter((i) => t(i[0]) && V.CAUSAL_LESIONS.includes(i[0])).map((i) => i[1]);
    if (t('img.lesion')) out.push({ cat: 'Structural', text: lesions.length ? lesions.join('; ') : 'Causal lesion on MRI' });
    const genes = V.SECTIONS.find((s) => s.key === 'gen').groups[0].items.filter((i) => t(i[0])).map((i) => i[1]);
    if (genes.length) out.push({ cat: 'Genetic', text: 'Pathogenic variant: ' + genes.join(', ') });
    if (['fh.ad_incomplete', 'fh.mtle', 'fh.variable_foci'].some(t)) out.push({ cat: 'Genetic', text: 'Family history suggests a heritable (familial) epilepsy' });
    if (t('lab.csf_infection')) out.push({ cat: 'Infectious', text: 'CSF evidence of CNS infection' });
    if (['lab.csf_low_glucose', 'lab.pdx_markers', 'lab.pdx_response', 'lab.metabolic_documented'].some(t)) out.push({ cat: 'Metabolic', text: 'Metabolic marker/response documented (e.g. hypoglycorrhachia, pyridoxine dependency)' });
    if (t('lab.autoantibody')) out.push({ cat: 'Immune', text: 'Causal autoantibody documented' });
    const skin = [['neuro.hypopigmented_macules', 'hypomelanotic macules'], ['neuro.angiofibromas', 'facial angiofibromas / other tuberous sclerosis skin signs'], ['neuro.cafe_au_lait', 'café-au-lait macules / freckling']].filter((x) => t(x[0])).map((x) => x[1]);
    if (skin.length) out.push({ cat: 'Neurocutaneous clue', text: 'Skin signs entered (' + skin.join('; ') + ') — consider a neurocutaneous disorder such as tuberous sclerosis complex or neurofibromatosis type 1; MRI and genetic evaluation are indicated (international consensus criteria; not scored by the ILAE syndrome tables).' });
    if (t('neuro.facial_angioma_v1')) out.push({ cat: 'Neurocutaneous clue', text: 'Facial capillary malformation in the V1 distribution — consider Sturge–Weber syndrome (MRI with contrast; ophthalmology review).' });
    (results || []).filter((r) => r.status !== 'excluded' && r.group === 'IGE').slice(0, 1).forEach((r) => out.push({ cat: 'Genetic (presumed)', text: r.abbr + ' is an idiopathic generalized epilepsy: a genetic basis is presumed from family/twin studies; a specific pathogenic variant need not be found (ILAE 2017; 2022).' }));
    const specific = (results || []).filter((r) => r.status === 'met' && ['KCNQ2DEE', 'CDKL5', 'PCDH19', 'GLUT1DS', 'PDDEE', 'SWS', 'HHGS'].includes(r.id));
    specific.forEach((r) => out.push({ cat: 'Etiology-specific syndrome', text: r.name + ' — the etiology defines the syndrome (ILAE 2022; extended in the 2026 ILAE Terminology Commission report).' }));
    if (!out.length) out.push({ cat: 'Unknown', text: 'No etiology identified from the data entered' + (patient.mri ? '' : ' — MRI not yet entered') + '.' });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Clinical flags and next steps                                        */
  /* ------------------------------------------------------------------ */
  function clinicalFlags(patient, results) {
    const ctx = makeContext(patient);
    const flags = [];
    const seen = new Set();
    const add = (level, text, src) => { const k = level + text; if (!seen.has(k)) { seen.add(k); flags.push({ level, text, src }); } };
    if (ctx.get('st.superrefractory_se') === true) {
      add('urgent', 'Super-refractory status epilepticus: medical emergency requiring intensive care and urgent aetiological work-up (including autoimmune and infectious causes).', 'ILAE 2022 (FIRES)');
    }
    (results || []).filter((r) => r.status !== 'excluded').forEach((r) => (r.flags || []).forEach((fl) => add(fl.level, fl.text, r.abbr + ' — ' + r.source)));
    // Generic seizure-level flag — suppressed when a syndrome-level flag (e.g. IESS) already says the same thing.
    if (ctx.get('sz.spasms') === true && !flags.some((f) => f.level === 'urgent' && /spasms/i.test(f.text))) {
      flags.unshift({ level: 'urgent', text: 'Epileptic spasms: early recognition and prompt spasms-specific treatment is time-critical — delay is associated with poorer developmental outcome. Urgent specialist assessment and EEG.', src: 'ILAE 2025 seizure classification; ILAE 2022 neonatal/infant syndromes' });
    }
    return flags;
  }

  function nextSteps(patient, results) {
    const ctx = makeContext(patient);
    const steps = [];
    const rev = patient.reviewed || {};
    const f = patient.findings || {};
    const anyEeg = Object.keys(f).some((k) => k.startsWith('eeg.') && (f[k] === true || f[k] === false)) || rev.eeg;
    if (!anyEeg) steps.push('EEG not yet entered: obtain a routine EEG including sleep, hyperventilation and photic stimulation (ILAE syndrome criteria depend heavily on EEG).');
    if (!patient.mri) steps.push('MRI brain not yet entered: several syndromes require a non-lesional MRI (e.g. SeLNE, SeLIE, MEI, EIMFS) and many require lesion exclusion.');
    const onset = ctx.onsetMonths;
    if (!rev.gen && !Object.keys(f).some((k) => k.startsWith('gen.') && f[k] === true) && ((onset !== null && onset <= 36) || ctx.get('devo.moderate_plus') === true || ctx.get('dev.encephalopathy') === true)) {
      steps.push('Genetic testing (epilepsy gene panel / exome) is worth considering: early onset or developmental/encephalopathic features raise the chance of an etiology-specific syndrome.');
    }
    if (ctx.get('neuro.microcephaly') === true && ctx.get('lab.csf_low_glucose') !== true && ctx.get('gen.slc2a1') !== true) {
      steps.push('Microcephaly: the ILAE recommends testing for GLUT1 deficiency (CSF glucose and/or SLC2A1) in children with microcephaly, onset ≤3 years or intellectual disability, particularly with an absence phenotype.');
    }
    if (ctx.get('neuro.dysmorphism') === true) steps.push('Dysmorphic features or congenital anomalies: consider clinical genetics review and chromosomal microarray (ILAE: recommended if seizures in an IGE are drug-resistant).');
    const cands = (results || []).filter((r) => r.status !== 'excluded').slice(0, 3);
    cands.forEach((r) => {
      r.pending.slice(0, 4).forEach((p) => steps.push('To establish ' + r.abbr + ': ' + p.text + ' (' + (DOMAIN_NAMES[p.domain] || p.domain) + ').'));
      if (r.unkE.length) steps.push('To firm up ' + r.abbr + ': assess exclusionary criteria — ' + r.unkE.slice(0, 3).map((x) => x.text).join('; ') + (r.unkE.length > 3 ? '; …' : '') + '.');
      r.alerts.forEach((a) => steps.push('Alert for ' + r.abbr + ': ' + a.text + ' — rethink the diagnosis and investigate further.'));
    });
    return steps;
  }

  /* ------------------------------------------------------------------ */
  /* Summary text (for copy-to-clipboard)                                 */
  /* ------------------------------------------------------------------ */
  function summarize(patient, results) {
    const sz = classifySeizures(patient);
    const et = epilepsyType(patient);
    const lines = [];
    lines.push('EPILEPSY CLASSIFICATION SUPPORT — rule-based summary (not a diagnosis)');
    lines.push('Seizures (ILAE 2025): ' + (sz.seizures.length ? sz.seizures.map((s) => s.name).join('; ') : 'none entered'));
    lines.push('Epilepsy type (ILAE 2017): ' + et.type);
    const shown = results.filter((r) => r.status !== 'excluded');
    lines.push('Syndrome candidates (ILAE 2022):');
    if (!shown.length) lines.push('  none meeting or approaching the mandatory criteria with the data entered');
    shown.forEach((r) => lines.push('  - ' + r.name + ' (' + r.abbr + '): ' + (r.status === 'met' ? 'mandatory criteria met' : 'possible — data missing') + ', ' + r.counts.alerts + ' alert(s)'));
    lines.push('Generated locally; verify against the ILAE position papers. Clinician judgement prevails.');
    return lines.join('\n');
  }

  /* ------------------------------------------------------------------ */
  /* Age-of-onset windows, derived from the syndrome's own criteria       */
  /* ------------------------------------------------------------------ */
  // Samples onset age on a log grid (1 day … ~92 y) and evaluates only the age-based
  // criteria. windows = ages passing every mandatory onset criterion and no exclusionary one;
  // alerts = ages where an onset alert fires. Sex-dependent windows (PCDH19) are the union.
  function onsetWindows(s) {
    const rows = s.criteria.filter((c) => c.domain === 'onset' && c.expr);
    if (!rows.length) return { none: true, windows: [], alerts: [] };
    const N = 520, lo = Math.log10(0.03), hi = Math.log10(1100);
    const grid = []; for (let i = 0; i <= N; i++) grid.push(Math.pow(10, lo + ((hi - lo) * i) / N));
    const okAt = (t, female) => {
      const ctx = { get: (id) => (id === 'pt.female' ? female : null), onsetMonths: t, nowMonths: null };
      return rows.every((c) => { const v = evalNode(c.expr, ctx); return c.level === 'M' ? v === true : c.level === 'E' ? v !== true : true; });
    };
    const inWindow = (t) => okAt(t, true) || okAt(t, false);
    const alertAt = (t) => inWindow(t) && rows.some((c) => c.level === 'A' && [true, false].some((f) => evalNode(c.expr, { get: (id) => (id === 'pt.female' ? f : null), onsetMonths: t, nowMonths: null }) === true));
    const runs = (fn) => { const out = []; let a = null; grid.forEach((t, i) => { const on = fn(t); if (on && a === null) a = t; if ((!on || i === grid.length - 1) && a !== null) { out.push([a, on ? t : grid[i - 1]]); a = null; } }); return out; };
    return { none: false, windows: runs(inWindow), alerts: runs(alertAt) };
  }

  return { parseExpr, evalNode, parseKB, collectIds, makeContext, evaluate, evaluateSyndrome, classifySeizures, epilepsyType, etiologyHints, clinicalFlags, nextSteps, summarize, onsetWindows, DOMAIN_NAMES };
});
