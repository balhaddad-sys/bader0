// Report rendering (HTML + SVG field map + CSV). Used on screen and for printing.

import { escapeHtml as esc, fmtMs, fmtPct } from './util.js';
import { QUADS, QUAD_LABEL, T } from './analysis.js';

const METHOD_LABEL = {
  camera: 'Eye movement (camera-tracked)',
  examiner: 'Eye movement (examiner-scored)',
  touch: 'Touch-to-target',
};
const EYE_LABEL = { both: 'Both eyes (binocular)', right: 'Right eye only (left covered)', left: 'Left eye only (right covered)' };
const CLS_LABEL = { intact: 'Intact', equivocal: 'Equivocal', defective: 'Missed', unknown: 'Too few trials' };

function rateClass(rate, n) {
  if (n < 1 || !Number.isFinite(rate)) return 'm-na';
  if (rate >= T.INTACT) return 'm-ok';
  if (rate <= T.DEFECT) return 'm-bad';
  return 'm-mid';
}

/** The tested visual field, drawn as the PATIENT sees it (left field on the left). */
export function fieldMapSVG(summary, session) {
  const g = session.geo || { halfDegH: 20, halfDegV: 14 };
  const Hx = Math.max(10, Math.ceil(g.halfDegH / 5) * 5), Hy = Math.max(10, Math.ceil(g.halfDegV / 5) * 5);
  const W = 560, Hh = 372, padL = 44, padT = 18, availW = W - padL - 16, availH = Hh - padT - 34;
  const s = Math.min(availW / (2 * Hx), availH / (2 * Hy));
  const pw = 2 * Hx * s, ph = 2 * Hy * s;
  const x0 = padL + (availW - pw) / 2, y0 = padT + (availH - ph) / 2;
  const cx = x0 + pw / 2, cy = y0 + ph / 2;
  const X = (h) => cx + h * s, Y = (v) => cy - v * s;

  // screen extent (what was physically testable)
  const ex = g.halfDegH * s, ey = g.halfDegV * s;
  let out = `<svg class="fieldmap" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Visual field map as seen by the patient">`;
  // quadrant shading
  const qpos = { UR: [cx, cy - ey, ex, ey], UL: [cx - ex, cy - ey, ex, ey], LR: [cx, cy, ex, ey], LL: [cx - ex, cy, ex, ey] };
  for (const q of QUADS) {
    const [qx, qy, qw, qh] = qpos[q];
    const cls = summary.cls?.[q] || 'unknown';
    out += `<rect x="${qx}" y="${qy}" width="${qw}" height="${qh}" class="qshade q-${cls}"/>`;
  }
  // grid
  for (let h = -Hx; h <= Hx; h += 5) {
    out += `<line x1="${X(h)}" y1="${y0}" x2="${X(h)}" y2="${y0 + ph}" class="${h === 0 ? 'axis' : 'grid'}"/>`;
    if (h % 10 === 0) out += `<text x="${X(h)}" y="${y0 + ph + 16}" class="tick" text-anchor="middle">${h > 0 ? '+' : ''}${h}°</text>`;
  }
  for (let v = -Hy; v <= Hy; v += 5) {
    out += `<line x1="${x0}" y1="${Y(v)}" x2="${x0 + pw}" y2="${Y(v)}" class="${v === 0 ? 'axis' : 'grid'}"/>`;
    if (v % 10 === 0) out += `<text x="${x0 - 6}" y="${Y(v) + 4}" class="tick" text-anchor="end">${v > 0 ? '+' : ''}${v}°</text>`;
  }
  out += `<rect x="${cx - ex}" y="${cy - ey}" width="${2 * ex}" height="${2 * ey}" class="extent"/>`;
  // quadrant corner labels
  out += `<text x="${cx - ex + 8}" y="${cy - ey + 16}" class="qlab">UL</text><text x="${cx + ex - 8}" y="${cy - ey + 16}" class="qlab" text-anchor="end">UR</text>`;
  out += `<text x="${cx - ex + 8}" y="${cy + ey - 8}" class="qlab">LL</text><text x="${cx + ex - 8}" y="${cy + ey - 8}" class="qlab" text-anchor="end">LR</text>`;
  // fixation
  out += `<circle cx="${cx}" cy="${cy}" r="5" class="fix"/>`;
  // tested locations
  for (const [id, L] of Object.entries(summary.locations || {})) {
    const t = L.target;
    if (!t) continue;
    const sc = L.seen + L.delayed * 0.5;
    const label = L.n ? `${Number.isInteger(sc) ? sc : sc.toFixed(1)}/${L.n}` : '–';
    const tip = `${QUAD_LABEL[L.quad]} ${L.ring === 'in' ? 'inner' : 'outer'} (${t.h.toFixed(0)}°, ${t.v.toFixed(0)}°): seen ${L.seen}, delayed ${L.delayed}, missed ${L.missed}, invalid ${L.invalid}`;
    out += `<g class="loc ${rateClass(L.rate, L.n)}"><title>${esc(tip)}</title><circle cx="${X(t.h)}" cy="${Y(t.v)}" r="19"/><text x="${X(t.h)}" y="${Y(t.v) + 4.5}" text-anchor="middle">${label}</text></g>`;
  }
  out += `<text x="${W / 2}" y="${Hh - 4}" class="cap" text-anchor="middle">Patient’s view: left field on the left · centre = fixation · dashed box = testable screen area</text>`;
  return out + '</svg>';
}

