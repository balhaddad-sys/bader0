import type { DirectedConverter, EquivalenceConverter, EquivItem, Module } from '../../types';
import { pt } from '../helpers';

/**
 * Systemic corticosteroid equivalence. Table 1 of Liu et al. 2013 (adapted by
 * the authors from NICE 2012 and Furst 2012): approximate equivalent dose for
 * oral or IV administration, with prednisone 5 mg as the anchor.
 */

const SHORT = 'Short-acting (8–12 h)';
const INTER = 'Intermediate-acting (12–36 h)';
const LONG = 'Long-acting (36–72 h)';

const items: EquivItem[] = [
  { id: 'hydrocortisone', name: 'Hydrocortisone', group: SHORT, equiv: pt(20), unit: 'mg', note: 'Relative glucocorticoid activity 1; relative mineralocorticoid activity 1.' },
  { id: 'cortisone', name: 'Cortisone', group: SHORT, equiv: pt(25), unit: 'mg', note: 'Relative glucocorticoid activity 0.8; relative mineralocorticoid activity 0.8.' },
  { id: 'prednisone', name: 'Prednisone', group: INTER, equiv: pt(5), unit: 'mg', note: 'Relative glucocorticoid activity 4; relative mineralocorticoid activity 0.8.' },
  { id: 'prednisolone', name: 'Prednisolone', group: INTER, equiv: pt(5), unit: 'mg', note: 'Relative glucocorticoid activity 4; relative mineralocorticoid activity 0.8.' },
  { id: 'methylprednisolone', name: 'Methylprednisolone', group: INTER, equiv: pt(4), unit: 'mg', note: 'Relative glucocorticoid activity 5; minimal mineralocorticoid activity.' },
  { id: 'triamcinolone', name: 'Triamcinolone', group: INTER, equiv: pt(4), unit: 'mg', note: 'Relative glucocorticoid activity 5; no mineralocorticoid activity.' },
  { id: 'dexamethasone', name: 'Dexamethasone', group: LONG, equiv: pt(0.75), unit: 'mg', note: 'Relative glucocorticoid activity 30; minimal mineralocorticoid activity.' },
  { id: 'betamethasone', name: 'Betamethasone', group: LONG, equiv: pt(0.6), unit: 'mg', note: 'Relative glucocorticoid activity 30; negligible mineralocorticoid activity.' },
];

const equivalence: EquivalenceConverter = {
  id: 'steroid-equivalence',
  kind: 'equivalence',
  title: 'Glucocorticoid equivalence (oral / IV)',
  summary: 'Approximate equivalent doses of systemic glucocorticoids (prednisone 5 mg anchor).',
  doseBasis: 'Daily dose (mg) of the starting glucocorticoid.',
  referenceLabel: 'prednisone 5 mg',
  refs: ['liu2013'],
  items,
  provenance: {
    tier: 'D',
    refs: ['liu2013'],
    locator: 'Table 1: properties, dosing equivalents and indications of systemic corticosteroids (adapted from NICE 2012 and Furst 2012)',
  },
  callouts: [
    {
      kind: 'warning',
      text: 'Equivalence refers to glucocorticoid (anti-inflammatory) activity for oral or intravenous administration. The source cautions that relative potency for intramuscular or intra-ocular administration may vary considerably.',
    },
    {
      kind: 'note',
      text: 'Agents differ in mineralocorticoid activity and duration of action (see each agent’s note), so equal glucocorticoid doses are not interchangeable for adrenal-insufficiency replacement. Fludrocortisone is excluded.',
    },
  ],
};

const msRelapse: DirectedConverter = {
  id: 'steroid-ms-relapse',
  kind: 'directed',
  title: 'MS relapse: IV ⇄ oral methylprednisolone',
  summary: 'High-dose methylprednisolone for relapses: the oral regimen tested against IV in a non-inferiority trial.',
  doseBasis: 'Daily dose of methylprednisolone (mg).',
  refs: ['lepage2015', 'burton2012'],
  callouts: [
    {
      kind: 'note',
      text: 'Evidence is for 1,000 mg once daily for 3 days. COPOUSEP enrolled adults aged 18–55 with relapsing–remitting MS and a relapse within the previous 15 days; it was not designed for other regimens or populations.',
    },
  ],
  routes: [
    {
      id: 'mp-iv-oral',
      kind: 'factor',
      group: 'Methylprednisolone',
      label: 'Methylprednisolone: IV → oral (MS relapse)',
      reverseLabel: 'Methylprednisolone: oral → IV (MS relapse)',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: pt(1),
      reversible: true,
      reverseStated: true,
      provenance: {
        tier: 'C',
        refs: ['lepage2015', 'burton2012'],
        locator:
          'COPOUSEP (RCT, n=199): oral vs IV methylprednisolone 1,000 mg/day for 3 days; improved at day 28 in 81% (oral) vs 80% (IV), difference 0.5% (90% CI −9.5 to 10.4), non-inferiority margin 15%',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'Adverse-event rates were similar overall, but insomnia was reported more often with oral dosing (77% vs 64%).',
        },
        {
          kind: 'note',
          text: 'This is a mg-for-mg dose equivalence, not a potency conversion: it differs from the prednisone-equivalent table because the trial tested identical 1,000 mg methylprednisolone doses by each route.',
        },
      ],
    },
  ],
};

export const corticosteroids: Module = {
  id: 'steroids',
  title: 'Corticosteroids',
  area: 'Neuroimmunology · Neuro-oncology',
  summary: 'Glucocorticoid equivalence table, plus the evidence for oral vs IV methylprednisolone in MS relapse.',
  converters: [equivalence, msRelapse],
};
