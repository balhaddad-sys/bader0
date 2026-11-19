import type { DirectedConverter, FactorRoute, FormulaCalculator, Module } from '../../types';
import { pt } from '../helpers';

/**
 * Antiseizure drug concentrations: mass ⇄ molar units, and the phenytoin albumin correction.
 *
 * Unit conversion is arithmetic on molecular weight: µmol/L = µg/mL × 1000 ÷ MW.
 * Molecular weights are those of the analyte a laboratory reports, taken from PubChem and
 * checked against the FDA label wherever a label states one (levetiracetam 170.21,
 * lamotrigine 256.09, carbamazepine 236.27, lacosamide 250.30, brivaracetam 212.29,
 * topiramate 339.4, zonisamide 212.23, clobazam 300.7, gabapentin 171.24, pregabalin 159.23).
 */

interface LevelDrug {
  id: string;
  name: string;
  mw: number;
  note?: string;
}

const DRUGS: LevelDrug[] = [
  { id: 'vpa', name: 'Valproic acid', mw: 144.21, note: 'Valproate is reported as valproic acid (not the sodium salt, MW 166.2).' },
  { id: 'pht', name: 'Phenytoin', mw: 252.27, note: 'The same factor applies to total and to free (unbound) concentrations.' },
  { id: 'cbz', name: 'Carbamazepine', mw: 236.27 },
  { id: 'cbze', name: 'Carbamazepine-10,11-epoxide', mw: 252.27 },
  { id: 'pb', name: 'Phenobarbital', mw: 232.23 },
  { id: 'prm', name: 'Primidone', mw: 218.25 },
  { id: 'ltg', name: 'Lamotrigine', mw: 256.09 },
  { id: 'lev', name: 'Levetiracetam', mw: 170.21 },
  { id: 'mhd', name: 'Oxcarbazepine or eslicarbazepine (as MHD, licarbazepine)', mw: 254.28, note: 'Reported as the monohydroxy derivative (MHD, licarbazepine), not the parent drug.' },
  { id: 'tpm', name: 'Topiramate', mw: 339.36 },
  { id: 'zns', name: 'Zonisamide', mw: 212.23 },
  { id: 'lcm', name: 'Lacosamide', mw: 250.29 },
  { id: 'brv', name: 'Brivaracetam', mw: 212.29 },
  { id: 'gbp', name: 'Gabapentin', mw: 171.24 },
  { id: 'pgb', name: 'Pregabalin', mw: 159.23 },
  { id: 'clb', name: 'Clobazam', mw: 300.74 },
  { id: 'nclb', name: 'N-desmethylclobazam', mw: 286.71 },
  { id: 'cnz', name: 'Clonazepam', mw: 315.71 },
  { id: 'esm', name: 'Ethosuximide', mw: 141.17 },
  { id: 'rfn', name: 'Rufinamide', mw: 238.19 },
  { id: 'per', name: 'Perampanel', mw: 349.4 },
];

const routes: FactorRoute[] = DRUGS.map((d) => ({
  id: `${d.id}-units`,
  kind: 'factor',
  group: d.name,
  label: `${d.name}: µg/mL → µmol/L`,
  reverseLabel: `${d.name}: µmol/L → µg/mL`,
  fromUnit: 'µg/mL (= mg/L)',
  toUnit: 'µmol/L',
  factor: pt(1000 / d.mw),
  reversible: true,
  reverseStated: true,
  provenance: {
    tier: 'B',
    refs: ['pubchem', 'patsalos2008', 'patsalos2018'],
    derived: true,
    locator: `µmol/L = µg/mL × 1000 ÷ ${d.mw} (molecular weight of the analyte, PubChem; agrees with the FDA label where one states it)`,
  },
  callouts: d.note ? [{ kind: 'note', text: d.note }] : [],
}));

const units: DirectedConverter = {
  id: 'level-units',
  kind: 'directed',
  title: 'Level units',
  summary: 'Convert a drug concentration between µg/mL (= mg/L) and µmol/L.',
  doseBasis: 'The concentration your laboratory reported.',
  inputLabel: 'Your level',
  refs: ['pubchem', 'patsalos2008', 'patsalos2018'],
  callouts: [
    {
      kind: 'warning',
      text: 'Convert the substance the laboratory actually measured: the parent drug or an active metabolite (carbamazepine-10,11-epoxide, MHD, N-desmethylclobazam), and total or free concentration. µg/mL and mg/L are the same unit.',
    },
    {
      kind: 'note',
      text: 'This converts units only; it does not say whether a level is in range. The ILAE guidance is that concentrations should be measured with a clear indication and interpreted critically, taking into account the whole clinical context.',
    },
  ],
  routes,
};

const phenytoinAlbumin: FormulaCalculator = {
  id: 'phenytoin-albumin',
  kind: 'formula',
  formulaId: 'sheiner-tozer',
  title: 'Phenytoin: low-albumin correction',
  summary: 'Sheiner–Tozer estimate of the total phenytoin concentration expected at normal albumin. Use with the cautions below.',
  doseBasis: 'Enter the measured total phenytoin and the serum albumin.',
  inputLabel: 'Your values',
  refs: ['kiang2016', 'kane2013', 'buckley2016'],
  inputs: [
    { id: 'observed', label: 'Measured total phenytoin', unit: 'µg/mL', hint: 'Same as mg/L. Convert µmol/L first if needed.' },
    { id: 'albumin', label: 'Serum albumin', unit: 'g/dL', hint: 'For g/L, divide by 10 (25 g/L = 2.5 g/dL).' },
  ],
  provenance: {
    tier: 'D',
    refs: ['kiang2016', 'kane2013', 'buckley2016'],
    locator: 'Sheiner-Tozer equation as stated in Kiang & Ensom 2016: corrected = observed ÷ [(0.2 × albumin) + 0.1]; performance data from Kiang 2016, Kane 2013 and Buckley 2016',
  },
  callouts: [
    {
      kind: 'warning',
      text: 'Treat this as a rough guide, not a substitute for a measured free phenytoin level. A 2016 review found the Sheiner–Tozer equation biased and imprecise in critical-care, head-trauma and general-neurology patients.',
    },
    {
      kind: 'warning',
      text: 'In 140 neurointensive-care patients the related Winter–Tozer equation underpredicted unbound phenytoin, with a prediction error above 50% in 32.1% of the validation cohort. In 238 ICU patients, adjusted levels correlated with free levels (r = 0.82) but agreed on interpretation only 77% of the time and more often overestimated the free level.',
    },
    {
      kind: 'note',
      text: 'Revised equations with different albumin coefficients improved accuracy in intensive-care and elderly patients but still need validation (Kiang 2016). Renal function, age, other medicines and the assay temperature all affect the result.',
    },
  ],
};

export const levels: Module = {
  id: 'levels',
  title: 'Drug levels',
  area: 'Epilepsy · Monitoring',
  summary: 'Convert antiseizure drug concentrations between µg/mL and µmol/L, and estimate a low-albumin phenytoin correction.',
  converters: [units, phenytoinAlbumin],
};
