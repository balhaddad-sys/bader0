/*
 * Worked example cases. Used by the "Load example" menu in the UI and as
 * regression fixtures in tests (each declares the expected top syndrome).
 * These are synthetic teaching vignettes, not real patients.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EpiExamples = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const Y = (n) => n * 12;
  const D = (n) => (n * 12) / 365.25;
  const rv = (...keys) => keys.reduce((o, k) => { o[k] = true; return o; }, {});
  const on = (...ids) => ids.reduce((o, k) => { o[k] = true; return o; }, {});

  return [
    {
      id: 'cae', title: '7-year-old with daily staring spells', expectTop: 'CAE',
      blurb: 'Typical absences provoked by hyperventilation, 3 Hz generalized spike-wave, normal MRI and development.',
      patient: {
        onsetMonths: Y(7), nowMonths: Y(8), sex: 'F', mri: 'normal', devOnset: 0, devNow: 0,
        findings: on('sz.abs_typical', 'ctx.hv', 'ctx.abs_daily', 'eeg.bg_normal', 'eeg.gsw_3hz', 'neuro.normal'),
        reviewed: rv('sz', 'sem', 'ctx', 'eeg', 'gen', 'lab', 'neuro'),
      },
    },
    {
      id: 'jme', title: '15-year-old with morning jerks', expectTop: 'JME',
      blurb: 'Myoclonic jerks on waking and a generalized tonic–clonic seizure; 4–5 Hz polyspike-wave; normal MRI.',
      patient: {
        onsetMonths: Y(15), nowMonths: Y(15), sex: 'M', mri: 'normal', devOnset: 0, devNow: 0,
        findings: on('sz.myoclonic', 'sz.gtc', 'eeg.bg_normal', 'eeg.gsw_3_55', 'eeg.gen_epileptiform', 'neuro.normal'),
        reviewed: rv('sz', 'sem', 'ctx', 'eeg', 'gen', 'lab', 'neuro'),
      },
    },
    {
      id: 'iess', title: '6-month-old with clusters of spasms', expectTop: 'IESS',
      blurb: 'Flexor spasm clusters on waking, developmental plateau, hypsarrhythmia. Time-critical.',
      patient: {
        onsetMonths: 6, nowMonths: 6, sex: 'M', mri: null, devOnset: null, devNow: null,
        findings: on('sz.spasms', 'eeg.hypsarrhythmia', 'dev.regression', 'ctx.cluster'),
        reviewed: rv('sz', 'eeg'),
      },
    },
    {
      id: 'dravet', title: '8-month-old with prolonged febrile hemiclonic seizure', expectTop: 'DRAVET',
      blurb: 'Fever-triggered, side-alternating hemiclonic seizures >10 min, normal development so far, SCN1A variant.',
      patient: {
        onsetMonths: 6, nowMonths: 8, sex: 'F', mri: 'normal', devOnset: 0, devNow: 0,
        findings: on('sem.hemiclonic', 'ctx.fever', 'st.prolonged_gt10', 'gen.scn1a', 'eeg.bg_normal', 'neuro.normal'),
        reviewed: rv('sz', 'sem', 'ctx', 'eeg', 'neuro'),
      },
    },
    {
      id: 'selects', title: '8-year-old with nocturnal face-twitching', expectTop: 'SELECTS',
      blurb: 'Oro-facial focal seizures with speech arrest shortly after falling asleep; centrotemporal spikes; normal MRI.',
      patient: {
        onsetMonths: Y(8), nowMonths: Y(9), sex: 'M', mri: 'normal', devOnset: 0, devNow: 0,
        findings: on('sz.focal_aware', 'sem.oral_speech', 'ctx.sleep_pred', 'ctx.sleep_onset_window', 'eeg.ctsp', 'eeg.bg_normal', 'eeg.sleep_activated', 'neuro.normal'),
        reviewed: rv('sz', 'sem', 'ctx', 'eeg', 'neuro'),
      },
    },
    {
      id: 'selne', title: 'Neonate (day 5) with focal tonic seizures, family history', expectTop: 'SELNE',
      blurb: 'Well baby with focal tonic then clonic seizures; normal MRI; KCNQ2 variant; dominant family history.',
      patient: {
        onsetMonths: D(5), nowMonths: D(7), sex: 'F', mri: 'normal', devOnset: 0, devNow: 0,
        findings: on('sz.focal_aware', 'sem.tonic_focal', 'sem.clonic_focal', 'gen.kcnq2', 'fh.ad_incomplete', 'eeg.bg_normal', 'neuro.normal'),
        reviewed: rv('sz', 'sem', 'ctx', 'eeg', 'neuro', 'lab', 'gen'),
      },
    },
    {
      id: 'mtlehs', title: '25-year-old with déjà vu auras', expectTop: 'MTLEHS',
      blurb: 'Rising epigastric aura, déjà vu, impaired consciousness; temporal spikes; hippocampal sclerosis on MRI.',
      patient: {
        onsetMonths: Y(14), nowMonths: Y(25), sex: 'F', mri: 'abnormal', devOnset: 0, devNow: 0,
        findings: on('sz.focal_impaired', 'sem.mesial_temporal', 'sem.cog_dejavu', 'eeg.temporal_spikes', 'img.hs', 'course.drug_resistant', 'neuro.normal'),
        reviewed: rv('sz', 'sem', 'ctx', 'eeg', 'neuro', 'lab', 'gen'),
      },
    },
    {
      id: 'lgs', title: '4-year-old with drops and tonic seizures', expectTop: 'LGS',
      blurb: 'Tonic, atonic and atypical absence seizures; slow spike-wave and GPFA in sleep; drug-resistant; moderate ID.',
      patient: {
        onsetMonths: Y(2.5), nowMonths: Y(4), sex: 'M', mri: 'normal', devOnset: 1, devNow: 2,
        findings: on('sz.tonic', 'sz.atonic', 'sz.abs_atypical', 'eeg.gsw_slow', 'eeg.gpfa', 'eeg.bg_diffuse_slow', 'course.drug_resistant'),
        reviewed: rv('sz', 'sem', 'ctx', 'eeg'),
      },
    },
  ];
});
