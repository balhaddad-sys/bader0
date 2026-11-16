import type { EquivalenceConverter, Module } from '../../types';
import { pt, rng } from '../helpers';

/**
 * Botulinum toxin type A unit ratios. Reference: onabotulinumtoxinA 1 unit.
 * Ratios from the clinical literature review by Scaglione 2016. Every current
 * US label states that units are NOT interchangeable, which the app surfaces
 * prominently next to the numbers.
 */

const equivalence: EquivalenceConverter = {
  id: 'botulinum-ratio',
  kind: 'equivalence',
  title: 'Botulinum toxin A unit ratios',
  summary: 'Literature-based unit ratios for onabotulinumtoxinA, incobotulinumtoxinA and abobotulinumtoxinA.',
  doseBasis: 'Dose in units of the starting product.',
  referenceLabel: 'onabotulinumtoxinA 1 unit',
  refs: ['scaglione2016', 'lbl-botox', 'lbl-dysport', 'lbl-xeomin', 'lbl-myobloc', 'lbl-daxxify'],
  items: [
    {
      id: 'ona',
      name: 'onabotulinumtoxinA (Botox)',
      group: 'Botulinum toxin type A',
      equiv: pt(1),
      unit: 'units',
      note: 'Reference product.',
    },
    {
      id: 'inco',
      name: 'incobotulinumtoxinA (Xeomin)',
      group: 'Botulinum toxin type A',
      equiv: rng(1, 1.2, 1),
      unit: 'units',
      note: 'Clinical conversion ratio of 1:1 (or 1:1.2) with onabotulinumtoxinA was equally effective with a comparable adverse-event profile.',
    },
    {
      id: 'abo',
      name: 'abobotulinumtoxinA (Dysport)',
      group: 'Botulinum toxin type A',
      equiv: rng(2, 3),
      unit: 'units',
      note: 'Studies support 1:3 or lower; 1:4 or higher, adopted empirically before clinical data were available, is considered too high.',
    },
  ],
  provenance: {
    tier: 'C',
    refs: ['scaglione2016'],
    locator:
      'Review of clinical studies: onabotulinumtoxinA:incobotulinumtoxinA ≈ 1:1 to 1:1.2; onabotulinumtoxinA:abobotulinumtoxinA 1:3 or lower (reported range 1:1 to 1:11)',
  },
  callouts: [
    {
      kind: 'warning',
      text: 'The prescribing information for BOTOX, DYSPORT, XEOMIN, MYOBLOC and DAXXIFY each states that its units are not interchangeable with other botulinum toxin products and cannot be compared to or converted into units of any other product. The ratios here come from published clinical experience, not from labelling.',
    },
    {
      kind: 'warning',
      text: 'The review notes that comparability was established by indirect methods and that clinical trials are needed to define the exact ratio. Ratios above 1:3 (onabotulinumtoxinA:abobotulinumtoxinA) were associated with greater efficacy but more adverse events, consistent with abobotulinumtoxinA overdose.',
    },
    {
      kind: 'note',
      text: 'Dosing is individualised by muscle, indication and prior response. Use the range as a starting reference only. rimabotulinumtoxinB (Myobloc), daxibotulinumtoxinA (Daxxify) and other products are not included: the sources reviewed support no ratio for them.',
    },
  ],
};

export const botulinum: Module = {
  id: 'botulinum',
  title: 'Botulinum toxins',
  area: 'Movement disorders · Spasticity',
  summary: 'Unit ratios from the clinical literature, shown beside the labels’ non-interchangeability warning.',
  converters: [equivalence],
};
