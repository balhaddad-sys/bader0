/*
 * Physical signs atlas: dysmorphic, skin/neurocutaneous and neurological-examination findings
 * that point toward an epilepsy syndrome or cause. Each entry has 1–3 labelled frames
 * (figures.js), features, a pitfall and a `basis` line stating what is ILAE-sourced and what
 * comes from international consensus criteria or standard clinical teaching.
 *
 * The patient's RIGHT is on the viewer's LEFT. Figures are schematic, not clinical photographs;
 * skin signs vary in appearance with skin tone and age.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EpiPhysical = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const GROUPS = ['Head & face', 'Skin (neurocutaneous)', 'Tone, strength & vision', 'Movement & coordination'];
  const ILAE = 'ILAE 2022 syndrome papers';
  const STD = 'standard clinical teaching';
  const REF = {
    northrup2021: 'Northrup H, Aronow ME, Bebin EM, et al. Updated International Tuberous Sclerosis Complex Diagnostic Criteria and Surveillance and Management Recommendations. Pediatr Neurol 2021;123:50–66.',
    legius2021: 'Legius E, Messiaen L, Wolkenstein P, et al. Revised diagnostic criteria for neurofibromatosis type 1 and Legius syndrome: an international consensus recommendation. Genet Med 2021;23:1506–1513.',
  };
  const A = (x, y, b) => ({ hand: [x, y], bend: b || 'out' });
  const G = (x, y, b) => ({ foot: [x, y], bend: b || 'out' });
  const body = (title, spec) => ({ kind: 'body', title, spec });
  const face = (title, spec) => ({ kind: 'face', title, spec });
  const custom = (title, key) => ({ kind: 'custom', title, spec: { key } });
  const lb = (x, y, text, anchor, cls) => ({ t: 'label', x, y, text, anchor, cls });
  const num = (x, y, n) => [{ t: 'dots', pts: [[x, y]], r: 8, cls: 'pf-num' }, lb(x, y + 3.6, String(n), 'middle', 'pf-numt')];

  const ITEMS = [
    /* ------------------------------------------------ Head & face */
    { id: 'neuro.facial_angioma_v1', name: 'Facial capillary malformation (port-wine stain) in V1', group: GROUPS[0], basis: ILAE + ' (Sturge–Weber syndrome table; alerts in HHE and Rasmussen criteria); trigeminal territories: ' + STD,
      summary: 'A flat red–purple birthmark over the forehead and upper eyelid (first trigeminal division), typically on one side — the facial sign of Sturge–Weber syndrome.',
      features: [['What it looks like', 'A flat, sharply demarcated pink-to-purple capillary malformation present from birth, in the V1 distribution (forehead and upper eyelid), usually unilateral and sometimes extending to V2/V3.'],
        ['ILAE criteria', 'Sturge–Weber syndrome: focal motor or autonomic seizures plus MRI leptomeningeal enhancement are mandatory; the absence of a facial capillary malformation in the V1 distribution is an alert. A facial angioma suggesting Sturge–Weber is also an alert for HHE, and SWS on imaging excludes Rasmussen syndrome.'],
        ['Timing', 'MRI changes may be subtle or absent before 2 months of age, so a normal early MRI does not exclude the diagnosis (ILAE).'],
        ['Other', 'Eyes need ophthalmological review: glaucoma is a recognised association of facial port-wine stains involving the upper lid.']],
      pitfall: 'Most facial port-wine stains are isolated and do not signal Sturge–Weber syndrome; the risk is highest with V1 (forehead and upper eyelid) involvement, so look for that pattern and for seizures or neurological signs.',
      frames: [face('Unilateral V1 capillary malformation', { mouth: 'neutral', marks: [{ t: 'shape', d: 'M108 47Q150 42 176 78L180 99Q150 105 120 99L108 99Z', cls: 'pf-lesion' }, lb(150, 70, 'forehead &', 'middle', 'pf-lbw'), lb(150, 81, 'upper lid', 'middle', 'pf-lbw')] }),
        face('Trigeminal territories|V1 · V2 · V3', { mouth: 'neutral', marks: [{ t: 'shape', d: 'M44 72Q105 30 166 72L178 99L32 99Z', cls: 'pf-v1' }, { t: 'shape', d: 'M32 99L178 99L172 140Q105 154 38 140Z', cls: 'pf-v2' }, { t: 'shape', d: 'M38 140Q105 154 172 140Q150 192 105 198Q60 192 38 140Z', cls: 'pf-v3' }, lb(204, 72, 'V1', 'end'), lb(204, 124, 'V2', 'end'), lb(204, 176, 'V3', 'end')] })] },

    { id: 'neuro.microcephaly', name: 'Microcephaly (small head size)', group: GROUPS[0], basis: ILAE + ' (IGE tables: testing recommended with microcephaly; head size normal in SeLEAS); measurement: ' + STD,
      summary: 'A head circumference below the normal range for age and sex — a prompt for genetic and metabolic evaluation, including GLUT1 deficiency.',
      features: [['Measurement', 'Measure the largest occipitofrontal circumference with a flexible tape and plot it on age- and sex-specific growth charts; trend over time matters more than one value.'],
        ['ILAE criteria', 'For childhood and juvenile absence epilepsy, testing for low CSF glucose and/or an SLC2A1 pathogenic variant is strongly recommended in children with onset at ≤3 years, microcephaly and/or intellectual disability; for example, head size is typically normal in self-limited epilepsy with autonomic seizures.'],
        ['Context', 'Small head size with early-onset epilepsy raises the possibility of a developmental and epileptic encephalopathy, congenital malformation or prenatal cause.']],
      pitfall: 'A single below-range measurement in a small child needs interpretation against parental head size and the growth trajectory; a falling centile is more concerning than a constant low one.',
      frames: [custom('Head size vs the normal range|(schematic)', 'headsizes')] },

    { id: 'neuro.dysmorphism', name: 'Dysmorphic features / congenital anomalies', group: GROUPS[0], basis: ILAE + ' (MEI exclusion; IGE genetics section); facial survey landmarks: ' + STD,
      summary: 'Unusual facial or body features and congenital anomalies point toward a chromosomal or genetic syndrome rather than an idiopathic epilepsy.',
      features: [['What to survey', '1 eyes and brows (spacing, slant) · 2 ears (position, shape) · 3 nose bridge and philtrum · 4 mouth, lips, palate and teeth · 5 chin and jaw; plus hands, feet, skin, hair and growth parameters.'],
        ['ILAE criteria', 'In myoclonic epilepsy in infancy, dysmorphism or other congenital anomalies are exclusionary because they suggest a chromosomal disorder. If seizures in an idiopathic generalized epilepsy are drug-resistant, a chromosomal microarray should be performed to look for recurrent copy-number variants.'],
        ['Use', 'Document findings in a standardised way and consider referral to clinical genetics; many dysmorphic features are subtle and best recognised against family resemblance.']],
      pitfall: 'Minor anomalies are common in the general population and in families; weigh combinations, onset of epilepsy and neurodevelopment rather than any single feature.',
      frames: [face('Dysmorphology survey', { mouth: 'neutral', marks: [].concat(num(105, 66, 1), num(24, 118, 2), num(186, 118, 2), num(105, 140, 3), num(105, 172, 4), num(105, 202, 5)) })] },

    { id: 'neuro.facial_asymmetry', name: 'Facial asymmetry / reduced facial movement', group: GROUPS[0], basis: ILAE + ' (variable-age paper, MTLE-HS: reduced facial movement on the contralateral side); drawing: ' + STD,
      summary: 'Subtle weakness of lower-face movement on one side, noticed when smiling, in an otherwise normal examination.',
      features: [['What it looks like', 'A flatter nasolabial fold and less movement of one corner of the mouth, most obvious on voluntary or emotional smiling.'],
        ['ILAE', 'In mesial temporal lobe epilepsy with hippocampal sclerosis the neurological examination is normal, although reduced facial movement may be noted on the contralateral side.'],
        ['Meaning', 'A mild, long-standing asymmetry can be a lateralising clue pointing to the contralateral hemisphere; new or progressive weakness needs imaging.']],
      pitfall: 'Congenital facial asymmetry, dental asymmetry and photographs taken at an angle can mimic it.',
      frames: [face('Reduced movement on one side|(smile weaker on the patient’s right)', { mouth: 'droop', gaze: [0, 0], marks: [{ t: 'arrow', p: [58, 176, 58, 198] }, lb(52, 214, 'weaker', 'middle', 'sm')] })] },

    /* ------------------------------------------------ Skin (neurocutaneous) */
    { id: 'neuro.hypopigmented_macules', name: 'Hypomelanotic (ash-leaf) macules', group: GROUPS[1], basis: 'International TSC diagnostic criteria (Northrup 2021); ' + STD + '. Not described in the ILAE syndrome papers.',
      summary: 'Pale, leaf-shaped patches of skin present from early life — the commonest skin sign of tuberous sclerosis complex, which is a recognised cause of infantile spasms.',
      features: [['What it looks like', 'Well-defined, depigmented (not white) patches, often oval or leaf-shaped, on the trunk or limbs; they may be the only early sign and are easier to see under ultraviolet (Wood’s) light, especially in fair skin.'],
        ['Criteria', 'Three or more hypomelanotic macules of at least 5 mm diameter are a major feature of tuberous sclerosis complex (2021 International criteria).'],
        ['Why it matters in epilepsy', 'Tuberous sclerosis complex is a recognised cause of infantile epileptic spasms and focal seizures; recognition prompts MRI, genetic testing and surveillance (see the EPISTOP prevention trial cited in the ILAE papers).']],
      pitfall: 'One or two small pale patches are common in healthy children; count and size matter, and examine the whole skin under good light.',
      refs: [REF.northrup2021],
      frames: [body('Ash-leaf macules|on the trunk', { age: 'child', hl: [], marks: [{ t: 'shape', d: 'M72 104Q92 86 112 104Q92 120 72 104Z', cls: 'pf-macule' }, { t: 'shape', d: 'M100 136Q116 122 132 136Q116 148 100 136Z', cls: 'pf-macule' }, { t: 'shape', d: 'M72 138Q85 128 98 138Q85 146 72 138Z', cls: 'pf-macule' }] })] },

    { id: 'neuro.angiofibromas', name: 'Facial angiofibromas & other tuberous sclerosis skin signs', group: GROUPS[1], basis: 'International TSC diagnostic criteria (Northrup 2021); ' + STD + '. Not described in the ILAE syndrome papers.',
      summary: 'Small, firm, red papules across the cheeks and nasolabial folds appearing in early childhood, with other skin signs of tuberous sclerosis complex.',
      features: [['Facial angiofibromas', 'Red-pink papules over the cheeks, nasolabial folds and chin, usually appearing after infancy; three or more (or a fibrous cephalic plaque) is a major criterion.'],
        ['Other skin signs', 'Shagreen patch (a thickened, leathery plaque, often over the lower back) and ungual (nail-fold) fibromas, two or more of which is a major criterion; hypomelanotic macules are usually the earliest sign.'],
        ['Why it matters', 'A positive skin examination in a child with epilepsy prompts brain MRI and genetic testing for tuberous sclerosis complex.']],
      pitfall: 'Acne and angiofibromas look alike in adolescents; look for monomorphic firm papules in the central face and for other TSC signs.',
      refs: [REF.northrup2021],
      frames: [face('Facial angiofibromas', { mouth: 'neutral', marks: [{ t: 'dots', pts: [[70, 148], [80, 160], [66, 134], [140, 148], [130, 160], [144, 134], [94, 152], [116, 152], [105, 146], [84, 140], [126, 140]], r: 3, cls: 'pf-papule' }] })] },

    { id: 'neuro.cafe_au_lait', name: 'Café-au-lait macules & freckling', group: GROUPS[1], basis: 'International NF1 diagnostic criteria (Legius 2021); ' + STD + '. Not described in the ILAE syndrome papers.',
      summary: 'Flat, uniformly tan-brown patches with smooth edges, plus freckling of the armpits or groin — the skin signs of neurofibromatosis type 1.',
      features: [['What it looks like', 'Evenly pigmented, flat patches with smooth borders; the criterion is six or more larger than 5 mm in prepubertal children (15 mm after puberty), together with axillary or inguinal freckling and other features.'],
        ['Why it matters in epilepsy', 'Neurofibromatosis type 1 is associated with epilepsy in a minority of patients, often with structural brain findings; the skin signs prompt full NF1 evaluation.'],
        ['Context', 'Café-au-lait spots alone are common; one to three are seen in many healthy people.']],
      pitfall: 'Isolated café-au-lait macules are common; the diagnosis rests on the combination of criteria, with family history and genetic testing.',
      refs: [REF.legius2021],
      frames: [body('Café-au-lait macules|and axillary freckling', { age: 'child', marks: [{ t: 'shape', d: 'M78 98a9 5 -20 1 0 18 0a9 5 -20 1 0 -18 0Z', cls: 'pf-cal' }, { t: 'shape', d: 'M104 118a10 5 15 1 0 20 0a10 5 15 1 0 -20 0Z', cls: 'pf-cal' }, { t: 'shape', d: 'M82 138a8 4.5 -10 1 0 16 0a8 4.5 -10 1 0 -16 0Z', cls: 'pf-cal' }, { t: 'dots', pts: [[70, 90], [74, 94], [68, 96], [72, 99], [130, 90], [126, 94], [132, 96], [128, 99]], r: 1.8, cls: 'pf-dot' }] })] },

    /* ------------------------------------------------ Tone, strength & vision */
    { id: 'neuro.hypotonia', name: 'Hypotonia (reduced muscle tone)', group: GROUPS[2], basis: ILAE + ' (EIDEE: abnormal tone, most frequently central hypotonia, with posture and cortical visual impairment; EIMFS; CDKL5 and gelastic-HH alerts); drawing and tests: ' + STD,
      summary: 'A floppy infant: limbs lie extended and limp rather than flexed, and the head lags behind when pulled to sit.',
      features: [['Posture', 'A typical young infant lies with flexed limbs; the hypotonic infant lies “frog-legged” with limbs extended and abducted and little spontaneous movement.'],
        ['Head lag', 'On pulling to sit, the head falls back and does not follow the trunk; on ventral suspension the infant droops like an inverted “U”.'],
        ['ILAE', 'In early infantile DEE the neurological examination is often severely abnormal, with abnormal tone (most frequently central hypotonia), posture and motor behaviour, and cortical visual impairment. Normal tone is an alert against CDKL5-DEE; generalized hypotonia is an alert for gelastic seizures with hypothalamic hamartoma, and is described as part of the evolution of some infantile focal seizures.'],
        ['Central vs peripheral', 'Central hypotonia (brain) usually keeps reflexes and antigravity strength; peripheral causes weaken the limbs and reduce reflexes.']],
      pitfall: 'Hypotonia is non-specific: sedating anti-seizure medicines, systemic illness and prematurity can all cause it; look for it between seizures.',
      frames: [body('Typical posture|limbs flexed', { age: 'infant', arm: { R: A(70, 98), L: A(130, 98) }, leg: { R: G(80, 206), L: G(120, 206) } }),
        body('Hypotonic posture|limp, extended, “frog-leg”', { age: 'infant', head: { eyes: 'closed' }, arm: { R: A(36, 130), L: A(164, 130) }, leg: { R: G(58, 228), L: G(142, 228) }, hl: ['torso'] }),
        body('Head lag on pull-to-sit', { age: 'infant', torso: { scale: 0.92 }, head: { dy: -9, eyes: 'closed' }, arm: { R: A(66, 56), L: A(134, 56) }, marks: [{ t: 'arrow', p: [150, 30, 150, 66] }] })] },

    { id: 'neuro.hemiparesis_permanent', alias: ['neuro.hemiparesis_at_onset', 'neuro.focal'], name: 'Hemiparesis, hemiatrophy & focal weakness', group: GROUPS[2], basis: ILAE + ' (HHE, Rasmussen syndrome; focal neurological findings are an alert in many criteria); drawing: ' + STD,
      summary: 'Weakness of one side of the body — permanent after febrile status in HHE, progressive in Rasmussen syndrome, transient after a seizure (Todd paresis).',
      features: [['Permanent hemiparesis', 'Hemiconvulsion–hemiplegia–epilepsy syndrome requires permanent hemiparesis following hemiclonic febrile status epilepticus; chronic epilepsy appears later (usually within 3 years).'],
        ['Progressive', 'Rasmussen syndrome causes progressive hemiparesis and may cause hemianopia, with progressive hemiatrophy on MRI; hemiparesis present at onset argues for HHE rather than Rasmussen syndrome.'],
        ['Todd paresis', 'Transient postictal weakness that resolves within hours to days; it is not counted as a permanent deficit.'],
        ['Hemiatrophy', 'A smaller limb on the affected side suggests that the weakness has been present during growth, e.g. early-life injury.']],
      pitfall: 'Focal neurological findings (other than Todd paresis) are an alert in many self-limited syndromes; they should prompt MRI to look for a structural cause.',
      frames: [body('Permanent hemiparesis|(right side)', { age: 'child', arm: { R: A(88, 112), L: A(136, 146) }, leg: { R: G(84, 238), L: G(112, 238) }, hl: ['armR', 'legR'], marks: [{ t: 'x', x: 90, y: 122 }] }),
        body('Hemiatrophy|smaller limbs on the weak side', { age: 'child', limbScale: { armR: 0.78, legR: 0.84 }, arm: { R: A(70, 134), L: A(136, 146) }, leg: { R: G(90, 222), L: G(112, 238) }, hl: ['armR', 'legR'] }),
        body('Todd paresis|transient — recovers', { age: 'child', arm: { R: A(72, 150), L: A(136, 146) }, hl: ['armR'], marks: [{ t: 'arrow', p: [40, 150, 40, 120], bend: 0 }, lb(40, 164, 'recovers', 'middle', 'sm')] })] },

    { id: 'neuro.visual_field_deficit', name: 'Visual-field deficit / hemianopia', group: GROUPS[2], basis: ILAE + ' (COVE and POLE exclusions; Rasmussen syndrome; SWS; cortical visual impairment in EIDEE); drawing: ' + STD,
      summary: 'Loss of one half of the field of vision in both eyes — a persistent deficit points toward a structural occipital or hemispheric lesion.',
      features: [['What it is', 'A homonymous hemianopia: the same half of the visual field is lost in both eyes (here the right half), usually from a lesion of the contralateral occipital lobe or optic radiation.'],
        ['ILAE criteria', 'A persistent visual field deficit is exclusionary for childhood occipital visual epilepsy and photosensitive occipital lobe epilepsy (a permanent deficit for POLE). Rasmussen syndrome may cause homonymous hemianopia as it progresses.'],
        ['Young children', 'Cortical visual impairment is described in early infantile DEE; assess visual attention and tracking rather than confrontation fields.'],
        ['Testing', 'Confrontation fields in cooperative children and adults; formal perimetry where available.']],
      pitfall: 'Transient postictal field loss and visual aura are not the same as a persistent deficit; test between seizures.',
      frames: [custom('Right homonymous hemianopia|(both eyes lose the right half)', 'visualfield')] },

    /* ------------------------------------------------ Movement & coordination */
    { id: 'neuro.movement_disorder', name: 'Ataxia, paroxysmal dyskinesia & dystonia', group: GROUPS[3], basis: ILAE + ' (GLUT1DS alert; PRRT2 / SeLIE; PME cerebellar signs); drawing: ' + STD,
      summary: 'Unsteady, wide-based gait, or brief episodes of twisting or jerky movement triggered by starting to move — clues to GLUT1 deficiency, PRRT2 variants and progressive myoclonus epilepsies.',
      features: [['Ataxia', 'Wide-based, unsteady gait with arms held out for balance and difficulty with tandem walking. In GLUT1 deficiency a movement disorder (ataxia, paroxysmal exercise-induced dyskinesia or dystonia) is expected — its absence is an alert; in progressive myoclonus epilepsies progressive cerebellar signs develop.'],
        ['Paroxysmal dyskinesia', 'PRRT2 variants cause self-limited infantile epilepsy and may later cause paroxysmal kinesigenic dyskinesia or dystonia, from childhood to adult life; the episodes last only seconds and are easily missed, so ask about them specifically.'],
        ['Triggers', 'Kinesigenic episodes are triggered by sudden movement; exercise-induced episodes follow prolonged activity.']],
      pitfall: 'Brief paroxysmal movements are often mistaken for seizures or tics; video and a precise description of triggers and duration help.',
      frames: [body('Ataxic stance|wide base, arms out for balance', { arm: { R: A(24, 100), L: A(176, 100) }, leg: { R: G(62, 238), L: G(138, 238) }, head: { eyes: 'open' }}),
        body('Paroxysmal dystonic episode|seconds, on starting to move', { arm: { R: A(40, 62, 'up'), L: A(150, 122) }, head: { turn: -1, eyes: 'open' }, hl: ['armR', 'torso'], marks: [{ t: 'burst', x: 34, y: 54, a: 220 }] })] },
  ];

  const byId = {};
  ITEMS.forEach((m) => { byId[m.id] = m; (m.alias || []).forEach((a) => { byId[a] = m; }); });
  return { GROUPS, ITEMS, byId, REF };
});
