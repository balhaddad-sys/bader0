import type { DirectedConverter, Module } from '../../types';
import { pt, rng } from '../helpers';

/**
 * Antiseizure medications.
 *
 * There is no "equivalent dose" between different antiseizure drugs, so this
 * module only converts the SAME drug between routes or formulations — and only
 * where a prescribing-information statement or pharmacokinetic study supports it.
 */

const ivOral: DirectedConverter = {
  id: 'asm-iv-oral',
  kind: 'directed',
  title: 'IV ⇄ oral',
  summary: 'Most switch at the same dose. Exceptions: carbamazepine IV is 70% of the oral dose, and fosphenytoin is dosed in phenytoin equivalents (PE).',
  doseBasis: 'Total daily dose, mg/day.',
  refs: ['lbl-keppra-iv', 'lbl-vimpat', 'lbl-briviact', 'lbl-valproate-iv', 'lbl-cerebyx'],
  callouts: [
    {
      kind: 'warning',
      text: 'These conversions apply to the same drug only. They are not equivalences between different antiseizure drugs, which do not exist.',
    },
    {
      kind: 'note',
      text: 'Keep the dosing frequency stated in each source. IV use is intended as a temporary alternative when oral administration is not feasible.',
    },
  ],
  routes: [
    {
      id: 'lev-oral-iv',
      kind: 'factor',
      group: 'Levetiracetam',
      label: 'Levetiracetam: oral → IV',
      reverseLabel: 'Levetiracetam: IV → oral',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: pt(1),
      reversible: true,
      reverseStated: true,
      provenance: {
        tier: 'A',
        refs: ['lbl-keppra-iv'],
        locator: 'Dosage and Administration §2.4–2.5 (switching to/from oral dosing); §12.3',
      },
      callouts: [
        {
          kind: 'note',
          text: 'The initial total daily IV dosage should equal the total daily dosage and frequency of the oral regimen. Equivalent doses give equivalent Cmax, Cmin and total exposure when the IV dose is given as a 15-minute infusion.',
        },
      ],
    },
    {
      id: 'lac-oral-iv',
      kind: 'factor',
      group: 'Lacosamide',
      label: 'Lacosamide: oral → IV',
      reverseLabel: 'Lacosamide: IV → oral',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: pt(1),
      reversible: true,
      reverseStated: true,
      provenance: {
        tier: 'A',
        refs: ['lbl-vimpat'],
        locator: 'Dosage and Administration: "Oral and intravenous dosages are the same unless specified"',
      },
      callouts: [
        {
          kind: 'note',
          text: 'The recommended infusion duration is 30 to 60 minutes (as rapid as 15 minutes can be given to adults if required). The label recommends an ECG before initiation in certain patients, and IV lacosamide is for use only when oral administration is temporarily not feasible.',
        },
      ],
    },
    {
      id: 'briv-oral-iv',
      kind: 'factor',
      group: 'Brivaracetam',
      label: 'Brivaracetam: oral → IV',
      reverseLabel: 'Brivaracetam: IV → oral',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: pt(1),
      reversible: true,
      reverseStated: true,
      provenance: {
        tier: 'A',
        refs: ['lbl-briviact'],
        locator: 'Dosage and Administration; Clinical Pharmacology: tablets, oral solution and injection "can be used interchangeably"',
      },
      callouts: [{ kind: 'note', text: 'Give the injection at the same dosage and the same frequency as the oral product.' }],
    },
    {
      id: 'vpa-oral-iv',
      kind: 'factor',
      group: 'Valproate',
      label: 'Valproate: oral → IV',
      reverseLabel: 'Valproate: IV → oral',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: pt(1),
      reversible: true,
      reverseStated: false,
      provenance: {
        tier: 'A',
        refs: ['lbl-valproate-iv'],
        locator: 'Dosage and Administration: switching from oral valproate products',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'Infuse over 60 minutes (not faster than 20 mg/min) at the same frequency as the oral product; divide the total daily dose if it exceeds 250 mg. IV use for more than 14 days has not been studied. Plasma-concentration monitoring and dose adjustment may be necessary.',
        },
        {
          kind: 'note',
          text: 'Doses are expressed as valproic-acid equivalents. If the oral product is divalproex ER, first convert to the delayed-release total daily dose (see Oral formulation switches).',
        },
      ],
    },
    {
      id: 'pb-oral-iv',
      kind: 'factor',
      group: 'Phenobarbital',
      label: 'Phenobarbital: oral → IV',
      reverseLabel: 'Phenobarbital: IV → oral',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: pt(1),
      reversible: true,
      reverseStated: false,
      provenance: {
        tier: 'B',
        refs: ['nelson1982'],
        locator: 'Abstract: absolute oral bioavailability 94.9% (range 81–111.9%), six healthy adults',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'Not a labelled conversion. Mean oral bioavailability was 94.9% (range 81–111.9%) after single doses in six healthy adults, so 1:1 is an approximation. Elimination half-life averaged 5.8 days (IV), so steady state takes weeks; confirm with serum levels and clinical response.',
        },
      ],
    },
    {
      id: 'cbz-oral-iv',
      kind: 'factor',
      group: 'Carbamazepine',
      label: 'Carbamazepine: oral → IV (Carnexiv)',
      reverseLabel: 'Carbamazepine: IV → oral',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: pt(0.7),
      reversible: true,
      reverseStated: false,
      provenance: {
        tier: 'B',
        refs: ['vickery2018', 'marino2012'],
        locator:
          'Vickery 2018 (review of labelling and two bioavailability studies): IV dose = 70% of oral dose, every 6 h by 30-minute infusion',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'IV carbamazepine is intended as short-term replacement therapy (up to 7 days) for adults already stabilised on oral carbamazepine, given as four 30-minute infusions per day. Availability is limited, and this figure could not be checked against a current US prescribing-information record during curation; confirm with the product labelling.',
        },
        {
          kind: 'note',
          text: 'Consistent with a mean absolute oral bioavailability of 0.78 measured with stable-labelled IV carbamazepine in 92 patients with epilepsy (Marino 2012).',
        },
      ],
    },
    {
      id: 'fos-mg-pe',
      kind: 'factor',
      group: 'Phenytoin / fosphenytoin',
      label: 'Fosphenytoin: mg fosphenytoin sodium → mg PE',
      reverseLabel: 'Fosphenytoin: mg PE → mg fosphenytoin sodium',
      fromUnit: 'mg fosphenytoin',
      toUnit: 'mg PE',
      factor: pt(1 / 1.5),
      reversible: true,
      reverseStated: true,
      provenance: {
        tier: 'A',
        refs: ['lbl-cerebyx'],
        locator: 'Description: "1.5 mg of fosphenytoin sodium is equivalent to 1 mg phenytoin sodium, and is referred to as 1 mg PE"',
      },
      callouts: [
        {
          kind: 'note',
          text: 'This is a ratio, so it applies to any single or total dose, not only a daily total.',
        },
        {
          kind: 'warning',
          text: 'Fosphenytoin is always prescribed, labelled and dosed in mg PE (phenytoin sodium equivalents). Fatal overdoses have occurred when the vial concentration (50 mg PE/mL) was misread as the vial total: a 2 mL vial contains 100 mg PE and a 10 mL vial 500 mg PE.',
        },
      ],
    },
    {
      id: 'pht-fos',
      kind: 'factor',
      group: 'Phenytoin / fosphenytoin',
      label: 'Phenytoin sodium (oral/IV) → fosphenytoin (mg PE)',
      reverseLabel: 'Fosphenytoin (mg PE) → phenytoin sodium (oral/IV)',
      fromUnit: 'mg phenytoin sodium/day',
      toUnit: 'mg PE/day',
      factor: pt(1),
      reversible: true,
      reverseStated: true,
      provenance: {
        tier: 'A',
        refs: ['lbl-cerebyx'],
        locator: 'Dosage and Administration §2.6 (parenteral substitution for oral phenytoin) and Description',
      },
      callouts: [
        {
          kind: 'note',
          text: '1,000 mg PE of fosphenytoin equals 1,000 mg of phenytoin sodium; no molecular-weight adjustment is needed. Fosphenytoin is indicated for short-term substitution when oral phenytoin is not possible.',
        },
        {
          kind: 'warning',
          text: 'IV/IM fosphenytoin is 100% bioavailable whereas oral Dilantin capsules are about 90% bioavailable, so serum phenytoin concentrations may rise modestly after substitution: monitor levels. For phenytoin free-acid products (Infatabs, suspension) convert to sodium-salt equivalents first.',
        },
      ],
    },
  ],
};

