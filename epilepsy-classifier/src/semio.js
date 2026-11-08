/*
 * Seizure movements & poses (semiology atlas).
 *
 * Each entry: what the body does, drawn as 1–3 schematic frames (figures.js), with features,
 * localising/lateralising value where it has been studied, pitfalls and a `basis` line stating
 * where the wording comes from. The ILAE 2022 semiology glossary (Beniczky et al., Epileptic
 * Disord 24:447–495) could not be accessed from this build environment, so wording marked
 * "standard teaching" should be checked against it.
 *
 * The patient's RIGHT is on the viewer's LEFT. Figures are stylised, not clinical photographs.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EpiSemio = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const GROUPS = ['Tonic & posturing', 'Clonic & tonic–clonic', 'Myoclonic, spasms & drops', 'Hyperkinetic & automatisms', 'Face, eyes & arrest'];
  const ILAE = 'ILAE 2025 seizure classification and ILAE 2022 syndrome papers';
  const STD = 'standard semiology teaching (ILAE 2022 semiology glossary not accessed — verify there)';
  const REF = {
    kotagal2000: 'Kotagal P, Bleasel A, Geller E, Kankirawatana P, et al. Lateralizing value of asymmetric tonic limb posturing observed in secondarily generalized tonic-clonic seizures. Epilepsia 2000;41:457–462.',
    bleasel1997: 'Bleasel A, Kotagal P, Kankirawatana P, Rybicki L. Lateralizing value and semiology of ictal limb posturing and version in temporal lobe and extratemporal epilepsy. Epilepsia 1997;38:168–174.',
    lodd2005: 'Loddenkemper T, Kotagal P. Lateralizing signs during seizures in focal epilepsy. Epilepsy Behav 2005;7:1–17.',
    glossary: 'Beniczky S, Tatum WO, Blumenfeld H, et al. Seizure semiology: ILAE glossary of terms and their significance. Epileptic Disord 2022;24:447–495.',
  };

  const A = (x, y, b) => ({ hand: [x, y], bend: b || 'out' });
  const G = (x, y, b) => ({ foot: [x, y], bend: b || 'out' });
  const body = (title, spec) => ({ kind: 'body', title, spec });
  const face = (title, spec) => ({ kind: 'face', title, spec });
  const lb = (x, y, text, anchor, cls) => ({ t: 'label', x, y, text, anchor, cls });
  const rest = body('Rest', { head: { eyes: 'open' } });

  const ITEMS = [
    /* ------------------------------------------------ Tonic & posturing */
    { id: 'sz.tonic', name: 'Tonic seizure', group: GROUPS[0], basis: ILAE + ' (duration and cluster contrast); posture details: ' + STD,
      summary: 'Sustained muscle stiffening — arms flexed or extended, trunk and legs rigid — typically longer than 3 s.',
      features: [['Movement', 'Sudden, sustained increase in tone of axial and limb muscles; arms may stay flexed and raised or become extended; the patient may be thrown rigid, with eyes open or deviated up and respiration disturbed.'],
        ['Duration & timing', 'Typically longer than 3 s, and — unlike spasms — they do not occur in clusters on waking. Often arise from sleep.'],
        ['Context', 'Mandatory in Lennox–Gastaut syndrome; tonic seizures at onset are atypical for infantile epileptic spasms syndrome and should raise concern for another early-onset DEE.']],
      pitfall: 'Brief tonic spasms in a cluster on waking are epileptic spasms, not tonic seizures; look at duration (spasms are shorter) and the sleep–wake pattern.',
      frames: [body('Arms flexed & raised|trunk and legs rigid', { arm: { R: A(44, 46), L: A(156, 46) }, leg: { R: G(91, 238), L: G(109, 238) }, head: { eyes: 'up' }, hl: ['armR', 'armL', 'torso'] }),
        body('Or extended|(extensor variant)', { arm: { R: A(22, 134), L: A(178, 134) }, leg: { R: G(86, 240), L: G(114, 240) }, head: { eyes: 'up' }, hl: ['armR', 'armL', 'legR', 'legL', 'torso'] })] },

    { id: 'sem.fencing', name: 'Fencing posture', group: GROUPS[0], basis: 'Named in the ILAE 2025 descriptor list (under tonic); description and context: ' + STD,
      summary: 'Asymmetric tonic posture: one arm extended, the other flexed beside the head, with the head and eyes turned toward the extended arm.',
      features: [['Posture', 'One arm extended and elevated, the opposite arm flexed with the hand near the face or head; head and eyes turn toward the extended side. The pose resembles a fencer’s en-garde.'],
        ['Context', 'Classically associated with seizures arising from the supplementary motor area / mesial frontal cortex, often brief, frequent and arising from sleep.'],
        ['Lateralization', 'Reported to be less consistent than figure-of-4 posturing; interpret together with EEG and imaging.']],
      pitfall: 'Easily mistaken for a nonepileptic posture or a startle; look for stereotypy, abrupt onset/offset and preserved awareness (common in frontal seizures).',
      frames: [body('Fencing posture', { arm: { R: A(14, 20), L: A(114, 52) }, leg: { R: G(88, 238), L: G(112, 238) }, head: { turn: -1, eyes: 'dev' }, hl: ['armR', 'armL', 'head'], marks: [lb(34, 108, 'extended', 'middle'), lb(168, 100, 'flexed', 'middle'), { t: 'arc', x: 100, y: 44, r: 30, a0: 270, a1: 215, both: false }] })] },

    { id: 'sem.figure4', name: 'Figure-of-4 sign', group: GROUPS[0], basis: 'Named in the ILAE 2025 descriptor list (tonic–clonic); the lateralizing figures are from the cited surgical series.',
      summary: 'During the tonic phase of a focal-to-bilateral tonic–clonic seizure, one elbow is extended while the other is flexed.',
      features: [['Posture', 'Asymmetric tonic limb posturing: one elbow extended, the other flexed with the forearm across the body, forming a “4” shape.'],
        ['Lateralization', 'In 31 surgical patients, the extended elbow was contralateral to the side of ictal EEG onset in 35 of 39 patients who showed the sign (Kotagal 2000).'],
        ['Value', 'May sometimes be the only available lateralizing sign in a secondarily generalized seizure; interobserver agreement was very good.']],
      pitfall: 'Concordance is high but not absolute (≈90%); confirm with EEG and imaging before using it to decide the side.',
      refs: [REF.kotagal2000],
      frames: [body('Tonic phase of a focal-to-|bilateral tonic–clonic seizure', { arm: { R: A(26, 142), L: A(84, 104) }, leg: { R: G(88, 238), L: G(112, 238) }, head: { eyes: 'up' }, hl: ['armR', 'armL'], marks: [lb(26, 168, 'extended', 'middle'), lb(166, 112, 'flexed', 'middle')] })] },

    { id: 'sem.dystonic', name: 'Dystonic limb posturing', group: GROUPS[0], basis: 'Named in the ILAE 2025 descriptor list; lateralizing data from the cited study; movement description: ' + STD,
      summary: 'Unilateral twisting, sustained posture of the arm or hand — often with an automatism in the other hand.',
      features: [['Posture', 'Sustained, slowly evolving abnormal posture of one limb (flexion, rotation or twisting of the hand and arm), usually in focal seizures with impaired awareness.'],
        ['Lateralization', 'In temporal lobe epilepsy, unilateral dystonic limb posturing was contralateral to seizure onset with a positive predictive value of 92% (Bleasel 1997); tonic limb posturing in the same series had a PPV of only 40%.'],
        ['With automatisms', 'Often accompanied by an automatism in the opposite (ipsilateral) hand, which helps recognise the pattern.']],
      pitfall: 'Distinguish dystonic from tonic posturing and from an immobile limb — they have different predictive values.',
      refs: [REF.bleasel1997, REF.lodd2005],
      frames: [body('Contralateral dystonic posture|+ ipsilateral hand automatism', { arm: { R: A(94, 122), L: A(160, 52) }, head: { eyes: 'open' }, hl: ['armL'], marks: [{ t: 'zz', x: 78, y: 120, a: 0, len: 22 }, lb(166, 104, 'dystonic', 'middle'), lb(44, 142, 'automatism', 'middle')] })] },

    { id: 'sem.version', name: 'Head & eye version', group: GROUPS[0], basis: 'ILAE 2022 variable-age paper (MTLE-HS: contralateral version; initial ipsilateral head turn possible); lateralizing remarks: ' + STD,
      summary: 'Sustained forced turning of the head and eyes to one side.',
      features: [['Movement', 'Tonic deviation of the eyes and turning of the head to one side, often forced and sustained, and sometimes progressing to a focal-to-bilateral tonic–clonic seizure.'],
        ['In temporal lobe epilepsy (ILAE)', 'Contralateral head and eye version can occur, although in some patients there may be an initial ipsilateral head turn before the contralateral version.'],
        ['Figure', 'Drawn for a focus in the patient’s left hemisphere: the early ipsilateral turn is toward the left (viewer’s right), the forced version toward the right.'],
        ['Lateralization', 'Version that is forced and occurs late, shortly before secondary generalization, is classically contralateral to the onset; early or non-forced turning is unreliable.']],
      pitfall: 'The side of an early head turn can be ipsilateral — time the turn in the seizure before drawing conclusions.',
      refs: [REF.lodd2005],
      frames: [body('Early: ipsilateral|head turn (may occur)', { head: { turn: 1, eyes: 'dev' }, marks: [{ t: 'arc', x: 100, y: 44, r: 30, a0: 270, a1: 320 }] }),
        body('Contralateral head & eye|version (forced)', { head: { turn: -1, eyes: 'dev' }, hl: ['head'], marks: [{ t: 'arc', x: 100, y: 44, r: 30, a0: 270, a1: 215 }] })] },

    /* ------------------------------------------------ Clonic & tonic–clonic */
    { id: 'sem.clonic_focal', name: 'Focal clonic seizure', group: GROUPS[1], basis: ILAE + ' (face > arm and leg); lateralization: ' + STD,
      summary: 'Rhythmic, repetitive jerking of one part of the body — face, arm or leg — with preserved or impaired awareness.',
      features: [['Movement', 'Regular, repetitive jerks of one body part at roughly 1–3 Hz, often starting in the face or hand and spreading (“march”).'],
        ['ILAE description', 'Contralateral clonic jerking (face greater than arm and leg) with head turning can precede a focal-to-bilateral tonic–clonic phase.'],
        ['Context', 'Focal tonic then clonic seizures of the neonate alternate sides in SeLNE; hemifacial and limb clonic seizures also occur in SeLECTS and perirolandic epilepsies.']],
      pitfall: 'Rhythmic jerking that stops on restraint or distraction, or is variable in rate, may be nonepileptic.',
      refs: [REF.lodd2005],
      frames: [body('Focal clonic: right arm|rhythmic jerking', { arm: { R: A(48, 110), L: A(136, 146) }, head: { eyes: 'open' }, hl: ['armR'], marks: [{ t: 'zz', x: 62, y: 96, a: 120, len: 24 }, { t: 'burst', x: 40, y: 118, a: 200 }] }),
        face('Hemifacial clonic', { mouth: 'pull', gaze: [0, 0], marks: [{ t: 'zz', x: 62, y: 168, a: -50, len: 26 }, { t: 'burst', x: 50, y: 150, a: 200 }] })] },

    { id: 'sem.hemiclonic', name: 'Hemiclonic seizure', group: GROUPS[1], basis: 'ILAE 2022 neonatal/infant and childhood papers (Dravet; SeLIE; HHE)',
      summary: 'Clonic jerking of one entire side of the body; in infancy it may alternate sides from one seizure to the next.',
      features: [['Movement', 'Rhythmic jerking of the face, arm and leg of one side, often prolonged.'],
        ['In Dravet syndrome', 'Recurrent hemiclonic seizures, febrile and afebrile, often alternating sides from seizure to seizure; prolonged (>10 min) hemiclonic seizures are an expected feature.'],
        ['Other contexts', 'SeLIE seizures may become hemiclonic (alert if >10 min); febrile hemiclonic status followed by permanent hemiparesis defines the acute stage of HHE.']],
      pitfall: 'Alternation between seizures is typical of Dravet syndrome; alternation of sides within a single seizure is a different phenomenon (migrating seizures in EIMFS).',
      frames: [body('Seizure 1: right side', { arm: { R: A(46, 108), L: A(136, 146) }, leg: { R: G(80, 226), L: G(112, 238) }, head: { turn: -1 }, hl: ['armR', 'legR', 'head'], marks: [{ t: 'zz', x: 58, y: 94, a: 120, len: 22 }, { t: 'zz', x: 70, y: 180, a: 80, len: 24 }] }),
        body('Seizure 2: alternates to|the left side', { arm: { R: A(64, 146), L: A(154, 108) }, leg: { R: G(88, 238), L: G(120, 226) }, head: { turn: 1 }, hl: ['armL', 'legL', 'head'], marks: [{ t: 'zz', x: 142, y: 94, a: 60, len: 22 }, { t: 'zz', x: 130, y: 180, a: 100, len: 24 }] })] },

    { id: 'sz.gtc', alias: ['sz.clonic', 'sz.mtc'], name: 'Tonic–clonic seizure', group: GROUPS[1], basis: ILAE + ' (tonic stage, then clonic phase, then postictal slowing); posture details: ' + STD,
      summary: 'Stiffening (tonic phase), then rhythmic jerking of all limbs (clonic phase), then a flaccid unresponsive postictal state.',
      features: [['Tonic phase', 'Bilateral tonic muscle activation with loss of consciousness; EEG shows generalized fast rhythmic spikes in this stage.'],
        ['Clonic phase', 'Rhythmic jerks that progressively slow as silent periods lengthen; EEG shows bursts of spikes and after-coming slow waves synchronous with the jerks.'],
        ['Postictal', 'Unresponsiveness and gradual recovery with irregular slow EEG activity. Tonic–clonic seizures carry the highest morbidity and mortality and are the major risk factor for SUDEP (ILAE 2025).'],
        ['Subtypes', 'May be heralded by myoclonic jerks (myoclonic–tonic–clonic, e.g. JME) or by an absence (absence–tonic–clonic).']],
      pitfall: 'If the onset was not witnessed and EEG/MRI do not establish focal vs generalized onset, ILAE 2025 classes it as bilateral tonic–clonic of unknown onset.',
      frames: [body('1 · Tonic phase|stiffening', { arm: { R: A(30, 60), L: A(170, 60) }, leg: { R: G(86, 240), L: G(114, 240) }, head: { eyes: 'up', mouth: 'open' }, hl: ['torso'] }),
        body('2 · Clonic phase|rhythmic jerking', { arm: { R: A(48, 104), L: A(152, 104) }, leg: { R: G(76, 232), L: G(124, 232) }, head: { eyes: 'up', mouth: 'open' }, hl: ['armR', 'armL', 'legR', 'legL'], marks: [{ t: 'zz', x: 56, y: 92, a: 100, len: 20 }, { t: 'zz', x: 144, y: 92, a: 80, len: 20 }, { t: 'zz', x: 76, y: 196, a: 90, len: 22 }, { t: 'zz', x: 124, y: 196, a: 90, len: 22 }] }),
        body('3 · Postictal|limp, unresponsive', { head: { eyes: 'closed', turn: 1 } })] },

    /* ------------------------------------------------ Myoclonic, spasms & drops */
    { id: 'sz.myoclonic', name: 'Myoclonic seizure', group: GROUPS[2], basis: 'ILAE 2022 papers (duration <100 ms; JME morning predominance); movement description: ' + STD,
      summary: 'A brief, sudden, shock-like jerk — typically of the shoulders and arms — lasting under 100 ms.',
      features: [['Movement', 'Very brief (<100 ms), often bilateral, symmetrical or asymmetrical jerks of the upper limbs and shoulders; head may nod; objects may be thrown or dropped. Awareness is usually preserved.'],
        ['Timing', 'In JME, myoclonic seizures are essential and occur particularly in the morning or after sleep deprivation; in myoclonic epilepsy in infancy they are the mandatory seizure type.'],
        ['Contrast with spasms', 'Myoclonus is much shorter than an epileptic spasm (spasms last longer than ~1 s) and does not occur in clusters on waking.']],
      pitfall: 'Hypnic jerks and benign sleep myoclonus are physiological; confirm epileptic myoclonus with EEG (ideally with EMG), especially in infants.',
      frames: [body('Before', { head: { eyes: 'open' } }),
        body('Myoclonic jerk (<100 ms)|both arms shoot up / forward', { arm: { R: A(52, 62), L: A(148, 62) }, head: { dy: 2, eyes: 'open' }, hl: ['armR', 'armL'], marks: [{ t: 'burst', x: 44, y: 54, a: 215 }, { t: 'burst', x: 156, y: 54, a: -35 }] })] },

    { id: 'sz.abs_myoclonic', name: 'Myoclonic absence', group: GROUPS[2], basis: 'ILAE 2022 IGE paper (Hirsch): 3 Hz myoclonic jerks of the upper limbs with progressive elevation (ratcheting up) of the arms',
      summary: 'An absence with rhythmic 3 Hz jerks of the shoulders and arms that progressively lift the arms — “ratcheting up”.',
      features: [['Movement', '3 Hz rhythmic myoclonic jerks of the upper limbs with progressive elevation of the arms, with tonic posturing; consciousness is impaired.'],
        ['EEG', 'Regular 3 Hz generalized spike-wave time-locked with the jerks.'],
        ['Syndrome', 'Predominant seizure type of epilepsy with myoclonic absences; mandatory for that syndrome.']],
      pitfall: 'Atypical features (focal seizures, drop attacks, progressive decline) argue against the syndrome and suggest a different epilepsy.',
      frames: [body('Start (0 s)', { arm: { R: A(52, 126), L: A(148, 126) }, head: { eyes: 'open' }, marks: [{ t: 'burst', x: 48, y: 120, a: 200 }] }),
        body('~1 s|arms jerk higher', { arm: { R: A(38, 90), L: A(162, 90) }, head: { eyes: 'open' }, hl: ['armR', 'armL'], marks: [{ t: 'burst', x: 34, y: 86, a: 200 }, { t: 'burst', x: 166, y: 86, a: -20 }] }),
        body('~2 s|arms ratchet overhead', { arm: { R: A(46, 30), L: A(154, 30) }, head: { eyes: 'open' }, hl: ['armR', 'armL'], marks: [{ t: 'burst', x: 40, y: 22, a: 220 }, { t: 'burst', x: 160, y: 22, a: -40 }, { t: 'arrow', p: [12, 130, 12, 50] }, { t: 'arrow', p: [188, 130, 188, 50] }] })] },

    { id: 'sz.spasms', name: 'Epileptic spasm', group: GROUPS[2], basis: 'ILAE 2025 and ILAE 2022 neonatal/infant papers (duration, clusters, waking); flexor/extensor postures: ' + STD,
      summary: 'A brief flexor, extensor or mixed axial–limb contraction lasting about 1–2 s, repeating in clusters, often just after waking.',
      features: [['Movement', 'Flexor: neck and trunk flex with arms drawn toward the chest (“salaam”) and legs drawn up. Extensor: arms and legs extend with the back arching. Mixed forms are common.'],
        ['Duration & timing', 'Spasms last longer than 1 s (longer than myoclonus, shorter than tonic seizures), occur in clusters, and are most commonly seen shortly after waking.'],
        ['Time-critical', 'Timely recognition and spasms-specific treatment matter: delay is associated with poorer developmental outcome (ILAE 2025). In focal/unknown seizures a spasm is a descriptor (“focal epileptic spasm”).']],
      pitfall: 'Parents often describe them as startles, colic or reflux. Video of a cluster is diagnostically valuable.',
      frames: [body('Flexor spasm|trunk & neck flex, arms to chest', { infant: true, torso: { scale: 0.8 }, head: { dy: 12, eyes: 'up' }, arm: { R: A(94, 108), L: A(106, 108) }, leg: { R: G(82, 202), L: G(118, 202) }, hl: ['armR', 'armL', 'torso'], marks: [{ t: 'arrow', p: [36, 80, 74, 108], bend: 0.2 }, { t: 'arrow', p: [164, 80, 126, 108], bend: -0.2 }] }),
        body('Extensor spasm|arms out, back arches', { infant: true, head: { dy: -4, eyes: 'up' }, arm: { R: A(20, 56), L: A(180, 56) }, leg: { R: G(68, 238), L: G(132, 238) }, hl: ['armR', 'armL', 'legR', 'legL'], marks: [{ t: 'arrow', p: [60, 92, 24, 68], bend: 0.1 }, { t: 'arrow', p: [140, 92, 176, 68], bend: -0.1 }] }),
        body('Cluster on waking|1–2 s each, repeating', { infant: true, head: { eyes: 'up' }, arm: { R: A(60, 44), L: A(140, 44) }, leg: { R: G(86, 214), L: G(114, 214) }, hl: ['armR', 'armL', 'torso'] })] },

    { id: 'sz.atonic', name: 'Atonic seizure (head drop / fall)', group: GROUPS[2], basis: 'ILAE 2022 childhood paper (abrupt but brief loss of axial tone, head nods or sudden fall); posture drawing: ' + STD,
      summary: 'A sudden, brief loss of muscle tone — a head nod or a collapse — without a preceding jerk.',
      features: [['Movement', 'Abrupt but brief loss of axial tone leading to head nods or a sudden fall; “pure” atonic seizures lack the myoclonic component at onset.'],
        ['Injury', 'Falls are typically forward or collapse onto the knees, so facial and head injuries are common; protective helmets are often used in drop-attack syndromes.'],
        ['Context', 'Atonic seizures are common in Lennox–Gastaut syndrome and are part of the picture of epilepsy with myoclonic–atonic seizures; in evolution to EE-SWAS, focal atonic seizures and negative myoclonus cause falls.']],
      pitfall: 'Cataplexy, syncope and cardiac causes of drop attacks need to be considered; EEG–EMG polygraphy confirms epileptic atonia.',
      frames: [body('Head drop|brief axial tone loss', { torso: { scale: 0.9 }, head: { dy: 14, eyes: 'closed' }, arm: { R: A(68, 152), L: A(132, 152) }, hl: ['head', 'torso'], marks: [{ t: 'arrow', p: [150, 36, 150, 66] }] }),
        body('Collapse / fall|if trunk and legs lose tone', { torso: { scale: 0.66 }, head: { dy: 4, eyes: 'closed' }, arm: { R: A(68, 176), L: A(132, 176) }, leg: { R: G(78, 214), L: G(122, 214) }, hl: ['torso', 'legR', 'legL'], marks: [{ t: 'arrow', p: [178, 80, 178, 142] }] })] },

    { id: 'sz.myoatonic', name: 'Myoclonic–atonic seizure', group: GROUPS[2], basis: 'ILAE 2022 childhood paper (jerk followed by loss of tone / drop); drawing: ' + STD,
      summary: 'A myoclonic jerk immediately followed by a sudden loss of tone — the “drop”.',
      features: [['Movement', 'A brief jerk of the head, shoulders and arms followed at once by atonia of the neck and trunk, producing a head nod or a fall.'],
        ['Syndrome', 'Mandatory seizure type of epilepsy with myoclonic–atonic seizures (EMAtS), with generalized 2–6 Hz spike-wave on EEG.'],
        ['Contrast', 'Pure atonic seizures lack the myoclonic jerk at onset.']],
      pitfall: 'Tonic seizures within 12 months of onset are an alert pointing toward Lennox–Gastaut syndrome.',
      frames: [body('1 · Jerk|arms & head jerk up', { arm: { R: A(52, 62), L: A(148, 62) }, head: { dy: -3, eyes: 'open' }, hl: ['armR', 'armL'], marks: [{ t: 'burst', x: 44, y: 54, a: 215 }, { t: 'burst', x: 156, y: 54, a: -35 }] }),
        body('2 · Drop|sudden loss of tone', { torso: { scale: 0.66 }, head: { dy: 4, eyes: 'closed' }, arm: { R: A(68, 176), L: A(132, 176) }, leg: { R: G(78, 214), L: G(122, 214) }, hl: ['torso', 'legR', 'legL'], marks: [{ t: 'arrow', p: [178, 80, 178, 142] }] })] },

    { id: 'sz.neg_myoclonus', name: 'Negative myoclonus', group: GROUPS[2], basis: 'ILAE 2025 (recognised as a seizure type; differs from asterixis); movement description: ' + STD,
      summary: 'A sudden, brief interruption of sustained muscle activity — an outstretched arm “drops”, or posture is briefly lost.',
      features: [['Movement', 'Brief lapse of tone in muscles that were actively contracted, causing the arm to drop or the head or trunk to dip; the opposite of the positive jerk of myoclonus.'],
        ['ILAE 2025', 'Epileptic negative myoclonus is now recognised as a distinct generalized seizure type and differs from asterixis seen in toxic–metabolic encephalopathies.'],
        ['In practice', 'Seen in the evolution to EE-SWAS, where focal motor seizures with negative myoclonus cause loss of balance and falls.']],
      pitfall: 'Asterixis (hepatic, uraemic or toxic) looks similar but is not epileptic; consider the clinical context and EEG.',
      frames: [body('Arms held out|(actively held posture)', { arm: { R: A(-2, 78), L: A(202, 78) }, head: { eyes: 'open' }, hl: ['armR', 'armL'] }),
        body('Sudden lapse of tone|arms drop (brief)', { arm: { R: A(62, 150), L: A(138, 150) }, head: { dy: 4, eyes: 'open' }, hl: ['armR', 'armL'], marks: [{ t: 'arrow', p: [34, 92, 50, 130] }, { t: 'arrow', p: [166, 92, 150, 130] }] })] },

    /* ------------------------------------------------ Hyperkinetic & automatisms */
    { id: 'sem.hypermotor', name: 'Hyperkinetic (hypermotor) seizure', group: GROUPS[3], basis: 'ILAE 2022 variable-age paper (Riney): wording on proximal/axial large-amplitude movements and associated features',
      summary: 'Abrupt, vigorous, stereotyped movements of the proximal limbs and trunk — pedalling, thrashing, rocking — often arising from sleep.',
      features: [['Movement', 'Hyperkinetic movements involve proximal limb or axial muscles producing irregular large-amplitude movements such as pedalling, pelvic thrusting, jumping, thrashing or rocking.'],
        ['Associated', 'Autonomic signs (tachycardia, tachypnoea, irregular breathing), vocalisation and negative emotional expression; awareness is often preserved.'],
        ['Timing', 'Abrupt onset and offset, usually brief (<2 min), stereotyped, clustered, and predominantly from NREM sleep. Subtle forms were previously termed “paroxysmal arousals”.'],
        ['Syndrome', 'Defines sleep-related hypermotor (hyperkinetic) epilepsy (SHE).']],
      pitfall: 'Parasomnias (NREM arousal disorders) and nonepileptic events are the key differentials; stereotypy, brevity and clusters favour epilepsy; video-polysomnography is often needed.',
      frames: [body('Abrupt arousal from sleep|vigorous thrashing', { arm: { R: A(20, 36), L: A(180, 132) }, leg: { R: G(80, 214), L: G(118, 238) }, head: { turn: 1, eyes: 'open', mouth: 'open' }, hl: ['armR', 'armL', 'legR'], marks: [{ t: 'arrow', p: [40, 116, 22, 70], bend: 0.3, both: true }, { t: 'arrow', p: [150, 100, 178, 150], bend: -0.3, both: true }] }),
        body('Pedalling · rocking · thrusting|large-amplitude, stereotyped', { arm: { R: A(52, 132), L: A(150, 40) }, leg: { R: G(124, 238), L: G(84, 204) }, head: { turn: -1, eyes: 'open', mouth: 'open' }, hl: ['armL', 'legL', 'legR'], marks: [{ t: 'arrow', p: [76, 232, 76, 206], both: true }, { t: 'arrow', p: [124, 206, 124, 232], both: true }] })] },

    { id: 'sem.hkt_spasms', name: 'Hyperkinetic → tonic → spasms sequence', group: GROUPS[3], basis: 'ILAE 2025 (characteristic of CDKL5 deficiency disorder) and ILAE 2022 neonatal/infant paper; drawing: ' + STD,
      summary: 'A stereotyped three-part seizure — hyperkinetic activity, then tonic stiffening, then epileptic spasms — characteristic of CDKL5-DEE.',
      features: [['Sequence', 'Hyperkinetic phase (flailing, vocalising), followed by a tonic phase, followed by a run of epileptic spasms.'],
        ['Significance', 'Characteristic but not seen in all individuals with CDKL5-DEE; not yet a formal seizure type in the 2025 classification, which notes that such combinations may carry syndromic meaning.'],
        ['Context', 'Mandatory seizure criterion for CDKL5-DEE lists tonic seizures, spasms, GTC and focal seizures, with this sequence as the characteristic pattern.']],
      pitfall: 'Genetic confirmation (CDKL5 variant) is required for the diagnosis.',
      frames: [body('1 · Hyperkinetic', { infant: true, arm: { R: A(22, 44), L: A(178, 128) }, leg: { R: G(80, 214), L: G(118, 238) }, head: { turn: 1, mouth: 'open' }, hl: ['armR', 'armL'], marks: [{ t: 'arrow', p: [40, 112, 24, 70], bend: 0.3, both: true }] }),
        body('2 · Tonic', { infant: true, arm: { R: A(30, 130), L: A(170, 130) }, leg: { R: G(86, 240), L: G(114, 240) }, head: { eyes: 'up' }, hl: ['torso'] }),
        body('3 · Spasms|flexor cluster', { infant: true, torso: { scale: 0.8 }, head: { dy: 12, eyes: 'up' }, arm: { R: A(94, 108), L: A(106, 108) }, leg: { R: G(82, 202), L: G(118, 202) }, hl: ['armR', 'armL'], marks: [{ t: 'burst', x: 100, y: 22, a: -90 }] })] },

    { id: 'sem.automatism', name: 'Automatisms (oral, manual, gestural)', group: GROUPS[3], basis: 'ILAE 2022 variable-age and IGE papers (oral, vocal and gestural automatisms; behavioural arrest); further detail: ' + STD,
      summary: 'Stereotyped, semi-purposeful movements — chewing, lip-smacking, fumbling — during a seizure with impaired awareness.',
      features: [['Oral', 'Chewing, lip-smacking and swallowing automatisms, typically after a period of behavioural arrest in temporal lobe seizures.'],
        ['Manual / gestural', 'Picking, fumbling or rubbing movements of the hands; may be unilateral. Vocal automatisms (speech) can occur, notably in nondominant mesial temporal seizures.'],
        ['Absence', 'Oral and/or manual automatisms occur in about 86% of patients with typical absences in CAE; they are brief and arise after abrupt arrest.'],
        ['Lateralization', 'Unilateral manual automatisms are generally ipsilateral to the seizure onset, often with contralateral dystonic posturing (Bleasel 1997; Loddenkemper & Kotagal 2005).']],
      pitfall: 'Automatisms do not by themselves distinguish temporal from extratemporal onset; interpret the whole sequence.',
      refs: [REF.bleasel1997, REF.lodd2005],
      frames: [face('Oral automatism|chewing / lip-smacking', { mouth: 'chew', gaze: [0, 0], marks: [{ t: 'arrow', p: [74, 164, 136, 164], both: true, bend: 0 }] }),
        body('Manual automatism|fumbling, picking', { arm: { R: A(92, 124), L: A(110, 130) }, head: { eyes: 'open' }, hl: ['armR', 'armL'], marks: [{ t: 'zz', x: 74, y: 138, a: 0, len: 24 }, { t: 'zz', x: 108, y: 146, a: 0, len: 22 }] })] },

    /* ------------------------------------------------ Face, eyes & arrest */
    { id: 'sz.eyelid_myoclonia', name: 'Eyelid myoclonia', group: GROUPS[4], basis: 'ILAE 2022 IGE paper (Hirsch) and childhood paper (Specchio)',
      summary: 'Rapid rhythmic eyelid jerks with upward deviation of the eyes and head extension, typically triggered by eye closure or light.',
      features: [['Movement', 'Repetitive, rhythmic, fast (>4 Hz) jerking or fluttering of the eyelids with upward deviation of the eyeballs and subtle head extension.'],
        ['Triggers', 'Often very frequent and induced by eye closure and photic environmental stimuli; photosensitivity is nearly universal.'],
        ['EEG', 'Eye closure and intermittent photic stimulation elicit fast 3–6 Hz generalized polyspikes or polyspike-wave.'],
        ['Syndrome', 'Mandatory for epilepsy with eyelid myoclonia.']],
      pitfall: 'Blink artefact, tics and voluntary fluttering mimic it; look for the generalized discharge and for upward eye deviation.',
      frames: [face('Eyes closing|trigger', { lid: 0.75, mouth: 'neutral' }),
        face('Rapid eyelid jerks (>4 Hz)|eyes deviate upward', { lid: 0.45, gaze: [0, -1], marks: [{ t: 'arrow', p: [72, 62, 72, 96], both: true }, { t: 'arrow', p: [138, 62, 138, 96], both: true }, { t: 'burst', x: 40, y: 80, a: 200 }, { t: 'burst', x: 170, y: 80, a: -20 }] }),
        body('Head extends|slightly back', { head: { dy: -5, eyes: 'up' }, marks: [{ t: 'arrow', p: [140, 50, 150, 24], bend: -0.2 }] })] },

    { id: 'sz.reflex_myoclonic_orofacial', name: 'Reflex orofacial myoclonia (reading-induced)', group: GROUPS[4], basis: 'ILAE 2022 variable-age paper (Riney): epilepsy with reading-induced seizures',
      summary: 'Brief jerks of the jaw, lips and tongue triggered by reading or other language-related tasks.',
      features: [['Movement', 'Reflex myoclonic seizures affecting the orofacial muscles, triggered by reading or language-related tasks; the jaw may open or jerk.'],
        ['Triggers', 'Also precipitated by talking, writing or making complex decisions; hand jerks are seen with writing.'],
        ['Course', 'If unchecked, may progress to a generalized tonic–clonic seizure; warning jaw jerks are a clue.']],
      pitfall: 'Orofacial tics, stuttering and dental/jaw disorders are common mimics; reproduce with a reading task during EEG.',
      frames: [face('Reading aloud / language task', { gaze: [0, 0.8], mouth: 'neutral' }),
        face('Jaw & perioral myoclonic jerks', { gaze: [0, 0.6], mouth: 'open', marks: [{ t: 'arrow', p: [105, 152, 105, 176], both: true }, { t: 'burst', x: 56, y: 160, a: 180 }, { t: 'burst', x: 154, y: 160, a: 0 }] })] },

    { id: 'sem.oral_speech', name: 'Facial motor seizure with speech arrest (SeLECTS)', group: GROUPS[4], basis: 'ILAE 2022 childhood paper (Specchio): dysarthria, sialorrhoea, dysphasia and unilateral clonic or tonic–clonic movement of the mouth',
      summary: 'Unilateral twitching of the mouth and face with drooling and an inability to speak, usually with preserved awareness.',
      features: [['Movement', 'Focal seizure with dysarthria, sialorrhoea (drooling), dysphasia and unilateral clonic or tonic–clonic movement of the mouth, in wakefulness or sleep.'],
        ['Timing', 'If in sleep, within about 1 h of falling asleep or 1–2 h before waking; may evolve to a nocturnal focal-to-bilateral tonic–clonic seizure.'],
        ['EEG', 'High-amplitude centrotemporal sharp-and-slow-wave complexes, activated in sleep.']],
      pitfall: 'Seizures with gustatory hallucinations, fear and autonomic features suggest another self-limited syndrome (SeLEAS), not SeLECTS.',
      frames: [face('Unilateral mouth clonic|jerking, speech arrest', { mouth: 'pull', gaze: [0, 0], marks: [{ t: 'zz', x: 60, y: 172, a: -45, len: 24 }, { t: 'burst', x: 48, y: 150, a: 200 }, { t: 'arrow', p: [52, 188, 52, 208] }, lb(50, 222, 'drooling', 'middle', 'sm')] })] },

    { id: 'sem.gelastic', name: 'Gelastic seizure', group: GROUPS[4], basis: 'ILAE 2022 neonatal/infant paper (Zuberi): gelastic seizures with hypothalamic hamartoma',
      summary: 'Seizures of mechanical, mirthless laughter that is inappropriate to the context.',
      features: [['Movement', 'Laughter-like vocalisation and facial movements that look forced and joyless; usually brief and frequent, often arising without emotional trigger.'],
        ['Syndrome', 'Mandatory for gelastic seizures with hypothalamic hamartoma, which requires an MRI showing the hamartoma; seizures are drug-resistant and may evolve to other seizure types and cognitive and behavioural problems.'],
        ['Localization', 'Gelastic seizures can also arise from other regions, so imaging is required before attributing them to a hamartoma.']],
      pitfall: 'Distinguish from pathological laughing (pseudobulbar) and from normal laughter; look for the stereotyped, mirthless quality and lack of trigger.',
      frames: [face('Mechanical, mirthless|laughter', { mouth: 'smile', lid: 0.35, gaze: [0, 0], marks: [{ t: 'burst', x: 40, y: 160, a: 200 }, { t: 'burst', x: 170, y: 160, a: -20 }] })] },

    { id: 'sem.emesis', name: 'Ictal vomiting / retching', group: GROUPS[4], basis: 'ILAE 2022 childhood paper (Specchio): SeLEAS',
      summary: 'Prominent autonomic seizure with pallor, malaise and retching or vomiting, often prolonged and often in sleep.',
      features: [['Presentation', 'Focal autonomic seizure with prominent retching and vomiting; may include malaise, pallor, flushing, abdominal pain and pupillary or cardiorespiratory changes; consciousness may be impaired.'],
        ['Syndrome', 'Defines self-limited epilepsy with autonomic seizures (SeLEAS): prolonged focal non-motor seizures with ictal vomiting should prompt this diagnosis.'],
        ['Course', 'Seizures are typically infrequent; an alert is more than monthly frequency.']],
      pitfall: 'Often misdiagnosed as gastroenteritis, migraine or cyclic vomiting; the stereotyped, afebrile, sleep-related pattern and EEG help.',
      frames: [face('Pallor, malaise|then retching / vomiting', { mouth: 'open', lid: 0.35, sweat: true, gaze: [0, 0], marks: [{ t: 'arrow', p: [105, 202, 105, 228] }] })] },

    { id: 'sem.fearful_scream', name: 'Ictal fear / fearful screaming', group: GROUPS[4], basis: 'ILAE 2022 neonatal/infant paper (PCDH19 clustering epilepsy: fearful screaming typical); drawing: ' + STD,
      summary: 'Sudden fear with screaming or a frightened expression at seizure onset, typically in clusters.',
      features: [['Presentation', 'Focal seizure beginning with fearful screaming; seizures occur in clusters and may be triggered by fever.'],
        ['Syndrome', 'Typical of PCDH19 clustering epilepsy (X-linked, girls and mosaic males), with onset 1.5–60 months in females.'],
        ['Other', 'Fear is also a common aura of mesial temporal seizures.']],
      pitfall: 'Night terrors and panic attacks overlap in presentation; clusters and stereotypy favour epilepsy.',
      frames: [face('Fearful scream|wide eyes, open mouth', { mouth: 'open', wide: true, lid: 0, gaze: [0, 0], marks: [{ t: 'burst', x: 36, y: 168, a: 200 }, { t: 'burst', x: 174, y: 168, a: -20 }] })] },

    { id: 'sz.abs_typical', alias: ['sem.behavioral_arrest'], name: 'Typical absence / behavioural arrest', group: GROUPS[4], basis: 'ILAE 2022 IGE paper (Hirsch) and variable-age paper (arrest and automatisms); drawing: ' + STD,
      summary: 'Sudden cessation of activity with a blank stare and unresponsiveness lasting seconds, then abrupt recovery.',
      features: [['Presentation', 'Abrupt behavioural arrest and staring; the child stops mid-activity, does not respond, and resumes just as suddenly, usually without confusion.'],
        ['Associated', 'Oral and/or manual automatisms occur in about 86% of patients, and eye involvement (blinking, eye opening, subtle eyelid or perioral myoclonus) in about 77%.'],
        ['Duration', 'Typical absences last seconds (often 4–20 s); staring spells longer than 30 s or with postictal confusion are an alert for CAE.'],
        ['Provocation', 'Hyperventilation for 3 minutes provokes them; in temporal seizures the arrest precedes automatisms.']],
      pitfall: 'Daydreaming and inattention are the usual mimics; hyperventilation during EEG reproduces absences in most untreated CAE.',
      frames: [body('Activity stops abruptly', { arm: { R: A(66, 62), L: A(136, 146) }, head: { eyes: 'open' }, marks: [lb(164, 52, 'mid-task', 'middle', 'sm')] }),
        face('Blank stare, unresponsive|(seconds)', { gaze: [0, 0], mouth: 'neutral' })] },

    { id: 'sem.ictal_paresis', name: 'Ictal paresis / postictal (Todd) paresis', group: GROUPS[4], basis: 'Ictal paresis is listed in the ILAE 2025 descriptor table; Todd paresis is distinguished in the ILAE 2022 papers (transient, vs permanent hemiparesis in HHE); drawing: ' + STD,
      summary: 'Loss of voluntary movement in a limb during (ictal) or after (Todd) a seizure.',
      features: [['Ictal paresis', 'Focal weakness during the seizure: the limb stops moving or cannot be used; a lateralizing/localizing negative sign of motor cortex involvement.'],
        ['Todd paresis', 'A transient postictal weakness of the affected side, resolving within hours to days. Transient Todd paresis does not count as a permanent deficit, and permanent hemiparesis after febrile status points to HHE.'],
        ['Value', 'Weakness of one side after a seizure suggests the contralateral hemisphere was involved.']],
      pitfall: 'Prolonged or persistent deficit needs imaging to exclude stroke or other structural cause.',
      refs: [REF.lodd2005],
      frames: [body('Weakness of one limb|(right arm limp)', { arm: { R: A(72, 150), L: A(136, 146) }, head: { eyes: 'open' }, hl: ['armR'], marks: [{ t: 'x', x: 80, y: 160 }] })] },
  ];

  const byId = {};
  ITEMS.forEach((m) => { byId[m.id] = m; (m.alias || []).forEach((a) => { byId[a] = m; }); });
  return { GROUPS, ITEMS, byId, REF, STD };
});
