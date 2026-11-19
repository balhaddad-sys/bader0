import type { DirectedConverter, Module } from '../../types';
import { pt } from '../helpers';

/** Subcutaneous immunoglobulin for CIDP, from the HyQvia and Hizentra labels. */

const cidp: DirectedConverter = {
  id: 'cidp-scig',
  kind: 'directed',
  title: 'IVIG → subcutaneous (CIDP)',
  summary: 'Starting doses when moving a patient with CIDP from intravenous to subcutaneous immunoglobulin.',
  doseBasis: 'The previous IVIG dose (g), or the body weight (kg).',
  inputLabel: 'Your number',
  refs: ['lbl-hyqvia', 'lbl-hizentra'],
  callouts: [
    {
      kind: 'warning',
      text: 'These are the starting doses in the CIDP sections of the labels. The Hizentra factor of 1.37 applied to a previous IVIG dose is for primary immunodeficiency only, so it is not used here. Adjust to clinical response.',
    },
  ],
  routes: [
    {
      id: 'hyqvia-cidp',
      kind: 'factor',
      group: 'HyQvia',
      label: 'HyQvia: IVIG dose → HyQvia dose (same dose and frequency)',
      fromUnit: 'g per dose (previous IVIG)',
      toUnit: 'g per dose (HyQvia)',
      factor: pt(1),
      provenance: {
        tier: 'A',
        refs: ['lbl-hyqvia'],
        locator: 'Dosage and Administration §2.1, CIDP: "The starting dose and dosing frequency of HYQVIA is the same as the patient’s previous IGIV treatment"',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'The patient must be on stable doses of IGIV. The label states that the typical dosing interval in the clinical trial was 2 to 4 weeks.',
        },
      ],
    },
    {
      id: 'hizentra-cidp-02',
      kind: 'factor',
      group: 'Hizentra',
      label: 'Hizentra: recommended weekly dose (0.2 g/kg)',
      fromUnit: 'kg body weight',
      toUnit: 'g per week',
      factor: pt(0.2),
      provenance: {
        tier: 'A',
        refs: ['lbl-hizentra'],
        locator: 'Dosage and Administration §2.2, CIDP: recommended subcutaneous dose 0.2 g/kg (1 mL/kg) body weight per week',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'Start 1 week after the last IGIV infusion. 0.2 g/kg is 1 mL/kg of the 20% liquid, once a week. If CIDP symptoms worsen, the label says to consider 0.4 g/kg a week.',
        },
      ],
    },
    {
      id: 'hizentra-cidp-04',
      kind: 'factor',
      group: 'Hizentra',
      label: 'Hizentra: higher weekly dose (0.4 g/kg)',
      fromUnit: 'kg body weight',
      toUnit: 'g per week',
      factor: pt(0.4),
      provenance: {
        tier: 'A',
        refs: ['lbl-hizentra'],
        locator: 'Dosage and Administration §2.2, CIDP: 0.4 g/kg (2 mL/kg) per week was also safe and effective in the clinical study',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'For patients whose symptoms worsen on 0.2 g/kg a week. If CIDP symptoms worsen on 0.4 g/kg a week, the label says to consider re-initiating IGIV and stopping Hizentra.',
        },
      ],
    },
  ],
};

export const immunoglobulin: Module = {
  id: 'immunoglobulin',
  title: 'Immunoglobulin (CIDP)',
  area: 'Neuroimmunology',
  summary: 'Starting doses for subcutaneous immunoglobulin in CIDP, from the HyQvia and Hizentra labels.',
  converters: [cidp],
};
