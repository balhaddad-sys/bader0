import { APP_VERSION, DATA_VERSION, FINDINGS, MODULES, MODULE_MAP, OMISSIONS, REFERENCES } from '../data';
import { resolveRoutes } from '../engine/convert';
import type { Converter, EvidenceTier, Finding, Reference } from '../types';
import { copyText, h, link } from './dom';
import { calloutList, referenceLinks, referencesAsText, tierBadge, TIERS } from './evidence';
import { formulaPanel } from './formula-panel';
import { leddPanel } from './ledd-panel';
import { directedPanel, equivalencePanel, leadWarning, segmented, splitCallouts, type PanelCtx } from './panels';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function converterRules(c: Converter): { label: string; tier: EvidenceTier; derived: boolean; refs: string[] }[] {
  switch (c.kind) {
    case 'directed':
      return resolveRoutes(c.routes).map((r) => ({
        label: r.label,
        tier: r.provenance.tier,
        derived: !!r.provenance.derived,
        refs: r.provenance.refs,
      }));
    case 'equivalence':
      return [{ label: `${c.title} (${c.items.length} agents)`, tier: c.provenance.tier, derived: !!c.provenance.derived, refs: c.provenance.refs }];
    case 'ledd':
      return [{ label: `${c.title} (${c.items.length} agents)`, tier: c.provenance.tier, derived: false, refs: c.provenance.refs }];
    case 'formula':
      return [{ label: `${c.title} (calculator)`, tier: c.provenance.tier, derived: false, refs: c.provenance.refs }];
  }
}

/* ------------------------------------------------------------------ */
/* Search index                                                        */
/* ------------------------------------------------------------------ */

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
      const sub = `${m.title} · ${c.title}`;
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

function search(query: string): SearchEntry[] {
  searchIndex ??= buildSearchIndex();
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  return searchIndex.filter((e) => tokens.every((t) => e.text.includes(t))).slice(0, 12);
}

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

const TILE_BLURB: Record<string, string> = {
  epilepsy: 'Switch between IV and tablets, or between formulations',
  levels: 'Convert drug levels (µg/mL ⇄ µmol/L) and correct phenytoin for albumin',
  benzodiazepines: 'Equivalent doses: lorazepam, clonazepam, clobazam, diazepam…',
  parkinson: 'Total levodopa dose, formulation switches, Vyalev and Duopa pump settings',
  steroids: 'Equivalent doses: prednisone, dexamethasone, methylprednisolone…',
  botulinum: 'Unit ratios between Botox, Dysport and Xeomin',
  dementia: 'Rivastigmine patch, memantine XR and Namzaric',
  gabapentinoids: 'Lyrica to Lyrica CR conversion table',
  immunoglobulin: 'Starting doses for subcutaneous immunoglobulin in CIDP',
};

