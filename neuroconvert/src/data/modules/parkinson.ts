import type {
  DirectedConverter,
  EquivalenceConverter,
  EquivItem,
  LeddCalculator,
  LeddItem,
  Module,
} from '../../types';
import { pt } from '../helpers';

/* ------------------------------------------------------------------ */
/* Levodopa equivalent dose (LED) — Jost et al., Mov Disord 2023, Table 1 */
/* ------------------------------------------------------------------ */

const LD = 'Levodopa-containing';
const COMT = 'COMT inhibitors (applied to the levodopa LED)';
const MAOB = 'MAO-B inhibitors';
const DA = 'Dopamine agonists (non-ergot)';
const ERGOT = 'Dopamine agonists (ergot-derived)';
const OTHER = 'Other agents';

/**
 * Every factor below is transcribed from Table 1 of Jost 2023, read from the
 * published paper. `publications` is the number of LED proposals the review
 * found for that drug (0 = consensus-only).
 */
export const LED_ITEMS: LeddItem[] = [
  // Levodopa-containing products
  { id: 'ld-ir', name: 'Levodopa, immediate-release', group: LD, kind: 'factor', unit: 'mg levodopa/day', factor: 1, levodopaContaining: true, note: 'Enter the levodopa content only (carbidopa or benserazide combinations count by their levodopa dose).' },
  { id: 'ld-dr', name: 'Levodopa, dual-release (Madopar DR)', group: LD, kind: 'factor', unit: 'mg levodopa/day', factor: 0.85, publications: 0, levodopaContaining: true },
  { id: 'ld-cr', name: 'Levodopa, controlled-release', group: LD, kind: 'factor', unit: 'mg levodopa/day', factor: 0.75, publications: 27, levodopaContaining: true },
  { id: 'ld-er', name: 'Levodopa, extended-release capsule (IPX066, Rytary)', group: LD, kind: 'factor', unit: 'mg levodopa/day', factor: 0.5, publications: 1, levodopaContaining: true },
  {
    id: 'ld-lcig',
    name: 'Levodopa/carbidopa intestinal gel (LCIG)',
    group: LD,
    kind: 'factor',
    unit: 'mg levodopa/day',
    factor: 1.11,
    publications: 1,
    levodopaContaining: true,
    note: 'Total daily levodopa delivered: morning, maintenance and extra doses.',
  },

  // COMT inhibitors: ratio applied to the levodopa-containing LED
  { id: 'comt-ent', name: 'Entacapone', group: COMT, kind: 'comt', unit: 'mg/day', ratio: 0.33, publications: 10 },
  { id: 'comt-tol', name: 'Tolcapone', group: COMT, kind: 'comt', unit: 'mg/day', ratio: 0.5, publications: 7 },
  { id: 'comt-opi', name: 'Opicapone', group: COMT, kind: 'comt', unit: 'mg/day', ratio: 0.5, publications: 2 },

  // MAO-B inhibitors
  { id: 'sel-oral', name: 'Selegiline, oral', group: MAOB, kind: 'factor', unit: 'mg/day', factor: 10, publications: 9 },
  { id: 'sel-sl', name: 'Selegiline, sublingual', group: MAOB, kind: 'factor', unit: 'mg/day', factor: 80, publications: 3 },
  { id: 'rasagiline', name: 'Rasagiline', group: MAOB, kind: 'factor', unit: 'mg/day', factor: 100, publications: 6 },
  {
    id: 'safinamide',
    name: 'Safinamide (fixed LED)',
    group: MAOB,
    kind: 'fixed',
    unit: 'mg/day',
    fixedLed: 150,
    validDoses: [50, 100],
    publications: 1,
    note: 'Jost 2023 proposes one LED of 150 mg for both 50 and 100 mg/day. Schade 2020 had proposed 100 mg.',
  },

  // Non-ergot dopamine agonists
  { id: 'pramipexole-salt', name: 'Pramipexole as salt (IR or ER)', group: DA, kind: 'factor', unit: 'mg salt/day', factor: 100, publications: 23, note: 'Salt = dihydrochloride monohydrate, the basis used in US labelling.' },
  { id: 'pramipexole-base', name: 'Pramipexole as base (IR or ER)', group: DA, kind: 'factor', unit: 'mg base/day', factor: 142.86, publications: 23 },
  { id: 'ropinirole', name: 'Ropinirole (IR or ER)', group: DA, kind: 'factor', unit: 'mg/day', factor: 20, publications: 23 },
  { id: 'rotigotine', name: 'Rotigotine (transdermal)', group: DA, kind: 'factor', unit: 'mg/24 h', factor: 30.3, publications: 4 },
  { id: 'piribedil', name: 'Piribedil', group: DA, kind: 'factor', unit: 'mg/day', factor: 1, publications: 5 },
  { id: 'apo-sc', name: 'Apomorphine hydrochloride, subcutaneous', group: DA, kind: 'factor', unit: 'mg/day', factor: 10, publications: 13 },
  { id: 'apo-sl', name: 'Apomorphine hydrochloride, sublingual', group: DA, kind: 'factor', unit: 'mg/day', factor: 1.5, publications: 0 },

  // Ergot-derived dopamine agonists
  { id: 'lisuride', name: 'Lisuride', group: ERGOT, kind: 'factor', unit: 'mg/day', factor: 100, publications: 10 },
  { id: 'bromocriptine', name: 'Bromocriptine', group: ERGOT, kind: 'factor', unit: 'mg/day', factor: 10, publications: 29 },
  { id: 'pergolide', name: 'Pergolide', group: ERGOT, kind: 'factor', unit: 'mg/day', factor: 100, publications: 30 },
  { id: 'cabergoline', name: 'Cabergoline', group: ERGOT, kind: 'factor', unit: 'mg/day', factor: 66.67, publications: 12 },
  { id: 'dhec', name: 'Dihydroergocryptine (DHEC)', group: ERGOT, kind: 'factor', unit: 'mg/day', factor: 5, publications: 4 },

  // Others
  { id: 'amantadine-ir', name: 'Amantadine hydrochloride, immediate-release', group: OTHER, kind: 'factor', unit: 'mg amantadine HCl/day', factor: 1, publications: 6 },
  {
    id: 'anticholinergic',
    name: 'Trihexyphenidyl / other anticholinergic',
    group: OTHER,
    kind: 'perDose',
    unit: 'efficacious single doses/day',
    ledPerDose: 100,
    publications: 0,
    note: 'Jost 2023: apply only when a single dose improves UPDRS-III by at least 5 points. Each such dose counts as an LED of 100 mg (e.g. 3 doses a day → 300 mg).',
  },
  {
    id: 'istradefylline',
    name: 'Istradefylline',
    group: OTHER,
    kind: 'istradefylline',
    unit: 'mg/day',
    ratio: 0.2,
    publications: 0,
    note: 'Adds 20% of the levodopa + COMT LED once any dose is entered.',
  },
];

