'use strict';
/* NeuroLocalize 1.6: lesson deep dives (bedside sequence, comparison table, worked example, extra traps)
   and a glossary. Original teaching summaries of standard neuroanatomy; not clinical guidance. */
window.NL_DEEP = {
 approach: {
  exam: ['Ask exactly what the person means by weak, numb or dizzy, and when it started.', 'Map the distribution: one limb, one side, both legs, distal, proximal or patchy.', 'Check for upper versus lower motor neuron signs: tone, reflexes, plantar response, wasting.', 'Add a second system: sensation, cranial nerves, language, vision or coordination.', 'State one level that explains everything, then name the finding that would prove you wrong.'],
  compare: {title: 'Three patterns of involvement', head: ['Pattern', 'Usually means', 'Think of'], rows: [['Focal', 'One lesion at one level', 'Stroke, compression, a single nerve'], ['Multifocal', 'Several separate lesions', 'Inflammatory or vascular disease, multiple nerves'], ['Diffuse, symmetric', 'A system-wide process', 'Polyneuropathy, myopathy, metabolic or toxic causes']]},
  example: {case: 'Weakness of the right hand and face with trouble finding words, starting suddenly.', steps: ['Face and hand on the same side with language difficulty point above the brainstem.', 'Language involvement adds a cortical sign, usually from the left hemisphere.', 'Sudden onset suggests a vascular mechanism, but the level comes first.'], answer: 'Left frontal cortex and its nearby language network.'},
  traps: ['Stopping at the first level that fits, without testing one finding that does not.', 'Treating "dizzy" or "numb" as a single symptom before clarifying what the person feels.'],
  figs: ['neuraxis', 'weakness-flow', 'time-course', 'body-patterns']
 },
 motor: {
  exam: ['Inspect for wasting and fasciculation at rest.', 'Test tone with slow and fast passive movement; feel for a catch.', 'Grade power in groups: shoulder, elbow, wrist, fingers, hip, knee, ankle.', 'Test reflexes on both sides and compare them, then the plantar responses.', 'Look for drift with arms held out and eyes closed.'],
  compare: {title: 'Patterns of weakness', head: ['Distribution', 'Typical level', 'Supporting sign'], rows: [['Face, arm and leg, one side', 'Opposite hemisphere or brainstem', 'Brisk reflexes, extensor plantar'], ['Both legs, arms spared', 'Thoracic cord (or parasagittal)', 'Sensory level, bladder change'], ['One myotome', 'Nerve root', 'Matching reflex and dermatome'], ['Proximal, symmetric', 'Muscle or junction', 'Sensation normal']]},
  example: {case: 'Both legs weak with brisk knee and ankle reflexes; arms normal; numb below the umbilicus.', steps: ['Upper motor neuron signs in both legs only place the lesion in the cord below the arms.', 'A sensory level at the umbilicus marks about T10 on the skin.', 'The cord lesion is at or above that level.'], answer: 'Thoracic spinal cord at or above T10.'},
  traps: ['Calling weakness "upper motor neuron" from brisk reflexes alone; check plantars and tone too.', 'Forgetting that the cord level can be higher than the sensory level suggests.'],
  figs: ['umn-lmn', 'motor', 'reflex-arc']
 },
 cortex: {
  exam: ['Listen to spontaneous speech, then test naming, repetition, comprehension, reading and writing.', 'Test for neglect: line bisection, cancellation, or double simultaneous touch.', 'Test cortical sensation: number writing on the palm, object recognition by touch, two-point discrimination.', 'Check visual fields by confrontation in each quadrant.', 'Ask the person to mime using a tool to look for apraxia.'],
  compare: {title: 'Hemisphere clues', head: ['Finding', 'Usually points to', 'Note'], rows: [['Aphasia', 'Dominant (usually left) hemisphere', 'Fluency and repetition refine the site'], ['Neglect of the left side', 'Non-dominant (usually right) parietal', 'Can coexist with normal strength'], ['Astereognosis, agraphesthesia', 'Opposite parietal cortex', 'Requires intact primary sensation'], ['Homonymous field cut', 'Opposite temporal, parietal or occipital', 'Superior or inferior quadrant matters']]},
  example: {case: 'A person ignores food on the left of the plate and denies any problem; strength is near normal.', steps: ['Ignoring one side with unawareness is spatial neglect.', 'Left neglect usually arises from the right hemisphere, often parietal.', 'Normal strength makes a large motor lesion less likely.'], answer: 'Right parietal cortex.'},
  traps: ['Mistaking aphasia for confusion; test naming and comprehension separately.', 'Assuming a field cut is ocular without checking both eyes together.'],
  figs: ['cortex', 'aphasia-tree', 'vascular']
 },
 subcortex: {
  exam: ['Compare face, arm and leg strength: are they equally affected?', 'Look carefully for cortical signs: language, neglect, field cut.', 'Test all sensory modalities on both sides of the body.', 'Check for involuntary movements such as flinging or writhing.'],
  compare: {title: 'Cortex or deep pathway?', head: ['Feature', 'Cortical lesion', 'Deep (capsular) lesion'], rows: [['Face, arm, leg', 'Often uneven', 'Often equal'], ['Language or neglect', 'May be present', 'Usually absent'], ['Sensation', 'Cortical modalities affected', 'Can be purely motor or purely sensory'], ['Field cut', 'Common with large lesions', 'Only if the optic radiation is involved']]},
  example: {case: 'Sudden equal weakness of the left face, arm and leg; speech, sensation and fields normal.', steps: ['Equal face, arm and leg weakness suggests fibres packed close together.', 'No cortical or sensory signs argues against a large cortical lesion.', 'Contralateral to the left-sided weakness is the right hemisphere.'], answer: 'Right internal capsule (posterior limb) or ventral pons.'},
  traps: ['Labelling every pure motor stroke as capsular; the pons can produce the same pattern.', 'Missing thalamic sensory loss because strength is normal.'],
  figs: ['compact', 'vascular']
 },
 brainstem: {
  exam: ['Examine every cranial nerve, especially eye movements, facial sensation and swallowing.', 'Look for crossed findings: face on one side, body on the other.', 'Test limb coordination and gait for cerebellar involvement.', 'Check pupils and lids for Horner syndrome.', 'Test both pain and vibration on the body.'],
  compare: {title: 'Classic brainstem patterns', head: ['Pattern', 'Level and side', 'Key nerve'], rows: [['III palsy + opposite hemiparesis', 'Medial midbrain', 'III'], ['VI or VII palsy + opposite hemiparesis', 'Ventral pons', 'VI, VII'], ['XII palsy + opposite hemiparesis', 'Medial medulla', 'XII'], ['Face pain loss, Horner, ataxia + opposite body pain loss', 'Lateral medulla', 'V (spinal), IX, X']]},
  example: {case: 'Left facial numbness to pin, hoarse voice, left Horner, and right-sided body pain loss.', steps: ['Crossed face and body sensory loss means the brainstem.', 'Hoarseness (nucleus ambiguus) and Horner are lateral structures.', 'The facial findings mark the side of the lesion.'], answer: 'Left lateral medulla.'},
  traps: ['Expecting every classical sign; partial syndromes are common.', 'Forgetting that a cranial nerve can be damaged outside the brainstem.'],
  figs: ['brainstem-rule', 'crossed', 'horner']
 },
 cranial: {
  exam: ['II: acuity, fields, pupils and fundi.', 'III, IV, VI: eye movements in all directions and a cover test for diplopia.', 'V and VII: facial sensation, corneal reflex and facial strength including forehead.', 'VIII: whisper test and, when relevant, vestibular tests.', 'IX, X, XII: palate, swallow, voice and tongue protrusion.'],
  compare: {title: 'Facial weakness: central or peripheral?', head: ['Feature', 'Central (above nucleus)', 'Peripheral (nucleus or nerve)'], rows: [['Forehead', 'Largely spared', 'Weak'], ['Eye closure', 'Usually good', 'Weak'], ['Side vs lesion', 'Opposite side', 'Same side'], ['Associated signs', 'Arm weakness, aphasia', 'Hearing, taste or tear changes']]},
  example: {case: 'Sudden inability to wrinkle the right forehead or close the right eye; arm strength normal.', steps: ['Forehead and eye closure weakness indicates a peripheral pattern.', 'A peripheral lesion is on the same side as the weakness.', 'No limb or other cranial signs suggests the nerve outside the brainstem.'], answer: 'Right facial nerve (peripheral).'},
  traps: ['Calling every facial palsy peripheral without checking the forehead.', 'Over-interpreting a sixth nerve palsy: raised intracranial pressure can cause it without a lesion on that nerve.'],
  figs: ['cranial', 'facial', 'cavernous-sinus', 'gaze-circuit']
 },
 eyes: {
  exam: ['Compare pupil sizes in bright and dim light, then perform the swinging light test.', 'Test pursuit in an H pattern and ask where double vision is worst.', 'Cover each eye to see which image disappears.', 'Test saccades and look for nystagmus.', 'Check lids for ptosis and fatigability.'],
  compare: {title: 'Ptosis with a pupil change', head: ['Finding', 'Third nerve', 'Horner syndrome'], rows: [['Pupil', 'Large, poorly reactive', 'Small, reacts to light'], ['Ptosis', 'Often marked', 'Mild'], ['Eye movement', 'Down and out', 'Normal'], ['Worse in', 'Bright light (anisocoria)', 'Dim light (anisocoria)']]},
  example: {case: 'Double vision worst looking down and to the left; the right eye sits slightly higher.', steps: ['Vertical diplopia worse looking down suggests a depressor muscle.', 'Worse looking down and to the left implicates the right superior oblique, which depresses in adduction.', 'The superior oblique is supplied by IV.'], answer: 'Right fourth nerve (trochlear) palsy.'},
  traps: ['Missing a myasthenic pattern because the pupils are normal.', 'Attributing a large pupil to drops or trauma before excluding a third nerve palsy.'],
  figs: ['eye-muscles', 'pupil-reflex', 'gaze-circuit', 'cavernous-sinus']
 },
 cord: {
  exam: ['Search for a sensory level with pin, moving upward from the feet on the trunk.', 'Compare pain and vibration on each side.', 'Test reflexes above and below the suspected level.', 'Ask about bladder and bowel change; check saddle sensation.', 'Look for a band of pain or lower motor signs at the level of the lesion.'],
  compare: {title: 'Cord syndromes', head: ['Syndrome', 'Lost', 'Spared'], rows: [['Anterior cord', 'Strength, pain, temperature', 'Vibration, position'], ['Posterior cord', 'Vibration, position', 'Strength often, pain'], ['Central cord', 'Arms more than legs; cape-like pain loss', 'Sacral sensation often'], ['Hemicord', 'Same-side strength and vibration', 'Opposite-side vibration']]},
  example: {case: 'Weak right leg, loss of vibration in the right leg, loss of pain in the left leg.', steps: ['Strength and vibration lost on one side with pain lost on the other is dissociated loss.', 'This fits damage to one half of the cord.', 'Motor and vibration loss mark the lesion side.'], answer: 'Right hemicord (Brown-Séquard pattern).'},
  traps: ['Missing a cord lesion because the arms are normal; check the trunk for a level.', 'Assuming normal reflexes exclude an acute cord lesion.'],
  figs: ['cord-syndromes', 'hemicord', 'conus-cauda', 'sensory-pathways']
 },
 roots: {
  exam: ['Ask about radiating pain and what posture or cough makes it worse.', 'Test muscles that share the root but use different nerves.', 'Test the reflex for that root.', 'Map sensory change against dermatome landmarks.', 'Look for a straight-leg raise or neck movement that reproduces the pain.'],
  compare: {title: 'Common radiculopathies', head: ['Root', 'Weakness', 'Reflex / sensation'], rows: [['C6', 'Elbow flexion, wrist extension', 'Brachioradialis; thumb'], ['C7', 'Elbow and finger extension', 'Triceps; middle finger'], ['L5', 'Toe and foot extension, hip abduction', 'None reliable; top of the foot'], ['S1', 'Plantar flexion', 'Ankle; outer foot and sole']]},
  example: {case: 'Back pain shooting down the leg, weak great-toe extension and hip abduction, normal ankle reflex.', steps: ['Toe extension and hip abduction share L5 but use different nerves.', 'A normal ankle reflex makes S1 less likely.', 'Radiating pain supports a root.'], answer: 'L5 radiculopathy.'},
  traps: ['Expecting a full dermatomal band; overlap makes single-root loss small.', 'Diagnosing a root lesion from pain alone without matching weakness or reflex change.'],
  figs: ['root-signatures', 'dermatome-landmarks', 'reflex-arc']
 },
 plexus: {
  exam: ['Test muscles supplied by different nerves in the affected limb.', 'Check whether deficits span more than one root.', 'Test sensation in each nerve and dermatome territory.', 'Look for Horner syndrome with a lower brachial plexus pattern.', 'Ask about trauma, radiation, cancer or severe preceding pain.'],
  compare: {title: 'Upper or lower brachial plexus?', head: ['Feature', 'Upper trunk (C5–C6)', 'Lower trunk (C8–T1)'], rows: [['Weak', 'Shoulder abduction, elbow flexion', 'Hand muscles'], ['Reflex', 'Biceps reduced', 'Usually normal arm reflexes'], ['Sensory loss', 'Lateral arm', 'Medial forearm and hand'], ['Extra sign', 'Arm hangs internally rotated', 'Possible Horner syndrome']]},
  example: {case: 'Weak shoulder abduction, elbow flexion and external rotation after a fall onto the shoulder.', steps: ['Several muscles from axillary, musculocutaneous and suprascapular nerves are weak.', 'All share C5–C6.', 'Trauma that widens the neck–shoulder angle stretches the upper trunk.'], answer: 'Upper trunk of the brachial plexus.'},
  traps: ['Calling a plexopathy a mononeuropathy because one muscle is weakest.', 'Ignoring a Horner syndrome that points to a proximal lower plexus or root lesion.'],
  figs: ['brachial-plexus', 'lumbosacral', 'peripheral']
 },
 leg: {
  exam: ['Test hip flexion, adduction and abduction, knee extension and flexion.', 'Test ankle dorsiflexion, plantar flexion, inversion and eversion separately.', 'Check knee and ankle reflexes on both sides.', 'Map sensory change: medial leg, lateral leg, top of the foot, sole.', 'Look at the back for tenderness or pain on movement.'],
  compare: {title: 'Leg nerve lesions', head: ['Nerve', 'Weak', 'Sensory loss'], rows: [['Femoral', 'Knee extension (knee reflex lost)', 'Front of thigh, medial leg'], ['Obturator', 'Hip adduction', 'Medial thigh'], ['Common fibular', 'Dorsiflexion and eversion', 'Lateral leg, top of foot'], ['Tibial', 'Plantar flexion and inversion', 'Sole']]},
  example: {case: 'Foot drop after crossing the legs for hours; inversion and hip abduction normal; numb top of foot.', steps: ['Dorsiflexion is weak but inversion (tibial) and hip abduction (gluteal) are spared.', 'Sensory change on the top of the foot fits the fibular nerve.', 'Compression at the fibular head is a common site.'], answer: 'Common fibular nerve at the fibular head.'},
  traps: ['Diagnosing a fibular palsy without testing inversion and hip abduction.', 'Missing a femoral neuropathy when the knee buckles but the patient walks.'],
  figs: ['lumbosacral', 'dermatome-landmarks']
 },
 nerves: {
  exam: ['Test one muscle supplied by each major nerve in the affected limb.', 'Map sensory loss against nerve territories, including whether the ring finger splits.', 'Tap over common compression sites for tingling.', 'Compare with the other side.', 'Check reflexes: a nerve lesion reduces only reflexes it carries.'],
  compare: {title: 'Hand nerve lesions', head: ['Nerve', 'Weakness', 'Sensory clue'], rows: [['Median (wrist)', 'Thumb abduction', 'Thumb to radial ring, palm side'], ['Ulnar (elbow)', 'Finger spreading, grip', 'Little finger, split ring'], ['Radial (arm)', 'Wrist and finger extension', 'Back of first web space'], ['C8 root', 'Hand muscles across nerves', 'Whole ring and little finger, medial forearm']]},
  example: {case: 'Numb little finger and half the ring finger, weak finger spreading, normal thumb abduction.', steps: ['Finger spreading uses ulnar muscles; thumb abduction (median) is spared.', 'Sensory loss splits the ring finger, a nerve border.', 'A C8 root lesion would weaken median muscles too.'], answer: 'Ulnar neuropathy.'},
  traps: ['Calling every hand numbness carpal tunnel without mapping the territory.', 'Missing a polyneuropathy when symptoms start in the feet first.'],
  figs: ['hand-nerves', 'peripheral', 'body-patterns']
 },
 nmj: {
  exam: ['Ask whether weakness worsens through the day or with use.', 'Test sustained upgaze for ptosis and a cover test for diplopia.', 'Test neck flexion and proximal limb strength after repetition.', 'Check reflexes before and after brief maximal effort.', 'Ask about dry mouth, constipation or dizziness on standing.'],
  compare: {title: 'Junction disorders', head: ['Feature', 'Myasthenia gravis', 'Lambert–Eaton'], rows: [['Site', 'Postsynaptic receptors', 'Presynaptic calcium channels'], ['Typical start', 'Eyes, bulbar muscles', 'Proximal legs'], ['Reflexes', 'Normal', 'Reduced, may improve after effort'], ['Autonomic', 'No', 'Dry mouth common']]},
  example: {case: 'Drooping eyelids and double vision that worsen by evening; strength and reflexes otherwise normal.', steps: ['Fatigable, fluctuating eye muscle weakness suggests the junction.', 'Normal reflexes and no autonomic symptoms favour a postsynaptic disorder.', 'Pupils are spared.'], answer: 'Neuromuscular junction, postsynaptic (myasthenia pattern).'},
  traps: ['Missing fatigability because the examination was brief.', 'Ignoring sensory loss: junction disorders spare sensation, so its presence points to another level.'],
  figs: ['motor-unit', 'nmj-compare']
 },
 muscle: {
  exam: ['Test neck flexion and proximal limb strength: rising from a chair, lifting arms overhead.', 'Look for a waddling gait or using hands to climb up the legs.', 'Check for wasting, hypertrophy or tenderness.', 'Confirm sensation is normal and reflexes are preserved.', 'Ask about dark urine, rash, drugs and family history.'],
  compare: {title: 'Muscle or nerve?', head: ['Feature', 'Myopathy', 'Neuropathy'], rows: [['Distribution', 'Proximal, symmetric', 'Distal first'], ['Sensation', 'Normal', 'Often affected'], ['Reflexes', 'Kept until late', 'Reduced early'], ['Fasciculation', 'Absent', 'May occur']]},
  example: {case: 'Difficulty climbing stairs and combing hair over months; sensation and reflexes normal.', steps: ['Symmetric proximal weakness with normal sensation is a motor pattern.', 'Preserved reflexes and no fatigability point away from the junction.', 'Slow progression fits a myopathy.'], answer: 'Muscle (myopathy pattern).'},
  traps: ['Assuming proximal weakness always means myopathy; junction and motor neuron disease can mimic it.', 'Missing distal myopathies that look like neuropathies.'],
  figs: ['motor-unit', 'body-patterns', 'umn-lmn']
 },
 cerebellum: {
  exam: ['Finger–nose and heel–shin testing for dysmetria and intention tremor.', 'Rapid alternating movements for dysdiadochokinesia.', 'Stance with feet together, then tandem gait.', 'Eye movements for nystagmus and saccadic pursuit.', 'Romberg test to separate sensory from cerebellar ataxia.'],
  compare: {title: 'Ataxia: where from?', head: ['Feature', 'Cerebellar', 'Sensory'], rows: [['Eyes closed', 'Little change', 'Much worse (Romberg)'], ['Position sense', 'Normal', 'Reduced'], ['Reflexes', 'Usually normal', 'Often reduced'], ['Eye movements', 'Nystagmus possible', 'Normal']]},
  example: {case: 'Overshooting with the right finger–nose test and clumsy right hand; strength and sensation normal.', steps: ['Limb dysmetria with normal strength and position sense suggests the cerebellum.', 'Limb ataxia is usually ipsilateral to a cerebellar hemisphere lesion.', 'Gait is less affected than the limb.'], answer: 'Right cerebellar hemisphere.'},
  traps: ['Calling ataxia cerebellar without testing position sense.', 'Expecting cerebellar limb signs on the opposite side, as with cortical lesions.'],
  figs: ['coordination', 'sensory-pathways']
 },
 vision: {
  exam: ['Test acuity in each eye separately.', 'Confrontation fields in all four quadrants of each eye.', 'Check pupils, including the swinging light test.', 'Compare the defect in the two eyes: is it homonymous and congruous?', 'Look for associated cortical signs such as neglect or alexia.'],
  compare: {title: 'Where is the field defect from?', head: ['Defect', 'Site', 'Clue'], rows: [['One eye', 'Retina or optic nerve', 'Afferent pupil defect'], ['Bitemporal', 'Chiasm', 'Often pituitary region'], ['Homonymous, upper quadrant', 'Temporal lobe', 'Meyer loop'], ['Homonymous, macula spared', 'Occipital cortex', 'Congruous defect']]},
  example: {case: 'Missing the upper left quarter of vision in both eyes; acuity normal.', steps: ['The defect is in both eyes on the same side: homonymous, so behind the chiasm.', 'Upper quadrant loss implicates the Meyer loop.', 'Left field loss means the right pathway.'], answer: 'Right temporal lobe (Meyer loop).'},
  traps: ['Assuming a field defect noticed in one eye is monocular without testing the other.', 'Missing bitemporal loss because each eye compensates for the other.'],
  figs: ['vision', 'field-defects', 'pupil-reflex']
 },
 sensory: {
  exam: ['Test pin or cold and vibration or position separately.', 'Start distally and move proximally to find a border.', 'Compare both sides and map any level on the trunk.', 'Test cortical sensation if primary sensation is intact.', 'Perform the Romberg test.'],
  compare: {title: 'Which system is affected?', head: ['Modality', 'Pathway', 'Crosses'], rows: [['Pain, temperature', 'Spinothalamic', 'Within a few cord segments'], ['Vibration, position', 'Dorsal column', 'In the medulla'], ['Face pain', 'Spinal trigeminal', 'In the medulla, after descending'], ['Discriminative touch', 'Dorsal column to cortex', 'In the medulla']]},
  example: {case: 'Loss of pain and temperature over both shoulders and arms; vibration and strength normal.', steps: ['Selective pain loss in a cape distribution spares the dorsal columns.', 'Crossing pain fibres near the centre of the cord are affected first.', 'The cervical segments map to the shoulders and arms.'], answer: 'Central cervical cord (syrinx-like pattern).'},
  traps: ['Testing only light touch, which travels in more than one pathway.', 'Missing a level because testing started on the trunk instead of the feet.'],
  figs: ['sensory-pathways', 'dermatome-landmarks', 'hemicord']
 }
};