export function homePage(): HTMLElement {
  const resultsHost = h('ul', { class: 'search-results', id: 'search-results', role: 'list' });
  const searchInput = h('input', {
    id: 'search',
    type: 'search',
    class: 'search-input',
    placeholder: 'Search a drug, e.g. levetiracetam',
    autocomplete: 'off',
    'aria-controls': 'search-results',
    onInput: (e: Event) => {
      const q = (e.target as HTMLInputElement).value;
      resultsHost.replaceChildren();
      const hits = search(q);
      if (q.trim() && hits.length === 0) {
        resultsHost.appendChild(
          h('li', { class: 'no-hits' }, 'No conversion for that. Not every drug has an evidence-based conversion.'),
        );
      }
      for (const e2 of hits) {
        resultsHost.appendChild(h('li', null, h('a', { href: e2.href }, h('strong', null, e2.label), h('span', { class: 'sub' }, e2.sub))));
      }
    },
  });

  return h(
    'div',
    { class: 'page home' },
    h(
      'section',
      { class: 'hero' },
      h('h1', null, 'What do you want to convert?'),
      h('label', { for: 'search', class: 'sr-only' }, 'Search conversions'),
      searchInput,
      resultsHost,
    ),
    h(
      'div',
      { class: 'cards' },
      MODULES.map((m) =>
        h('a', { class: 'card module-card', href: `#/m/${m.id}` }, h('h2', null, m.title), h('p', null, TILE_BLURB[m.id] ?? m.summary)),
      ),
    ),
    h(
      'p',
      { class: 'fine home-note' },
      'Every answer shows where the number comes from. ',
      h('a', { href: '#/methods' }, 'How reliable are these numbers?'),
    ),
  );
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export function modulePage(moduleId: string, query: URLSearchParams, setParams: (p: Record<string, string | undefined>) => void): HTMLElement {
  const m = MODULE_MAP.get(moduleId);
  if (!m) return notFound();

  const requested = query.get('c');
  const activeId = m.converters.some((c) => c.id === requested) ? (requested as string) : m.converters[0].id;

  const sections = new Map<string, HTMLElement>();
  for (const c of m.converters) {
    const { lead, rest } = splitCallouts(c.callouts);
    // When the chosen conversion has its own, more specific caution, the converter-wide one moves into the collapsed list.
    const caution = (routeHasLead = false) => {
      const hidden = routeHasLead && lead ? [lead, ...rest] : rest;
      return [
        routeHasLead ? null : leadWarning(lead),
        hidden.length > 0
          ? h('details', { class: 'more inline' }, h('summary', null, 'More cautions and notes'), h('div', { class: 'more-body' }, calloutList(hidden)))
          : null,
      ];
    };
    const ctx: PanelCtx = { params: c.id === activeId ? query : new URLSearchParams(), setParams, caution };
    let panel: HTMLElement;
    switch (c.kind) {
      case 'directed':
        panel = directedPanel(c, ctx);
        break;
      case 'equivalence':
        panel = equivalencePanel(c, ctx);
        break;
      case 'ledd':
        panel = leddPanel(c, ctx);
        break;
      case 'formula':
        panel = formulaPanel(c, ctx);
        break;
    }
    sections.set(
      c.id,
      h(
        'section',
        { class: 'card converter', id: c.id, 'aria-labelledby': `${c.id}-h`, hidden: c.id !== activeId },
        h('h2', { id: `${c.id}-h` }, c.title),
        h('p', { class: 'conv-summary' }, c.summary),
        panel,
      ),
    );
  }

  const tabs =
    m.converters.length > 1
      ? segmented(
          'Converter',
          m.converters.map((c) => ({ value: c.id, label: c.title })),
          activeId,
          (id) => {
            for (const [cid, el] of sections) el.hidden = cid !== id;
            setParams({ c: id });
          },
          'tabs',
        )
      : null;

  return h(
    'div',
    { class: 'page module' },
    h('p', { class: 'crumb' }, h('a', { href: '#/' }, '← All converters')),
    h('h1', null, m.title),
    tabs,
    [...sections.values()],
  );
}

export function notFound(): HTMLElement {
  return h('div', { class: 'page' }, h('h1', null, 'Page not found'), h('p', null, h('a', { href: '#/' }, 'Back to all converters')));
}

/* ------------------------------------------------------------------ */
/* Methods                                                             */
/* ------------------------------------------------------------------ */

function refShort(r: Reference): string {
  if (r.short) return r.short;
  if (r.kind === 'label') return `${r.citation.split(/[ (]/)[0]} label`;
  return r.id;
}

function refHref(r: Reference): string | undefined {
  return r.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/` : r.url;
}

/** "Sources: Kiang 2016 · Kane 2013 …" as links. */
function findingSources(f: Finding): HTMLElement | null {
  if (f.refs.length === 0) return null;
  const items: (Node | string)[] = [];
  f.refs.forEach((id, i) => {
    const r = REFERENCES.find((x) => x.id === id);
    if (!r) return;
    if (i > 0) items.push(' · ');
    const href = refHref(r);
    items.push(href ? link(href, refShort(r), 'ref-link') : refShort(r));
  });
  return h('p', { class: 'finding-sources' }, 'Sources: ', ...items);
}

export function methodsPage(): HTMLElement {
  const rulesRows: HTMLElement[] = [];
  for (const m of MODULES) {
    for (const c of m.converters) {
      for (const r of converterRules(c)) {
        rulesRows.push(
          h(
            'tr',
            null,
            h('td', null, m.title),
            h('td', null, r.label),
            h('td', null, tierBadge(r.tier, r.derived)),
            h('td', null, r.refs.join(', ')),
          ),
        );
      }
    }
  }

  return h(
    'div',
    { class: 'page prose' },
    h('p', { class: 'eyebrow' }, 'Methods & limitations'),
    h('h1', null, 'How NeuroConvert works'),

    h('div', { class: 'callout warning' }, h('span', { class: 'callout-label' }, 'Review status'),
      h('p', null, `Version ${APP_VERSION}, data version ${DATA_VERSION}. The numbers were curated from primary sources (FDA prescribing information and peer-reviewed papers) with AI assistance, and every table is covered by automated tests. They have not yet been independently reviewed by a licensed clinical pharmacist or neurologist, and the app is not a regulated medical device. Do not rely on it for patient care until such a review has been completed, and always confirm against current prescribing information.`)),

    h('h2', null, 'What it does'),
    h('p', null, 'NeuroConvert converts a dose between routes, formulations or members of a drug class in neurology, and for each result shows the evidence tier, the exact location in the source, and full references with PubMed, DOI or DailyMed links. A result is either a single value (when a source gives one), a range (when sources disagree or only bound the value), or “no conversion defined” (when a label table does not cover the dose).'),

    h('h2', null, 'Evidence tiers'),
    h('p', null, 'The tiers are this app’s own rubric for how directly a source supports a number. They are not GRADE ratings.'),
    h('div', { class: 'table-scroll' }, h('table', { class: 'data-table' },
      h('thead', null, h('tr', null, h('th', null, 'Tier'), h('th', null, 'Meaning'), h('th', null, 'Typical sources'))),
      h('tbody', null,
        h('tr', null, h('td', null, tierBadge('A')), h('td', null, TIERS.A.detail), h('td', null, 'FDA prescribing information (DailyMed)')),
        h('tr', null, h('td', null, tierBadge('B')), h('td', null, TIERS.B.detail), h('td', null, 'Label pharmacokinetic sections; bioavailability studies; salt factors')),
        h('tr', null, h('td', null, tierBadge('C')), h('td', null, TIERS.C.detail), h('td', null, 'Randomised trials; reviews of clinical studies')),
        h('tr', null, h('td', null, tierBadge('D')), h('td', null, TIERS.D.detail), h('td', null, 'Consensus tables; position papers; clinical-experience tables')),
      ),
    )),
    h('p', null, 'A “derived” flag marks a number that is arithmetic on source data rather than stated by the source: for example the reverse of a one-direction label conversion, or a range computed from a labelled pharmacokinetic difference.'),

    h('h2', null, 'How the data were curated'),
    h('ul', null,
      h('li', null, 'Every factor and table was read from the primary source: the FDA label text on DailyMed (set ID and version date are in each citation) or the paper itself, rather than taken from secondary summaries.'),
      h('li', null, 'Where an initial recollection or a secondary source disagreed with the primary source, the primary source was used. Example: the ropinirole extended-release table in the current label differs from an older 2011 label (both noted in the app).'),
      h('li', null, 'Every PubMed-indexed reference was checked against its PubMed record (PMID, title, journal, year, DOI). The repository includes `npm run verify:references` to re-check them and the DailyMed set IDs.'),
      h('li', null, 'Automated tests enforce that no conversion exists without an evidence tier and resolvable references, that reversible conversions round-trip, that tables do not overlap, and that every label table and published factor matches its source.'),
      h('li', null, 'Labels change. A conversion that was current on the curation dates (16 and 19 November 2026) may have been revised since: check the current prescribing information.'),
    ),

    h('h2', null, 'Limits you should know'),
    h('ul', null,
      h('li', null, 'Equal total daily dose after a formulation switch is a starting point. Many labels advise monitoring and adjustment.'),
      h('li', null, 'Levodopa equivalent dose factors are a research tool for comparing cohorts, not a validated rule for switching an individual patient; several factors rest on consensus (Jost 2023; Cilia 2023; Snineh 2020).'),
      h('li', null, 'Benzodiazepine equivalents come from clinical experience during withdrawal switch-overs and differ between authors; they do not describe antiseizure potency.'),
      h('li', null, 'Botulinum toxin units are not interchangeable according to every current US label; the ratios shown are from clinical literature and reported over a wide range.'),
      h('li', null, 'Intravenous carbamazepine (Carnexiv) could not be checked against a current US label during curation and has limited availability.'),
    ),

    h('h2', null, 'What the cross-checks found'),
    h('p', null, 'A second research pass (19 November 2026) compared the existing numbers with independent sources. These findings changed or qualify what the app shows.'),
    h('dl', { class: 'omissions' }, FINDINGS.flatMap((f) => [h('dt', null, f.title), h('dd', null, f.text, findingSources(f))])),

    h('h2', null, 'Intentionally not provided'),
    h('p', null, 'Omission is deliberate where no evidence-based conversion could be traced.'),
    h('dl', { class: 'omissions' }, OMISSIONS.flatMap((f) => [h('dt', null, f.title), h('dd', null, f.text, findingSources(f))])),

    h('h2', null, 'Privacy'),
    h('p', null, 'All calculation happens in your browser. There are no accounts, no analytics and no network requests with your inputs. The app stores only whether you have accepted the notice and your theme choice, in your browser’s local storage. The shareable link contains the numbers you typed in its address, so avoid sharing it if the dose is identifying.'),

    h('h2', null, `All conversions (${rulesRows.length})`),
    h('div', { class: 'table-scroll' },
      h('table', { class: 'data-table rules-index' },
        h('thead', null, h('tr', null, h('th', null, 'Module'), h('th', null, 'Conversion'), h('th', null, 'Evidence'), h('th', null, 'Reference IDs'))),
        h('tbody', null, rulesRows),
      ),
    ),

    h('h2', null, 'Reporting an error'),
    h('p', null, 'A wrong number can harm a patient, so corrections are welcome. Open an issue in the project repository with the conversion, the value you expected and the source that supports it.'),
  );
}

/* ------------------------------------------------------------------ */
/* References                                                          */
/* ------------------------------------------------------------------ */

function citedBy(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const add = (id: string, where: string) => map.set(id, (map.get(id) ?? new Set()).add(where));
  for (const m of MODULES) {
    for (const c of m.converters) {
      c.refs.forEach((id) => add(id, `${m.title}`));
      if (c.kind === 'directed') c.routes.forEach((r) => r.provenance.refs.forEach((id) => add(id, m.title)));
      else c.provenance.refs.forEach((id) => add(id, m.title));
    }
  }
  return map;
}

export function referencesPage(): HTMLElement {
  const used = citedBy();
  const section = (title: string, items: Reference[]) =>
    h(
      'section',
      { class: 'ref-section' },
      h('h2', null, `${title} (${items.length})`),
      h(
        'ol',
        { class: 'ref-list' },
        items.map((r) =>
          h(
            'li',
            { id: `ref-${r.id}` },
            h('span', { class: 'cite' }, r.citation),
            h('span', { class: 'ref-links' }, referenceLinks(r)),
            h('span', { class: 'cited-by' }, `Used in: ${[...(used.get(r.id) ?? [])].join(', ')}`),
          ),
        ),
      ),
    );

  const sorted = (xs: Reference[]) => [...xs].sort((a, b) => a.citation.localeCompare(b.citation));
  const articles = sorted(REFERENCES.filter((r) => r.kind === 'article'));
  const labels = sorted(REFERENCES.filter((r) => r.kind === 'label'));
  const web = sorted(REFERENCES.filter((r) => r.kind === 'web'));

  return h(
    'div',
    { class: 'page prose' },
    h('p', { class: 'eyebrow' }, 'Sources'),
    h('h1', null, 'References'),
    h('p', null, `${REFERENCES.length} sources. Each article was checked against its PubMed record on the curation date; each prescribing-information entry names the DailyMed set ID and the label version that was read.`),
    h('div', { class: 'actions no-print' },
      h('button', { type: 'button', class: 'btn', onClick: () => void copyText(referencesAsText(REFERENCES.map((r) => r.id)), 'All references copied') }, 'Copy all references'),
    ),
    section('Peer-reviewed literature', articles),
    section('FDA prescribing information (DailyMed)', labels),
    section('Other sources', web),
    h('p', { class: 'fine' }, 'Link to a DailyMed set ID always opens the current version of that label, which may be newer than the version read for curation.'),
  );
}