const ledd: LeddCalculator = {
  id: 'ledd',
  kind: 'ledd',
  title: 'LEDD calculator',
  summary: 'Sum a patient’s antiparkinsonian medication on one scale using the 2023 MDS-endorsed conversion formulae.',
  doseBasis: 'Daily dose of each agent, in the unit shown beside it.',
  refs: ['jost2023', 'schade2020', 'cilia2023', 'snineh2020', 'tomlinson2010'],
  items: LED_ITEMS,
  provenance: {
    tier: 'D',
    refs: ['jost2023'],
    locator:
      'Table 1 and legend: systematic review of 682 studies plus a GRADE-grid consensus process (N=27 panellists)',
  },
  callouts: [
    {
      kind: 'warning',
      text: 'Jost 2023 states that these formulae serve as a research tool to compare the equivalence of antiparkinsonian medication across study cohorts. They are not a validated rule for converting an individual patient’s therapy. Several factors rest on consensus or empirical approaches rather than direct measurement (Cilia 2023; Snineh 2020).',
    },
    {
      kind: 'note',
      text: 'Method: LED of levodopa-containing products first; a COMT inhibitor adds 33% (entacapone) or 50% (tolcapone, opicapone) of that levodopa LED; istradefylline adds 20% of the levodopa + COMT LED; all other agents are dose × factor. The paper proposes that entacapone and tolcapone raise the LED only for about 4 h and 8 h after each intake, whereas once-daily opicapone acts across the whole day; this calculator applies the ratio to the daily total, as in the tabulated formula.',
    },
    {
      kind: 'note',
      text: 'Not included because the source table’s dose basis is ambiguous, or its use is restricted: inhaled levodopa, subcutaneous foslevodopa/foscarbidopa, levodopa/carbidopa/entacapone gel (LECIG), extended-release amantadine products (Gocovri, Osmolex ER; salt versus base is not specified) and zonisamide (the paper says it should not be used outside Japan).',
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Dopamine-agonist equivalence derived from the same LED factors     */
/* ------------------------------------------------------------------ */

const DA_IDS = ['pramipexole-salt', 'pramipexole-base', 'ropinirole', 'rotigotine', 'bromocriptine', 'cabergoline', 'piribedil'];

const daItems: EquivItem[] = DA_IDS.map((id) => {
  const src = LED_ITEMS.find((i) => i.id === id);
  if (!src || src.factor === undefined) throw new Error(`LED item missing: ${id}`);
  return {
    id,
    name: src.name.replace(' (IR or ER)', '').replace(' (transdermal)', ''),
    group: src.group,
    // Amount of agent equal to an LED of 100 mg.
    equiv: pt(100 / src.factor),
    unit: src.unit.replace('/day', ''),
  };
});

const daEquivalence: EquivalenceConverter = {
  id: 'da-equivalence',
  kind: 'equivalence',
  title: 'Dopamine agonist equivalence',
  summary: 'Approximate equivalent doses between oral/transdermal dopamine agonists, derived from the LED factors.',
  doseBasis: 'Daily dose of the starting dopamine agonist.',
  referenceLabel: 'an LED of 100 mg',
  refs: ['jost2023', 'snineh2020', 'cilia2023'],
  items: daItems,
  provenance: {
    tier: 'D',
    refs: ['jost2023'],
    derived: true,
    locator: 'Table 1 LED factors; equivalent amount = 100 ÷ factor',
  },
  callouts: [
    {
      kind: 'warning',
      text: 'Derived arithmetically from LED factors that Jost 2023 intends as a research tool. In a real-world polytherapy analysis no reliable conversion factor could be identified for dopamine agonists (Snineh 2020). Individual response, tolerability and titration needs vary widely: use as an approximate starting point only.',
    },
    {
      kind: 'note',
      text: 'US labelling expresses pramipexole doses as the dihydrochloride monohydrate salt; the base values apply where strength is stated as base. Apomorphine, other ergot agonists and device-aided therapy conversions are not included.',
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Label-defined formulation switches                                  */
/* ------------------------------------------------------------------ */

const formulation: DirectedConverter = {
  id: 'pd-formulation',
  kind: 'directed',
  title: 'Formulation switches',
  summary: 'Immediate- → controlled/extended-release levodopa, ropinirole and pramipexole, and pramipexole salt ⇄ base.',
  doseBasis: 'Total daily dose of the current product.',
  refs: ['lbl-cdld-er', 'lbl-rytary', 'lbl-ropinirole-er', 'lbl-pramipexole-er', 'jost2023'],
  callouts: [
    {
      kind: 'warning',
      text: 'After any switch, reassess motor control and tolerability and adjust: each label notes that the dose may need to be changed.',
    },
  ],
  routes: [
    {
      id: 'cdld-ir-cr-pct',
      kind: 'factor',
      group: 'Carbidopa/levodopa',
      label: 'Carbidopa/levodopa immediate-release → controlled-release (levodopa dose)',
      fromUnit: 'mg levodopa/day',
      toUnit: 'mg levodopa/day',
      factor: { low: 1.1, high: 1.3 },
      provenance: {
        tier: 'A',
        refs: ['lbl-cdld-er'],
        locator: 'Dosage and Administration: substitute an amount providing about 10% more levodopa per day, up to 30% more depending on response',
      },
      callouts: [
        {
          kind: 'note',
          text: 'Dosing intervals for controlled-release should be 4 to 8 hours during the waking day. For patients on levodopa without a decarboxylase inhibitor, and for dosing ranges not shown in Table 3, follow the label.',
        },
      ],
    },
    {
      id: 'cdld-ir-cr-table',
      kind: 'table',
      group: 'Carbidopa/levodopa',
      label: 'Carbidopa/levodopa immediate-release → controlled-release (label Table 3 regimens)',
      fromUnit: 'mg levodopa/day',
      toUnit: 'suggested regimen',
      provenance: {
        tier: 'A',
        refs: ['lbl-cdld-er'],
        locator: 'Table 3: guidelines for initial conversion from carbidopa and levodopa to extended-release',
      },
      callouts: [],
      rows: [
        { from: [300, 400], to: '200 mg twice daily (total 400 mg levodopa/day)' },
        { from: [500, 600], to: '300 mg twice daily, or 200 mg three times daily (total 600 mg levodopa/day)' },
        { from: [700, 800], to: 'Total 800 mg/day in 3 or more divided doses (e.g. 300 mg a.m., 300 mg early p.m., 200 mg later p.m.)' },
        { from: [900, 1000], to: 'Total 1,000 mg/day in 3 or more divided doses (e.g. 400 mg a.m., 400 mg early p.m., 200 mg later p.m.)' },
      ],
      tableNote: 'Doses are mg of levodopa. For dosing ranges not shown in the table, see the label’s initial-dosage instructions.',
    },
    {
      id: 'cdld-ir-rytary',
      kind: 'table',
      group: 'Carbidopa/levodopa',
      label: 'Carbidopa/levodopa immediate-release → Rytary (extended-release capsules)',
      fromUnit: 'mg levodopa/day (IR)',
      toUnit: 'Rytary starting dose',
      provenance: {
        tier: 'A',
        refs: ['lbl-rytary'],
        locator: 'Dosage and Administration §2.3, Table 1',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'Rytary dosages are not interchangeable with other carbidopa-levodopa products on a 1:1 basis. For patients also taking a COMT inhibitor such as entacapone, the initial levodopa dose may need to be increased.',
        },
      ],
      rows: [
        { from: [400, 549], to: '855 mg levodopa/day: 3 capsules of 23.75 mg/95 mg per dose, three times daily' },
        { from: [550, 749], to: '1,140 mg levodopa/day: 4 capsules of 23.75 mg/95 mg per dose, three times daily' },
        { from: [750, 949], to: '1,305 mg levodopa/day: 3 capsules of 36.25 mg/145 mg per dose, three times daily' },
        { from: [950, 1249], to: '1,755 mg levodopa/day: 3 capsules of 48.75 mg/195 mg per dose, three times daily' },
        {
          from: [1250, 100000],
          fromLabel: '1,250 mg/day or more',
          to: '2,340 mg levodopa/day (4 capsules of 48.75 mg/195 mg per dose, three times daily) or 2,205 mg levodopa/day (3 capsules of 61.25 mg/245 mg per dose, three times daily)',
        },
      ],
      tableNote: 'The label reports capsule strengths as carbidopa/levodopa. Values shown are the label’s recommended starting dosages.',
    },
    {
      id: 'rop-ir-xl',
      kind: 'table',
      group: 'Ropinirole',
      label: 'Ropinirole immediate-release → extended-release',
      fromUnit: 'mg/day (IR)',
      toUnit: 'mg/day (ER)',
      provenance: {
        tier: 'A',
        refs: ['lbl-ropinirole-er'],
        locator: 'Dosage and Administration §2.3, Table 1',
      },
      callouts: [
        {
          kind: 'note',
          text: 'The initial ER dose should most closely match the IR total daily dose. An older (2011) Requip XL label grouped 15–18 mg as 16 mg; the current label version used here lists 15 mg → 16 mg and 18 mg → 18 mg. Confirm against your product’s label.',
        },
      ],
      rows: [
        { from: [0.75, 2.25], to: '2 mg/day' },
        { from: [3, 4.5], to: '4 mg/day' },
        { from: [6, 6], to: '6 mg/day' },
        { from: [7.5, 9], to: '8 mg/day' },
        { from: [12, 12], to: '12 mg/day' },
        { from: [15, 15], to: '16 mg/day' },
        { from: [18, 18], to: '18 mg/day' },
        { from: [21, 21], to: '20 mg/day' },
        { from: [24, 24], to: '24 mg/day' },
      ],
      tableNote: 'Following conversion the dose may be adjusted for therapeutic response and tolerability.',
    },
    {
      id: 'pra-ir-er',
      kind: 'factor',
      group: 'Pramipexole',
      label: 'Pramipexole immediate-release → extended-release',
      fromUnit: 'mg salt/day',
      toUnit: 'mg salt/day',
      factor: pt(1),
      provenance: {
        tier: 'A',
        refs: ['lbl-pramipexole-er'],
        locator: 'Dosage and Administration §2.3: switch overnight at the same daily dose',
      },
      callouts: [
        {
          kind: 'note',
          text: 'Patients with Parkinson’s disease may be switched overnight at the same daily dose; monitor to determine whether dose adjustment is needed. US labelling expresses doses as pramipexole dihydrochloride (salt).',
        },
      ],
    },
    {
      id: 'pra-salt-base',
      kind: 'factor',
      group: 'Pramipexole',
      label: 'Pramipexole: salt (dihydrochloride monohydrate) → base',
      reverseLabel: 'Pramipexole: base → salt (dihydrochloride monohydrate)',
      fromUnit: 'mg salt',
      toUnit: 'mg base',
      factor: pt(100 / 142.86),
      reversible: true,
      reverseStated: false,
      provenance: {
        tier: 'B',
        refs: ['jost2023', 'lbl-pramipexole-er'],
        derived: true,
        locator: 'Jost 2023 Table 1 lists LED factors of 100 per mg salt and 142.86 per mg base (ratio 0.70); US labelling states strengths as the salt',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'Confirm whether your product’s strength is stated as salt or base before converting: a mix-up changes the dose by about 30%.',
        },
      ],
    },
  ],
};

export const parkinson: Module = {
  id: 'parkinson',
  title: 'Parkinson’s disease',
  area: 'Movement disorders',
  summary: 'LEDD calculator (Jost 2023), dopamine-agonist equivalence, and label-defined formulation switches.',
  converters: [ledd, daEquivalence, formulation],
};
