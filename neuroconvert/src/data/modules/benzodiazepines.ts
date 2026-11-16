import type { EquivalenceConverter, EquivItem, Module } from '../../types';
import { pt, rng } from '../helpers';

/**
 * Benzodiazepine equivalence – oral doses approximately equivalent to
 * diazepam 10 mg. Source: Ashton benzodiazepine equivalence table (rev. April
 * 2007). Values and half-lives transcribed from the table as published.
 */

const EPILEPSY = 'Commonly used in epilepsy care';
const ANXIO = 'Marketed as anxiolytics';
const HYPNO = 'Marketed as hypnotics';

const items: EquivItem[] = [
  { id: 'clobazam', name: 'Clobazam', group: EPILEPSY, equiv: pt(20), unit: 'mg', note: 'Half-life 12–60 h.' },
  { id: 'clonazepam', name: 'Clonazepam', group: EPILEPSY, equiv: pt(0.5), unit: 'mg', note: 'Half-life 18–50 h.' },
  { id: 'diazepam', name: 'Diazepam', group: EPILEPSY, equiv: pt(10), unit: 'mg', note: 'Half-life 20–100 h; active metabolite 36–200 h.' },
  { id: 'lorazepam', name: 'Lorazepam', group: EPILEPSY, equiv: pt(1), unit: 'mg', note: 'Half-life 10–20 h.' },

  { id: 'alprazolam', name: 'Alprazolam', group: ANXIO, equiv: pt(0.5), unit: 'mg', note: 'Half-life 6–12 h.' },
  { id: 'bromazepam', name: 'Bromazepam', group: ANXIO, equiv: rng(5, 6), unit: 'mg', note: 'Half-life 10–20 h.' },
  { id: 'chlordiazepoxide', name: 'Chlordiazepoxide', group: ANXIO, equiv: pt(25), unit: 'mg', note: 'Half-life 5–30 h; active metabolite 36–200 h.' },
  { id: 'clorazepate', name: 'Clorazepate', group: ANXIO, equiv: pt(15), unit: 'mg', note: 'Active metabolite half-life 36–200 h.' },
  { id: 'halazepam', name: 'Halazepam', group: ANXIO, equiv: pt(20), unit: 'mg', note: 'Active metabolite half-life 30–100 h.' },
  { id: 'ketazolam', name: 'Ketazolam', group: ANXIO, equiv: rng(15, 30), unit: 'mg', note: 'Half-life 30–100 h; active metabolite 36–200 h.' },
  { id: 'medazepam', name: 'Medazepam', group: ANXIO, equiv: pt(10), unit: 'mg', note: 'Half-life 36–200 h.' },
  { id: 'nordazepam', name: 'Nordazepam', group: ANXIO, equiv: pt(10), unit: 'mg', note: 'Half-life 36–200 h.' },
  { id: 'oxazepam', name: 'Oxazepam', group: ANXIO, equiv: pt(20), unit: 'mg', note: 'Half-life 4–15 h.' },
  { id: 'prazepam', name: 'Prazepam', group: ANXIO, equiv: rng(10, 20), unit: 'mg', note: 'Active metabolite half-life 36–200 h.' },

  { id: 'estazolam', name: 'Estazolam', group: HYPNO, equiv: rng(1, 2), unit: 'mg', note: 'Half-life 10–24 h.' },
  { id: 'flunitrazepam', name: 'Flunitrazepam', group: HYPNO, equiv: pt(1), unit: 'mg', note: 'Half-life 18–26 h; active metabolite 36–200 h.' },
  { id: 'flurazepam', name: 'Flurazepam', group: HYPNO, equiv: rng(15, 30), unit: 'mg', note: 'Active metabolite half-life 40–250 h.' },
  { id: 'loprazolam', name: 'Loprazolam', group: HYPNO, equiv: rng(1, 2), unit: 'mg', note: 'Half-life 6–12 h.' },
  { id: 'lormetazepam', name: 'Lormetazepam', group: HYPNO, equiv: rng(1, 2), unit: 'mg', note: 'Half-life 10–12 h.' },
  { id: 'nitrazepam', name: 'Nitrazepam', group: HYPNO, equiv: pt(10), unit: 'mg', note: 'Half-life 15–38 h.' },
  { id: 'quazepam', name: 'Quazepam', group: HYPNO, equiv: pt(20), unit: 'mg', note: 'Half-life 25–100 h.' },
  { id: 'temazepam', name: 'Temazepam', group: HYPNO, equiv: pt(20), unit: 'mg', note: 'Half-life 8–22 h.' },
  { id: 'triazolam', name: 'Triazolam', group: HYPNO, equiv: pt(0.5), unit: 'mg', note: 'Half-life about 2 h.' },
];

const equivalence: EquivalenceConverter = {
  id: 'benzo-equivalence',
  kind: 'equivalence',
  title: 'Benzodiazepine equivalence (oral)',
  summary: 'Approximate oral doses equivalent to diazepam 10 mg, e.g. when switching agent or building a taper.',
  doseBasis: 'Oral daily dose (mg) of the starting benzodiazepine.',
  referenceLabel: 'diazepam 10 mg',
  refs: ['ashton2007'],
  items,
  provenance: {
    tier: 'D',
    refs: ['ashton2007'],
    locator: 'Benzodiazepine Equivalence Table, revised April 2007: "Approximately equivalent oral dosages (mg)"',
  },
  callouts: [
    {
      kind: 'warning',
      text: 'The source states: “These equivalents do not agree with those used by some authors. They are firmly based on clinical experience during switch-over to diazepam at start of withdrawal programs but may vary between individuals.” Treat results as an approximate starting point, not a validated potency ratio.',
    },
    {
      kind: 'warning',
      text: 'The equivalents come from benzodiazepine switch-overs and withdrawal programmes. The source does not address antiseizure potency, so do not use them to choose doses for seizure control or in status epilepticus.',
    },
    {
      kind: 'note',
      text: 'Oral doses only. Intravenous, rectal and intranasal routes and midazolam are not covered. Several agents have long-acting active metabolites (see the half-life note on each agent).',
    },
  ],
};

export const benzodiazepines: Module = {
  id: 'benzodiazepines',
  title: 'Benzodiazepines',
  area: 'Epilepsy · Sleep · Withdrawal',
  summary: 'Approximate oral equivalents relative to diazepam 10 mg, from the Ashton table.',
  converters: [equivalence],
};
