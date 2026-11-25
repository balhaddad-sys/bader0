// Pure scoring + pattern interpretation. Output is a screening aid, never a diagnosis.

import { median } from './util.js';

export const QUADS = ['UR', 'UL', 'LR', 'LL'];
export const QUAD_LABEL = { UR: 'Upper right', UL: 'Upper left', LR: 'Lower right', LL: 'Lower left' };
const HEMI = { R: ['UR', 'LR'], L: ['UL', 'LL'], U: ['UR', 'UL'], Lo: ['LR', 'LL'] };

export const T = { INTACT: 0.75, DEFECT: 0.25, MIN_N: 3 };

const val = (o) => (o === 'seen' ? 1 : o === 'delayed' ? 0.5 : o === 'missed' ? 0 : null);

function tally(trials) {
  const c = { n: 0, seen: 0, delayed: 0, missed: 0, invalid: 0 };
  for (const t of trials) {
    if (t.outcome === 'invalid') { c.invalid++; continue; }
    if (val(t.outcome) == null) continue;
    c.n++; c[t.outcome]++;
  }
  c.rate = c.n ? (c.seen + 0.5 * c.delayed) / c.n : NaN;
  c.lat = median(trials.filter((t) => (t.outcome === 'seen' || t.outcome === 'delayed') && Number.isFinite(t.latency)).map((t) => t.latency));
  return c;
}

export function classify(rate, n) {
  if (n < T.MIN_N || !Number.isFinite(rate)) return 'unknown';
  if (rate >= T.INTACT) return 'intact';
  if (rate <= T.DEFECT) return 'defective';
  return 'equivocal';
}

export function locationStats(trials) {
  const by = {};
  for (const t of trials) {
    if (t.kind !== 'quad') continue;
    (by[t.locId] ||= []).push(t);
  }
  return Object.fromEntries(Object.entries(by).map(([id, ts]) => [id, { ...tally(ts), quad: ts[0].quad, ring: ts[0].ring, target: ts[0].targets[0] }]));
}

const sideWord = (s) => (s === 'L' ? 'left' : 'right');

