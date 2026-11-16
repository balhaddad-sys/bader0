import type { DirectedConverter, Module } from '../../types';

/** Cognitive-agent switches taken directly from FDA prescribing information. */

const switches: DirectedConverter = {
  id: 'dementia-switch',
  kind: 'directed',
  title: 'Formulation switches',
  summary: 'Oral → transdermal rivastigmine and immediate- → extended-release memantine, as stated in the labels.',
  doseBasis: 'Total daily dose of the current oral product (mg/day).',
  refs: ['lbl-exelon', 'lbl-namenda-xr'],
  callouts: [
    {
      kind: 'note',
      text: 'No equivalence between donepezil, galantamine, rivastigmine and memantine is provided: none of the sources reviewed defines one.',
    },
  ],
  routes: [
    {
      id: 'riva-oral-patch',
      kind: 'table',
      group: 'Rivastigmine',
      label: 'Rivastigmine: oral (capsule/solution) → transdermal patch',
      fromUnit: 'mg/day (total oral daily dose)',
      toUnit: 'patch strength',
      provenance: {
        tier: 'A',
        refs: ['lbl-exelon'],
        locator: 'Dosage and Administration §2.3 (switching to EXELON PATCH from capsules or oral solution)',
      },
      callouts: [
        {
          kind: 'note',
          text: 'Apply the first patch on the day after the last oral dose. If treatment is interrupted for more than 3 days because of intolerance, restart with the 4.6 mg/24 h patch to reduce the risk of severe vomiting.',
        },
      ],
      rows: [
        { from: [0.001, 5.999], fromLabel: 'less than 6 mg/day', to: '4.6 mg/24 h patch' },
        { from: [6, 12], fromLabel: '6 to 12 mg/day', to: '9.5 mg/24 h patch' },
      ],
      tableNote: 'The label defines no conversion above 12 mg/day of oral rivastigmine.',
    },
    {
      id: 'mem-ir-xr',
      kind: 'table',
      group: 'Memantine',
      label: 'Memantine: immediate-release → extended-release (Namenda XR)',
      fromUnit: 'mg/day (IR total daily dose)',
      toUnit: 'XR once-daily dose',
      provenance: {
        tier: 'A',
        refs: ['lbl-namenda-xr'],
        locator: 'Dosage and Administration §2.2 (switching from NAMENDA to NAMENDA XR)',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'The label states that there is no study addressing the comparative efficacy of the two regimens. Start XR on the day after the last immediate-release dose.',
        },
      ],
      rows: [
        {
          from: [10, 10],
          fromLabel: '10 mg/day (5 mg twice daily) — severe renal impairment',
          to: '14 mg once daily (extended-release capsule)',
          note: 'Label recommendation for patients with severe renal impairment.',
        },
        { from: [20, 20], fromLabel: '20 mg/day (10 mg twice daily)', to: '28 mg once daily (extended-release capsule)' },
      ],
      tableNote: 'Only these two regimens are defined in the label. This repackaged label version is dated 2018; confirm against your current product information.',
    },
  ],
};

export const dementia: Module = {
  id: 'dementia',
  title: 'Dementia agents',
  area: 'Cognitive neurology',
  summary: 'Label-defined switches for rivastigmine and memantine.',
  converters: [switches],
};
