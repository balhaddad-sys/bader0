import { REFERENCE_MAP } from '../data';
import type { Callout, EvidenceTier, Provenance, Reference } from '../types';
import { h, link, type Child } from './dom';

export const TIERS: Record<EvidenceTier, { name: string; blurb: string; detail: string }> = {
  A: {
    name: 'Regulatory label',
    blurb: 'Stated in current FDA prescribing information.',
    detail:
      'The conversion is given explicitly in the FDA-approved prescribing information (a switching instruction or table). Strongest support for the number itself; the label may still advise monitoring and adjustment.',
  },
  B: {
    name: 'Pharmacokinetic',
    blurb: 'Derived from bioavailability or exposure data.',
    detail:
      'Derived from labelled or published pharmacokinetic data (bioavailability, relative exposure, salt factors). It predicts exposure, not clinical outcome, and is not a labelled switching instruction.',
  },
  C: {
    name: 'Clinical evidence',
    blurb: 'Supported by clinical studies or reviews.',
    detail:
      'Supported by clinical trials or a review of clinical studies. May conflict with labelling (for example botulinum toxin units) and often covers a narrow population or regimen.',
  },
  D: {
    name: 'Expert consensus',
    blurb: 'Approximate, from consensus or clinical-experience tables.',
    detail:
      'An approximate equivalence from expert consensus or clinical experience, without direct comparative validation. Wide between-patient variability; use only as a starting point.',
  },
};

export function tierBadge(tier: EvidenceTier, derived = false): HTMLElement {
  const t = TIERS[tier];
  return h(
    'span',
    { class: `badge tier-${tier}`, title: `${t.name}: ${t.blurb}${derived ? ' (derived by calculation)' : ''}` },
    h('span', { class: 'badge-letter', 'aria-hidden': 'true' }, tier),
    h('span', { class: 'sr-only' }, `Evidence tier ${tier}: `),
    h('span', { class: 'badge-name' }, t.name),
    derived ? h('span', { class: 'badge-derived' }, 'derived') : null,
  );
}

export function calloutList(callouts: Callout[]): HTMLElement | null {
  if (callouts.length === 0) return null;
  return h(
    'div',
    { class: 'callouts' },
    callouts.map((c) =>
      h(
        'div',
        { class: `callout ${c.kind}`, role: c.kind === 'warning' ? 'note' : undefined },
        h('span', { class: 'callout-label' }, c.kind === 'warning' ? 'Caution' : 'Note'),
        h('p', null, c.text),
      ),
    ),
  );
}

/** Links for a reference (PubMed, DOI, DailyMed, web). */
export function referenceLinks(r: Reference): Child[] {
  const out: Child[] = [];
  if (r.pmid) out.push(link(`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`, `PubMed ${r.pmid}`, 'ref-link'));
  if (r.doi) out.push(link(`https://doi.org/${r.doi}`, 'DOI', 'ref-link'));
  if (r.kind === 'label' && r.url) out.push(link(r.url, 'DailyMed label', 'ref-link'));
  if (r.kind === 'web' && r.url) out.push(link(r.url, 'Source page', 'ref-link'));
  return out;
}

/** Numbered source list for one provenance. */
export function sourcesBlock(p: Provenance, extraRefs: string[] = []): HTMLElement {
  const ids = [...new Set([...p.refs, ...extraRefs])];
  return h(
    'section',
    { class: 'sources', 'aria-label': 'Sources for this conversion' },
    h('h4', null, 'Sources'),
    p.locator ? h('p', { class: 'locator' }, h('strong', null, 'Where in the source: '), p.locator) : null,
    h(
      'ol',
      null,
      ids.map((id) => {
        const r = REFERENCE_MAP.get(id);
        if (!r) return h('li', null, `Missing reference ${id}`);
        return h(
          'li',
          null,
          h('span', { class: 'cite' }, r.citation),
          h('span', { class: 'ref-links' }, referenceLinks(r)),
        );
      }),
    ),
  );
}

/** Plain-text numbered references, for copy/paste. */
export function referencesAsText(ids: string[]): string {
  return [...new Set(ids)]
    .map((id, i) => `${i + 1}. ${REFERENCE_MAP.get(id)?.citation ?? id}`)
    .join('\n');
}