function cell(st) {
  if (!st || !st.n) return '<span class="dim">–</span>';
  const bits = [`${st.seen}`];
  if (st.delayed) bits.push(`+${st.delayed}d`);
  return `<b>${bits.join(' ')}</b>/${st.n}`;
}

export function reportHTML(session, summary, { forPrint = false } = {}) {
  const d = new Date(session.createdAt);
  const when = d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const g = session.geo;
  const rel = summary.reliability;
  const relLabel = { good: 'Good', fair: 'Fair', poor: 'Poor', 'n/a': '—' }[rel.level] || '—';
  let h = '';

  h += `<header class="rep-head">
    <div><h2>Bedside visual field screen</h2>
    <div class="meta">${esc(when)}${session.label ? ` · <b>${esc(session.label)}</b>` : ''}</div></div>
    <div class="badges">${session.demo ? '<span class="badge warn">SIMULATED DEMO PATIENT — not real data</span>' : ''}
    <span class="badge">${esc(METHOD_LABEL[session.method] || session.method)}</span>
    <span class="badge">${esc(EYE_LABEL[session.eye] || session.eye)}</span></div>
  </header>`;

  // interpretation cards
  h += '<section class="rep-sec"><h3>Screening pattern <small>(non-diagnostic)</small></h3>';
  if (!summary.interpretation.length) h += '<p class="dim">No data yet.</p>';
  for (const it of summary.interpretation) {
    h += `<div class="interp tone-${it.tone}"><div class="it-title">${esc(it.text)}</div>${it.detail ? `<div class="it-detail">${esc(it.detail)}</div>` : ''}</div>`;
  }
  h += '</section>';

  // quadrant block
  if (summary.hasQuad) {
    h += `<section class="rep-sec"><h3>Quadrant screen</h3><div class="rep-grid">
      <div class="rep-map">${fieldMapSVG(summary, session)}
        <div class="legend"><span class="lg m-ok"></span>detected ≥${T.INTACT * 100}% <span class="lg m-mid"></span>partial <span class="lg m-bad"></span>missed ≤${T.DEFECT * 100}% <span class="lg m-na"></span>no valid data · label = detected / valid trials</div></div>
      <div class="rep-tab"><table><thead><tr><th>Quadrant</th><th>Inner</th><th>Outer</th><th>Detected</th><th>${session.method === 'touch' ? 'Median RT' : session.method === 'camera' ? 'Median latency' : 'Latency'}</th><th>Status</th></tr></thead><tbody>`;
    for (const q of ['UL', 'UR', 'LL', 'LR']) {
      const s = summary.quads[q];
      const innerLoc = summary.locations[q + '-in'], outerLoc = summary.locations[q + '-out'];
      const ecc = (L) => (L?.target ? `<small>${L.target.h.toFixed(0)}°, ${L.target.v.toFixed(0)}°</small>` : '');
      h += `<tr class="${rateClass(s.rate, s.n)}"><td>${QUAD_LABEL[q]}</td><td>${cell(s.in)} ${ecc(innerLoc)}</td><td>${cell(s.out)} ${ecc(outerLoc)}</td><td>${fmtPct(s.rate)} <small>(${s.n})</small></td><td>${session.method === 'examiner' ? '<span class="dim">n/a</span>' : fmtMs(s.lat)}</td><td>${CLS_LABEL[s.cls]}</td></tr>`;
    }
    h += `</tbody></table>
      <p class="note">“d” = delayed response (${session.method === 'touch' ? 'found after searching' : 'late or not the first eye movement'}); counted as half. Ecc. shown as horizontal°, vertical° from fixation.</p>
      <table class="mini"><tbody>
        <tr><td>Right hemifield</td><td>${fmtPct(summary.hemi.R.rate)}</td><td>Left hemifield</td><td>${fmtPct(summary.hemi.L.rate)}</td></tr>
        <tr><td>Upper field</td><td>${fmtPct(summary.hemi.U.rate)}</td><td>Lower field</td><td>${fmtPct(summary.hemi.Lo.rate)}</td></tr>
      </tbody></table></div></div></section>`;
  }

  // DSS
  if (summary.hasDss && summary.dss) {
    const x = summary.dss;
    h += `<section class="rep-sec"><h3>Double simultaneous stimulation</h3>
      <table class="dsst"><thead><tr><th></th><th>Left</th><th>Right</th></tr></thead><tbody>
      <tr><td>Single stimulus detected</td><td>${fmtPct(x.uniL.rate)} <small>(${x.uniL.n})</small></td><td>${fmtPct(x.uniR.rate)} <small>(${x.uniR.n})</small></td></tr>
      <tr><td>Detected when both sides stimulated</td><td>${fmtPct(x.detL)}</td><td>${fmtPct(x.detR)}</td></tr>
      <tr><td>Bilateral trials (${x.bi.n})</td><td colspan="2">both ${x.bi.both} · left only ${x.bi.left} · right only ${x.bi.right} · neither ${x.bi.none}${x.first.L + x.first.R ? ` · first response L ${x.first.L} / R ${x.first.R}` : ''}</td></tr>
      </tbody></table></section>`;
  }

  // reliability
  h += `<section class="rep-sec"><h3>Reliability</h3><div class="rel rel-${rel.level}">
    <div class="rel-level">${relLabel}</div><ul>
    <li>Catch trials (no stimulus): ${summary.catch.n ? `${summary.catch.fa}/${summary.catch.n} false alarms (${fmtPct(summary.catch.rate)})` : 'none valid'}</li>
    <li>Unusable trials: ${rel.invalid}/${rel.attempts}${rel.attempts ? ` (${fmtPct(rel.invalidFrac)})` : ''}</li>
    ${session.method === 'camera' ? `<li>Camera tracking: ${Number.isFinite(rel.trackingFrac) ? fmtPct(rel.trackingFrac) + ' of frames usable' : '—'}${session.cal ? ` · horizontal ${session.cal.okX ? 'OK' : 'poor'} (${session.cal.noiseDegX ? '±' + session.cal.noiseDegX.toFixed(1) + '°' : ''}), vertical ${session.cal.okY ? 'OK' : 'not used'}` : ''}</li>` : ''}
    ${session.cal && session.cal.acc != null ? `<li>Gaze accuracy measured on unseen dots at the start: ${session.cal.acc.toFixed(1)}° mean error (${esc(session.cal.grade || '')}; H ${session.cal.accX.toFixed(1)}° · V ${session.cal.accY.toFixed(1)}°) · steadiness ±${(session.cal.prec ?? 0).toFixed(1)}° · ${esc(session.cal.model || '')} map${session.cal.headCorr ? ' + head correction' : ''}</li>` : ''}
    ${session.cal && session.cal.eyesAgree === false ? `<li class="warn">The two eyes responded differently during the tracking check (possible misalignment or a poor view of one eye).</li>` : ''}
    ${rel.reasons.map((r) => `<li class="warn">${esc(r)}</li>`).join('')}
    </ul></div></section>`;

  // parameters
  h += `<section class="rep-sec"><h3>Test parameters</h3><p class="params">
    Viewing distance ${g?.distanceCm ?? '—'} cm · screen ${g?.pxPerMm ? g.pxPerMm.toFixed(2) + ' px/mm' : '—'} (${esc(session.calSource || 'uncalibrated')}) ·
    tested area ±${g?.halfDegH ?? '—'}° horizontal, ±${g?.halfDegV ?? '—'}° vertical · stimulus ${g?.stimDeg ?? '—'}° ${esc(session.stimulus || '')} flicker ${session.flickerHz || 12} Hz ·
    window ${session.windowMs ?? '—'} ms · ${session.reps ?? '—'} repeats/location.
    ${session.method === 'camera' ? 'Latencies are camera-referenced and include roughly 50–100 ms of camera/processing delay (30 fps sampling); use them for left–right comparison, not as absolute saccade latencies.' : ''}
    ${session.eye !== 'both' ? 'Monocular test: tablet centred on the open eye.' : ''}</p>
    ${session.notes ? `<p class="params"><b>Notes:</b> ${esc(session.notes)}</p>` : ''}
    <p class="disclaimer">Qualitative bedside screening and documentation aid (digital confrontation equivalent). Not equivalent to automated perimetry (no luminance calibration, no head fixation) and not validated for diagnosis. Interpret in clinical context.</p></section>`;
  return h;
}

export function csvOf(session) {
  const cols = ['idx', 'block', 'kind', 'locId', 'quad', 'ring', 'outcome', 'latency_ms', 'score_ms', 'first', 'stray_taps', 'valid_frac', 'fix_gx_deg', 'retried', 'reason'];
  const rows = [cols.join(',')];
  for (const t of session.trials || []) {
    rows.push([t.idx, t.block, t.kind, t.locId, t.quad ?? '', t.ring ?? '', t.outcome, t.latency ?? '', t.scoreMs ?? '', t.first ?? '', t.stray ?? '', t.validFrac ?? '', t.fixGx ?? '', t.retried ? 1 : '', t.reason ?? '']
      .map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(','));
  }
  return rows.join('\n');
}