export function summarize(session) {
  const all = (session.trials || []).filter((t) => t.kind !== 'practice');
  const quadTrials = all.filter((t) => t.kind === 'quad');
  const catchTrials = all.filter((t) => t.kind === 'catch');
  const dssUni = all.filter((t) => t.kind === 'dss-uni');
  const dssBi = all.filter((t) => t.kind === 'dss-bi');
  const out = { hasQuad: quadTrials.length > 0, hasDss: dssUni.length + dssBi.length > 0, interpretation: [], flags: [] };

  // ---- quadrants / hemifields ----
  out.quads = {};
  out.cls = {};
  for (const q of QUADS) {
    const ts = quadTrials.filter((t) => t.quad === q);
    const st = tally(ts);
    st.cls = classify(st.rate, st.n);
    st.in = tally(ts.filter((t) => t.ring === 'in'));
    st.out = tally(ts.filter((t) => t.ring === 'out'));
    out.quads[q] = st;
    out.cls[q] = st.cls;
  }
  out.hemi = {};
  for (const [k, qs] of Object.entries(HEMI)) {
    const st = tally(quadTrials.filter((t) => qs.includes(t.quad)));
    st.cls = classify(st.rate, st.n);
    out.hemi[k] = st;
  }
  out.locations = locationStats(all);

  // ---- catch trials / reliability ----
  const cv = catchTrials.filter((t) => t.outcome === 'fa' || t.outcome === 'cr');
  out.catch = { n: cv.length, fa: cv.filter((t) => t.outcome === 'fa').length };
  out.catch.rate = cv.length ? out.catch.fa / cv.length : NaN;
  const attempts = all.length;
  const invalid = all.filter((t) => t.outcome === 'invalid').length;
  const vf = all.map((t) => t.validFrac).filter(Number.isFinite);
  out.reliability = {
    attempts, invalid,
    invalidFrac: attempts ? invalid / attempts : 0,
    faRate: out.catch.rate,
    trackingFrac: vf.length ? vf.reduce((a, b) => a + b, 0) / vf.length : NaN,
    overrides: all.filter((t) => t.fixOverride).length,
    reasons: [],
  };
  const R = out.reliability;
  let level = 'good';
  if (out.catch.n >= 3 && R.faRate > 0.34) { level = 'poor'; R.reasons.push(`High false-alarm rate on catch trials (${out.catch.fa}/${out.catch.n}): responses may not be stimulus-driven.`); }
  else if (out.catch.n >= 2 && R.faRate > 0.15) { level = 'fair'; R.reasons.push(`Some false alarms on catch trials (${out.catch.fa}/${out.catch.n}).`); }
  if (R.invalidFrac > 0.35) { level = 'poor'; R.reasons.push(`${Math.round(R.invalidFrac * 100)}% of trials were unusable (tracking lost / unscored).`); }
  else if (R.invalidFrac > 0.2 && level === 'good') { level = 'fair'; R.reasons.push(`${Math.round(R.invalidFrac * 100)}% of trials were unusable.`); }
  if (session.method === 'camera' && session.cal && session.cal.okY === false) R.reasons.push('Vertical gaze tracking was too noisy: left/right (hemifield) results are reliable, upper/lower are not.');
  if (R.overrides > 2) R.reasons.push(`Examiner overrode the fixation check on ${R.overrides} trials.`);
  R.level = out.hasQuad || out.hasDss ? level : 'n/a';

  // ---- latency asymmetry (Welch-style: needs a gap that is large in absolute terms AND vs. the scatter) ----
  if (session.method !== 'examiner') {
    const lats = (qs) => quadTrials.filter((t) => qs.includes(t.quad) && (t.outcome === 'seen' || t.outcome === 'delayed') && Number.isFinite(t.latency)).map((t) => t.latency);
    const lr = lats(HEMI.R), ll = lats(HEMI.L);
    if (lr.length >= 4 && ll.length >= 4) {
      const mr = median(lr), ml = median(ll);
      const v = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1); };
      const se = Math.sqrt(v(lr) / lr.length + v(ll) / ll.length);
      const slow = mr > ml ? 'R' : 'L';
      const hi = Math.max(mr, ml), lo = Math.min(mr, ml);
      if (hi / lo >= 1.4 && hi - lo >= 150 && hi - lo >= 2.5 * se) out.flags.push({ tone: 'warn', text: `Slower responses toward the ${sideWord(slow)} field`, detail: `Median ${Math.round(hi)} vs ${Math.round(lo)} ms. If detection there is intact, consider an attentional / frontal-eye-field contribution rather than a pure field cut.` });
    }
  }

  // ---- tonic gaze deviation (camera only; indicative) ----
  const fx = all.map((t) => t.fixGx).filter(Number.isFinite);
  if (fx.length >= 5) {
    const m = median(fx);
    if (Math.abs(m) > 12) out.flags.push({ tone: 'warn', text: 'Possible tonic gaze deviation', detail: `Resting gaze during fixation sat about ${Math.abs(Math.round(m))}° to the ${m > 0 ? 'right' : 'left'} of the anchor (relative to the tracking-check calibration; indicative only). Interpret misses on the opposite side with caution.` });
  }

  // ---- pattern from the quadrant screen ----
  if (out.hasQuad) out.pattern = patternOf(out, session);

  // ---- DSS ----
  if (out.hasDss) out.dss = dssOf(dssUni, dssBi, out);

  // ---- assemble interpretation lines ----
  if (out.pattern) out.interpretation.push({ tone: out.pattern.tone, text: out.pattern.title, detail: out.pattern.detail });
  if (out.dss) out.interpretation.push({ tone: out.dss.tone, text: out.dss.title, detail: out.dss.detail });
  for (const f of out.flags) out.interpretation.push(f);
  return out;
}

function listQ(a) { return a.map((q) => QUAD_LABEL[q].toLowerCase()).join(' & '); }