const oralSwitch: DirectedConverter = {
  id: 'asm-oral',
  kind: 'directed',
  title: 'Formulation switches',
  summary: 'Immediate-release ⇄ extended-release, salt/acid and suspension changes, using label tables where they exist.',
  doseBasis: 'Total daily dose, mg/day.',
  refs: ['lbl-depakote-er', 'lbl-tegretol', 'lbl-lamictal-xr', 'lbl-oxtellar-xr', 'lbl-keppra-xr', 'lbl-dilantin', 'lbl-fycompa', 'lbl-onfi', 'lambrecht2011', 'hoy2016'],
  callouts: [
    {
      kind: 'warning',
      text: 'After any formulation switch, monitor seizure control and, where useful, serum concentrations. Many labels state that the converted dose may need adjustment.',
    },
  ],
  routes: [
    {
      id: 'dvp-dr-er',
      kind: 'table',
      group: 'Valproate',
      label: 'Divalproex DR → divalproex ER (Depakote → Depakote ER)',
      fromUnit: 'mg/day (DR total daily dose)',
      toUnit: 'mg/day (ER, once daily)',
      provenance: {
        tier: 'A',
        refs: ['lbl-depakote-er'],
        locator: 'Dosage and Administration §2.4, Table 1 (Dose Conversion)',
      },
      callouts: [
        {
          kind: 'note',
          text: 'Label scope: adults and paediatric patients aged 10 years or older with epilepsy previously receiving Depakote. ER is given once daily at a dose 8 to 20% higher than the DR total daily dose.',
        },
      ],
      rows: [
        { from: [500, 625], to: '750 mg/day', note: 'The label marks 500 mg with an asterisk; see the table note.' },
        { from: [750, 875], to: '1,000 mg/day', note: 'The label marks 750 mg with an asterisk; see the table note.' },
        { from: [1000, 1125], to: '1,250 mg/day', note: 'The label marks 1,000 mg with an asterisk; see the table note.' },
        { from: [1250, 1375], to: '1,500 mg/day' },
        { from: [1500, 1625], to: '1,750 mg/day' },
        { from: [1750, 1750], to: '2,000 mg/day' },
        { from: [1875, 2000], to: '2,250 mg/day' },
        { from: [2125, 2250], to: '2,500 mg/day' },
        { from: [2375, 2375], to: '2,750 mg/day' },
        { from: [2500, 2750], to: '3,000 mg/day' },
        { from: [2875, 2875], to: '3,250 mg/day' },
        { from: [3000, 3125], to: '3,500 mg/day' },
      ],
      tableNote:
        'Asterisked totals (500, 750 and 1,000 mg/day) cannot be converted directly to an 8–20% higher ER dose because the required ER strengths are not available; at the clinician’s discretion the DR dose may be raised to the next higher dose before converting. The label gives no conversion factor above 3,125 mg/day of DR. Plasma valproate Cmin averages the same after conversion but varies between patients; if response is unsatisfactory, measure levels (usual range 50–100 mcg/mL).',
    },
    {
      id: 'dvp-er-dr',
      kind: 'factor',
      group: 'Valproate',
      label: 'Divalproex ER → divalproex DR (estimate)',
      fromUnit: 'mg/day (ER)',
      toUnit: 'mg/day (DR)',
      factor: rng(1 / 1.2, 1 / 1.08, 0.89),
      provenance: {
        tier: 'B',
        refs: ['lbl-depakote-er'],
        derived: true,
        locator: 'Clinical Pharmacology: ER bioavailability averaged 89% of an equal DR daily dose; DR → ER conversion is +8–20%',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'Not a labelled conversion: the label defines DR → ER only. This range is the arithmetic inverse of the labelled +8–20% (0.83–0.93) with the 89% relative bioavailability as the typical value. Divide the DR dose across the day (the label compared once-daily ER with DR given two, three or four times daily) and check valproate levels.',
        },
      ],
    },
    {
      id: 'vpa-dvp',
      kind: 'factor',
      group: 'Valproate',
      label: 'Valproic acid capsules → divalproex delayed-release',
      reverseLabel: 'Divalproex delayed-release → valproic acid capsules',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: pt(1),
      reversible: true,
      reverseStated: true,
      provenance: {
        tier: 'A',
        refs: ['lbl-depakote'],
        locator: 'Clinical Pharmacology: equivalent oral doses of Depakote products and valproic acid capsules deliver equivalent valproate ion',
      },
      callouts: [
        {
          kind: 'note',
          text: 'Equivalent quantities of valproate ion reach the circulation, but the rate of absorption varies with formulation, food and administration method. Divalproex doses are expressed as valproic-acid equivalents.',
        },
      ],
    },
    {
      id: 'cbz-tab-xr',
      kind: 'factor',
      group: 'Carbamazepine',
      label: 'Carbamazepine tablets → Tegretol-XR',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: pt(1),
      provenance: {
        tier: 'A',
        refs: ['lbl-tegretol'],
        locator: 'Dosage and Administration: "the same total daily mg dose of Tegretol-XR should be administered"',
      },
      callouts: [
        { kind: 'note', text: 'Tegretol-XR is a twice-daily formulation and must be swallowed whole, never crushed or chewed.' },
      ],
    },
    {
      id: 'cbz-tab-susp',
      kind: 'factor',
      group: 'Carbamazepine',
      label: 'Carbamazepine tablets → suspension',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: pt(1),
      provenance: {
        tier: 'A',
        refs: ['lbl-tegretol'],
        locator: 'Dosage and Administration: conversion from tablets to suspension',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'Give the same mg per day in smaller, more frequent doses (for example twice-daily tablets → three-times-daily suspension): the suspension produces higher peak levels than the same dose as tablets.',
        },
      ],
    },
    {
      id: 'ltg-ir-xr',
      kind: 'factor',
      group: 'Lamotrigine',
      label: 'Lamotrigine immediate-release → Lamictal XR',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: pt(1),
      provenance: {
        tier: 'A',
        refs: ['lbl-lamictal-xr'],
        locator: 'Dosage and Administration §2.4',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'Some patients taking enzyme-inducing drugs may have lower lamotrigine plasma levels after conversion. Monitor closely for seizure control, especially with drugs that induce lamotrigine glucuronidation; the total daily dose may need adjustment.',
        },
      ],
    },
    {
      id: 'lev-ir-er',
      kind: 'factor',
      group: 'Levetiracetam',
      label: 'Levetiracetam immediate-release → Keppra XR',
      reverseLabel: 'Keppra XR → levetiracetam immediate-release',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: pt(1),
      reversible: true,
      reverseStated: false,
      provenance: {
        tier: 'B',
        refs: ['lbl-keppra-xr'],
        locator: 'Clinical Pharmacology: two 500 mg ER tablets once daily gave comparable Cmax and AUC to one 500 mg IR tablet twice daily (fasting)',
      },
      callouts: [
        {
          kind: 'note',
          text: 'The label documents comparable exposure at an equal total daily dose, but no explicit switching instruction was found. ER is given once daily (maximum 3,000 mg/day) and swallowed whole.',
        },
      ],
    },
    {
      id: 'oxc-ir-xr',
      kind: 'factor',
      group: 'Oxcarbazepine',
      label: 'Oxcarbazepine immediate-release → Oxtellar XR (estimate)',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: rng(1, 1 / 0.81),
      provenance: {
        tier: 'B',
        refs: ['lbl-oxtellar-xr'],
        derived: true,
        locator: '§2.7 ("higher dosages of Oxtellar XR may be necessary") and §12.3 (XR AUC about 19% lower than IR at 1,200 mg/day)',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'The label states only that higher dosages of Oxtellar XR may be necessary. At the same 1,200 mg total daily dose, once-daily XR gave about 19% lower MHD exposure (AUC) than twice-daily IR, so an exposure-matched XR dose is up to about 1.23× (1 ÷ 0.81). This range is an arithmetic estimate, not a labelled factor: titrate to response and tolerability.',
        },
      ],
    },
    {
      id: 'prm-tab-susp',
      kind: 'factor',
      group: 'Perampanel',
      label: 'Perampanel tablets → oral suspension',
      reverseLabel: 'Perampanel oral suspension → tablets',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: pt(1),
      reversible: true,
      reverseStated: true,
      provenance: {
        tier: 'A',
        refs: ['lbl-fycompa'],
        locator: 'Clinical Pharmacology: "FYCOMPA oral suspension has comparable bioavailability to FYCOMPA tablets under steady state. Both formulations may be used interchangeably."',
      },
      callouts: [{ kind: 'note', text: 'The label states the two formulations may be used interchangeably, so the same dose applies.' }],
    },
    {
      id: 'clb-tab-susp',
      kind: 'factor',
      group: 'Clobazam',
      label: 'Clobazam tablets → oral suspension',
      reverseLabel: 'Clobazam oral suspension → tablets',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: pt(1),
      reversible: true,
      reverseStated: false,
      provenance: {
        tier: 'B',
        refs: ['lbl-onfi'],
        locator: 'Clinical Pharmacology §12.3: tablets and oral suspension had similar bioavailability (Cmax and AUC) under fasted conditions; relative bioavailability of tablets versus an oral solution about 100%',
      },
      callouts: [
        { kind: 'note', text: 'The label documents similar exposure for the tablet and the suspension (2.5 mg/mL) but gives no explicit switching instruction.' },
      ],
    },
    {
      id: 'tpm-ir-xr',
      kind: 'factor',
      group: 'Topiramate',
      label: 'Topiramate immediate-release → Qudexy XR (USL255)',
      reverseLabel: 'Qudexy XR (USL255) → topiramate immediate-release',
      fromUnit: 'mg/day',
      toUnit: 'mg/day',
      factor: pt(1),
      reversible: true,
      reverseStated: false,
      provenance: {
        tier: 'B',
        refs: ['lambrecht2011', 'hoy2016'],
        locator:
          'Single-dose crossover in 36 healthy volunteers: relative bioavailability 91.2% (90% CI 84–99%) versus twice-daily immediate-release; review: bioequivalent exposure at the same total daily dose, and switching between the two did not affect topiramate concentrations',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'Not a labelled conversion: the topiramate extended-release labels reviewed give no switching instruction. The data cover the USL255 product (Qudexy XR) only, not Trokendi XR. Relative bioavailability was 91% (90% CI 84–99%) in a single-dose study, so monitor after the switch. XR is once daily.',
        },
      ],
    },
    {
      id: 'pht-na-acid',
      kind: 'factor',
      group: 'Phenytoin / fosphenytoin',
      label: 'Phenytoin sodium (capsules/IV) → phenytoin free acid (Infatabs/suspension)',
      reverseLabel: 'Phenytoin free acid (Infatabs/suspension) → phenytoin sodium (capsules/IV)',
      fromUnit: 'mg phenytoin sodium/day',
      toUnit: 'mg phenytoin free acid/day',
      factor: pt(0.92),
      reversible: true,
      reverseStated: false,
      provenance: {
        tier: 'B',
        refs: ['lbl-dilantin'],
        derived: true,
        locator:
          'Label: free-acid products contain approximately 8% more drug than the sodium salt. Factor 0.92 = molecular-weight ratio phenytoin (252.3) ÷ phenytoin sodium (274.2)',
      },
      callouts: [
        {
          kind: 'warning',
          text: 'The label advises that dosage adjustment and serum-level monitoring may be necessary when switching between free-acid products (Infatabs, suspension) and sodium-salt products (extended capsules, parenteral). Because phenytoin metabolism is saturable, small incremental doses can produce very substantial increases in serum level when levels are already in the upper range.',
        },
      ],
    },
  ],
};

export const antiseizure: Module = {
  id: 'epilepsy',
  title: 'Antiseizure medications',
  area: 'Epilepsy',
  summary: 'IV ⇄ oral and formulation switches for the same drug, from prescribing information and pharmacokinetic data.',
  converters: [ivOral, oralSwitch],
};