window.NL_GLOSSARY = [
 ['Agraphesthesia', 'Inability to recognise numbers or letters traced on the skin despite intact primary sensation; a cortical sensory sign.'],
 ['Anosognosia', 'Unawareness of one’s own deficit, often with non-dominant parietal lesions.'],
 ['Anterior horn', 'Grey matter of the spinal cord containing lower motor neuron cell bodies.'],
 ['Aphasia', 'An acquired disorder of language production or comprehension.'],
 ['Apraxia', 'Inability to carry out learned movements on command despite adequate strength and understanding.'],
 ['Astereognosis', 'Inability to recognise an object by touch alone despite intact primary sensation.'],
 ['Ataxia', 'Incoordination of movement not explained by weakness.'],
 ['Babinski sign', 'Extensor plantar response: upward movement of the great toe on stroking the sole; an upper motor neuron sign.'],
 ['Bitemporal hemianopia', 'Loss of the outer half of the visual field in both eyes, typical of a chiasmal lesion.'],
 ['Brown-Séquard pattern', 'Hemicord lesion: same-side weakness and vibration loss with opposite-side pain loss.'],
 ['Cauda equina', 'The bundle of lumbar and sacral nerve roots below the end of the spinal cord.'],
 ['Clonus', 'Rhythmic involuntary contractions after a sudden stretch; an upper motor neuron sign.'],
 ['Congruous defect', 'Homonymous field defects that are nearly identical in both eyes; suggests a posterior lesion.'],
 ['Conus medullaris', 'The tapered lower end of the spinal cord, usually near L1–L2.'],
 ['Corticobulbar', 'Fibres from the cortex to cranial nerve motor nuclei.'],
 ['Corticospinal tract', 'The main descending motor pathway from cortex to spinal cord; most fibres cross in the medulla.'],
 ['Decussation', 'A crossing of fibres from one side of the nervous system to the other.'],
 ['Dermatome', 'The area of skin supplied by a single spinal root.'],
 ['Diplopia', 'Double vision; binocular diplopia resolves when either eye is covered.'],
 ['Dorsal column', 'Spinal cord pathway carrying vibration, position and discriminative touch; crosses in the medulla.'],
 ['Dorsal root ganglion', 'Cluster of sensory neuron cell bodies next to the spinal cord.'],
 ['Dysarthria', 'Impaired articulation of speech with normal language.'],
 ['Dysdiadochokinesia', 'Difficulty performing rapid alternating movements; a cerebellar sign.'],
 ['Dysmetria', 'Overshooting or undershooting a target; a cerebellar sign.'],
 ['Fasciculation', 'Visible twitching of a small group of muscle fibres; a lower motor neuron sign.'],
 ['Fatigability', 'Weakness that increases with repeated or sustained use; typical of junction disorders.'],
 ['Genu', 'The bend of the internal capsule, carrying corticobulbar fibres.'],
 ['Hemianopia', 'Loss of half of the visual field.'],
 ['Homonymous', 'Affecting the same side of the visual field in both eyes; indicates a lesion behind the chiasm.'],
 ['Horner syndrome', 'Mild ptosis and a small pupil on one side from interruption of the sympathetic pathway.'],
 ['Hyperreflexia', 'Abnormally brisk reflexes; usually an upper motor neuron sign.'],
 ['Internal capsule', 'Compact white matter between the thalamus, caudate and lentiform nucleus.'],
 ['Internuclear ophthalmoplegia', 'Failure of adduction on lateral gaze from a lesion of the medial longitudinal fasciculus.'],
 ['Lateral geniculate nucleus', 'Thalamic relay for vision between the optic tract and optic radiation.'],
 ['Lower motor neuron', 'The anterior horn cell or cranial motor nucleus and its axon to muscle.'],
 ['Medial lemniscus', 'Brainstem continuation of the dorsal column pathway after it crosses.'],
 ['Medial longitudinal fasciculus', 'Brainstem pathway linking eye movement nuclei for conjugate gaze.'],
 ['Meyer loop', 'Inferior optic radiation fibres in the temporal lobe carrying the upper visual field.'],
 ['Miosis', 'A small pupil.'],
 ['Mononeuropathy', 'Damage to a single peripheral nerve.'],
 ['Myotome', 'The group of muscles supplied mainly by a single spinal root.'],
 ['Neglect', 'Failure to attend to one side of space or the body, usually the left after right hemisphere lesions.'],
 ['Nystagmus', 'Involuntary rhythmic eye movements.'],
 ['Plexopathy', 'Damage to a nerve plexus, affecting several nerves and roots in one limb.'],
 ['Polyneuropathy', 'Diffuse damage to peripheral nerves, typically length-dependent and symmetric.'],
 ['PPRF', 'Paramedian pontine reticular formation, which generates horizontal saccades.'],
 ['Pronator drift', 'Downward drift and pronation of an outstretched arm with eyes closed; a subtle upper motor neuron sign.'],
 ['Ptosis', 'Drooping of the upper eyelid.'],
 ['Quadrantanopia', 'Loss of one quarter of the visual field.'],
 ['Radiculopathy', 'Dysfunction of a spinal nerve root.'],
 ['RAPD', 'Relative afferent pupillary defect: reduced response to light in one eye from an afferent lesion.'],
 ['Romberg sign', 'Loss of balance with feet together when the eyes close; indicates impaired position sense.'],
 ['Saddle anaesthesia', 'Sensory loss over the perineum and buttocks; suggests a conus or cauda equina lesion.'],
 ['Sensory level', 'A border on the trunk below which sensation is reduced; suggests a spinal cord lesion.'],
 ['Spasticity', 'Velocity-dependent increase in muscle tone; an upper motor neuron sign.'],
 ['Spinothalamic tract', 'Spinal pathway for pain and temperature; crosses near its entry level.'],
 ['Upper motor neuron', 'Neurons and pathways from the cortex down to the anterior horn or cranial motor nuclei.'],
 ['Vermis', 'The midline part of the cerebellum, concerned with posture and gait.']
];