function patternOf(out, session) {
  const cls = out.cls;
  const D = QUADS.filter((q) => cls[q] === 'defective');
  const E = QUADS.filter((q) => cls[q] === 'equivocal');
  const U = QUADS.filter((q) => cls[q] === 'unknown');
  const key = [...D].sort().join('+');
  const eq = E.length ? ` Equivocal (partial / inconsistent) responses: ${listQ(E)}.` : '';
  const ext = session.geo ? `±${Math.round(session.geo.halfDegH)}° horizontally, ±${Math.round(session.geo.halfDegV)}° vertically` : 'the tested area';

  if (U.length) return { code: 'INSUFFICIENT', tone: 'warn', title: 'Insufficient valid trials', detail: `Too few valid trials in the ${listQ(U)} quadrant(s). Repeat the screen.` };

  const sparing = [...D, ...E].map((q) => {
    const s = out.quads[q];
    return s.in.n >= 2 && s.out.n >= 2 && s.in.rate >= 0.67 && s.out.rate <= 0.34 ? q : null;
  }).filter(Boolean);
  const spareNote = sparing.length ? ` The inner target (nearer fixation) was detected in the ${listQ(sparing)} quadrant(s) while the outer one was not: the defect may begin beyond the inner ring (possible macular sparing; only two eccentricities are sampled).` : '';

  const P = (code, title, hint, tone = 'bad') => ({ code, tone, title, detail: `${hint}${eq}${spareNote}` });
  switch (key) {
    case '': {
      if (sparing.length) return { code: 'PERIPH', tone: 'warn', title: `Outer target missed, inner target seen: ${listQ(sparing)}`, detail: `In the ${listQ(sparing)} quadrant(s) the inner target (nearer fixation) was detected but the outer one was not. Possible constricted or peripheral relative loss; only two eccentricities are sampled, so repeat before reading much into it.${E.length > sparing.length ? eq : ''}` };
      if (E.length) return { code: 'EQUIVOCAL', tone: 'warn', title: 'No clear defect, but responses were partial or inconsistent', detail: `No quadrant was clearly missed.${eq} Possible subtle/relative defect, inattention, or fatigue. Repeat, and consider the double-simultaneous block.` };
      return { code: 'NONE', tone: 'ok', title: 'No field defect detected on this screen', detail: `All four quadrants were detected (≥${T.INTACT * 100}% of valid trials) within roughly ${ext}. This does not exclude small, relative, or far-peripheral (e.g. temporal crescent) loss.` };
    }
    case 'LR+UR': return P('RHH', 'Right homonymous hemianopia pattern', 'Both right-sided quadrants were missed with the left intact. Fits a retrochiasmal lesion on the LEFT (optic tract, radiation or occipital cortex); with aphasia think left MCA/PCA territory.');
    case 'LL+UL': return P('LHH', 'Left homonymous hemianopia pattern', 'Both left-sided quadrants were missed with the right intact. Fits a retrochiasmal lesion on the RIGHT. Where responses are absent on the left, also consider hemispatial neglect (see the double-simultaneous block).');
    case 'UR': return P('RSQ', 'Right superior (upper) quadrantanopia pattern', 'Only the upper-right quadrant was missed. Fits a LEFT temporal (Meyer’s loop) or inferior-radiation / lingual-gyrus lesion.');
    case 'UL': return P('LSQ', 'Left superior (upper) quadrantanopia pattern', 'Only the upper-left quadrant was missed. Fits a RIGHT temporal (Meyer’s loop) or inferior-radiation / lingual-gyrus lesion.');
    case 'LR': return P('RIQ', 'Right inferior (lower) quadrantanopia pattern', 'Only the lower-right quadrant was missed. Fits a LEFT parietal (superior radiation) or cuneus lesion.');
    case 'LL': return P('LIQ', 'Left inferior (lower) quadrantanopia pattern', 'Only the lower-left quadrant was missed. Fits a RIGHT parietal (superior radiation) or cuneus lesion.');
    case 'UL+UR': return P('SUPALT', 'Upper (superior altitudinal) pattern', 'Both upper quadrants were missed. Bilateral lesions below the calcarine fissure (lingual gyri) or a pre-chiasmal cause (check monocularly) fit; also consider limited upward gaze or ptosis.');
    case 'LL+LR': return P('INFALT', 'Lower (inferior altitudinal) pattern', 'Both lower quadrants were missed. Bilateral lesions above the calcarine fissure (cunei) or a pre-chiasmal cause (check monocularly) fit; also consider poor downward gaze or lid position.');
    case 'LL+UR':
    case 'LR+UL': return P('DIAG', 'Diagonal (checkerboard) pattern — atypical', 'Diagonally opposite quadrants were missed, which is anatomically unusual for a single lesion. Check task engagement, tracking quality and the catch-trial rate; repeat.', 'warn');
    default:
      return P('EXTENSIVE', 'Extensive loss or no reliable detection', `${D.length} of 4 quadrants were missed. Distinguish true bilateral/cortical visual loss from inability to perform the task (drowsiness, inattention, tracking failure) before drawing conclusions.`, 'warn');
  }
}

