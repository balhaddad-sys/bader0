// Past tests saved on this device.

import { $, el, show } from '../ui/dom.js';
import { loadSessions, deleteSession } from '../core/store.js';
import { summarize } from '../core/analysis.js';
import { showResults } from './results.js';

export function goHistory() {
  const list = $('#hist-list');
  list.innerHTML = '';
  const all = loadSessions();
  if (!all.length) list.append(el('p', { class: 'dim' }, 'No saved tests yet.'));
  for (const s of all) {
    const sum = summarize(s);
    const when = new Date(s.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const item = el('div', { class: 'hist-item' },
      el('div', { class: 'grow', onclick: () => showResults(s, { readonly: true }) },
        el('div', { class: 't1' }, s.label || 'Unlabelled'),
        el('div', { class: 't2' }, `${when} · ${s.method} · ${s.eye}${s.demo ? ' · DEMO' : ''}`),
        el('div', { class: 't2' }, [sum.pattern?.title, sum.dss?.title].filter(Boolean).join(' · ') || '—')),
      el('button', { class: 'danger', onclick: (e) => { e.stopPropagation(); if (e.currentTarget.dataset.arm) { deleteSession(s.id); goHistory(); } else { e.currentTarget.dataset.arm = 1; e.currentTarget.textContent = 'Confirm'; } } }, 'Delete'));
    list.append(item);
  }
  show('s-history');
}
