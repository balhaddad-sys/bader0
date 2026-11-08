/*
 * Knowledge base: ILAE 2022 epilepsy-syndrome diagnostic criteria.
 *
 * Encoded from the "Mandatory / Alerts / Exclusionary" tables in:
 *   zuberi2022  Zuberi et al.  Epilepsia 2022;63:1349-1397 (neonates & infants)
 *   specchio2022 Specchio et al. Epilepsia 2022;63:1398-1442 (childhood)
 *   riney2022   Riney et al.   Epilepsia 2022;63:1443-1474 (variable age)
 *   hirsch2022  Hirsch et al.  Epilepsia 2022;63:1475-1499 (idiopathic generalized)
 *
 * Line format
 *   ## ID | Name | Abbrev | Group | Source | Table | Epilepsy type
 *   M|A|E domain | criterion text :: expression [@core] [@follow]
 *      M = mandatory   A = alert (rethink diagnosis)   E = exclusionary
 *      @core   defining criterion: the syndrome is only considered when a
 *              @core criterion is met
 *      @follow depends on later course; never blocks an early diagnosis
 *      expression "-" = not assessable by this tool (shown for manual check)
 *   > note        ! urgent|caution|info | flag text
 *
 * Expression language is documented in engine.js. Age is age at seizure onset.
 * A criterion text is a faithful paraphrase of the ILAE table cell; where the
 * ILAE gave "or" alternatives they are expressed with "|".
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EpiKB = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const TEXT = `
// =====================================================================
// NEONATES & INFANTS  (Zuberi 2022)
// =====================================================================
## SELNE | Self-limited (familial) neonatal epilepsy | SeLNE | Neonate–infant | zuberi2022 | Table 1 | Focal
M sz | Focal tonic seizures at onset affecting head, face and limbs; focal clonic/tonic seizures may alternate sides and evolve to bilateral tonic or clonic :: sem.tonic_focal | sem.clonic_focal @core
M img | Non-lesional MRI (required for diagnosis) :: img.normal
A sz | History suggesting in-utero seizures :: -
E sz | Epileptic spasms, myoclonic seizures, generalized tonic seizures or generalized tonic–clonic seizures :: sz.spasms | sz.myoclonic | sz.tonic | sz.gtc
A eeg | Interictal mild background slowing :: eeg.bg_mild_slow
E eeg | Persistent focal slowing or moderate-or-greater background slowing; burst-suppression; hypsarrhythmia :: eeg.focal_slow | eeg.bg_diffuse_slow | eeg.burst_suppression | eeg.hypsarrhythmia
E eeg | Ictal: lack of EEG correlate with clinical symptoms :: eeg.ictal_no_corr
E onset | Onset after the first month of life :: age>1m
E dev | Any degree of encephalopathy at onset :: dev.encephalopathy
A neuro | Significant neurological examination abnormalities :: neuro.abnormal_significant
E img | Neuroimaging documenting a causal lesion :: img.lesion
E gen | Other acute symptomatic cause (CNS infection, stroke, HIE, significant metabolic disturbance) :: lab.acute_symptomatic_cause
A gen | Neither a pathogenic variant in the associated gene (KCNQ2/KCNQ3) nor a family history suggesting AD inheritance with incomplete penetrance :: !(gen.kcnq2 | gen.kcnq3 | fh.ad_incomplete)
A course | Mild long-term neurodevelopmental delay; drug-resistant epilepsy :: devn.mild | course.drug_resistant @follow
A course | Lack of remission after 6 months of age :: - @follow
E course | Moderate-to-severe long-term neurodevelopmental disability :: devn.moderate_plus @follow
> Non-lesional MRI is required; ictal EEG is not. Without EEG/MRI (resource-limited), SeLNE may be diagnosed in a neonate with a suggestive family history, no alerts and a typical course.

## SELFNIE | Self-limited familial neonatal-infantile epilepsy | SeLFNIE | Neonate–infant | zuberi2022 | Table 2 | Focal
M sz | Focal tonic seizures with head and eye deviation, followed by other tonic and clonic features; may evolve to bilateral tonic–clonic :: sem.tonic_focal | sem.version | sem.clonic_focal @core
M onset | Age at onset 1 day to 23 months :: age>=1d & age<24m
M img | Non-lesional MRI (required for diagnosis) :: img.normal
A sz | Sequential seizures :: sem.sequential
E sz | Epileptic spasms or myoclonic seizures :: sz.spasms | sz.myoclonic
A eeg | Interictal mild background slowing :: eeg.bg_mild_slow
E eeg | Persistent focal slowing or moderate-or-greater background slowing; burst-suppression; hypsarrhythmia :: eeg.focal_slow | eeg.bg_diffuse_slow | eeg.burst_suppression | eeg.hypsarrhythmia
E eeg | Ictal: lack of EEG correlate with clinical symptoms :: eeg.ictal_no_corr
A dev | History of prior acute symptomatic seizures (infection, stroke, HIE, metabolic) :: lab.acute_symptomatic_cause
E dev | Encephalopathy at onset :: dev.encephalopathy
A neuro | Significant neurological examination abnormalities :: neuro.abnormal_significant
E img | Neuroimaging documenting a causal lesion :: img.lesion
A gen | Lack of pathogenic variant in the associated gene (usually SCN2A) :: !gen.scn2a
A course | Mild long-term neurodevelopmental delay; drug-resistant epilepsy :: devn.mild | course.drug_resistant @follow
A course | Lack of remission by age 2 years :: - @follow
E course | Moderate-to-severe long-term neurodevelopmental disability :: devn.moderate_plus @follow
> Non-lesional MRI is required; ictal EEG is not.

## SELIE | Self-limited (familial) infantile epilepsy | SeLIE | Neonate–infant | zuberi2022 | Table 3 | Focal
M sz | Focal seizures with behavioural arrest, impaired awareness, automatisms, head/eye version and clonic movements (often alternating sides; may become hemiclonic or focal to bilateral tonic–clonic); usually brief (<3 min) :: sz.focal_aware | sz.focal_impaired | sem.behavioral_arrest | sem.version | sem.clonic_focal @core
M img | Non-lesional MRI (required for diagnosis) :: img.normal
A sz | Prolonged (>10 min) or hemiclonic seizures :: st.prolonged_gt10 | sem.hemiclonic
E sz | Epileptic spasms, myoclonic, sequential or tonic seizures :: sz.spasms | sz.myoclonic | sem.sequential | sz.tonic
A eeg | Interictal mild background slowing :: eeg.bg_mild_slow
E eeg | Persistent focal slowing or moderate-or-greater background slowing; hypsarrhythmia :: eeg.focal_slow | eeg.bg_diffuse_slow | eeg.hypsarrhythmia
A onset | Onset 18–36 months :: age[18m,36m]
E onset | Onset <1 month or >36 months :: age<1m | age>36m
A dev | Mild developmental delay at onset :: devo.mild
E dev | Moderate-to-profound delay, or neurocognitive regression :: devo.moderate_plus | dev.regression
A neuro | Significant neurological examination abnormalities :: neuro.abnormal_significant
E img | Causal lesion on brain MRI :: img.lesion
A gen | Neither a pathogenic variant (PRRT2, SCN2A, KCNQ2, KCNQ3) nor a family history suggesting AD inheritance with incomplete penetrance :: !(gen.prrt2 | gen.scn2a | gen.kcnq2 | gen.kcnq3 | fh.ad_incomplete)
A course | Lack of remission by late childhood :: - @follow
E course | Neurocognitive regression with myoclonic seizures, ataxia, spasticity :: course.regression_myoclonic_ataxia
> Non-lesional MRI is required; ictal EEG is not. PRRT2 variants may also cause paroxysmal kinesigenic dyskinesia — ask specifically.

## MEI | Myoclonic epilepsy in infancy | MEI | Neonate–infant | zuberi2022 | Table 4 | Generalized
M sz | Myoclonic seizures :: sz.myoclonic @core
M eeg | Normal EEG background :: eeg.bg_normal
M img | Non-lesional MRI (required for diagnosis) :: img.normal
A sz | Afebrile generalized tonic–clonic or generalized clonic seizure at time of epilepsy onset :: sz.gtc | sz.clonic
E sz | Absence, atonic, epileptic spasms, focal impaired awareness, hemiclonic, myoclonic-absence or tonic seizures :: sz.abs_typical | sz.abs_atypical | sz.atonic | sz.spasms | sz.focal_impaired | sem.hemiclonic | sz.abs_myoclonic | sz.tonic
A eeg | Lack of generalized spike-wave on sleep recording; PPR at low-frequency photic stimulation (suggests CLN2) :: !(eeg.gsw_3hz | eeg.gsw_3_55 | eeg.gsw_2_6) | eeg.ppr_slow
E eeg | Recorded myoclonic event without EEG correlate; hypsarrhythmia; generalized slow spike-wave <2.5 Hz :: eeg.ictal_no_corr | eeg.hypsarrhythmia | eeg.gsw_slow
E onset | Onset of myoclonic seizures ≤4 months or >3 years :: age<=4m | age>36m
A dev | Speech delay at diagnosis, or moderate-to-profound ID :: dev.speech_delay | devo.moderate_plus
A neuro | Significant neurological examination abnormalities :: neuro.abnormal_significant
E neuro | Dysmorphism or congenital anomalies (suggests chromosomal disorder) :: neuro.dysmorphism
E img | Significant neuroimaging abnormalities :: img.abnormal_significant
E gen | Low CSF glucose or pathogenic SLC2A1 variant (GLUT1DS) :: lab.csf_low_glucose | gen.slc2a1
E course | Neurocognitive regression :: dev.regression
> Non-lesional MRI is required. Ictal EEG is not required but should be considered if the sleep recording lacks generalized spike-wave, to prove the myoclonus is epileptic.

## EIDEE | Early infantile developmental and epileptic encephalopathy | EIDEE | Neonate–infant | zuberi2022 | Table 5 | Focal and/or generalized
M sz | Tonic and/or myoclonic seizures :: sz.tonic | sz.myoclonic | sem.tonic_focal @core
M eeg | Interictal burst-suppression or multifocal discharges :: eeg.burst_suppression | eeg.multifocal
M onset | Birth to 3 months (adjusted for prematurity) :: age<=3m
M dev | Developmental impairment present before or shortly after seizure onset :: devo.any_impair | dev.encephalopathy
M course | Abnormal neurodevelopment including intellectual disability :: devn.any_impair @follow
A dev | Normal development at onset :: devo.normal
A neuro | Normal neurological examination at onset :: neuro.normal
> MRI is not required but strongly recommended to exclude structural causes. Subsumes Ohtahara syndrome and early myoclonic encephalopathy.

## EIMFS | Epilepsy of infancy with migrating focal seizures | EIMFS | Neonate–infant | zuberi2022 | Table 6 | Focal
M sz | Focal/multifocal tonic or clonic seizures, ± behavioural arrest and prominent autonomic features :: sem.tonic_focal | sem.clonic_focal | sem.autonomic | sz.focal_impaired @core
M sz | Seizures migrate clinically from one hemisphere or lobe to another :: sem.migrating
M sz | Seizure frequency rapidly increases in first weeks/months, often to status :: ctx.escalating
M eeg | Interictal multifocal discharges :: eeg.multifocal
M eeg | Ictal recording shows a migrating pattern (may be missed without prolonged video-EEG) :: eeg.ictal_migrating | sem.migrating
M onset | Onset <12 months :: age<12m
M img | MRI performed excluding a causal structural etiology :: img.normal
M dev | Developmental plateauing or regression with frequent seizures :: dev.regression @follow
M course | Neurodevelopmental delay :: devn.any_impair @follow
E sz | Myoclonic seizures :: sz.myoclonic
A eeg | Burst-suppression before medication; single persistent epileptic focus; hypsarrhythmia :: eeg.burst_suppression | eeg.single_focus | eeg.hypsarrhythmia
A onset | Onset 6–12 months :: age>=6m & age<12m
A dev | Severe delay before seizure onset :: devo.severe_plus
A neuro | Significant neurological abnormalities before onset :: neuro.abnormal_significant
E img | Abnormal neuroimaging with structural causal lesion :: img.lesion
A course | Seizure freedom :: - @follow
> MRI is required to exclude a causal structural etiology. Ictal EEG is strongly recommended to document the migrating pattern, but may be unnecessary if clinical migration is observed.

## IESS | Infantile epileptic spasms syndrome | IESS | Neonate–infant | zuberi2022 | Table 7 | Focal and/or generalized
M sz | Flexor, extensor or mixed epileptic spasms, often in clusters :: sz.spasms @core
M eeg | Interictal hypsarrhythmia, multifocal or focal epileptiform discharges :: eeg.hypsarrhythmia | eeg.multifocal | eeg.focal_spikes
M onset | Onset 1–24 months (spasms beginning later are not IESS) :: age>=1m & age<25m
M dev | Developmental slowing after spasms onset (may be absent early) :: dev.regression @follow
A eeg | Normal interictal EEG, or suppression-burst :: eeg.no_discharges | eeg.burst_suppression
E eeg | Ictal: normal EEG during recorded events of suspected spasms :: eeg.ictal_no_corr
A onset | Onset at 1–2 months :: age[1m,2m]
! urgent | Infantile epileptic spasms syndrome is time-critical: begin spasms-specific therapy without delay — shorter lag-to-treatment is associated with better developmental outcome. Arrange urgent specialist review, video-EEG and MRI.
> MRI is highly recommended to look for a cause. Ictal EEG is required only if the interictal EEG shows neither hypsarrhythmia nor epileptiform abnormality.

## DRAVET | Dravet syndrome | DS | Neonate–infant | zuberi2022 | Table 8 | Combined generalized and focal
M sz | Recurrent hemiclonic (often side-alternating), focal to bilateral tonic–clonic and/or generalized clonic seizures, febrile and afebrile :: sem.hemiclonic | sz.clonic | sz.focal_btc @core
M onset | Onset 1–20 months :: age>=1m & age<21m
M course | Drug-resistant epilepsy :: course.drug_resistant @follow
M course | Intellectual disability :: devn.any_impair @follow
A sz | No history of prolonged (>10 min) seizures, or lack of fever sensitivity :: !st.prolonged_gt10 | !ctx.fever
E sz | Epileptic spasms :: sz.spasms
A eeg | Normal background without interictal discharges after age 2 years :: eeg.bg_normal & eeg.no_discharges & now>24m
A onset | Onset 1–2 months or 15–20 months :: age[1m,2m] | age[15m,20m]
A dev | Developmental delay at seizure onset :: devo.any_impair
A neuro | Focal neurological findings (other than Todd paresis) :: neuro.focal
E img | MRI showing a causal focal lesion :: img.lesion
A gen | Neither pathogenic SCN1A nor another causal variant :: !(gen.scn1a | gen.other)
A course | Good efficacy of prophylactic sodium-channel agents (carbamazepine, oxcarbazepine, phenytoin) :: course.sodium_channel_good_response @follow
! caution | Dravet syndrome: sodium-channel-blocking ASMs (carbamazepine, lamotrigine, oxcarbazepine, phenytoin) can exacerbate seizures — a recognised diagnostic clue. Consider SCN1A testing before such drugs are used.
> A child <12 months with a prolonged febrile hemiclonic or bilateral tonic–clonic seizure and no other cause may be an evolving Dravet syndrome; diagnosis is supported by a pathogenic SCN1A variant.

## KCNQ2DEE | KCNQ2-developmental and epileptic encephalopathy | KCNQ2-DEE | Neonate–infant | zuberi2022 | Table 9 | Focal and/or generalized
M gen | Pathogenic variant in KCNQ2 :: gen.kcnq2 @core
M sz | Tonic, myoclonic and/or focal seizures :: sz.tonic | sz.myoclonic | sem.tonic_focal | sem.clonic_focal | sz.focal_aware | sz.focal_impaired
M eeg | Burst-suppression or multifocal discharges; diffuse slowing :: eeg.burst_suppression | eeg.multifocal
M onset | Onset <3 months :: age<3m
M dev | Neurodevelopmental slowing / encephalopathy apparent at seizure onset :: dev.encephalopathy | devo.any_impair
M course | Abnormal neurodevelopment, moderate-to-profound impairment :: devn.moderate_plus @follow
A onset | Onset beyond the first week of life :: age>7d
A neuro | Normal neurological examination :: neuro.normal
> Cannot be diagnosed without genetic testing. MRI strongly recommended to exclude other causes.

## PDDEE | Pyridoxine- / pyridox(am)ine-5′-phosphate-dependent DEE | PD/P5PD-DEE | Neonate–infant | zuberi2022 | Table 10 | Focal and/or generalized
M sz | Drug-resistant, frequent seizures that respond rapidly to pyridoxine or pyridoxal-5-phosphate :: lab.pdx_response @core
M eeg | Interictal slowing with focal/multifocal discharges or burst-suppression :: eeg.focal_slow | eeg.multifocal | eeg.burst_suppression | eeg.bg_diffuse_slow
M gen | Confirmatory evidence: raised α-AASA/pipecolic acid or low CSF PLP, or ALDH7A1/PLBD1/PNPO variants :: lab.pdx_markers | gen.aldh7a1 | gen.pnpo
M course | Sustained marked reduction or cessation of seizures with lifelong pyridoxine/PLP :: lab.pdx_response
A onset | Onset >3 years :: age>3y
A neuro | Lack of encephalopathy and irritability :: !dev.encephalopathy
A course | Normal neurodevelopmental outcome :: devn.normal @follow
> A pyridoxine trial is a recognised diagnostic step in early-onset drug-resistant seizures; confirm with biomarkers or genetics.

## CDKL5 | CDKL5-developmental and epileptic encephalopathy | CDKL5-DEE | Neonate–infant | zuberi2022 | Table 11 | Focal and/or generalized
M gen | Pathogenic variant in CDKL5 (X-linked; females outnumber males ~4:1) :: gen.cdkl5 @core
M sz | Tonic seizures, epileptic spasms, GTC and/or focal seizures (hyperkinetic–tonic–spasms sequence is characteristic) :: sz.tonic | sz.spasms | sz.gtc | sz.focal_btc | sz.focal_impaired | sz.focal_aware | sem.hkt_spasms
M course | Profound-to-severe intellectual disability :: devn.severe_plus @follow
M course | Drug-resistant epilepsy :: course.drug_resistant @follow
A sz | Absence of epileptic spasms in the first year :: !sz.spasms
A eeg | Normal background without interictal discharges after 4 months :: eeg.bg_normal & eeg.no_discharges & now>4m
A onset | Onset of epilepsy >3 months :: age>3m
A dev | Normal development before seizure onset :: devo.normal
A neuro | Normal tone, or lack of encephalopathy :: neuro.normal | !dev.encephalopathy
> Cannot be diagnosed without genetic confirmation.

## PCDH19 | PCDH19 clustering epilepsy | PCDH19 | Neonate–infant | zuberi2022 | Table 12 | Focal
M gen | Pathogenic PCDH19 variant (female or mosaic male; X-linked with male sparing) :: gen.pcdh19 @core
M sz | Focal seizures (fearful screaming typical) and tonic–clonic seizures in clusters; may be fever-triggered :: ctx.cluster & (sz.focal_aware | sz.focal_impaired | sz.focal_btc | sem.fearful_scream)
M onset | Onset 1.5–60 months in females; 5–96 months in males :: (pt.female & age>=1.5m & age<=60m) | (!pt.female & age>=5m & age<=96m)
A sz | Prolonged hemiclonic seizures in infancy (consider Dravet), or no clustering :: (st.prolonged_gt10 & sem.hemiclonic) | !ctx.cluster
A eeg | Absence of epileptiform discharges :: eeg.no_discharges
> Consider in an infant girl whose first presentation is a cluster of febrile seizures. Provisional diagnosis possible without genetics if the family history suggests X-linked dominant inheritance with male sparing.

## GLUT1DS | Glucose transporter 1 deficiency syndrome | GLUT1DS | Neonate–infant | zuberi2022 | Table 13 | Focal and/or generalized
M sz | Focal or generalized seizures, including absence (often before 3 years) :: sz.any
M gen | Pathogenic SLC2A1 variant, or low fasting CSF glucose with low CSF:plasma ratio :: gen.slc2a1 | lab.csf_low_glucose @core
M course | Intellectual disability :: devn.any_impair @follow
E gen | Other documented cause of hypoglycorrhachia :: lab.csf_low_other_cause
A neuro | Focal neurological findings (other than Todd paresis) :: neuro.focal
A course | Lack of movement disorder (ataxia, paroxysmal exercise-induced dyskinesia, dystonia) :: !neuro.movement_disorder @follow
A course | Seizures controlled with medication; no improvement on ketogenic diet :: - @follow
> CSF studies are required for diagnosis in resource-limited settings. Testing is strongly recommended in children with onset ≤3 years, microcephaly or ID.

## SWS | Sturge–Weber syndrome | SWS | Neonate–infant | zuberi2022 | Table 14 | Focal
M sz | Focal motor or autonomic seizures ± impaired awareness, may evolve to bilateral tonic–clonic :: sz.focal_aware | sz.focal_impaired | sz.focal_btc
M img | MRI: leptomeningeal enhancement suggestive of angioma (± calcification, atrophy over time) :: img.angioma @core
A eeg | Lack of asymmetric background (reduced voltage/slowing over the affected hemisphere) :: !eeg.hemispheric_slow
A neuro | Lack of facial capillary malformation in V1 distribution :: !neuro.facial_angioma_v1
A course | Normal neurological exam and no intellectual disability :: neuro.normal & devn.normal @follow
> MRI is required; findings may be subtle or absent before 2 months of age.

## HHGS | Gelastic seizures with hypothalamic hamartoma | GS-HH | Neonate–infant | zuberi2022 | Table 15 | Focal
M sz | Gelastic seizures with mechanical, mirthless laughter inappropriate to context :: sem.gelastic @core
M img | Hypothalamic hamartoma on MRI (thin hypothalamic slices may be needed) :: img.hh
M course | Drug-resistant epilepsy :: course.drug_resistant @follow
A sz | Seizure frequency less than daily :: !ctx.daily
A eeg | Interictal generalized or focal background slowing :: eeg.bg_diffuse_slow | eeg.focal_slow
A onset | Onset >5 years :: age>5y
A dev | Clear developmental delay at onset :: devo.moderate_plus
A neuro | Focal neurological findings or generalized hypotonia :: neuro.focal | neuro.hypotonia
A course | Lack of behavioural problems (aggression, impulsivity, hyperactivity) :: !course.behavior_problems @follow
> MRI is required — gelastic seizures can arise from other regions.

// =====================================================================
// IDIOPATHIC GENERALIZED EPILEPSIES  (Hirsch 2022)
// =====================================================================
## CAE | Childhood absence epilepsy | CAE | IGE | hirsch2022 | Table 3 | Generalized
M sz | Typical absence seizures :: sz.abs_typical @core
M eeg | 3 Hz (2.5–4 Hz) generalized spike-wave at the start of the absence (may be historical) :: eeg.gsw_3hz
A sz | GTCS before or during the period of frequent absences :: ctx.gtc_with_absence
A sz | Staring spells >30 s, or with postictal confusion/fatigue :: ctx.staring_gt30s
A sz | Absences occurring less than daily in an untreated patient :: !ctx.abs_daily
E sz | Prominent myoclonic seizures, prominent eyelid myoclonia, myoclonic-absence, atonic, tonic, atypical absence or focal impaired awareness seizures :: sz.myoclonic | sz.eyelid_myoclonia | sz.abs_myoclonic | sz.atonic | sz.tonic | sz.abs_atypical | sz.focal_impaired
A eeg | Consistently unilateral epileptiform discharges; no HV activation in an untreated patient who hyperventilates well; typical spell without EEG correlate :: eeg.unilateral_consistent | eeg.hv_no_activation | eeg.ictal_no_corr
E eeg | Diffuse background slowing :: eeg.bg_diffuse_slow
A onset | Onset 2–3 or 11–13 years :: age[2y,3y] | age[11y,13y]
E onset | Onset <2 or >13 years :: age<2y | age>13y
A dev | Mild intellectual disability :: devo.mild
E dev | Moderate-to-profound intellectual disability :: devo.moderate_plus
A neuro | Potentially relevant neurological examination abnormality :: neuro.abnormal_significant
A img | Potentially relevant abnormal neuroimaging :: img.abnormal_significant
E course | Cognitive stagnation or decline :: dev.regression
E gen | Low CSF glucose and/or SLC2A1 pathogenic variant :: lab.csf_low_glucose | gen.slc2a1
> MRI is not required. Ictal EEG is not required if interictal 2.5–4 Hz generalized spike-wave is seen. In resource-limited regions, CAE may be diagnosed without alerts if a typical absence is witnessed with hyperventilation. SLC2A1/CSF glucose testing is strongly recommended if onset ≤3 years, microcephaly or ID.

## JAE | Juvenile absence epilepsy | JAE | IGE | hirsch2022 | Table 4 | Generalized
M sz | Typical absence seizures :: sz.abs_typical @core
M eeg | 3–5.5 Hz generalized spike-wave (may be historical) :: eeg.gsw_3_55 | eeg.gsw_3hz
A sz | Staring spells >30 s, or with postictal confusion/fatigue :: ctx.staring_gt30s
A sz | Absence frequency >10 per day :: ctx.abs_gt10day
E sz | Prominent myoclonic seizures, prominent eyelid myoclonia, myoclonic-absence, atonic, tonic, atypical absence or focal impaired awareness seizures :: sz.myoclonic | sz.eyelid_myoclonia | sz.abs_myoclonic | sz.atonic | sz.tonic | sz.abs_atypical | sz.focal_impaired
A eeg | No HV activation in an untreated patient who hyperventilates well :: eeg.hv_no_activation
E eeg | Consistently unilateral focal discharges; diffuse background slowing; typical spell without EEG correlate :: eeg.unilateral_consistent | eeg.bg_diffuse_slow | eeg.ictal_no_corr
E onset | Onset <8 or >20 years :: age<8y | age>20y
A dev | Mild intellectual disability :: devo.mild
E dev | Moderate-to-profound intellectual disability :: devo.moderate_plus
A neuro | Potentially relevant neurological examination abnormality :: neuro.abnormal_significant
A img | Potentially relevant abnormal neuroimaging :: img.abnormal_significant
E course | Cognitive stagnation or decline :: dev.regression
E gen | Low CSF glucose and/or SLC2A1 pathogenic variant :: lab.csf_low_glucose | gen.slc2a1
A course | Lack of GTCS over the course of the epilepsy without GTCS-effective ASMs :: - @follow
> MRI and ictal EEG are not required for diagnosis.

## JME | Juvenile myoclonic epilepsy | JME | IGE | hirsch2022 | Table 5 | Generalized
M sz | Myoclonic seizures :: sz.myoclonic | sz.mtc @core
M eeg | 3–5.5 Hz generalized spike-wave or polyspike-wave (may be historical) :: eeg.gsw_3_55 | eeg.gsw_3hz | eeg.gsw_2_6
A sz | Generalized tonic–clonic status epilepticus :: st.gtc_se
A sz | Consistently unifocal semiology at GTC onset, or consistently unifocal myoclonus :: sem.unifocal
E sz | Myoclonic-absence, atonic, tonic, atypical absence or focal impaired awareness seizures :: sz.abs_myoclonic | sz.atonic | sz.tonic | sz.abs_atypical | sz.focal_impaired
E sz | Myoclonus predominantly/exclusively in sleep; myoclonic seizures only with reading :: sem.myoclonus_sleep_only | ctx.reading_only_myoclonic
E sz | Cortical tremor with myoclonus :: -
A eeg | Habitual myoclonic event without polyspike/spike-wave; focal slowing; consistently unilateral focal abnormality; generalized slow spike-wave <2.5 Hz; diffuse slowing :: eeg.ictal_no_corr | eeg.focal_slow | eeg.unilateral_consistent | eeg.gsw_slow | eeg.bg_diffuse_slow
A onset | Onset 8–9 or 25–40 years :: age[8y,9y] | age[25y,40y]
E onset | Onset <8 or >40 years (CAE may evolve to JME) :: age<8y | age>40y
A dev | Mild intellectual disability :: devo.mild
E dev | Moderate-to-profound intellectual disability :: devo.moderate_plus
A neuro | Potentially relevant neurological examination abnormality :: neuro.abnormal_significant
A img | Potentially relevant abnormal neuroimaging :: img.abnormal_significant
E course | Progressive cognitive decline; progressive myoclonus with impaired fine motor function :: dev.progressive_decline | course.prog_myoclonus
> MRI and ictal EEG are not required. Without lab confirmation (resource-limited): diagnosable if no alerts and all other criteria are met.

## GTCA | Epilepsy with generalized tonic–clonic seizures alone | GTCA | IGE | hirsch2022 | Table 6 | Generalized
M sz | Generalized tonic–clonic seizures :: sz.gtc @core
M eeg | 3–5.5 Hz generalized spike-wave or polyspike-wave (may be historical) :: eeg.gsw_3_55 | eeg.gsw_3hz | eeg.gsw_2_6
A sz | Consistently unifocal semiology at seizure onset :: sem.unifocal
E sz | Myoclonic–tonic–clonic seizures (suggests JME), or any other seizure type :: sz.other_than_gtc
A eeg | Focal slowing; consistently unilateral focal discharges; generalized slow spike-wave <2.5 Hz; diffuse slowing :: eeg.focal_slow | eeg.unilateral_consistent | eeg.gsw_slow | eeg.bg_diffuse_slow
A onset | Onset 5–9 or 26–40 years :: age[5y,9y] | age[26y,40y]
E onset | Onset <5 or >40 years :: age<5y | age>40y
A dev | Mild intellectual disability :: devo.mild
E dev | Moderate-to-profound intellectual disability :: devo.moderate_plus
A neuro | Potentially relevant neurological examination abnormality :: neuro.abnormal_significant
A img | Potentially relevant abnormal neuroimaging :: img.abnormal_significant
E img | Abnormal neuroimaging with causative lesion :: img.lesion
A course | Progressive cognitive decline :: dev.progressive_decline @follow
> Cannot be diagnosed without interictal EEG showing generalized spike-wave (focal onset cannot otherwise be excluded). MRI should be considered if there are alerts.

// =====================================================================
// CHILDHOOD ONSET  (Specchio 2022)
// =====================================================================
## SELECTS | Self-limited epilepsy with centrotemporal spikes | SeLECTS | Childhood | specchio2022 | Table 2 | Focal
M sz | Focal seizures with dysarthria, sialorrhoea, dysphasia and unilateral clonic/tonic–clonic oral movement in wake or sleep, and/or nocturnal focal to bilateral tonic–clonic seizures in sleep only :: sem.oral_speech | (sz.focal_btc & ctx.sleep_only) @core
M sz | If seizures occur in sleep, they occur within 1 h of falling asleep or 1–2 h before waking :: !(ctx.sleep_pred | ctx.sleep_only) | ctx.sleep_onset_window
M eeg | High-amplitude centrotemporal biphasic epileptiform abnormalities :: eeg.ctsp
M course | Remission by mid-to-late adolescence; no developmental regression :: !dev.regression @follow
A sz | Focal motor or generalized convulsive status >30 min; seizures more than daily; daytime seizures only :: st.conv_se_gt30 | ctx.daily | ctx.wake_only
E sz | GTC seizures during wakefulness; atypical absences; seizures with gustatory hallucinations, fear and autonomic features :: sz.gtc | sz.abs_atypical | sem.gustatory_fear
A eeg | Sustained focal slowing; persistently unilateral centrotemporal abnormality on serial EEGs; lack of sleep activation :: eeg.focal_slow | eeg.unilateral_consistent | !eeg.sleep_activated
A onset | Onset >12 years :: age>12y
E onset | Onset <3 or >14 years :: age<3y | age>14y
A dev | Moderate-to-profound intellectual disability :: devo.moderate_plus
E dev | Neurocognitive regression with continuous spike-wave in sleep (suggests EE-SWAS) :: dev.regression & eeg.swas
A neuro | Hemiparesis or focal neurological findings (other than Todd paresis) :: neuro.focal
E img | Causal lesion on brain MRI :: img.lesion
> If regression with continuous spike-wave in sleep occurs, the syndrome has evolved to EE-SWAS.

## SELEAS | Self-limited epilepsy with autonomic seizures | SeLEAS | Childhood | specchio2022 | Table 3 | Focal
M sz | Focal autonomic seizures ± impaired awareness (often prominent retching/vomiting; also pallor, flushing, abdominal pain, pupillary or cardiorespiratory change) :: sem.autonomic | sem.emesis @core
M eeg | High-amplitude focal or multifocal epileptiform abnormalities that increase in drowsiness and sleep :: (eeg.focal_spikes | eeg.multifocal | eeg.occipital) & eeg.sleep_activated
M course | Remission by early-to-mid adolescence; no developmental regression :: !dev.regression @follow
A sz | Seizure frequency greater than monthly :: ctx.freq_gt_monthly
A eeg | Sustained focal slowing; unilateral focal abnormalities in a consistent area across serial EEGs :: eeg.focal_slow | eeg.unilateral_consistent
A onset | Onset <3 or >8 years :: age<3y | age>8y
E onset | Onset <1 or >14 years :: age<1y | age>14y
A dev | Moderate-to-profound intellectual disability :: devo.moderate_plus
E dev | Neurocognitive regression with continuous spike-wave in sleep :: dev.regression & eeg.swas
A neuro | Hemiparesis or focal neurological findings :: neuro.focal
E img | Causal lesion on brain MRI :: img.lesion

## COVE | Childhood occipital visual epilepsy | COVE | Childhood | specchio2022 | Table 4 | Focal
M sz | Focal sensory visual seizures with elementary visual phenomena (e.g. coloured circles), ± impaired awareness, ± eye/head deviation :: sem.visual_elementary @core
M sz | Seizures arise predominantly or exclusively from wakefulness :: !ctx.sleep_pred
M eeg | Occipital spikes or spike-wave (awake or asleep) :: eeg.occipital
A sz | Seizure lasting >15 min; GTCS during wakefulness :: st.prolonged_gt15 | sz.gtc
E sz | Drop seizures (tonic/atonic); atypical absences; progressive myoclonus :: sz.atonic | sz.tonic | sz.abs_atypical | course.prog_myoclonus
A eeg | Sustained focal slowing :: eeg.focal_slow
A onset | Onset <6 or >14 years :: age<6y | age>14y
E onset | Onset <1 or >19 years :: age<1y | age>19y
A dev | Intellectual disability :: devo.any_impair
E dev | Neurocognitive regression :: dev.regression
A neuro | Any significant neurological examination abnormality :: neuro.abnormal_significant
E neuro | Persistent visual field deficit :: neuro.visual_field_deficit
E img | Causal lesion on MRI, or occipital calcifications :: img.lesion | img.occipital_calc
E course | Development of myoclonic seizures, ataxia, spasticity :: course.regression_myoclonic_ataxia

## POLE | Photosensitive occipital lobe epilepsy | POLE | Childhood | specchio2022 | Table 5 | Focal
M sz | Focal sensory visual seizures (may evolve to bilateral tonic–clonic) triggered by photic stimuli such as flickering sunlight :: sem.visual_elementary & ctx.photic @core
M eeg | Occipital epileptiform abnormalities facilitated by eye closure and IPS :: eeg.occipital_eyeclosure
A sz | Seizures lasting >15 min :: st.prolonged_gt15
E sz | Eyelid myoclonia; progressive myoclonus :: sz.eyelid_myoclonia | course.prog_myoclonus
A eeg | Sustained focal slowing; PPR at slow (1–2 Hz) frequency (suggests CLN2) :: eeg.focal_slow | eeg.ppr_slow
A onset | Onset <4 or >17 years :: age<4y | age>17y
E onset | Onset <1 or >50 years :: age<1y | age>50y
A dev | Moderate-to-profound intellectual disability :: devo.moderate_plus
E dev | Neurocognitive regression :: dev.regression
A neuro | Any significant neurological examination abnormality :: neuro.abnormal_significant
E neuro | Permanent visual field deficit :: neuro.visual_field_deficit
E img | Causal lesion on brain MRI :: img.lesion

## EEM | Epilepsy with eyelid myoclonia | EEM | Childhood | specchio2022 | Table 6 | Generalized
M sz | Eyelid myoclonia :: sz.eyelid_myoclonia @core
M eeg | Eye closure and IPS elicit fast (3–6 Hz) generalized polyspike or polyspike-wave :: eeg.eem_pattern
A sz | Eyelid myoclonia cannot be induced by slow eye closure or bright light (untreated) :: -
A sz | Myoclonic jerks affecting the limbs — strongly consider JME :: sz.myoclonic
E sz | Myoclonic-absence seizures; focal seizures :: sz.abs_myoclonic | sz.focal_impaired | sz.focal_aware
E eeg | Focal slowing; consistently unilateral focal spikes; generalized slow spike-wave <2.5 Hz; diffuse slowing; no EEG correlate with the typical event :: eeg.focal_slow | eeg.unilateral_consistent | eeg.gsw_slow | eeg.bg_diffuse_slow | eeg.ictal_no_corr
E onset | Onset <2 or >14 years :: age<2y | age>14y
A neuro | Focal neurological findings :: neuro.focal
A img | Potentially relevant abnormal neuroimaging :: img.abnormal_significant
E img | Abnormal neuroimaging with causative lesion :: img.lesion
E course | Progressive cognitive decline :: dev.progressive_decline

## EMA | Epilepsy with myoclonic absences | EMA | Childhood | specchio2022 | Table 7 | Generalized
M sz | Myoclonic absence seizures as the predominant type :: sz.abs_myoclonic @core
M eeg | Regular 3 Hz generalized spike-wave time-locked with myoclonic jerks :: eeg.gsw_3hz
E sz | Focal seizures; atonic, myoclonic–atonic or tonic seizures :: sz.focal_impaired | sz.focal_aware | sz.atonic | sz.myoatonic | sz.tonic
E eeg | Focal slowing; consistently unilateral focal spikes; generalized slow spike-wave <2 Hz; diffuse slowing :: eeg.focal_slow | eeg.unilateral_consistent | eeg.gsw_slow | eeg.bg_diffuse_slow
E onset | Onset <1 or >12 years :: age<1y | age>12y
A neuro | Moderate-or-greater intellectual disability, or focal neurological findings :: devo.moderate_plus | neuro.focal
E img | Abnormal neuroimaging with causative lesion :: img.lesion
E course | Progressive cognitive decline :: dev.progressive_decline

## EMATS | Epilepsy with myoclonic–atonic seizures | EMAtS | Childhood | specchio2022 | Table 8 | Generalized
M sz | Myoclonic–atonic seizures :: sz.myoatonic @core
M eeg | Generalized 2–6 Hz spike-wave or polyspike-wave :: eeg.gsw_2_6 | eeg.gsw_3hz | eeg.gsw_3_55
A sz | Tonic seizures within 12 months of onset :: sz.tonic
E sz | Epileptic spasms / IESS before diagnosis; focal seizures :: sz.spasms | sz.focal_impaired | sz.focal_aware
A eeg | Generalized paroxysmal fast activity in sleep; generalized slow spike-wave <2 Hz; PPR at low frequency (suggests CLN2) :: eeg.gpfa | eeg.gsw_slow | eeg.ppr_slow
E eeg | Persistent focal abnormalities; hypsarrhythmia :: eeg.single_focus | eeg.focal_slow | eeg.hypsarrhythmia
E onset | Onset <6 months or >8 years :: age<6m | age>8y
A dev | Moderate-to-severe developmental delay preceding onset :: devo.moderate_plus
A neuro | Focal neurological findings :: neuro.focal
E img | Causal lesion on MRI :: img.lesion

## LGS | Lennox–Gastaut syndrome | LGS | Childhood | specchio2022 | Table 9 | Combined generalized and focal
M sz | Tonic seizures :: sz.tonic @core
M sz | At least one additional seizure type (atypical absence, atonic, myoclonic, focal impaired awareness, GTC, NCSE or epileptic spasms) :: sz.abs_atypical | sz.atonic | sz.myoclonic | sz.focal_impaired | sz.gtc | st.ncse | sz.spasms
M eeg | Generalized slow spike-wave <2.5 Hz (or history of it) :: eeg.gsw_slow
M eeg | Generalized paroxysmal fast activity in sleep (or history of it) :: eeg.gpfa
M onset | Onset <18 years :: age<18y
M course | Drug-resistant epilepsy :: course.drug_resistant @follow
M course | Mild-to-profound intellectual disability :: devn.any_impair @follow
A eeg | PPR at low frequency (consider CLN2 disease) :: eeg.ppr_slow
E eeg | Persistent focal abnormalities without a generalized spike-wave pattern :: (eeg.focal_slow | eeg.single_focus) & !eeg.gsw_slow
A onset | Onset >8 years :: age>8y

## SWAS | DEE / EE with spike-wave activation in sleep | DEE-SWAS / EE-SWAS | Childhood | specchio2022 | Table 10 | Focal and/or generalized
M eeg | Slow (1.5–2 Hz) spike-wave in NREM sleep, markedly activated in sleep :: eeg.swas @core
M dev | Cognitive, behavioural or motor regression or plateauing temporally related to SWAS :: dev.regression
M course | Remission of the SWAS EEG pattern by mid-adolescence :: - @follow
A sz | Tonic seizures during sleep :: sz.tonic & ctx.sleep_pred
E sz | Epileptic spasms :: sz.spasms
A eeg | Generalized paroxysmal fast activity in sleep, or generalized slow spike-wave <2.5 Hz awake and asleep (consider LGS) :: eeg.gpfa | eeg.gsw_slow
A onset | Onset between 1 and 2 years :: age>1y & age<2y
E onset | Onset <1 or >12 years :: age<1y | age>12y
> DEE-SWAS = developmental delay before SWAS; EE-SWAS = normal development before SWAS.

## FIRES | Febrile infection-related epilepsy syndrome | FIRES | Childhood | specchio2022 | Table 11 | Focal
M sz | Non-specific febrile illness in the 2 weeks preceding seizure onset :: ctx.febrile_illness_2w @core
M sz | Focal/multifocal seizures, often to bilateral tonic–clonic :: sz.focal_aware | sz.focal_impaired | sz.focal_btc
M sz | Progression to super-refractory status epilepticus, typically within 2 weeks :: st.superrefractory_se
M eeg | Background slowing with multifocal epileptiform abnormality and frequent focal seizures :: eeg.multifocal & (eeg.bg_mild_slow | eeg.bg_diffuse_slow)
M dev | Acute encephalopathy with onset of frequent seizures :: dev.acute_enceph
E sz | History of epilepsy before the illness :: ctx.prior_epilepsy
A eeg | Unifocal seizures :: -
A onset | Onset <2 years :: age<2y
E onset | Onset <1 or >30 years :: age<1y | age>30y
A dev | Intellectual disability or neurological abnormality before onset :: devo.any_impair | neuro.abnormal_significant
E img | At presentation, an MRI lesion concordant with seizure onset :: img.lesion
E gen | CSF evidence of CNS infection; causal autoantibody; documented metabolic/genetic cause; toxic encephalopathy :: lab.csf_infection | lab.autoantibody | lab.metabolic_documented | lab.toxic_enceph
! urgent | FIRES / new-onset refractory status epilepticus is a neurological emergency (super-refractory status): intensive-care management and urgent aetiological work-up, including autoimmune and infectious causes.

## HHE | Hemiconvulsion–hemiplegia–epilepsy syndrome | HHE | Childhood | specchio2022 | Table 12 | Focal
M sz | Acute stage: febrile hemiclonic status immediately followed by permanent hemiparesis; chronic stage: unilateral focal motor or focal to bilateral tonic–clonic seizures later (usually <3 years) :: st.febrile_hemiclonic_se @core
M eeg | Slowing over the affected hemisphere; focal/multifocal epileptiform activity in the chronic phase :: eeg.hemispheric_slow
M img | Acute MRI: diffuse hemispheric T2 hyperintensity with restricted diffusion and oedema; later atrophy :: img.hemisphere_edema | img.hemisphere_atrophy_chronic
M course | Drug-resistant epilepsy; permanent focal motor deficit :: course.drug_resistant & neuro.hemiparesis_permanent @follow
E sz | Transient (Todd) hemiparesis; crescendo unilateral focal motor seizures with late progressive hemiparesis (consider Rasmussen) :: sem.epc_progressive
A onset | Onset >4 years :: age>4y
E onset | Onset >6 years :: age>6y
A dev | Intellectual disability before onset :: devo.any_impair
A neuro | Focal neurological abnormality before the febrile status; facial angioma suggesting Sturge–Weber :: neuro.focal | neuro.facial_angioma_v1
E img | Other structural cause predisposing to focal status :: img.lesion
E gen | Alternative cause of hemiparesis (ischaemic stroke, CNS infection) :: lab.acute_symptomatic_cause | lab.csf_infection

// =====================================================================
// VARIABLE AGE OF ONSET  (Riney 2022)
// =====================================================================
## SHE | Sleep-related hypermotor (hyperkinetic) epilepsy | SHE | Variable age | riney2022 | Table 3 | Focal
M sz | Brief focal motor seizures with hyperkinetic or asymmetric tonic/dystonic features occurring predominantly from sleep :: sem.hypermotor & ctx.sleep_pred @core
A sz | Seizures predominantly from the awake state :: ctx.wake_pred
E sz | Seizures only during wakefulness; generalized-onset seizures :: ctx.wake_only | sz.gen_any
A eeg | Frequent epileptiform abnormality outside the frontal regions; generalized epileptiform abnormality :: eeg.epi_nonfrontal | eeg.gen_epileptiform
A onset | Onset <10 or >20 years :: age<10y | age>20y
E onset | Onset <2 months or >64 years :: age<2m | age>64y
A dev | Moderate-to-severe intellectual disability :: devo.moderate_plus
A neuro | Focal neurological examination abnormalities :: neuro.focal
> MRI is not required but should be done to look for an underlying cause.

## FMTLE | Familial mesial temporal lobe epilepsy | FMTLE | Variable age | riney2022 | Table 4 | Focal
M sz | Focal cognitive (particularly déjà vu), sensory or autonomic seizures :: sem.cog_dejavu | sem.sensory_other | sem.autonomic
M gen | Family history of relatives with focal seizures arising from the mesial temporal lobe :: fh.mtle @core
M img | MRI normal or showing hippocampal atrophy/sclerosis :: img.normal | img.hs
E sz | Generalized-onset seizures :: sz.gen_any
A eeg | Generalized epileptiform abnormality :: eeg.gen_epileptiform
A dev | Intellectual disability :: devo.any_impair
A neuro | Focal abnormalities on neurological examination :: neuro.focal
> MRI is required to exclude other causes.

## FFEVF | Familial focal epilepsy with variable foci | FFEVF | Variable age | riney2022 | Table 5 | Focal
M sz | Focal-onset seizures :: sz.focal_any
M gen | Family history of focal seizures arising from different cortical regions in different relatives :: fh.variable_foci @core
M img | MRI normal or showing focal cortical dysplasia :: img.normal | img.mcd
E sz | Generalized-onset seizures :: sz.gen_any
A eeg | Generalized epileptiform abnormality :: eeg.gen_epileptiform
A onset | Neonatal onset :: age<1m
E dev | Moderate-to-profound intellectual disability :: devo.moderate_plus
A neuro | Focal neurological examination abnormalities :: neuro.focal
E gen | Family history of focal seizures occurring only before 20 months :: fh.focal_early_only
> MRI is required. A family history of focal seizures may be incidental if caused by an acquired lesion.

## EAF | Epilepsy with auditory features | EAF | Variable age | riney2022 | Table 6 | Focal
M sz | Focal sensory auditory seizures and/or focal cognitive seizures with receptive aphasia :: sem.auditory | sem.receptive_aphasia @core
M img | MRI normal or showing focal cortical dysplasia :: img.normal | img.mcd
E sz | Generalized-onset seizures :: sz.gen_any
E sz | Other focal-onset seizure types :: -
A eeg | Generalized epileptiform abnormality :: eeg.gen_epileptiform
E dev | Moderate-or-severe intellectual disability :: devo.moderate_plus
A neuro | Focal neurological examination abnormalities :: neuro.focal

## MTLEHS | Mesial temporal lobe epilepsy with hippocampal sclerosis | MTLE-HS | Variable age | riney2022 | Table 7 | Focal
M sz | Focal aware or impaired-awareness seizures with initial semiology referable to medial temporal networks :: sem.mesial_temporal | sem.cog_dejavu @core
M img | Hippocampal sclerosis (unilateral or bilateral) on MRI :: img.hs
A sz | Initial semiology referable to networks other than mesial temporal :: sem.non_mesial_onset
E sz | Generalized-onset seizures :: sz.gen_any
A eeg | Generalized epileptiform abnormality; high-amplitude centrotemporal spikes with horizontal dipole; interictal abnormality outside the temporal regions :: eeg.gen_epileptiform | eeg.ctsp | eeg.epi_nonfrontal
E eeg | Recorded seizures with generalized or non-temporal onset :: eeg.ictal_nontemporal
A onset | Onset <2 years :: age<2y
A dev | Moderate-to-severe intellectual disability :: devo.moderate_plus
A neuro | Focal neurological findings such as hemiparesis :: neuro.focal
> MRI with hippocampal sclerosis is required for this syndrome.

## RS | Rasmussen syndrome | RS | Variable age | riney2022 | Table 8 | Focal
M sz | Focal/hemispheric seizures that often increase in frequency over weeks to months (± epilepsia partialis continua) :: sem.epc_progressive @core
M eeg | Hemispheric slowing and epileptiform abnormality :: eeg.hemispheric_slow
M img | Progressive hemiatrophy (early insula and caudate-head atrophy) :: img.hemiatrophy_prog
M course | Drug-resistant epilepsy; progressive neurological deficits :: course.drug_resistant & course.progressive_deficits
E sz | Generalized-onset seizures :: sz.gen_any
A eeg | Generalized spike-wave :: eeg.gsw_3hz | eeg.gsw_3_55 | eeg.gsw_2_6
A onset | Onset in adolescence or adulthood :: age>=12y
A dev | Abnormal development before seizure onset :: devo.any_impair
E neuro | Hemiparesis present at onset (if permanent hemiparesis immediately follows status, consider HHE) :: neuro.hemiparesis_at_onset
E img | Imaging shows Sturge–Weber syndrome :: img.angioma
E gen | Metabolic cause of epilepsia partialis continua; antibody-mediated encephalitis :: lab.metabolic_documented | lab.autoantibody

## EWRIS | Epilepsy with reading-induced seizures | EwRIS | Variable age | riney2022 | Table 9 | Generalized
M sz | Reflex myoclonic seizures of orofacial muscles triggered by reading or language-related tasks :: sz.reflex_myoclonic_orofacial @core
M dev | Normal development at onset :: devo.normal
M neuro | Normal neurological examination :: neuro.normal
M img | Normal MRI :: img.normal
A sz | Prominent myoclonic jerks of the upper limbs :: sz.myoclonic
E sz | All other seizure types except generalized tonic–clonic :: sz.abs_typical | sz.abs_atypical | sz.tonic | sz.atonic | sz.spasms | sz.focal_impaired | sz.focal_aware | sz.mtc
E eeg | Background slowing (other than postictal) :: eeg.bg_diffuse_slow
A onset | Onset >20 years :: age>20y

## PME | Progressive myoclonus epilepsies | PME | Variable age | riney2022 | Table 10 | Combined generalized and focal
M sz | Myoclonic seizures :: sz.myoclonic @core
M eeg | Generalized spike / polyspike-wave :: eeg.gen_epileptiform | eeg.gsw_3hz | eeg.gsw_3_55 | eeg.gsw_2_6
M onset | Onset 2–50 years :: age>=2y & age<51y
M dev | Normal development at onset :: devo.normal
M neuro | Normal neurological examination at onset :: neuro.normal
M img | Normal MRI at onset :: img.normal
M course | Progressive neurocognitive deterioration (may need observation over time to distinguish from JME) :: dev.progressive_decline
M course | Progressive worsening of myoclonus and tonic–clonic seizures with cerebellar signs and EEG deterioration :: course.prog_myoclonus
A onset | Onset >20 years :: age>20y
E eeg | Persistent focal epileptiform abnormality other than occipital :: eeg.focal_spikes & !eeg.occipital
`;

  return { TEXT };
});
