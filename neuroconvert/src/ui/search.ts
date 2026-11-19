import { MODULES } from '../data';
import { resolveRoutes } from '../engine/convert';
import { h, nextId } from './dom';

/**
 * Drug search. Every drug a converter knows about is indexed, and each hit
 * deep-links to the right converter with that drug already chosen.
 */

interface SearchEntry {
  text: string;
  label: string;
  sub: string;
  href: string;
}

let searchIndex: SearchEntry[] | null = null;

function buildSearchIndex(): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const m of MODULES) {
    for (const c of m.converters) {
      const base = `#/m/${m.id}`;
      const sub = m.converters.length > 1 ? `${m.title} · ${c.title}` : c.title;
      if (c.kind === 'directed') {
        for (const r of resolveRoutes(c.routes)) {
          out.push({
            text: `${r.label} ${r.group} ${m.title} ${c.title}`.toLowerCase(),
            label: r.label,
            sub,
            href: `${base}?c=${c.id}&r=${encodeURIComponent(r.id)}`,
          });
        }
      } else if (c.kind === 'equivalence') {
        for (const i of c.items) {
          out.push({
            text: `${i.name} ${i.group} ${m.title} ${c.title}`.toLowerCase(),
            label: i.name,
            sub,
            href: `${base}?c=${c.id}&f=${encodeURIComponent(i.id)}`,
          });
        }
      } else if (c.kind === 'formula') {
        out.push({
          text: `${c.title} ${m.title} ${c.summary} ${c.inputs.map((i) => i.label).join(' ')}`.toLowerCase(),
          label: c.title,
          sub: m.title,
          href: `${base}?c=${c.id}`,
        });
      } else {
        for (const i of c.items) {
          out.push({
            text: `${i.name} ${i.group} ${m.title} ${c.title} ledd levodopa equivalent`.toLowerCase(),
            label: i.name,
            sub,
            href: `${base}?c=${c.id}&e=${encodeURIComponent(i.id)}:`,
          });
        }
      }
    }
  }
  return out;
}

export function search(query: string): SearchEntry[] {
  searchIndex ??= buildSearchIndex();
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  return searchIndex.filter((e) => tokens.every((t) => e.text.includes(t))).slice(0, 12);
}

/**
 * A search field with a result list underneath. `onQuery` lets a container react
 * (the sidebar hides its list while results are showing).
 */
export function searchBox(opts: { placeholder: string; large?: boolean; onQuery?: (hasQuery: boolean) => void }): HTMLElement {
  const id = nextId('search');
  const results = h('ul', { class: 'search-results', id: `${id}-results`, role: 'list' });
  const input = h('input', {
    id,
    type: 'search',
    class: `search-input${opts.large ? ' large' : ''}`,
    placeholder: opts.placeholder,
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-controls': `${id}-results`,
    onInput: (e: Event) => {
      const q = (e.target as HTMLInputElement).value;
      results.replaceChildren();
      const hits = search(q);
      if (q.trim() && hits.length === 0) {
        results.appendChild(h('li', { class: 'no-hits' }, 'No conversion for that. Not every drug has an evidence-based conversion.'));
      }
      for (const hit of hits) {
        results.appendChild(h('li', null, h('a', { href: hit.href }, h('strong', null, hit.label), h('span', { class: 'sub' }, hit.sub))));
      }
      opts.onQuery?.(q.trim() !== '');
    },
  });
  return h('div', { class: 'search-box' }, h('label', { for: id, class: 'sr-only' }, 'Search for a drug'), input, results);
}