function dssOf(uni, bi, out) {
  const side = (s) => tally(uni.filter((t) => t.side === s));
  const uL = side('L'), uR = side('R');
  const v = bi.filter((t) => ['both', 'left', 'right', 'none'].includes(t.outcome));
  const c = { n: v.length, both: 0, left: 0, right: 0, none: 0 };
  v.forEach((t) => c[t.outcome]++);
  const detL = c.n ? (c.both + c.left) / c.n : NaN;
  const detR = c.n ? (c.both + c.right) / c.n : NaN;
  const firsts = v.map((t) => t.first).filter(Boolean);
  const first = { L: firsts.filter((s) => s === 'L').length, R: firsts.filter((s) => s === 'R').length };
  const res = { uniL: uL, uniR: uR, bi: c, detL, detR, first, extinction: null };

  if (!c.n || uL.n < 2 || uR.n < 2) return { ...res, tone: 'warn', title: 'Double simultaneous stimulation: too few valid trials', detail: 'Not enough valid unilateral / bilateral trials to interpret.' };

  const okL = uL.rate >= T.INTACT, okR = uR.rate >= T.INTACT;
  if (!okL || !okR) {
    const bad = [!okL && 'left', !okR && 'right'].filter(Boolean).join(' and ');
    return { ...res, tone: 'warn', title: `Double simultaneous stimulation not interpretable for the ${bad} side`, detail: `Single stimuli on the ${bad} side were not reliably detected (left ${Math.round(uL.rate * 100)}%, right ${Math.round(uR.rate * 100)}%), so failure under bilateral stimulation cannot be called extinction. Extinction is only meaningful where single stimuli are detected.` };
  }
  if (detL >= T.INTACT && detR >= T.INTACT) return { ...res, tone: 'ok', title: 'No visual extinction detected', detail: `Both sides were detected on single stimuli (left ${Math.round(uL.rate * 100)}%, right ${Math.round(uR.rate * 100)}%) and under bilateral stimulation (left ${Math.round(detL * 100)}%, right ${Math.round(detR * 100)}%).` };
  if (detL <= 0.5 && detR >= T.INTACT) return { ...res, extinction: 'L', tone: 'bad', title: 'Left-sided visual extinction pattern', detail: `Left stimuli were detected alone (${Math.round(uL.rate * 100)}%) but only ${Math.round(detL * 100)}% of the time when a right stimulus competed. Fits hemispatial inattention (classically right parietal) rather than a field cut.` };
  if (detR <= 0.5 && detL >= T.INTACT) return { ...res, extinction: 'R', tone: 'bad', title: 'Right-sided visual extinction pattern', detail: `Right stimuli were detected alone (${Math.round(uR.rate * 100)}%) but only ${Math.round(detR * 100)}% of the time when a left stimulus competed. Fits hemispatial inattention (classically left parietal) rather than a field cut.` };
  return { ...res, tone: 'warn', title: 'Inconsistent bilateral performance', detail: `Bilateral detection: left ${Math.round(detL * 100)}%, right ${Math.round(detR * 100)}%. Neither a clear extinction pattern nor normal. Repeat; consider fatigue or fluctuating attention.` };
}

/** True when it is meaningful to continue to double simultaneous stimulation. */
export function dssEligible(summary) {
  if (!summary.hasQuad) return true;
  const r = summary.hemi.R.rate, l = summary.hemi.L.rate;
  return Number.isFinite(r) && Number.isFinite(l) && r >= 0.5 && l >= 0.5;
}
