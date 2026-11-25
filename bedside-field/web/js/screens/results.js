// Results screen: the report, notes, the double-simultaneous follow-up, and exports (print / CSV / JSON).

import { $, el, show, toast } from '../ui/dom.js';
import { S } from '../app/state.js';
import { summarize, dssEligible } from '../core/analysis.js';
import { reportHTML, csvOf } from '../core/report.js';
import { saveSession } from '../core/store.js';
import { printPage, saveTextFile } from '../platform.js';
import { runDssNow } from '../app/flow.js';
import { renderHome } from './home.js';

export function showResults(session, { fresh = false, readonly = false } = {}) {
  S.session = session;
  const summary = summarize(session);
  $('#report').innerHTML = reportHTML(session, summary);
  const notes = $('#res-notes');
  notes.value = session.notes || '';
  notes.onchange = () => { session.notes = notes.value; saveSession(session); $('#report').innerHTML = reportHTML(session, summary); };
  const acts = $('#res-actions');
  acts.innerHTML = '';
  if (!readonly && summary.hasQuad && !summary.hasDss) {
    const ok = dssEligible(summary);
    acts.append(el('button', { class: ok ? 'primary' : '', onclick: () => runDssNow(session) }, ok ? 'Run double simultaneous block' : 'Run double simultaneous block anyway'));
    if (!ok) acts.append(el('span', { class: 'hint' }, 'A hemifield was missed: extinction can only be judged where single stimuli are seen.'));
  }
  if (!readonly) acts.append(el('button', { onclick: () => { renderHome(); show('s-home'); } }, 'New test'));
  show('s-results');
}

// Sandboxed preview views refuse file downloads, so there the export goes to the clipboard instead.
function copyOut(name, text) {
  const fail = () => toast('This view blocks copying too. Use the hosted app to export.', 4200);
  try { navigator.clipboard.writeText(text).then(() => toast(`${name} copied. Paste it into Notes or an email.`, 4200), fail); } catch { fail(); }
}

export function wireResults() {
  $('#res-back').addEventListener('click', () => { renderHome(); show('s-home'); });
  $('#res-print').addEventListener('click', () => printPage());
  const stem = () => `field-${new Date(S.session.createdAt).toISOString().slice(0, 16).replace(/[:T]/g, '-')}`;
  const save = (name, text, type) => (window.__BF_PREVIEW ? copyOut(name, text) : saveTextFile(name, text, type));
  $('#res-csv').addEventListener('click', () => save(stem() + '.csv', csvOf(S.session), 'text/csv'));
  $('#res-json').addEventListener('click', () => save(stem() + '.json', JSON.stringify({ ...S.session, summary: summarize(S.session) }, null, 2)));
}
