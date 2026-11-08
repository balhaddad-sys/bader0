/*
 * Guided assessment: a step-by-step, picture-led, plain-language route into the same rule engine
 * that powers the full checklist. Nothing here scores anything — it only turns taps on pictures
 * into the findings the engine already understands (see FINDING IDS in vocab.js).
 *
 * Part 1 (pure, runs in Node): STEPS definitions and the state functions the tests drive.
 * Part 2 (browser): rendering, events and the plain-language result screen.
 *
 * Semantics worth knowing:
 *  - A tapped card sets its findings to PRESENT. Tapping again removes them (back to "not assessed").
 *  - On "Continue" in a step flagged `implicitFalse` (seizure pictures, examination signs), the cards
 *    that were NOT tapped become explicitly ABSENT — but only if at least one card was tapped. A step
 *    with nothing tapped is treated as skipped and leaves everything "not assessed".
 *  - Every other step leaves un-tapped items as "not assessed" (never as absent).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root, require('./vocab.js'), require('./engine.js'), require('./kb.js'), require('./plain.js'), require('./semio.js'), require('./physical.js'), require('./figures.js'), require('./diagrams.js'), require('./morph.js'));
  } else {
    root.EpiWizard = factory(root, root.EpiVocab, root.EpiEngine, root.EpiKB, root.EpiPlain, root.EpiSemio, root.EpiPhysical, root.EpiFigures, root.EpiDiagrams, root.EpiMorph);
  }
})(typeof self !== 'undefined' ? self : this, function (root, V, E, KB, PL, S, P, F, D, M) {
  'use strict';
  const PLAIN = PL.PLAIN;

  /* =====================================================================================
     PART 1 — definitions and pure state logic
     ===================================================================================== */

  // card(key, title, sub, picture, findings, extras)
  //   picture: ['entryId', frameIndex] (semiology / physical drawing) | {fig:'gsw3'} (EEG schematic) | 'iconName'
  //   findings: array of ids (all set PRESENT) or a map {id: true|false} (explicit values)
  const card = (key, title, sub, pic, set, extra) => Object.assign({ key, title, sub, pic, set }, extra || {});
  const chip = (key, title, icon, set, extra) => Object.assign({ key, title, icon, set }, extra || {});

  const SEIZURE_MAIN = [
    { title: 'Convulsions and stiffening', cards: [
      card('convulsion', 'Full-body convulsion', 'Stiffens, then jerks all over', ['sz.gtc', 1], ['sz.gtc']),
      card('stiff', 'Stiffening', 'Muscles go rigid for several seconds, often in sleep', ['sz.tonic', 0], ['sz.tonic']),
      card('spreads', 'Starts in one place, then spreads', 'Begins in one part of the body, then becomes a convulsion', 'arrow', ['sz.focal_btc'], { focal: true }),
      card('side', 'One whole side jerks', 'Arm and leg on one side; may swap sides between seizures', ['sem.hemiclonic', 0], ['sem.hemiclonic'], { focal: true }),
      card('part', 'One part jerks rhythmically', 'An arm, a leg or one side of the face', ['sem.clonic_focal', 0], ['sem.clonic_focal'], { focal: true }),
    ] },
    { title: 'Sudden and brief', cards: [
      card('jerks', 'Brief shock-like jerks', 'Single jerks of the arms or shoulders, often soon after waking', ['sz.myoclonic', 1], ['sz.myoclonic']),
      card('spasms', 'Clusters of spasms', 'Quick bends or stretches lasting 1–2 s, repeating, often on waking', ['sz.spasms', 0], ['sz.spasms']),
      card('drop', 'Goes limp or head drops', 'Sudden loss of muscle tone; may fall', ['sz.atonic', 0], ['sz.atonic']),
      card('jerkdrop', 'A jerk, then a drop', 'Arms and head jerk, then the body goes limp', ['sz.myoatonic', 1], ['sz.myoatonic']),
    ] },
    { title: 'Staring and switching off', cards: [
      card('stare', 'Short staring spells', 'Stops mid-activity, blank for seconds, then straight back to normal', ['sz.abs_typical', 1], ['sz.abs_typical', 'sem.behavioral_arrest']),
      card('longstare', 'Long staring, confused afterwards', 'Lasts over 30 seconds, or leaves the person confused or tired', 'clock', ['ctx.staring_gt30s', 'sem.behavioral_arrest'], { focal: true }),
      card('armjerk', 'Staring with rhythmic arm jerks', 'The arms jerk and creep upward during the stare', ['sz.abs_myoclonic', 2], ['sz.abs_myoclonic']),
      card('eyelid', 'Eyelid fluttering', 'Rapid blinking with the eyes rolling up; often with light or eye closure', ['sz.eyelid_myoclonia', 1], ['sz.eyelid_myoclonia']),
    ] },
  ];
  const SEIZURE_MORE = [
    { title: 'Movements and postures', cards: [
      card('focal_tonic', 'One limb or the face stiffens', 'Sustained tightening of an arm, a leg or one side of the face', 'figure', ['sem.tonic_focal'], { focal: true }),
      card('head_turn', 'Head and eyes turn to one side', 'The head and eyes are pulled round, often before a convulsion', ['sem.version', 1], ['sem.version'], { focal: true }),
      card('fencing', 'Fencing posture', 'One arm stretched out, the other bent, head turned toward the straight arm', ['sem.fencing', 0], ['sem.fencing'], { focal: true }),
      card('fig4', 'Figure-of-4', 'One elbow straight and the other bent while the body stiffens', ['sem.figure4', 0], ['sem.figure4']),
      card('dystonic', 'Twisted arm or hand', 'A sustained twisting posture of one arm or hand', ['sem.dystonic', 0], ['sem.dystonic'], { focal: true }),
      card('automatism', 'Chewing, lip-smacking or fumbling', 'Repetitive mouth or hand movements while unaware', ['sem.automatism', 0], ['sem.automatism'], { focal: true }),
      card('thrash', 'Violent thrashing, often from sleep', 'Pedalling, rocking or flailing; short and stereotyped', ['sem.hypermotor', 0], ['sem.hypermotor'], { focal: true }),
    ] },
    { title: 'Face and mouth', cards: [
      card('mouth', 'Mouth twitching, drooling, trouble speaking', 'Often at night; one side of the mouth and face', ['sem.oral_speech', 0], ['sem.oral_speech'], { focal: true }),
      card('jaw', 'Jaw jerks when reading or talking', 'Brief jerks of the jaw and lips set off by reading aloud or talking', ['sz.reflex_myoclonic_orofacial', 1], ['sz.reflex_myoclonic_orofacial']),
      card('laugh', 'Laughing fits for no reason', 'Mechanical, mirthless laughter', ['sem.gelastic', 0], ['sem.gelastic'], { focal: true }),
      card('retch', 'Retching or vomiting', 'Looks pale and unwell, then retches or vomits', ['sem.emesis', 0], ['sem.emesis'], { focal: true }),
      card('scream', 'Fearful scream', 'Wide eyes, open mouth, apparent terror', ['sem.fearful_scream', 0], ['sem.fearful_scream'], { focal: true }),
      card('autonomic', 'Pale, flushed or tummy pain', 'Colour change, sweating, abdominal pain or breathing change', 'thermometer', ['sem.autonomic'], { focal: true }),
    ] },
    { title: 'Feelings and senses', cards: [
      card('rising', 'Rising stomach feeling, fear, odd smell or taste', 'A feeling that builds, often a warning before the seizure', 'help', ['sem.mesial_temporal'], { focal: true }),
      card('dejavu', 'Déjà vu or a dreamy state', 'Everything feels strangely familiar, or unreal', 'repeat', ['sem.cog_dejavu'], { focal: true }),
      card('colors', 'Coloured spots or flashes', 'Seeing circles, spots or lights that are not there', 'eye', ['sem.visual_elementary'], { focal: true }),
      card('sounds', 'Hearing sounds that are not there', 'Buzzing, voices or music', 'ear', ['sem.auditory'], { focal: true }),
    ] },
  ];

  const EEG_BACKGROUND = [
    card('bg_normal', 'Normal', 'Smooth, age-appropriate rhythm', { fig: 'normal' }, { 'eeg.bg_normal': true, 'eeg.bg_mild_slow': false, 'eeg.bg_diffuse_slow': false, 'eeg.burst_suppression': false, 'eeg.hypsarrhythmia': false }),
    card('bg_mild', 'Mildly slow', 'Slower than expected for age', { fig: 'mildslow' }, { 'eeg.bg_normal': false, 'eeg.bg_mild_slow': true, 'eeg.bg_diffuse_slow': false, 'eeg.burst_suppression': false, 'eeg.hypsarrhythmia': false }),
    card('bg_slow', 'Very slow, all over', 'Moderate or marked slowing of the whole background', { fig: 'diffslow' }, { 'eeg.bg_normal': false, 'eeg.bg_diffuse_slow': true, 'eeg.burst_suppression': false, 'eeg.hypsarrhythmia': false }),
    card('bg_bs', 'Bursts and silences', 'Burst-suppression', { fig: 'bs' }, { 'eeg.bg_normal': false, 'eeg.burst_suppression': true, 'eeg.hypsarrhythmia': false }),
    card('bg_hyps', 'Chaotic and high voltage', 'Hypsarrhythmia', { fig: 'hyps' }, { 'eeg.bg_normal': false, 'eeg.hypsarrhythmia': true, 'eeg.burst_suppression': false }),
  ];
  const GEN = 'eeg.gen_epileptiform', FOC = 'eeg.focal_spikes';
  const EEG_DISCHARGES = [
    { title: 'Nothing epileptic', cards: [
      card('none', 'No spikes or sharp waves', 'The report shows no epileptiform discharges', 'check', ['eeg.no_discharges'], { exclusive: true, wide: true }),
    ] },
    { title: 'Whole-brain discharges', cards: [
      card('gsw3', '3 per second spike-wave', 'Regular, abrupt start and end (absence)', { fig: 'gsw3' }, ['eeg.gsw_3hz', GEN]),
      card('poly', 'Fast polyspike-wave', '3–5.5 per second, may only appear in drowsiness', { fig: 'poly' }, ['eeg.gsw_3_55', GEN]),
      card('gsw26', 'Irregular spike-wave', '2–6 per second, spikes and polyspikes', { fig: 'gsw26' }, ['eeg.gsw_2_6', GEN]),
      card('slowsw', 'Slow spike-wave', 'Under 2.5 per second, on a slow background', { fig: 'slowsw' }, ['eeg.gsw_slow', GEN]),
      card('gpfa', 'Fast bursts in sleep', 'Generalized paroxysmal fast activity', { fig: 'gpfa' }, ['eeg.gpfa', GEN]),
      card('swas', 'Nearly continuous spike-wave in sleep', 'Spike-wave takes over the sleep EEG', { fig: 'swas' }, ['eeg.swas', GEN]),
    ] },
    { title: 'Discharges from one area', cards: [
      card('focalspike', 'Focal spikes', 'Spikes or sharp waves from one region', { fig: 'focalspike' }, [FOC]),
      card('multi', 'Spikes in several places', 'Independent discharges from different regions', { fig: 'multi' }, ['eeg.multifocal']),
      card('ctsp', 'Centrotemporal spikes', 'High-amplitude spikes over the central–temporal area', { fig: 'ctsp' }, ['eeg.ctsp']),
      card('occ', 'Occipital spikes', 'Spikes at the back of the head', { fig: 'occ' }, ['eeg.occipital']),
      card('occeye', 'Occipital spikes on eye closure', 'Appear when the eyes close', { fig: 'occeye' }, ['eeg.occipital_eyeclosure']),
      card('temporal', 'Temporal sharp waves', 'Spikes over the temporal lobe', { fig: 'temporal' }, ['eeg.temporal_spikes']),
    ] },
    { title: 'Light, eyes and seizure patterns', cards: [
      card('ppr', 'Response to flashing light', 'Photoparoxysmal response', { fig: 'ppr' }, ['eeg.ppr']),
      card('pprslow', 'Response to slow flashes', 'Spikes locked to each flash at 1–3 per second', { fig: 'pprslow' }, ['eeg.ppr_slow']),
      card('eem', 'Polyspikes on eye closure', 'Eyelid fluttering with fast generalized polyspikes', { fig: 'eem' }, ['eeg.eem_pattern']),
      card('migrating', 'Seizure that moves around', 'The ictal rhythm travels between regions', { fig: 'migrating' }, ['eeg.ictal_migrating']),
    ] },
    { title: 'Slowing in one area', cards: [
      card('focalslow', 'Focal slowing', 'Slow waves that persist in one region', { fig: 'focalslow' }, ['eeg.focal_slow']),
      card('hemisph', 'One hemisphere slower', 'Slowing and flattening on one side', { fig: 'hemisph' }, ['eeg.hemispheric_slow']),
    ] },
  ];

  const EXAM = [
    card('normal', 'Examination normal', 'Nothing abnormal found', 'check', ['neuro.normal'], { exclusive: true, wide: true }),
    card('angioma', 'Port-wine mark on the face', 'Flat red-purple birthmark over the forehead or upper eyelid', ['neuro.facial_angioma_v1', 0], ['neuro.facial_angioma_v1']),
    card('micro', 'Small head size', 'Head circumference below the normal range', ['neuro.microcephaly', 0], ['neuro.microcephaly', 'neuro.abnormal_significant']),
    card('dysmorph', 'Unusual facial features or birth anomalies', 'Dysmorphism or congenital anomalies', ['neuro.dysmorphism', 0], ['neuro.dysmorphism', 'neuro.abnormal_significant']),
    card('asym', 'One side of the face moves less', 'Weaker smile or reduced movement on one side', ['neuro.facial_asymmetry', 0], ['neuro.facial_asymmetry', 'neuro.focal', 'neuro.abnormal_significant']),
    card('macules', 'Pale patches on the skin', 'Ash-leaf shaped, lighter than the surrounding skin', ['neuro.hypopigmented_macules', 0], ['neuro.hypopigmented_macules']),
    card('fibroma', 'Small red bumps on the face', 'Facial angiofibromas, or growths around the nails', ['neuro.angiofibromas', 0], ['neuro.angiofibromas']),
    card('cafe', 'Light-brown birthmarks or freckling', 'Café-au-lait patches, or freckles in the armpits or groin', ['neuro.cafe_au_lait', 0], ['neuro.cafe_au_lait']),
    card('floppy', 'Floppy muscles', 'Low muscle tone: limp, “frog-leg” posture', ['neuro.hypotonia', 1], ['neuro.hypotonia', 'neuro.abnormal_significant']),
    card('weak', 'Weakness of one side', 'Arm and leg weaker, sometimes smaller, on one side', ['neuro.hemiparesis_permanent', 0], ['neuro.hemiparesis_permanent', 'neuro.focal', 'neuro.abnormal_significant']),
    card('vision', 'Loss of part of the vision', 'Cannot see one side of the visual field', ['neuro.visual_field_deficit', 0], ['neuro.visual_field_deficit', 'neuro.focal', 'neuro.abnormal_significant']),
    card('ataxia', 'Unsteady, or unusual movements', 'Wide-based walking, dystonia or paroxysmal movements', ['neuro.movement_disorder', 0], ['neuro.movement_disorder', 'neuro.abnormal_significant']),
  ];

  /* ---- option builders (single-choice controls) ---- */
  const optSet = (key, label, map, extra) => Object.assign({ key, label, set: map }, extra || {});
  const optField = (key, label, field, value) => ({ key, label, field, value });
  const optUi = (key, label, ui, value, extra) => Object.assign({ key, label, ui, value }, extra || {});

  const DEV_OPTS = (field) => [
    optField('d0', 'Normal for age', field, 0), optField('d1', 'Mildly delayed', field, 1),
    optField('d2', 'Moderately delayed', field, 2), optField('d3', 'Severely delayed', field, 3),
  ];
  const GENES = V.SECTIONS.find((s) => s.key === 'gen').groups[0].items;
  const MRI_FINDINGS = [
    ['img.hs', 'Scarred hippocampus (hippocampal sclerosis)'], ['img.hh', 'Hypothalamic hamartoma'],
    ['img.mcd', 'Cortical malformation or dysplasia'], ['img.angioma', 'Leptomeningeal angioma (Sturge–Weber)'],
    ['img.occipital_calc', 'Calcification at the back of the brain'], ['img.lesion_other', 'Another structural lesion (tumour, stroke, scar…)'],
    ['img.hemiatrophy_prog', 'One side of the brain progressively shrinking'], ['img.hemisphere_edema', 'Acute swelling of one hemisphere'],
    ['img.hemisphere_atrophy_chronic', 'One hemisphere shrunken (long-standing)'],
  ];

  /* ---- steps ---- */
  const STEPS = [
    { short: 'About', key: 'who', title: 'About the person', question: 'Who is this about?', help: 'Age at the first seizure is the single most useful answer. Everything else can be skipped.',
      controls: [
        { id: 'onset', type: 'onset', title: 'How old were they at the first seizure?' },
        { id: 'sex', type: 'choice', title: 'Sex', options: [optField('f', 'Female', 'sex', 'F'), optField('m', 'Male', 'sex', 'M')] },
        { id: 'devOnset', type: 'choice', title: 'Before the seizures began, how was their development?', hint: 'Compared with other children of the same age — talking, walking, learning.', options: DEV_OPTS('devOnset') },
        { id: 'devNow', type: 'choice', title: 'And now?', options: DEV_OPTS('devNow') },
        { id: 'now', type: 'nowage', title: 'Current age (optional)' },
      ] },
    { short: 'Seizure', key: 'seizure', title: 'What the seizure looks like', question: 'What do the seizures look like?', help: 'Tap every picture that matches something you have seen — even if it only happened once. Anything you don’t tap counts as “not seen”.', implicitFalse: true,
      controls: [
        { id: 'seizure', type: 'cards', multi: true, implicitFalse: true, sections: SEIZURE_MAIN },
        { id: 'seizureMore', type: 'cards', multi: true, implicitFalse: true, more: 'Movements, face and feelings — more specific pictures', sections: SEIZURE_MORE },
        { id: 'aware', type: 'choice', title: 'During these episodes, the person…', when: 'focal', options: [
          optSet('aware', 'Stays aware and can respond', { 'sz.focal_aware': true, 'sz.focal_impaired': false }),
          optSet('unaware', 'Is not aware and does not respond', { 'sz.focal_aware': false, 'sz.focal_impaired': true }),
        ] },
      ] },
    { short: 'Timing', key: 'timing', title: 'When it happens', question: 'When do the seizures happen, and how are they going?', help: 'Pick whatever applies. Anything you leave out stays “not assessed” — it is never counted as no.',
      controls: [
        { id: 'sleepwake', type: 'choice', title: 'Sleep or awake?', options: [
          optSet('sleep_pred', 'Mostly asleep', { 'ctx.sleep_pred': true, 'ctx.sleep_only': false, 'ctx.wake_pred': false, 'ctx.wake_only': false }, { icon: 'moon', unless: 'ctx.sleep_only' }),
          optSet('sleep_only', 'Only asleep', { 'ctx.sleep_only': true, 'ctx.sleep_pred': true, 'ctx.wake_pred': false, 'ctx.wake_only': false }, { icon: 'moon' }),
          optSet('wake_pred', 'Mostly awake', { 'ctx.wake_pred': true, 'ctx.wake_only': false, 'ctx.sleep_pred': false, 'ctx.sleep_only': false }, { icon: 'sun', unless: 'ctx.wake_only' }),
          optSet('wake_only', 'Only awake', { 'ctx.wake_only': true, 'ctx.wake_pred': true, 'ctx.sleep_pred': false, 'ctx.sleep_only': false }, { icon: 'sun' }),
        ] },
        { id: 'timing', type: 'cards', multi: true, style: 'chips', sections: [
          { title: 'What sets them off?', cards: [
            chip('fever', 'Fever or illness', 'thermometer', ['ctx.fever']),
            chip('photic', 'Flickering light', 'zap', ['ctx.photic']),
            chip('eyeclose', 'Closing the eyes', 'eye', ['ctx.eye_closure']),
            chip('reading', 'Reading or talking', 'book', ['ctx.reading']),
            chip('hv', 'Fast, deep breathing', 'activity', ['ctx.hv']),
          ] },
          { title: 'How do they come?', cards: [
            chip('cluster', 'In clusters', null, ['ctx.cluster']),
            chip('daily', 'Every day', null, ['ctx.daily']),
            chip('drift', 'Soon after falling asleep or before waking', 'moon', ['ctx.sleep_onset_window']),
            chip('long', 'A seizure lasted over 10 minutes', 'clock', ['st.prolonged_gt10']),
          ] },
          { title: 'So far', cards: [
            chip('regress', 'Lost skills they once had', null, ['dev.regression']),
            chip('resist', 'Not controlled by two or more medicines', null, ['course.drug_resistant']),
          ] },
        ] },
      ] },
    { short: 'EEG', key: 'eeg', title: 'EEG', question: 'What did the EEG show?', help: 'Match the report to the closest picture. These are schematic drawings, not recordings — the EEG atlas explains each pattern in detail.',
      controls: [
        { id: 'eegGate', type: 'choice', title: 'Has an EEG been done?', options: [
          optUi('yes', 'Yes', 'eeg', 'yes'), optUi('no', 'Not yet, or not available', 'eeg', 'no'),
        ] },
        { id: 'eegBg', type: 'cards', single: true, title: 'Background rhythm', when: 'eegOpen', cards: EEG_BACKGROUND },
        { id: 'eegDis', type: 'cards', multi: true, title: 'Spikes, sharp waves and spike-wave', when: 'eegOpen', sections: EEG_DISCHARGES },
        { id: 'eegSleep', type: 'cards', multi: true, style: 'chips', when: 'eegOpen', sections: [{ title: '', cards: [chip('sleepact', 'Discharges increase in drowsiness or sleep', 'moon', ['eeg.sleep_activated'])] }] },
      ] },
    { short: 'Tests', key: 'tests', title: 'Scan, genes and other tests', question: 'What did the scan and other tests show?', help: 'Skip anything that has not been done.',
      controls: [
        { id: 'mri', type: 'choice', title: 'MRI brain', options: [
          optUi('notdone', 'Not done', 'mri', 'notdone'), optField('normal', 'Normal', 'mri', 'normal'), optField('abnormal', 'Abnormal', 'mri', 'abnormal'),
        ] },
        { id: 'mriItems', type: 'cards', multi: true, style: 'chips', when: 'mriAbnormal', sections: [{ title: 'What did it show?', cards: MRI_FINDINGS.map((f, i) => chip('img' + i, f[1], null, [f[0]])) }] },
        { id: 'gene', type: 'choice', title: 'Genetic testing', options: [
          optUi('notdone', 'Not done', 'gen', 'notdone'), optUi('none', 'Done — nothing found', 'gen', 'none'), optUi('found', 'Done — a variant was found', 'gen', 'found'),
        ] },
        { id: 'geneItems', type: 'cards', multi: true, style: 'chips', when: 'geneFound', sections: [{ title: 'Which gene?', cards: GENES.map((g, i) => chip('g' + i, g[1], null, [g[0]])) }] },
        { id: 'labs', type: 'cards', multi: true, style: 'chips', sections: [
          { title: 'Other results', cards: [
            chip('csf', 'Low glucose in spinal fluid', null, ['lab.csf_low_glucose']),
            chip('b6resp', 'Seizures stopped with vitamin B6', null, ['lab.pdx_response']),
            chip('b6mark', 'B6-dependency markers raised', null, ['lab.pdx_markers']),
            chip('antibody', 'Causal autoantibody found', null, ['lab.autoantibody']),
            chip('acute', 'Caused by an acute illness (infection, stroke, birth injury)', null, ['lab.acute_symptomatic_cause']),
          ] },
          { title: 'Family history', cards: [
            chip('fh_ad', 'Runs in the family (dominant pattern)', null, ['fh.ad_incomplete']),
            chip('fh_mtle', 'Relatives with temporal-lobe seizures', null, ['fh.mtle']),
            chip('fh_var', 'Relatives with focal seizures from different brain areas', null, ['fh.variable_foci']),
            chip('fh_early', 'Relatives whose seizures stopped in infancy', null, ['fh.focal_early_only']),
          ] },
        ] },
      ] },
    { short: 'Exam', key: 'exam', title: 'Physical examination', question: 'What does the examination show?', help: 'Tap anything abnormal, or “Examination normal”. Anything you don’t tap counts as “not found”. Skin signs look different on different skin tones.', implicitFalse: true,
      controls: [{ id: 'exam', type: 'cards', multi: true, implicitFalse: true, cards: EXAM }] },
  ];
  const RESULT = STEPS.length; // index of the result screen

  /* ---- control lookups ---- */
  const ctlById = {};
  STEPS.forEach((st) => st.controls.forEach((c) => { ctlById[c.id] = c; }));
  const sectionsOf = (c) => c.sections || [{ title: c.title || '', cards: c.cards || [] }];
  const cardsOf = (c) => [].concat(...sectionsOf(c).map((s) => s.cards));
  const cardByKey = (c, key) => cardsOf(c).find((x) => x.key === key);
  const valuesOf = (c) => (Array.isArray(c.set) ? c.set.reduce((o, id) => { o[id] = true; return o; }, {}) : c.set);
  const ensure = (s) => { s.findings = s.findings || {}; s.reviewed = s.reviewed || {}; s.ui = s.ui || {}; return s; };

  // A card is "on" when its PRIMARY finding (the first one listed as present) is present — so cards also light up
  // when the same finding was entered in the full checklist.
  const primary = (c) => (Array.isArray(c.set) ? c.set[0] : Object.keys(c.set).find((id) => c.set[id] === true));
  const cardOn = (s, c) => s.findings[primary(c)] === true;

  /* ---- state functions (all take the app state object `s`) ---- */
  function toggleCard(s, ctlId, key) {
    ensure(s);
    const ctl = ctlById[ctlId], c = cardByKey(ctl, key);
    if (!c) throw new Error('unknown card ' + ctlId + '/' + key);
    const f = s.findings, vals = valuesOf(c);
    if (cardOn(s, c)) {                                   // turn off
      const keep = new Set();
      cardsOf(ctl).forEach((o) => { if (o !== c && cardOn(s, o)) Object.keys(valuesOf(o)).forEach((id) => keep.add(id)); });
      Object.keys(vals).forEach((id) => { if (!keep.has(id)) delete f[id]; });
      return false;
    }
    if (ctl.single || c.exclusive) {                      // clear the others in this control first
      cardsOf(ctl).forEach((o) => { if (o !== c && (ctl.single || o.exclusive || c.exclusive)) Object.keys(valuesOf(o)).forEach((id) => { if (!(id in vals)) delete f[id]; }); });
    } else {                                              // an ordinary card removes any "exclusive" sibling (e.g. “Examination normal”)
      cardsOf(ctl).forEach((o) => { if (o.exclusive && cardOn(s, o)) Object.keys(valuesOf(o)).forEach((id) => { if (!(id in vals)) delete f[id]; }); });
    }
    Object.entries(vals).forEach(([id, v]) => { f[id] = v; });
    return true;
  }

  const optIsOn = (s, o) => {
    if (o.set) return s.findings[primary(o)] === true && !(o.unless && s.findings[o.unless] === true);
    if (o.field) return s[o.field] === o.value;
    if (o.ui === 'eeg') return eegOpen(s) === (o.value === 'yes') && (o.value === 'yes' || s.ui.eeg === 'no');
    if (o.ui === 'mri') return o.value === 'notdone' && s.ui.mri === 'notdone' && !s.mri;
    if (o.ui === 'gen') return genMode(s) === o.value;
    return false;
  };
  const anyEeg = (f) => Object.keys(f).some((id) => id.startsWith('eeg.'));
  const eegOpen = (s) => ensure(s) && (s.ui.eeg === 'yes' || (s.ui.eeg === undefined && anyEeg(s.findings)));
  const genFound = (s) => Object.keys(s.findings).some((id) => id.startsWith('gen.') && s.findings[id] === true);
  function genMode(s) {
    ensure(s);
    if (s.ui.gen === 'found' || genFound(s)) return 'found';
    if (s.ui.gen === 'notdone' && !s.reviewed.gen) return 'notdone';
    return s.reviewed.gen ? 'none' : null;
  }
  const condition = {
    focal: (s) => ensure(s) && ctlList(['seizure', 'seizureMore']).some((c) => cardsOf(c).some((x) => x.focal && cardOn(s, x))),
    eegOpen,
    mriAbnormal: (s) => s.mri === 'abnormal',
    geneFound: (s) => genMode(s) === 'found',
  };
  const ctlList = (ids) => ids.map((i) => ctlById[i]);
  const isShown = (s, c) => !c.when || condition[c.when](s);

  function setOption(s, ctlId, key) {
    ensure(s);
    const ctl = ctlById[ctlId], o = ctl.options.find((x) => x.key === key);
    if (!o) throw new Error('unknown option ' + ctlId + '/' + key);
    const on = optIsOn(s, o), f = s.findings;
    if (o.set) {
      ctl.options.forEach((x) => { if (x.set) Object.keys(x.set).forEach((id) => { delete f[id]; }); });
      if (!on) Object.assign(f, o.set);
    } else if (o.field) {
      s[o.field] = on ? (ctlId === 'sex' ? '' : ctlId === 'mri' ? '' : null) : o.value;
      if (ctlId === 'mri') { s.ui.mri = undefined; if (s.mri !== 'abnormal') MRI_FINDINGS.forEach((m) => { delete f[m[0]]; }); }
    } else if (o.ui === 'eeg') {                      // radio: never toggles off
      s.ui.eeg = o.value;
      if (o.value === 'no') Object.keys(f).filter((id) => id.startsWith('eeg.')).forEach((id) => { delete f[id]; });
      return true;
    } else if (o.ui === 'mri') {
      s.mri = ''; s.ui.mri = 'notdone';
      MRI_FINDINGS.forEach((m) => { delete f[m[0]]; });
      return true;
    } else if (o.ui === 'gen') {
      Object.keys(f).filter((id) => id.startsWith('gen.')).forEach((id) => { delete f[id]; });
      s.ui.gen = o.value; s.reviewed.gen = o.value !== 'notdone';
      return true;
    }
    return !on;
  }

  // Un-tapped pictures become "absent" — see the header note.
  function finalizeCards(s, ctl) {
    ensure(s);
    const cs = cardsOf(ctl), on = cs.filter((c) => cardOn(s, c)), keep = new Set();
    on.forEach((c) => Object.keys(valuesOf(c)).forEach((id) => keep.add(id)));
    cs.forEach((c) => Object.keys(valuesOf(c)).forEach((id) => {
      if (on.length && !keep.has(id)) s.findings[id] = false;
      else if (!on.length && s.findings[id] === false) delete s.findings[id];
    }));
    return on.length;
  }
  // Located discharges are, by definition, focal discharges: say so once the EEG step is done, so criteria that ask for
  // "focal epileptiform discharges" (or exclude them outside the occipital region) see them.
  const LOCATED = ['eeg.multifocal', 'eeg.ctsp', 'eeg.occipital', 'eeg.occipital_eyeclosure', 'eeg.temporal_spikes'];
  function finishStep(s, index) {
    ensure(s);
    const st = STEPS[index]; if (!st) return;
    if (st.key === 'eeg') { if (LOCATED.some((id) => s.findings[id] === true)) s.findings['eeg.focal_spikes'] = true; return; }
    if (!st.implicitFalse) return;
    if (st.key === 'seizure') {
      // the two seizure controls are judged together: one tap anywhere makes the rest "not seen"
      const ctls = ctlList(['seizure', 'seizureMore']);
      const any = ctls.some((c) => cardsOf(c).some((x) => cardOn(s, x)));
      const keep = new Set(), all = [].concat(...ctls.map(cardsOf));
      all.filter((x) => cardOn(s, x)).forEach((x) => Object.keys(valuesOf(x)).forEach((id) => keep.add(id)));
      all.forEach((x) => Object.keys(valuesOf(x)).forEach((id) => {
        if (any && !keep.has(id)) s.findings[id] = false; else if (!any && s.findings[id] === false) delete s.findings[id];
      }));
      const focal = condition.focal(s);
      ['sz.focal_aware', 'sz.focal_impaired'].forEach((id) => {
        if (any && !focal && s.findings[id] === undefined) s.findings[id] = false;
        if (!any && s.findings[id] === false) delete s.findings[id];
      });
    } else st.controls.forEach((c) => { if (c.implicitFalse) finalizeCards(s, c); });
  }

  /* ---- is the step answered? (drives the progress dots and the Continue/Skip label) ---- */
  function answered(s, index) {
    ensure(s);
    const st = STEPS[index]; if (!st) return false;
    return st.controls.some((c) => {
      if (c.type === 'onset') return String(s.onsetValue) !== '';
      if (c.type === 'nowage') return String(s.nowValue) !== '';
      if (c.type === 'choice') return c.options.some((o) => optIsOn(s, o));
      return cardsOf(c).some((x) => cardOn(s, x));
    });
  }

  /* ---- a convenience used by tests: tap things by name ---- */
  function newState() {
    return { onsetValue: '', onsetUnit: 'y', nowValue: '', nowUnit: 'y', sex: '', mri: '', devOnset: null, devNow: null, findings: {}, reviewed: {}, ui: {} };
  }
  const tap = (s, ctlId, key) => (ctlById[ctlId].type === 'choice' ? setOption(s, ctlId, key) : toggleCard(s, ctlId, key));

  /* =====================================================================================
     PART 2 — browser rendering
     ===================================================================================== */
  const api = { STEPS, RESULT, ctlById, cardsOf, sectionsOf, valuesOf, cardOn, optIsOn, toggleCard, setOption, finishStep, finalizeCards, answered, newState, tap, isShown, eegOpen, genMode, PLAIN };
  if (typeof document === 'undefined') return api;

  const $ = (sel, r) => (r || document).querySelector(sel);
  const $$ = (sel, r) => Array.from((r || document).querySelectorAll(sel));
  const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const IC = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
  const UNIT_NAME = { d: 'days', w: 'weeks', m: 'months', y: 'years' };
  let A = null, rootEl = null, step = 0;
  const picCache = {};

  function bodyAge(s) {
    const m = Number(s.onsetValue) * ({ d: 12 / 365.25, w: (12 / 365.25) * 7, m: 1, y: 12 }[s.onsetUnit] || 12);
    if (s.onsetValue === '' || Number.isNaN(m)) return 'adult';
    return m < 24 ? 'infant' : m < 144 ? 'child' : 'adult';
  }
  function picHtml(c, age) {
    const p = c.pic, key = JSON.stringify(p) + age;
    if (p && p.fig) { return picCache[key] || (picCache[key] = D.waveformSvg(p.fig, c.title, { thumb: true })); }
    if (Array.isArray(p)) {
      if (picCache[key]) return picCache[key];
      const e = S.byId[p[0]] || P.byId[p[0]], fr = e && e.frames[Math.min(p[1], e.frames.length - 1)];
      return (picCache[key] = fr ? F.framesSvg([fr], c.title, { age, thumb: true }) : '');
    }
    return IC(p || 'help', 'big');
  }

  function cardHtml(ctl, c, age) {
    if (ctl.style === 'chips') {
      return `<button type="button" class="ct" data-act="pick" data-ctl="${ctl.id}" data-key="${c.key}" aria-pressed="false">${c.icon ? IC(c.icon) : ''}<span>${esc(c.title)}</span>${IC('check', 'tk')}</button>`;
    }
    return `<button type="button" class="pk${c.wide ? ' wide' : ''}" data-act="pick" data-ctl="${ctl.id}" data-key="${c.key}" aria-pressed="false">
      <span class="pk-pic${c.pic && c.pic.fig ? ' eeg' : ''}">${picHtml(c, age)}</span><span class="pk-tx"><span class="pk-t">${esc(c.title)}</span>${c.sub ? `<span class="pk-s">${esc(c.sub)}</span>` : ''}</span><span class="pk-tick">${IC('check')}</span></button>`;
  }
  function sectionsHtml(ctl, age) {
    const chips = ctl.style === 'chips';
    return sectionsOf(ctl).map((sec) => `${sec.title ? `<h3 class="wz-sub">${esc(sec.title)}</h3>` : ''}<div class="${chips ? 'wz-chips' : 'wz-grid'}"${chips ? ' role="group"' : ''}>${sec.cards.map((c) => cardHtml(ctl, c, age)).join('')}</div>`).join('');
  }
  function choiceHtml(ctl) {
    return `<div class="wz-ctl" data-ctl-wrap="${ctl.id}"><h3 class="wz-sub" id="h-${ctl.id}">${esc(ctl.title)}</h3>${ctl.hint ? `<p class="wz-hint">${esc(ctl.hint)}</p>` : ''}
      <div class="wz-chips" role="group" aria-labelledby="h-${ctl.id}">${ctl.options.map((o) => `<button type="button" class="ct" data-act="opt" data-ctl="${ctl.id}" data-key="${o.key}" aria-pressed="false">${o.icon ? IC(o.icon) : ''}<span>${esc(o.label)}</span>${IC('check', 'tk')}</button>`).join('')}</div></div>`;
  }
  function unitChips(field, cur) {
    return `<div class="wz-chips unit" role="group" aria-label="Unit">${['d', 'w', 'm', 'y'].map((u) => `<button type="button" class="ct sm" data-act="unit" data-field="${field}" data-v="${u}" aria-pressed="${cur === u}">${UNIT_NAME[u]}</button>`).join('')}</div>`;
  }
  function controlHtml(ctl, s) {
    const age = bodyAge(s);
    if (ctl.type === 'onset') {
      return `<div class="wz-ctl"><h3 class="wz-sub" id="h-onset">${esc(ctl.title)}</h3><div class="wz-age"><input id="wz-onset" type="number" min="0" step="any" inputmode="decimal" placeholder="e.g. 7" aria-labelledby="h-onset" value="${esc(s.onsetValue)}">${unitChips('onsetUnit', s.onsetUnit)}</div></div>`;
    }
    if (ctl.type === 'nowage') {
      return `<details class="wz-more"${String(s.nowValue) !== '' ? ' open' : ''}><summary>${IC('chevron', 'chev')}${esc(ctl.title)}</summary><div class="wz-age"><input id="wz-now" type="number" min="0" step="any" inputmode="decimal" placeholder="e.g. 8" aria-label="Current age" value="${esc(s.nowValue)}">${unitChips('nowUnit', s.nowUnit)}</div></details>`;
    }
    if (ctl.type === 'choice') return `<div${ctl.when ? ` data-when="${ctl.when}"` : ''}>${choiceHtml(ctl)}</div>`;
    const inner = ctl.more
      ? `<details class="wz-more" data-more="${ctl.id}"><summary>${IC('chevron', 'chev')}<span>${esc(ctl.more)}</span><span class="wz-n" data-n="${ctl.id}" hidden></span></summary>${sectionsHtml(ctl, age)}</details>`
      : `${ctl.title && ctl.sections ? `<h3 class="wz-sub">${esc(ctl.title)}</h3>` : ''}${sectionsHtml(ctl, age)}`;
    return `<div class="wz-ctl"${ctl.when ? ` data-when="${ctl.when}"` : ''}>${inner}</div>`;
  }

  /* ---- chrome ---- */
  function progress() {
    const s = A.state(), items = STEPS.map((st, i) => `<li><button type="button" class="wz-dot${i === step ? ' cur' : ''}${i !== step && answered(s, i) ? ' done' : ''}" data-act="jump" data-to="${i}" aria-label="Step ${i + 1}: ${esc(st.title)}${answered(s, i) ? ' (answered)' : ''}"${i === step ? ' aria-current="step"' : ''}><span class="n">${answered(s, i) && i !== step ? IC('check') : i + 1}</span><span class="t">${esc(st.short)}</span></button></li>`);
    items.push(`<li><button type="button" class="wz-dot res${step === RESULT ? ' cur' : ''}" data-act="jump" data-to="${RESULT}" aria-label="Result"${step === RESULT ? ' aria-current="step"' : ''}><span class="n">${IC('check')}</span><span class="t">Result</span></button></li>`);
    return `<ol class="wz-prog" aria-label="Progress">${items.join('')}</ol>`;
  }
  function navHtml() {
    const last = step === STEPS.length - 1;
    return `<div class="wz-nav"><button type="button" class="btn" data-act="back"${step === 0 ? ' hidden' : ''}>${IC('arrow', 'flip')}Back</button>
      <span class="wz-so" id="wz-so" aria-live="polite"></span>
      <button type="button" class="btn btn-primary" data-act="next" id="wz-next"><span id="wz-next-t">${last ? 'See result' : 'Continue'}</span>${IC('arrow')}</button></div>`;
  }

  function statusText() {
    if (!A.hasInput()) return '';
    const ev = A.evaluate(), top = ev.results.filter((r) => r.status !== 'excluded')[0];
    return top ? `So far: <b>${esc(top.abbr)}</b> · ${top.status === 'met' ? 'criteria met' : 'possible'}` : 'So far: no syndrome fits yet';
  }
  function paint() {
    const s = A.state();
    $$('[data-act=pick]', rootEl).forEach((b) => { const c = cardByKey(ctlById[b.dataset.ctl], b.dataset.key); b.setAttribute('aria-pressed', String(cardOn(s, c))); });
    $$('[data-act=opt]', rootEl).forEach((b) => { const o = ctlById[b.dataset.ctl].options.find((x) => x.key === b.dataset.key); b.setAttribute('aria-pressed', String(optIsOn(s, o))); });
    $$('[data-when]', rootEl).forEach((w) => { w.hidden = !condition[w.dataset.when](s); });
    $$('.wz-n', rootEl).forEach((n) => { const c = ctlById[n.dataset.n], k = cardsOf(c).filter((x) => cardOn(s, x)).length; n.hidden = !k; n.textContent = k + ' selected'; });
    $$('details[data-more]', rootEl).forEach((d) => { if (cardsOf(ctlById[d.dataset.more]).some((x) => cardOn(s, x))) d.open = true; });
    const nt = $('#wz-next-t'); if (nt) nt.textContent = step === STEPS.length - 1 ? 'See result' : (answered(s, step) ? 'Continue' : 'Skip this step');
    const nb = $('#wz-next'); if (nb) nb.classList.toggle('quiet', !answered(s, step));
    const so = $('#wz-so'); if (so) so.innerHTML = step > 0 ? statusText() : '';
    $$('.wz-dot', rootEl).forEach((d, i) => { if (i < STEPS.length && i !== step) { const done = answered(s, i); d.classList.toggle('done', done); const n = $('.n', d); n.innerHTML = done ? IC('check') : String(i + 1); } });
  }

  function renderStep() {
    const s = A.state(), st = STEPS[step];
    rootEl.innerHTML = `${progress()}<section class="wz-card" aria-labelledby="wz-h">
      <header class="wz-head"><p class="wz-eyebrow">Step ${step + 1} of ${STEPS.length} · ${esc(st.title)}</p><h2 id="wz-h" tabindex="-1">${esc(st.question)}</h2><p class="wz-help">${esc(st.help)}</p></header>
      ${st.controls.map((c) => controlHtml(c, s)).join('')}
      ${step === 0 ? exampleHtml() : ''}
      ${step === 3 ? `<p class="wz-link"><a href="#/atlas">${IC('book')}Not sure what a pattern is called? Open the EEG atlas</a></p>` : ''}
      ${step === 1 ? `<p class="wz-link"><a href="#/movements">${IC('book')}See every movement in detail in the library</a></p>` : ''}
      </section>${navHtml()}`;
    paint();
  }
  function exampleHtml() {
    return `<details class="wz-more wz-ex"><summary>${IC('chevron', 'chev')}Just exploring? Try an example case</summary><div class="wz-exl">${A.examples().map((e) => `<button type="button" class="try-btn" data-act="example" data-id="${e.id}"><span>${esc(e.title)}</span>${IC('arrow')}</button>`).join('')}</div></details>`;
  }

  /* ---- result screen ---- */
  const STATUS = { met: ['check', 'Criteria met'], possible: ['help', 'Possible'], excluded: ['x', 'Not consistent'] };
  const pill = (st) => `<span class="pill ${st}">${IC(STATUS[st][0])}${STATUS[st][1]}</span>`;
  const mand = (r) => r.rows.filter((x) => x.level === 'M' && x.expr && !x.follow);
  function renderResult() {
    const s = A.state();
    if (!A.hasInput()) {
      rootEl.innerHTML = `${progress()}<section class="wz-card wz-res"><header class="wz-head"><p class="wz-eyebrow">Result</p><h2 id="wz-h" tabindex="-1">Nothing to assess yet</h2><p class="wz-help">Answer at least one question — the age at the first seizure and a picture of the seizure are the most useful.</p></header>
        <div class="wz-actions"><button type="button" class="btn btn-primary" data-act="edit">${IC('arrow')}Start with step 1</button></div></section>`;
      return;
    }
    const ev = A.evaluate(), shown = ev.results.filter((r) => r.status !== 'excluded'), top = shown[0], others = shown.slice(1, 4);
    let h = progress();
    ev.flags.filter((f) => f.level === 'urgent').forEach((f) => { h += `<div class="alertbox urgent" role="alert">${IC('alert')}<div><b>Time-critical</b>${esc(f.text)}</div></div>`; });
    h += '<section class="wz-card wz-res" aria-labelledby="wz-h">';
    if (top) {
      const fits = mand(top).filter((x) => x.state === 'met'), needs = mand(top).filter((x) => x.state === 'pending' || x.state === 'unmet');
      const al = top.rows.filter((x) => x.level === 'A' && x.state === 'alert');
      h += `<header class="wz-head"><p class="wz-eyebrow">${top.status === 'met' ? 'Best match' : 'Closest match so far'}</p>
        <h2 id="wz-h" tabindex="-1">${esc(top.name)} <span class="abbr">${esc(top.abbr)}</span></h2>${pill(top.status)}
        <p class="wz-plain">${esc(PLAIN[top.id] || '')}</p></header>`;
      h += `<div class="wz-fit"><div class="wz-meter" role="img" aria-label="${top.counts.mandatoryMet} of ${top.counts.mandatoryTotal} required features present"><span class="wz-meter-n">${top.counts.mandatoryMet}<small>/${top.counts.mandatoryTotal}</small></span><span class="wz-meter-t">required features present</span></div></div>`;
      if (fits.length) h += `<h3 class="wz-sub">What fits</h3><ul class="wz-list good">${fits.map((x) => `<li>${IC('check', 'good')}<span>${esc(x.text)}</span></li>`).join('')}</ul>`;
      if (needs.length) h += `<h3 class="wz-sub">${top.status === 'met' ? 'Still to confirm' : 'What is still needed'}</h3><ul class="wz-list">${needs.map((x) => `<li>${IC(x.state === 'unmet' ? 'x' : 'help', x.state === 'unmet' ? 'bad' : 'warn')}<span>${esc(x.text)}<small>${x.state === 'unmet' ? 'Does not fit what was entered' : 'Not answered yet'}</small></span></li>`).join('')}</ul>`;
      if (al.length) h += `<h3 class="wz-sub">Features that make this less likely</h3><ul class="wz-list">${al.map((x) => `<li>${IC('alert', 'warn')}<span>${esc(x.text)}</span></li>`).join('')}</ul>`;
    } else {
      h += `<header class="wz-head"><p class="wz-eyebrow">Result</p><h2 id="wz-h" tabindex="-1">No specific syndrome fits yet</h2>
        <p class="wz-plain">That is common early on, or when the epilepsy is not one of the ${A.syndromeCount()} syndromes with formal ILAE criteria. The seizure and epilepsy type below are then the right level of diagnosis.</p></header>`;
    }
    const seiz = ev.sz.seizures.map((x) => x.name);
    h += `<h3 class="wz-sub">In classification terms</h3><dl class="wz-dl"><div><dt>Seizure type</dt><dd>${seiz.length ? esc(seiz.join('; ')) : 'Not enough information'}</dd></div><div><dt>Epilepsy type</dt><dd>${esc(ev.et.type)}</dd></div></dl>`;
    if (ev.steps.length) h += `<h3 class="wz-sub">What to do next</h3><ol class="wz-next">${ev.steps.slice(0, 5).map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ol>`;
    if (others.length) h += `<h3 class="wz-sub">Other possibilities</h3><ul class="wz-others">${others.map((r) => `<li><div><b>${esc(r.name)}</b> <span class="abbr">${esc(r.abbr)}</span>${pill(r.status)}<small>${esc(PLAIN[r.id] || '')}</small></div><span class="wz-frac">${r.counts.mandatoryMet}/${r.counts.mandatoryTotal}</span></li>`).join('')}</ul>`;
    h += `<div class="wz-actions"><button type="button" class="btn" data-act="edit">${IC('arrow', 'flip')}Change answers</button><button type="button" class="btn" data-act="full">${IC('book')}See every criterion</button><button type="button" class="btn" data-act="copy">${IC('copy')}Copy summary</button><button type="button" class="btn" data-act="print">${IC('printer')}Print / PDF</button><button type="button" class="btn" data-act="restart">${IC('reset')}Start over</button></div>
      <p class="disc">Rule-based support derived from the published ILAE criteria. It does not diagnose; verify against the source papers and apply clinical judgement.</p></section>`;
    rootEl.innerHTML = h;
    A.setLive(top ? `Best match: ${top.name}, ${STATUS[top.status][1].toLowerCase()}.` : 'No specific syndrome fits yet.');
  }

  /* ---- navigation + events ---- */
  const stepFromHash = () => { const m = /^#\/guided\/(\d+)/.exec(location.hash); return m ? Math.min(Number(m[1]), RESULT) : 0; };
  function go(n) {
    const target = '#/guided/' + n;
    if (location.hash === target) show(); else location.hash = target;
  }
  let prev = null; // the step being left is finished (see finishStep) whichever way the user leaves it
  function show() {
    const next = stepFromHash();
    if (prev !== null && prev !== next && prev < RESULT) { finishStep(A.state(), prev); A.changed(); }
    step = prev = next;
    if (step === RESULT) renderResult(); else renderStep();
    const h = $('#wz-h'); if (h) h.focus({ preventScroll: true });
  }
  function changed() { A.changed(); paint(); }

  function onClick(e) {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const s = A.state(), act = t.dataset.act;
    if (act === 'pick') { toggleCard(s, t.dataset.ctl, t.dataset.key); changed(); }
    else if (act === 'opt') { setOption(s, t.dataset.ctl, t.dataset.key); changed(); if (t.dataset.ctl === 'eegGate' || t.dataset.ctl === 'mri' || t.dataset.ctl === 'gene') paint(); }
    else if (act === 'unit') { s[t.dataset.field] = t.dataset.v; $$(`[data-act=unit][data-field=${t.dataset.field}]`, rootEl).forEach((b) => b.setAttribute('aria-pressed', String(b === t))); changed(); }
    else if (act === 'next') go(step + 1);
    else if (act === 'back') go(Math.max(0, step - 1));
    else if (act === 'jump') go(Number(t.dataset.to));
    else if (act === 'edit') go(0);
    else if (act === 'full') location.hash = '#/assess';
    else if (act === 'print') window.print();
    else if (act === 'copy') A.copy(t);
    else if (act === 'restart') { A.reset(); go(0); }
    else if (act === 'example') { A.loadExample(t.dataset.id); go(RESULT); }
  }
  function onInput(e) {
    const s = A.state();
    if (e.target.id === 'wz-onset') s.onsetValue = e.target.value;
    else if (e.target.id === 'wz-now') s.nowValue = e.target.value;
    else return;
    A.changed(); paint();
  }
  function onKey(e) {
    if (e.key === 'Enter' && (e.target.id === 'wz-onset' || e.target.id === 'wz-now')) { e.preventDefault(); go(step + 1); }
  }

  function mount(app) {
    A = app; rootEl = document.getElementById('wz-root');
    rootEl.addEventListener('click', onClick); rootEl.addEventListener('input', onInput); rootEl.addEventListener('keydown', onKey);
  }
  const leave = () => { if (prev !== null && prev < RESULT) { finishStep(A.state(), prev); A.changed(); } prev = null; };
  const forget = () => { prev = null; };
  return Object.assign(api, { mount, show, go, leave, forget, refresh: () => { if (rootEl && !rootEl.closest('[hidden]')) show(); } });
});
