/*
 * Finding vocabulary: every clinical finding the app can take as input.
 * Each finding is tri-state (present / absent / not assessed).
 * IDs are referenced by the knowledge base (kb.js); tests verify every
 * referenced ID exists here.
 *
 * Item tuple: [id, label, hint?]
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EpiVocab = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const SECTIONS = [
    {
      key: 'sz',
      title: 'Seizures',
      blurb: 'Seizure types follow the ILAE 2025 classification. Tick what has been observed or reliably described.',
      reviewLabel: 'I have reviewed seizure types — treat anything not ticked as absent',
      groups: [
        {
          title: 'Focal seizures',
          items: [
            ['sz.focal_aware', 'Focal seizure, consciousness preserved', 'Aware and responsive throughout'],
            ['sz.focal_impaired', 'Focal seizure, consciousness impaired', 'Impaired awareness (recall) and/or responsiveness'],
            ['sz.focal_btc', 'Focal to bilateral tonic–clonic', 'Focal onset evolving to bilateral tonic–clonic'],
          ],
        },
        {
          title: 'Generalized seizures',
          items: [
            ['sz.abs_typical', 'Typical absence', 'Abrupt behavioural arrest, brief, often provoked by hyperventilation'],
            ['sz.abs_atypical', 'Atypical absence', 'Slower onset/offset, tone change, longer'],
            ['sz.abs_myoclonic', 'Myoclonic absence', 'Absence with rhythmic myoclonic jerks (shoulders/arms)'],
            ['sz.eyelid_myoclonia', 'Eyelid myoclonia (± absence)', 'Rapid eyelid jerks with upward eye deviation, eye-closure/light triggered'],
            ['sz.gtc', 'Generalized tonic–clonic', 'Includes tonic–clonic of unknown onset'],
            ['sz.mtc', 'Myoclonic–tonic–clonic', 'Myoclonic jerks, then tonic–clonic'],
            ['sz.myoclonic', 'Myoclonic', 'Brief, shock-like jerks'],
            ['sz.neg_myoclonus', 'Negative myoclonus', 'Brief loss of tone in an actively held posture'],
            ['sz.myoatonic', 'Myoclonic–atonic', 'Jerk followed by sudden loss of tone (drop)'],
            ['sz.atonic', 'Atonic', 'Sudden loss of tone'],
            ['sz.tonic', 'Tonic (generalized)', 'Sustained stiffening, often in sleep'],
            ['sz.clonic', 'Clonic (generalized)', 'Rhythmic jerking without tonic phase'],
            ['sz.spasms', 'Epileptic spasms', 'Flexor/extensor/mixed, ~1–2 s, in clusters; may be focal or generalized'],
            ['sz.reflex_myoclonic_orofacial', 'Reflex orofacial myoclonic seizures', 'Triggered by reading or language tasks'],
          ],
        },
      ],
    },
    {
      key: 'sem',
      title: 'Semiology & features',
      blurb: 'Descriptors (ILAE 2025) and specific phenomena that discriminate between syndromes.',
      reviewLabel: 'I have reviewed semiology — treat anything not ticked as absent',
      groups: [
        {
          title: 'Motor',
          items: [
            ['sem.tonic_focal', 'Focal tonic features', 'Head/face/limb tonic posturing'],
            ['sem.clonic_focal', 'Focal clonic features'],
            ['sem.hemiclonic', 'Hemiclonic (may alternate sides)'],
            ['sem.version', 'Head / eye version or deviation'],
            ['sem.hypermotor', 'Hyperkinetic (hypermotor) or asymmetric tonic/dystonic', 'Brief, vigorous, often from sleep'],
            ['sem.oral_speech', 'Dysarthria / sialorrhoea / unilateral oral clonic movements', 'Face–mouth seizure with speech arrest'],
            ['sem.hkt_spasms', 'Hyperkinetic → tonic → spasms sequence'],
            ['sem.unifocal', 'Consistently unifocal onset (same body part, same side)'],
            ['sem.myoclonus_sleep_only', 'Myoclonus predominantly / exclusively during sleep'],
            ['sem.fencing', 'Fencing posture', 'One arm extended, the other flexed beside the head, head turned toward the extended arm'],
            ['sem.figure4', 'Figure-of-4 sign', 'One elbow extended, the other flexed, in the tonic phase of a tonic–clonic seizure'],
            ['sem.dystonic', 'Dystonic limb posturing', 'Sustained unilateral twisting posture of an arm or hand'],
            ['sem.automatism', 'Automatisms (oral / manual)', 'Chewing, lip-smacking, fumbling'],
            ['sem.ictal_paresis', 'Ictal paresis', 'Weakness of a limb during the seizure'],
          ],
        },
        {
          title: 'Non-motor / aura',
          items: [
            ['sem.autonomic', 'Prominent autonomic features', 'Pallor, flushing, abdominal pain, pupillary or cardiorespiratory change'],
            ['sem.emesis', 'Ictal retching / vomiting'],
            ['sem.behavioral_arrest', 'Behavioural arrest / staring'],
            ['sem.visual_elementary', 'Elementary visual (e.g. coloured circles)'],
            ['sem.auditory', 'Auditory hallucinations'],
            ['sem.receptive_aphasia', 'Receptive aphasia'],
            ['sem.cog_dejavu', 'Cognitive: déjà vu / jamais vu / dreamy state'],
            ['sem.sensory_other', 'Other sensory (somatosensory, olfactory, gustatory)'],
            ['sem.mesial_temporal', 'Mesial-temporal semiology', 'Epigastric rising, fear, olfactory/gustatory, oro-alimentary automatisms'],
            ['sem.non_mesial_onset', 'Initial semiology referable to a non-mesial-temporal network'],
            ['sem.gustatory_fear', 'Gustatory hallucination or ictal fear'],
            ['sem.gelastic', 'Gelastic (mechanical, mirthless laughter)'],
            ['sem.fearful_scream', 'Fearful screaming'],
          ],
        },
        {
          title: 'Evolution & pattern',
          items: [
            ['sem.sequential', 'Sequential seizures'],
            ['sem.migrating', 'Clinically migrating between hemispheres / lobes'],
            ['sem.epc_progressive', 'Focal motor seizures escalating over weeks–months (± epilepsia partialis continua)'],
          ],
        },
        {
          title: 'Status & duration',
          items: [
            ['st.prolonged_gt10', 'Prolonged seizure > 10 min'],
            ['st.prolonged_gt15', 'Prolonged seizure > 15 min'],
            ['st.conv_se_gt30', 'Convulsive / focal motor status > 30 min'],
            ['st.gtc_se', 'Generalized tonic–clonic status epilepticus'],
            ['st.ncse', 'Non-convulsive status epilepticus'],
            ['st.febrile_hemiclonic_se', 'Febrile hemiclonic status followed by permanent hemiparesis'],
            ['st.superrefractory_se', 'Super-refractory status epilepticus'],
          ],
        },
      ],
    },
    {
      key: 'ctx',
      title: 'Context & triggers',
      blurb: 'Timing, triggers and frequency.',
      reviewLabel: 'I have reviewed context — treat anything not ticked as absent',
      groups: [
        {
          title: 'Context',
          items: [
            ['ctx.fever', 'Seizures triggered by fever / febrile illness'],
            ['ctx.febrile_illness_2w', 'Non-specific febrile illness in the 2 weeks before onset'],
            ['ctx.cluster', 'Seizures occur in clusters'],
            ['ctx.escalating', 'Frequency escalating rapidly over weeks'],
            ['ctx.prior_epilepsy', 'Epilepsy diagnosed before this illness'],
            ['ctx.sleep_pred', 'Predominantly from sleep'],
            ['ctx.sleep_only', 'Exclusively from sleep'],
            ['ctx.sleep_onset_window', 'Within 1 h of falling asleep or 1–2 h before waking'],
            ['ctx.wake_pred', 'Predominantly from wakefulness'],
            ['ctx.wake_only', 'Only during wakefulness'],
            ['ctx.photic', 'Triggered by photic stimuli (flickering light)'],
            ['ctx.eye_closure', 'Triggered by eye closure'],
            ['ctx.reading', 'Triggered by reading / language tasks'],
            ['ctx.reading_only_myoclonic', 'Myoclonic seizures occur only with reading'],
            ['ctx.hv', 'Absences provoked by hyperventilation'],
          ],
        },
        {
          title: 'Frequency & duration',
          items: [
            ['ctx.daily', 'Seizures occur daily (untreated)'],
            ['ctx.abs_daily', 'Absence seizures occur daily (untreated)'],
            ['ctx.abs_gt10day', 'Absences > 10 per day'],
            ['ctx.freq_gt_monthly', 'Seizure frequency more than monthly'],
            ['ctx.staring_gt30s', 'Staring spells > 30 s or with postictal confusion'],
            ['ctx.gtc_with_absence', 'Generalized tonic–clonic seizures before / during frequent absences'],
          ],
        },
      ],
    },
    {
      key: 'eeg',
      title: 'EEG',
      blurb: 'Interictal and ictal findings. Historical findings count.',
      reviewLabel: 'EEG reviewed — treat anything not ticked as absent',
      groups: [
        {
          title: 'Background',
          items: [
            ['eeg.bg_normal', 'Normal background'],
            ['eeg.bg_mild_slow', 'Mild background slowing'],
            ['eeg.bg_diffuse_slow', 'Moderate or greater diffuse background slowing', 'Not limited to postictal period'],
            ['eeg.focal_slow', 'Persistent focal slowing'],
            ['eeg.hemispheric_slow', 'Hemispheric slowing / asymmetry'],
            ['eeg.burst_suppression', 'Burst-suppression'],
            ['eeg.hypsarrhythmia', 'Hypsarrhythmia'],
          ],
        },
        {
          title: 'Epileptiform activity',
          items: [
            ['eeg.no_discharges', 'No interictal epileptiform discharges'],
            ['eeg.multifocal', 'Multifocal discharges'],
            ['eeg.focal_spikes', 'Focal epileptiform discharges'],
            ['eeg.single_focus', 'Single persistent epileptic focus'],
            ['eeg.unilateral_consistent', 'Consistently unilateral focal discharges on serial EEGs'],
            ['eeg.gen_epileptiform', 'Any generalized epileptiform abnormality'],
            ['eeg.gsw_3hz', '3 Hz (2.5–4 Hz) generalized spike-wave'],
            ['eeg.gsw_3_55', '3–5.5 Hz generalized spike-wave / polyspike-wave'],
            ['eeg.gsw_2_6', '2–6 Hz generalized spike-wave / polyspike-wave'],
            ['eeg.gsw_slow', 'Generalized slow spike-wave < 2.5 Hz'],
            ['eeg.gpfa', 'Generalized paroxysmal fast activity in sleep'],
            ['eeg.swas', 'Slow (1.5–2 Hz) spike-wave in NREM sleep, markedly activated by sleep'],
            ['eeg.ctsp', 'High-amplitude centrotemporal biphasic spikes'],
            ['eeg.occipital', 'Occipital spikes / spike-wave'],
            ['eeg.occipital_eyeclosure', 'Occipital abnormalities facilitated by eye closure and IPS'],
            ['eeg.temporal_spikes', 'Temporal epileptiform discharges'],
            ['eeg.epi_nonfrontal', 'Frequent epileptiform abnormality outside frontal regions'],
            ['eeg.sleep_activated', 'Epileptiform activity increases in drowsiness / sleep'],
          ],
        },
        {
          title: 'Provocation & ictal',
          items: [
            ['eeg.ppr', 'Photoparoxysmal response'],
            ['eeg.ppr_slow', 'Photoparoxysmal response at slow (1–2 Hz) flash rates'],
            ['eeg.eem_pattern', 'Eye closure + IPS elicit fast 3–6 Hz generalized polyspikes'],
            ['eeg.hv_no_activation', 'Good HV ≥ 3 min (untreated) with NO generalized spike-wave'],
            ['eeg.ictal_migrating', 'Ictal migrating pattern recorded'],
            ['eeg.ictal_no_corr', 'Recorded typical clinical event without EEG correlate'],
            ['eeg.ictal_nontemporal', 'Recorded seizures with non-temporal or generalized onset'],
          ],
        },
      ],
    },
    {
      key: 'gen',
      title: 'Genetics',
      blurb: 'Select pathogenic / likely pathogenic variants found.',
      reviewLabel: 'Genetic testing performed — treat variants not ticked as not found',
      groups: [
        {
          title: 'Pathogenic variant identified in',
          items: [
            ['gen.scn1a', 'SCN1A'], ['gen.kcnq2', 'KCNQ2'], ['gen.kcnq3', 'KCNQ3'],
            ['gen.scn2a', 'SCN2A'], ['gen.prrt2', 'PRRT2'], ['gen.cdkl5', 'CDKL5'],
            ['gen.pcdh19', 'PCDH19'], ['gen.slc2a1', 'SLC2A1 (GLUT1)'],
            ['gen.aldh7a1', 'ALDH7A1 / PLBD1 (pyridoxine-dependent)'], ['gen.pnpo', 'PNPO'],
            ['gen.other', 'Other causal variant'],
          ],
        },
      ],
    },
    {
      key: 'lab',
      title: 'Laboratory & family history',
      blurb: 'CSF, metabolic, immune and family findings.',
      reviewLabel: 'Reviewed — treat anything not ticked as absent',
      groups: [
        {
          title: 'Laboratory',
          items: [
            ['lab.csf_low_glucose', 'Low fasting CSF glucose / CSF:plasma ratio'],
            ['lab.csf_low_other_cause', 'Hypoglycorrhachia explained by another cause'],
            ['lab.pdx_markers', 'Raised α-AASA / pipecolic acid, or low CSF pyridoxal-5-phosphate'],
            ['lab.pdx_response', 'Seizures stop with pyridoxine / PLP and recur on withdrawal'],
            ['lab.csf_infection', 'CSF evidence of CNS infection'],
            ['lab.autoantibody', 'Causal autoantibody (CSF or serum)'],
            ['lab.metabolic_documented', 'Documented metabolic or genetic cause'],
            ['lab.toxic_enceph', 'Documented toxic encephalopathy'],
            ['lab.acute_symptomatic_cause', 'Acute symptomatic cause (infection, stroke, HIE, metabolic)'],
          ],
        },
        {
          title: 'Family history',
          items: [
            ['fh.ad_incomplete', 'Pattern suggests autosomal dominant inheritance with incomplete penetrance'],
            ['fh.mtle', 'Relatives with mesial-temporal-onset focal seizures'],
            ['fh.variable_foci', 'Relatives with focal seizures from different cortical regions'],
            ['fh.focal_early_only', 'Relatives with focal seizures only before 20 months'],
          ],
        },
      ],
    },
    {
      key: 'neuro',
      title: 'Neurological exam & course',
      blurb: 'Findings on examination and the clinical course so far.',
      reviewLabel: 'Reviewed — treat anything not ticked as absent',
      groups: [
        {
          title: 'Examination',
          items: [
            ['neuro.normal', 'Normal neurological examination'],
            ['neuro.abnormal_significant', 'Significant abnormality (excluding incidental)'],
            ['neuro.focal', 'Focal deficit (other than Todd paresis)'],
            ['neuro.hemiparesis_permanent', 'Permanent hemiparesis'],
            ['neuro.hemiparesis_at_onset', 'Hemiparesis present at seizure onset'],
            ['neuro.hypotonia', 'Generalized hypotonia'],
            ['neuro.facial_angioma_v1', 'Facial capillary malformation in V1 distribution'],
            ['neuro.dysmorphism', 'Dysmorphism / congenital anomalies'],
            ['neuro.visual_field_deficit', 'Persistent visual field deficit'],
            ['neuro.movement_disorder', 'Movement disorder (ataxia, paroxysmal dyskinesia, dystonia)'],
          ],
        },
        {
          title: 'Development & course',
          items: [
            ['dev.encephalopathy', 'Encephalopathy at onset'],
            ['dev.acute_enceph', 'Acute encephalopathy with onset of frequent seizures'],
            ['dev.speech_delay', 'Speech delay'],
            ['dev.regression', 'Neurocognitive regression or plateau'],
            ['dev.progressive_decline', 'Progressive cognitive decline'],
            ['course.drug_resistant', 'Drug-resistant epilepsy'],
            ['course.prog_myoclonus', 'Progressive worsening myoclonus / cerebellar signs'],
            ['course.progressive_deficits', 'Progressive neurological deficits'],
            ['course.regression_myoclonic_ataxia', 'Regression with myoclonic seizures, ataxia, spasticity'],
            ['course.sodium_channel_good_response', 'Good response to sodium-channel-blocking ASMs'],
            ['course.behavior_problems', 'Behavioural problems (aggression, impulsivity, hyperactivity)'],
          ],
        },
      ],
    },
  ];

  // Lesion-type imaging findings, shown when MRI is abnormal.
  const IMAGING_ITEMS = [
    ['img.hs', 'Hippocampal sclerosis'],
    ['img.hh', 'Hypothalamic hamartoma'],
    ['img.mcd', 'Malformation of cortical development / focal cortical dysplasia'],
    ['img.angioma', 'Leptomeningeal angioma / enhancement'],
    ['img.occipital_calc', 'Occipital calcifications'],
    ['img.lesion_other', 'Other causal structural lesion'],
    ['img.hemiatrophy_prog', 'Progressive hemiatrophy (insula / caudate)'],
    ['img.hemisphere_edema', 'Acute hemispheric oedema with restricted diffusion'],
    ['img.hemisphere_atrophy_chronic', 'Chronic hemispheric atrophy'],
  ];
  // Of those, the ones that count as a "causal structural lesion".
  const CAUSAL_LESIONS = ['img.hs', 'img.hh', 'img.mcd', 'img.angioma', 'img.occipital_calc', 'img.lesion_other'];

  const DEV_LEVELS = [
    { v: 0, label: 'Normal' },
    { v: 1, label: 'Mild delay / ID' },
    { v: 2, label: 'Moderate' },
    { v: 3, label: 'Severe–profound' },
  ];

  // Seizure id -> ILAE 2025 class + type name.
  const SEIZURE_CLASS = {
    'sz.focal_aware': ['Focal', 'Focal seizure, preserved consciousness'],
    'sz.focal_impaired': ['Focal', 'Focal seizure, impaired consciousness'],
    'sz.focal_btc': ['Focal', 'Focal to bilateral tonic–clonic seizure'],
    'sz.abs_typical': ['Generalized', 'Typical absence seizure'],
    'sz.abs_atypical': ['Generalized', 'Atypical absence seizure'],
    'sz.abs_myoclonic': ['Generalized', 'Myoclonic absence seizure'],
    'sz.eyelid_myoclonia': ['Generalized', 'Eyelid myoclonia (with absence)'],
    'sz.gtc': ['Generalized', 'Generalized tonic–clonic seizure'],
    'sz.mtc': ['Generalized', 'Generalized myoclonic–tonic–clonic seizure'],
    'sz.myoclonic': ['Generalized', 'Generalized myoclonic seizure'],
    'sz.neg_myoclonus': ['Generalized', 'Generalized negative myoclonus'],
    'sz.myoatonic': ['Generalized', 'Generalized myoclonic–atonic seizure'],
    'sz.atonic': ['Generalized', 'Generalized atonic seizure'],
    'sz.tonic': ['Generalized', 'Generalized tonic seizure'],
    'sz.clonic': ['Generalized', 'Generalized clonic seizure'],
    'sz.spasms': ['Epileptic spasms', 'Epileptic spasms'],
    'sz.reflex_myoclonic_orofacial': ['Generalized', 'Reflex orofacial myoclonic seizure (language-induced)'],
  };

  const FOCAL_IDS = ['sz.focal_aware', 'sz.focal_impaired', 'sz.focal_btc'];
  const GENERALIZED_IDS = [
    'sz.abs_typical', 'sz.abs_atypical', 'sz.abs_myoclonic', 'sz.eyelid_myoclonia', 'sz.gtc', 'sz.mtc',
    'sz.myoclonic', 'sz.neg_myoclonus', 'sz.myoatonic', 'sz.atonic', 'sz.tonic', 'sz.clonic', 'sz.reflex_myoclonic_orofacial',
  ];
  // Semiology that can only occur in focal seizures (ILAE 2025: focal tonic/clonic/hyperkinetic etc. are focal seizures).
  const FOCAL_SEMIOLOGY_IDS = [
    'sem.tonic_focal', 'sem.clonic_focal', 'sem.hemiclonic', 'sem.version', 'sem.hypermotor', 'sem.oral_speech',
    'sem.visual_elementary', 'sem.auditory', 'sem.receptive_aphasia', 'sem.cog_dejavu', 'sem.sensory_other',
    'sem.mesial_temporal', 'sem.gustatory_fear', 'sem.gelastic', 'sem.fearful_scream', 'sem.epc_progressive',
    'sem.fencing', 'sem.dystonic', 'sem.automatism', 'sem.ictal_paresis',
  ];
  const ALL_SEIZURE_IDS = FOCAL_IDS.concat(GENERALIZED_IDS, ['sz.spasms']);

  // Derived (computed) findings — not user inputs.
  const DERIVED = [
    'sz.focal_any', 'sz.gen_any', 'sz.any', 'sz.other_than_gtc',
    'img.normal', 'img.lesion', 'img.abnormal_significant',
    'devo.normal', 'devo.mild', 'devo.any_impair', 'devo.moderate_plus', 'devo.severe_plus',
    'devn.normal', 'devn.mild', 'devn.any_impair', 'devn.moderate_plus', 'devn.severe_plus',
    'pt.female',
  ];

  function allIds() {
    const ids = new Set(DERIVED);
    SECTIONS.forEach((s) => s.groups.forEach((g) => g.items.forEach((i) => ids.add(i[0]))));
    IMAGING_ITEMS.forEach((i) => ids.add(i[0]));
    return ids;
  }

  // id -> section key (for the "reviewed" rule)
  function sectionOf(id) {
    for (const s of SECTIONS) for (const g of s.groups) for (const i of g.items) if (i[0] === id) return s.key;
    return null;
  }

  return {
    SECTIONS, IMAGING_ITEMS, CAUSAL_LESIONS, DEV_LEVELS, SEIZURE_CLASS,
    FOCAL_IDS, GENERALIZED_IDS, FOCAL_SEMIOLOGY_IDS, ALL_SEIZURE_IDS, DERIVED, allIds, sectionOf,
  };
});
