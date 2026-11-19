import type { DirectedConverter, Module } from '../../types';

/** Pregabalin immediate-release → extended-release, from the Lyrica CR label, with the gabapentin substitution warnings. */

const switches: DirectedConverter = {
  id: 'pregabalin-switch',
  kind: 'directed',
  title: 'Pregabalin switch',
  summary: 'Lyrica capsules or solution → Lyrica CR, using the label table.',
  doseBasis: 'Total daily dose of Lyrica capsules or oral solution (mg/day).',
  refs: ['lbl-lyrica-cr', 'lbl-gralise', 'lbl-horizant'],
  callouts: [
    {
      kind: 'warning',
      text: 'Gabapentin products are not interchangeable: the Gralise and Horizant labels each state they are not substitutable with other gabapentin products. No gabapentin ⇄ pregabalin ratio is given here: no label defines one and no validated ratio was found.',
    },
    {
      kind: 'note',
      text: 'Lyrica CR is not recommended with creatinine clearance below 30 mL/min or in haemodialysis; those patients should receive Lyrica. Check the maximum dose for the indication in the label.',
    },
  ],
  routes: [
    {
      id: 'pgb-ir-cr',
      kind: 'table',
      group: 'Pregabalin',
      label: 'Pregabalin: Lyrica capsules or solution → Lyrica CR',
      fromUnit: 'mg/day (Lyrica, 2 or 3 doses)',
      toUnit: 'Lyrica CR once daily',
      provenance: {
        tier: 'A',
        refs: ['lbl-lyrica-cr'],
        locator: 'Dosage and Administration §2.4, Table 1 (conversion from Lyrica capsules or oral solution to Lyrica CR)',
      },
      callouts: [
        {
          kind: 'note',
          text: 'On the day of the switch, take the morning dose of Lyrica as prescribed and start Lyrica CR after an evening meal.',
        },
      ],
      rows: [
        { from: [75, 75], to: '82.5 mg once daily' },
        { from: [150, 150], to: '165 mg once daily' },
        { from: [225, 225], to: '247.5 mg once daily (3 × 82.5 mg tablets)' },
        { from: [300, 300], to: '330 mg once daily' },
        { from: [450, 450], to: '495 mg once daily (3 × 165 mg tablets)' },
        { from: [600, 600], to: '660 mg once daily (2 × 330 mg tablets)' },
      ],
      tableNote: 'Only these total daily doses are listed in the label. Do not interpolate.',
    },
  ],
};

export const gabapentinoids: Module = {
  id: 'gabapentinoids',
  title: 'Pregabalin',
  area: 'Neuropathic pain',
  summary: 'Lyrica to Lyrica CR table, with the gabapentin substitution warnings.',
  converters: [switches],
};
