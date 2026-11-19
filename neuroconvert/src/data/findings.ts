import type { Finding } from '../types';

/**
 * What the cross-checking research found, and what was deliberately left out.
 * Shown on the Methods page; every reference id must exist in the registry
 * (enforced by tests/data-integrity.test.ts).
 */

export const FINDINGS: Finding[] = [
  {
    title: 'Benzodiazepine equivalents disagree by a factor of two',
    text: 'Ashton puts lorazepam 1 mg and alprazolam 0.5 mg at diazepam 10 mg. The 2025 joint clinical practice guideline puts lorazepam 2 mg and alprazolam 1 mg there. Both give clonazepam 0.5 mg. Where the sources differ the app now shows a range (for example lorazepam 2 mg → diazepam 10–20 mg). The guideline adds that unlike opioids no precise conversion strategy exists, that the equivalents came from patient-reported experience, and that switches are better made over 1–2 weeks.',
    refs: ['ashton2007', 'brunner2025'],
  },
  {
    title: 'The phenytoin albumin correction performs poorly where it is used most',
    text: 'The Sheiner–Tozer formula is simple and widely used, but a 2016 review found it biased and imprecise in critical-care, head-trauma and general-neurology patients. In a neurointensive-care cohort the related Winter–Tozer equation underpredicted unbound phenytoin, and in ICU patients the adjusted level agreed with the free level on interpretation only 77% of the time. It is offered with those cautions, and a measured free level is preferred.',
    refs: ['kiang2016', 'kane2013', 'buckley2016'],
  },
  {
    title: 'Botulinum toxin ratios are supported by trials but sit against the labels',
    text: 'Randomised trials in cervical dystonia found abobotulinumtoxinA at 3× the onabotulinumtoxinA units equivalent (n=73) and 2.5× non-inferior (n=103), while 1:3 and 1:4 were more potent with more adverse events (n=54); incobotulinumtoxinA was non-inferior at the same units (n=463). Every current US label nevertheless states that its units cannot be converted to another product’s. The app shows both.',
    refs: ['scaglione2016', 'odergren1998', 'ranoux2002', 'yun2015', 'benecke2005', 'lbl-botox'],
  },
  {
    title: 'The foslevodopa dose basis in the LED table is confirmed by its label',
    text: 'Jost 2023 gives foslevodopa/foscarbidopa as dose × 0.75. The Vyalev label converts oral levodopa to foslevodopa × 1.3, whose inverse is 0.77, so the table’s dose is the foslevodopa component. Foslevodopa is therefore included in the LEDD calculator.',
    refs: ['jost2023', 'lbl-vyalev'],
  },
  {
    title: 'IV carbamazepine could not be verified in a current label',
    text: 'The 70% figure comes from a published review of the labelling and a pharmacokinetic study (oral bioavailability 0.78 measured with stable-labelled IV carbamazepine). The product is not listed in DailyMed, so it is marked as pharmacokinetic evidence, not label evidence.',
    refs: ['vickery2018', 'marino2012'],
  },
  {
    title: 'Label tables change between versions',
    text: 'The current ropinirole extended-release label maps 15 mg to 16 mg and 18 mg to 18 mg, whereas a 2011 label grouped 15–18 mg as 16 mg. Always check the label for the product in front of you.',
    refs: ['lbl-ropinirole-er'],
  },
];

export const OMISSIONS: Finding[] = [
  {
    title: 'Dose equivalence between different antiseizure drugs',
    text: 'Different antiseizure drugs differ in mechanism, spectrum and dose–response, so no dose equivalence between them is established. Moving from one drug to another is done by supervised cross-titration, not arithmetic.',
    refs: [],
  },
  {
    title: 'Status epilepticus and weight-based loading doses',
    text: 'Dosing rather than conversion; follow current guidelines and labelling.',
    refs: [],
  },
  {
    title: 'Pyridostigmine and neostigmine route or agent equivalence',
    text: 'No reliable conversion was found. A small pharmacokinetic study measured oral bioavailability of pyridostigmine at 7.6 ± 2.4% (two intravenous and five oral subjects), which would put 120 mg by mouth at roughly 9 mg intravenously, and steady-state plasma levels differed more than seven-fold between myasthenic patients on about the same daily dose. A commonly quoted clinical ratio could not be verified, and the pyridostigmine injection label reviewed concerns reversal of neuromuscular block, not myasthenia gravis dosing.',
    refs: ['aquilonius1980'],
  },
  {
    title: 'Gabapentin ⇄ pregabalin',
    text: 'No label defines a conversion and no validated ratio was found in PubMed. The Gralise and Horizant labels state they are not substitutable with other gabapentin products.',
    refs: ['lbl-gralise', 'lbl-horizant'],
  },
  {
    title: 'Primidone → phenobarbital',
    text: 'The Mysoline label gives no equivalence (it describes primidone and its metabolites phenobarbital and PEMA as all active), and no verifiable dose-equivalence ratio was located.',
    refs: ['lbl-mysoline'],
  },
  {
    title: 'Dimethyl fumarate ⇄ diroximel fumarate',
    text: 'A review states that monomethyl fumarate levels with diroximel fumarate are bioequivalent to dimethyl fumarate, but no source reviewed gives the milligram pairing, and the label says only that Vumerity may be started the day after stopping dimethyl fumarate.',
    refs: ['jonasson2020', 'lbl-vumerity'],
  },
  {
    title: 'Ocrelizumab intravenous ⇄ subcutaneous',
    text: 'The Ocrevus Zunovo label states that it has different dosage and administration instructions than intravenous ocrelizumab, so no dose conversion applies.',
    refs: ['lbl-ocrevus-zunovo'],
  },
  {
    title: 'Equivalence between donepezil, galantamine, rivastigmine and memantine',
    text: 'None of the sources reviewed defines one.',
    refs: [],
  },
  {
    title: 'rimabotulinumtoxinB, daxibotulinumtoxinA and other botulinum products',
    text: 'The sources reviewed support no unit ratio for them, and their labels state their units cannot be converted.',
    refs: ['lbl-myobloc', 'lbl-daxxify'],
  },
  {
    title: 'Reference (therapeutic) ranges for drug levels',
    text: 'The ILAE monitoring reviews could not be read in full in this version, so ranges were not verified from the primary source. Only unit conversion is offered.',
    refs: ['patsalos2008', 'patsalos2018'],
  },
  {
    title: 'Immunoglobulin in primary immunodeficiency',
    text: 'The Hizentra factor of 1.37 applied to a previous IVIG dose is for primary immunodeficiency, not CIDP, so it is not offered.',
    refs: ['lbl-hizentra'],
  },
  {
    title: 'Opioids and intrathecal baclofen',
    text: 'Not evaluated in this version.',
    refs: [],
  },
  {
    title: 'Inhaled levodopa, levodopa/carbidopa/entacapone gel, extended-release amantadine, zonisamide (LEDD)',
    text: 'Excluded from the LEDD calculator because the source table’s dose basis is ambiguous or its use is restricted (see the LEDD note).',
    refs: ['jost2023'],
  },
  {
    title: 'Paediatric, renal, hepatic, pregnancy and interaction adjustments',
    text: 'Not applied to any conversion. Check the label for the population in front of you.',
    refs: [],
  },
];
