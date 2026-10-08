/* Original synthetic practice cases. Anatomic references do not validate clinical diagnoses. */
(function () {
  'use strict';
  const accessed = '2026-10-08';
  const book = (id, title, number, note) => ({id, title, organization:'StatPearls / NCBI Bookshelf', url:'https://www.ncbi.nlm.nih.gov/sites/books/' + number + '/', accessed, note:note || 'Relevant source page text reviewed; anatomy and clinical distinctions only.'});
  const source = (id, title, organization, url, note) => ({id, title, organization, url, accessed, note});
  const sources = [
    book('cx-conduction','Conduction Aphasia','NBK537006'),
    book('cx-language','Aphasia','NBK559315'),
    source('cx-transcortical','Speech and Other Lateralizing Cortical Functions','Clinical Methods / NCBI Bookshelf','https://www.ncbi.nlm.nih.gov/books/NBK389/','Relevant indexed chapter excerpts reviewed; full-page retrieval unavailable. Historical examination framework, not a treatment source.'),
    book('cx-alexia','Alexia','NBK557669'),
    book('cx-stereo','Astereognosis','NBK560773'),
    book('cx-neglect','Spatial Neglect','NBK562184'),
    source('cx-apraxia','Ideomotor apraxia: behavioral dimensions and neuroanatomical basis','Brain and Cognition / PubMed','https://pubmed.ncbi.nlm.nih.gov/9184099/','Original lesion study; abstract reviewed. Supports left-hemisphere association without assigning a unique cortical point.'),
    book('cx-gerstmann','Gerstmann Syndrome','NBK519528'),
    book('cx-thalamic','Neuroanatomy, Thalamic Nuclei','NBK549908'),
    book('cx-paramedian','Posterior Cerebral Artery Stroke','NBK532296'),
    book('cx-capsule','Neuroanatomy, Internal Capsule','NBK542181'),
    book('cx-ballism','Hemiballismus','NBK559127'),
    source('cx-onehalf','One-and-a-half syndrome with its spectrum disorders','Quantitative Imaging in Medicine and Surgery / PMC','https://pmc.ncbi.nlm.nih.gov/articles/PMC5756788/','Relevant indexed anatomy excerpts reviewed; full-page retrieval met an access check. Cross-checked against the INO reference.'),
    book('cx-ino','Internuclear Ophthalmoplegia','NBK441970'),
    book('cx-sixth','Abducens Nerve Palsy','NBK482177'),
    book('cx-facial-colliculus','Neuroanatomy, Facial Colliculus','NBK555907'),
    book('cx-parinaud','Parinaud Syndrome','NBK441892'),
    source('cx-gaze','Conjugate Gaze Palsies','Merck Manual Professional','https://www.merckmanuals.com/professional/neurologic-disorders/neuro-ophthalmologic-and-cranial-nerve-disorders/conjugate-gaze-palsies?media=print','Source page reviewed; voluntary versus reflex gaze and supranuclear localization.'),
    book('cx-brainstem','Brainstem Stroke','NBK560896'),
    book('cx-medulla','Medial Medullary Syndrome','NBK560590'),
    book('cx-cavernous','Cavernous Sinus Syndromes','NBK532976'),
    book('cx-apex','Orbital Apex Syndrome','NBK592386'),
    book('cx-corneal','Corneal Reflex','NBK534247'),
    book('cx-trigeminal-reflex','Neuroanatomy, Trigeminal Reflexes','NBK551641'),
    book('cx-fourth','Trochlear Nerve Palsy','NBK565850'),
    book('cx-jugular','Jugular Foramen Syndrome','NBK549871'),
    book('cx-horner','Horner Syndrome','NBK500000'),
    source('cx-bilateral-optic','Dysthyroid Optic Neuropathy: Relative Afferent Pupillary Defect','American Academy of Ophthalmology / EyeWiki','https://eyewiki.aao.org/Dysthyroid_Optic_Neuropathy','Source page reviewed. Used only for the general principle that symmetric optic nerve dysfunction can lack a relative afferent defect; no thyroid etiology is inferred.'),
    source('cx-tract-pupil','Relative afferent pupillary defect in optic tract hemianopias','American Journal of Ophthalmology / PubMed','https://pubmed.ncbi.nlm.nih.gov/655233/','Original four-patient study; indexed abstract reviewed. Direct record retrieval was unavailable.'),
    source('cx-junction','Visual Fields','Clinical Methods / NCBI Bookshelf','https://www.ncbi.nlm.nih.gov/books/NBK220/','Relevant indexed chapter excerpts reviewed; full-page retrieval unavailable. Used for stable field anatomy only.'),
    book('cx-homonymous','Homonymous Hemianopsia','NBK558929'),
    book('cx-visual-path','Neuroanatomy, Visual Pathway','NBK553189'),
    book('cx-hemianopia','Hemianopsia','NBK562262'),
    book('cx-cortical-blind','Cortical Blindness','NBK560626'),
    source('cx-macula','Blurred Vision','Merck Manual Professional','https://www.merckmanuals.com/professional/eye-disorders/symptoms-of-ophthalmologic-disorders/blurred-vision','Source page text reviewed; retinal versus optic nerve clues.'),
    book('cx-ataxia','Cerebellar Dysfunction','NBK562317'),
    source('cx-flocculus','Cerebellar Control of Ocular Movements: Application to the Topographical Diagnosis of Cerebellar Lesions','Brain and Nerve / PubMed','https://pubmed.ncbi.nlm.nih.gov/27001776/','Indexed English abstract reviewed; direct record retrieval unavailable. Used for ocular motor anatomy only.'),
    source('cx-ocular-cerebellum','Eye Movement Disorders and the Cerebellum','Journal of Clinical Neurophysiology / PMC','https://pmc.ncbi.nlm.nih.gov/articles/PMC6986321/','Relevant indexed review excerpts reviewed; full-page retrieval met an access check. Functional territories overlap.'),
    source('cx-bilateral-vestibular','Bilateral vestibulopathy: Diagnostic criteria','Bárány Society consensus / Journal of Vestibular Research','https://pmc.ncbi.nlm.nih.gov/articles/PMC9249284/','Indexed consensus criteria reviewed; full-page retrieval met an access check. Quantitative vestibular testing supports classification.'),
    book('cx-balint','Balint Syndrome','NBK544347')
  ];
  const cases = [];
  function add(topicId,title,difficulty,taskType,stem,findings,question,correct,distractors,reasoning,pearl,discriminator,alternative,sourceIds) {
    const n = cases.length, answerIndex = n % 4, choices = distractors.slice();
    choices.splice(answerIndex,0,correct);
    cases.push({id:'case-'+String(n+41).padStart(3,'0'),topicId,title,difficulty,taskType,stem,findings,question,
      options:choices.map((x,i)=>({id:'abcd'[i],text:x[0],explanation:x[1]})),answerId:'abcd'[answerIndex],reasoning,pearl,discriminator,alternative,sourceIds});
  }

  add('cortex','Retelling a conversation','Advanced','Localize',
    'A teacher accurately explains a story but repeatedly distorts its exact wording when asked to repeat it.',
    ['Fluent speech with sound substitutions','Comprehension substantially preserved','Repeated self-correction; hearing adequate'],
    'Which language network is most implicated?',
    ['Dominant dorsal phonological network','Disproportionate repetition failure favors this network.'],
    [['Dominant ventral semantic network','Major comprehension failure would be more expected.'],['Dominant frontal speech-initiation network','Spontaneous output is fluent rather than markedly reduced.'],['Nondominant affective-prosody network','Prosody dysfunction does not explain this repetition pattern.']],
    ['Understanding the story shows that meaning is more preserved than exact verbal reproduction.','Repetition relies on dorsal phonological connections between auditory-language representations and speech output.','Their dysfunction fits the dissociation, but cortical and connecting lesions can produce it.'],
    'This pattern does not identify the arcuate fasciculus uniquely.',
    'Repetition is far worse than comprehension.','Posterior semantic-network dysfunction is less favored because meaning is understood.',['cx-conduction']);

  add('cortex','Long pauses before speaking','Intermediate','Discriminate',
    'An alert adult gives short, delayed answers and struggles to initiate conversation. Hearing and comprehension are adequate.',
    ['Sparse spontaneous speech','No significant dysarthria','Can repeat long unfamiliar sentences accurately'],
    'Which language profile best fits?',
    ['Transcortical motor profile','Preserved repetition separates this from typical Broca aphasia.'],
    [['Broca-type profile','Repetition is usually impaired along with spontaneous output.'],['Conduction-type profile','Repetition is the disproportionately impaired function.'],['Transcortical sensory profile','Comprehension would be impaired despite fluent output.']],
    ['Sparse speech establishes reduced spontaneous output; adequate comprehension argues against a primary semantic failure.','Preserved complex repetition shows that externally driven language output remains available.','This dissociation supports a transcortical motor profile without identifying one mandatory lesion.'],
    'Profiles describe network behavior, not a single mandatory lesion.',
    'Complex repetition remains strong despite sparse output.','Broca-type aphasia is closest, but preserved repetition weighs against it.',['cx-language']);

  add('cortex','Repeating the instructions','Advanced','Discriminate',
    'A patient repeats a multi-step instruction verbatim but cannot carry it out or explain what it means.',
    ['Fluent, semantically empty conversation','Poor word-to-object matching','Hearing and alertness adequate'],
    'Which language profile is most supported?',
    ['Transcortical sensory profile','Meaning is impaired while repetition is preserved.'],
    [['Wernicke-type profile','Repetition would usually also be impaired.'],['Conduction-type profile','Comprehension should be relatively stronger than repetition.'],['Anomic profile','Naming difficulty alone does not explain severe comprehension loss.']],
    ['Poor word-to-object matching confirms impaired meaning rather than simply difficulty following a complex command.','Accurate repetition shows that phonological input can still reach speech output despite weak semantic access.','That combination supports a transcortical sensory profile; echoing alone does not establish comprehension.'],
    'Language comprehension requires testing beyond repetition.',
    'Meaning fails even though the sentence can be echoed.','Wernicke-type aphasia is less fitting because repetition is unusually intact.',['cx-transcortical']);

  add('cortex','A note cannot be read','Advanced','Localize',
    'A patient writes a sensible shopping note but cannot read it afterward, even with words presented centrally.',
    ['Spoken comprehension and naming preserved','Right homonymous field loss','Writing to dictation preserved'],
    'Which region best unifies these findings?',
    ['Left occipital–splenial region','Visual access to the reading network is disrupted.'],
    [['Left angular–supramarginal region','Reading impairment here more often accompanies writing impairment.'],['Left posterior temporal region','A broader spoken-language impairment would be more expected.'],['Right occipitotemporal region','The field side and preserved language-writing pattern favor the left.']],
    ['Preserved writing and spoken language show that language production itself remains available.','Left occipital injury explains right field loss; splenial involvement can disrupt visual access to dominant reading networks.','This unifies the dissociation, although other left occipitotemporal lesions can also cause pure alexia.'],
    'Pure alexia can also follow left occipitotemporal lesions without splenial injury.',
    'Preserved writing accompanies acquired reading failure.','A dominant angular lesion is less favored because writing is preserved.',['cx-alexia']);

  add('cortex','Identifying an object by touch','Intermediate','Localize',
    'With eyes closed, a patient handles a key normally but cannot recognize it in the left hand. The right hand succeeds.',
    ['Touch, vibration, position, and two-point discrimination intact','Object named immediately when seen','No weakness or neglect on testing'],
    'Which site best explains this selective deficit?',
    ['Right parietal association cortex','Higher-order tactile recognition is impaired despite adequate sensory input.'],
    [['Right ventral posterior thalamus','Primary sensory loss would usually accompany impaired recognition.'],['Right primary somatosensory cortex','Loss of elementary discrimination would strengthen this alternative.'],['Right posterior internal capsule','A primary sensory or motor deficit would be more expected.']],
    ['Intact elementary sensation and exploration make inadequate input an unlikely explanation for object-recognition failure.','Parietal association processing links tactile features into recognizable objects from the opposite hand.','The left-hand deficit therefore favors right parietal association dysfunction, with language failure also excluded.'],
    'Failure to name an object alone is insufficient if language is impaired.',
    'Primary sensation and visual naming are intact.','Thalamic sensory loss is less favored because elementary sensation is preserved.',['cx-stereo']);

  add('cortex','Missing items on a tray','Intermediate','Discriminate',
    'A patient overlooks objects to the left. Initial visual-field testing is unreliable because attention wanders.',
    ['Single touches on either hand are detected','No major limb weakness','Comprehension adequate'],
    'Which additional result most supports neglect over isolated hemianopia?',
    ['Left touch extinguishes during bilateral stimulation','A nonvisual attentional deficit exceeds a visual field lesion.'],
    [['Left hemifield targets are missed in both eyes','That result could reflect hemianopia itself.'],['Reading slows near the left page margin','Either visual field loss or neglect can impair reading.'],['Scanning improves with repeated verbal cues','Compensation can occur with either disorder.']],
    ['Detection of either touch alone establishes that basic sensory input reaches awareness.','Failure only during competing bilateral stimulation indicates impaired allocation of attention.','Tactile extinction therefore supports neglect beyond an isolated visual pathway lesion; the two can coexist.'],
    'Neglect and hemianopia may coexist.',
    'The decisive deficit persists in the tactile modality.','Isolated retrochiasmal field loss cannot explain tactile extinction.',['cx-neglect']);

  add('cortex','Demonstrating a familiar gesture','Advanced','Localize',
    'An adult understands how to salute but makes spatial errors when demonstrating it with either hand, including by imitation.',
    ['Strength and basic coordination preserved','Tool recognition preserved','No substantial comprehension deficit'],
    'Which network is most implicated?',
    ['Dominant frontoparietal praxis network','Learned gesture organization fails despite adequate basic motor function.'],
    [['Bilateral corticospinal execution network','Weakness and pyramidal findings would be more expected.'],['Cerebellar movement-calibration network','Errors should also affect elementary coordinated movements.'],['Nondominant spatial-attention network','A lateralized attentional failure is not demonstrated.']],
    ['Preserved strength, basic coordination, and comprehension exclude common non-praxis reasons for gesture failure.','Dominant frontoparietal networks organize learned actions and can support praxis in both hands.','Their dysfunction explains bilateral gesture errors without requiring bilateral motor tract injury.'],
    'Bilateral limb praxis deficits can follow one dominant-hemisphere lesion.',
    'Learned gesture errors affect both hands despite preserved basic movement.','Cerebellar incoordination is less favored because basic coordination is intact.',['cx-apraxia']);

  add('cortex','Handling numbers and written words','Advanced','Predict',
    'An alert patient develops calculation errors and spelling errors when writing, despite good strength and conversational comprehension.',
    ['Dominant inferior parietal injury on imaging','No generalized confusion','Visual acuity adequate'],
    'Which task most specifically tests the associated Gerstmann pattern?',
    ['Distinguishing named fingers on the hand','Finger identification belongs to the associated Gerstmann pattern.'],
    [['Copying the perspective of a cube','That probes construction more than the defining associated deficit.'],['Bisecting a horizontal line accurately','That principally probes spatial attention.'],['Imitating an unfamiliar hand gesture','That probes praxis rather than the defining Gerstmann association.']],
    ['Calculation and writing errors with preserved strength indicate higher cortical rather than basic motor dysfunction.','Dominant inferior parietal networks are associated with calculation, writing, finger recognition, and right–left orientation.','Testing finger identification probes the linked pattern, although the full syndrome need not be present.'],
    'Incomplete Gerstmann patterns are common; exact cortical boundaries vary.',
    'Calculation and writing errors occur without weakness or global confusion.','A general language deficit is less fitting with preserved comprehension.',['cx-gerstmann']);

  add('subcortex','A small sensory lesion','Intermediate','Predict',
    'Imaging localizes a small lesion to the right ventral posterolateral thalamic nucleus, sparing its medial neighbor.',
    ['Motor capsule spared','Patient reports altered sensation','No cortical extension'],
    'Which sensory pattern is most expected?',
    ['Left body loss with relative facial sparing','VPL relays contralateral body sensation; VPM principally relays facial sensation.'],
    [['Left face loss with relative body sparing','That points more toward VPM involvement.'],['Right body loss with relative facial sparing','The major body sensory pathways have already crossed.'],['Right face loss with relative body sparing','Both side and relay nucleus fit poorly.']],
    ['Major body sensory pathways cross before reaching the thalamus, linking right VPL to left body input.','Facial input primarily relays through VPM, which the stem specifies is spared.','Relative facial sparing is therefore expected; lesion extent determines which body modalities are affected.'],
    'Small lesions need not affect every sensory modality equally.',
    'The lesion is confined to VPL, not VPM.','VPM dysfunction is less favored because the medial facial relay is spared.',['cx-thalamic']);

  add('subcortex','A deep lesion on imaging','Advanced','Predict',
    'MRI shows symmetric paramedian thalamic injury. You are anticipating its functional effects before detailed cognitive testing.',
    ['Lateral sensory nuclei relatively spared','No occipital cortical extension','No clear unilateral weakness'],
    'Which paired deficit is most expected?',
    ['Reduced arousal and impaired recent memory','Bilateral medial thalamic injury disrupts arousal and memory connections.'],
    [['Body sensory loss and sensory ataxia','These favor lateral somatosensory relays rather than the supplied medial territory.'],['Homonymous field loss and preserved alertness','This favors visual pathways rather than bilateral medial thalamic networks.'],['Limb dysmetria and preserved recent memory','Motor relay dysfunction fits less well than the medial cognitive pattern.']],
    ['Bilateral injury can interrupt both sides of a distributed arousal network.','Medial thalamic connections also participate in memory, explaining the expected paired deficit.','The imaged territory supports these functions; it does not prove a particular arterial variant.'],
    'Paramedian arterial anatomy varies; a clinical pattern does not prove a named vessel.',
    'Both medial thalami are involved while lateral sensory relays are relatively spared.','A sensory-relay pattern is less favored because the supplied lesions are paramedian.',['cx-paramedian']);

  add('subcortex','Speech changes after a small lesion','Advanced','Predict',
    'A tiny left capsular lesion is centered on the genu, with most posterior-limb fibers preserved.',
    ['Language testing is normal','No cortical lesion on MRI','Speech sounds less precise'],
    'Which deficit is most consistent with that location?',
    ['Right lower facial weakness with dysarthria','The genu contains important descending corticobulbar fibers.'],
    [['Right leg weakness exceeding facial weakness','Leg corticospinal fibers lie principally in the posterior limb.'],['Right homonymous field loss without weakness','That favors retrolenticular visual pathways.'],['Right body sensory loss without dysarthria','That favors more posterior sensory fibers.']],
    ['Normal language testing separates impaired articulation from aphasia.','Descending corticobulbar fibers in the left genu influence contralateral lower facial movement and speech articulation.','Relative posterior-limb sparing makes predominant leg weakness less fitting, while individual capsular anatomy varies.'],
    'Capsular somatotopy is approximate, not a rigid bedside coordinate map.',
    'The genu is affected while the posterior limb is largely spared.','Posterior-limb motor injury is less favored because the imaging is centered anterior to it.',['cx-capsule']);

  add('subcortex','Irregular proximal movements','Advanced','Predict',
    'An adult develops large, irregular flinging movements of the left arm and leg. Imaging shows a right subthalamic lesion.',
    ['Movements are nonrhythmic','Strength between movements is preserved','No sensory level'],
    'Which circuit change best accounts for the movements?',
    ['Reduced pallidal inhibition of motor thalamus','Reduced inhibitory output disinhibits thalamocortical movement circuits.'],
    [['Increased pallidal inhibition of motor thalamus','That reverses the expected output change and suppresses movement.'],['Reduced thalamic excitation of motor cortex','That predicts less motor facilitation rather than disinhibition.'],['Increased subthalamic excitation of pallidal output','The lesion reduces this excitatory drive rather than increasing it.']],
    ['The subthalamic nucleus normally excites inhibitory basal-ganglia output neurons.','Loss of that drive reduces pallidal restraint of motor thalamus, facilitating excessive movement.','This simplified circuit explains the supplied lesion; hemiballismus can also arise at other sites.'],
    'Hemiballismus can arise outside the subthalamic nucleus; imaging supplies the site here.',
    'The question supplies a contralateral subthalamic lesion.','Increased pallidal inhibition is less favored because it reverses the effect of losing subthalamic excitation.',['cx-ballism']);

  add('brainstem','Horizontal tracking is restricted','Advanced','Localize',
    'Neither eye moves right. On left gaze, only the left eye abducts, with nystagmus; the right eye does not adduct.',
    ['Vertical gaze preserved','Near convergence present','No ptosis'],
    'Which paired structures best explain the pattern?',
    ['Right horizontal-gaze circuit and right MLF','This combines right gaze palsy with right internuclear dysfunction.'],
    [['Right horizontal-gaze circuit and left MLF','The adduction deficit is in the right eye, not the left.'],['Left horizontal-gaze circuit and left MLF','The conjugate gaze palsy has the opposite direction.'],['Right and left MLFs without gaze-center injury','Bilateral INO should preserve abduction in both directions.']],
    ['Failure of both eyes to look right requires a right horizontal-gaze circuit deficit.','On left gaze, right adduction failure with preserved convergence additionally implicates the right MLF.','Together these explain one-and-a-half syndrome; examination alone may not separate PPRF from abducens nuclear involvement.'],
    'The gaze component may involve PPRF, abducens nucleus, or both.',
    'Rightward conjugate gaze and right-eye adduction are both lost.','Bilateral INO is less favored because right-eye abduction is also absent.',['cx-onehalf']);

  add('brainstem','One eye does not abduct','Intermediate','Discriminate',
    'The left eye fails to abduct. You are distinguishing a left sixth-nerve nuclear lesion from an isolated peripheral sixth-nerve palsy.',
    ['No mechanical restriction identified','Patient can follow gaze instructions','Vertical eye movements are full'],
    'Which additional deficit most favors the nuclear site?',
    ['Right eye fails to adduct on attempted left gaze','The sixth nucleus also drives contralateral medial rectus activity.'],
    [['Left abduction worsens at distance fixation','Distance diplopia can occur with peripheral sixth palsy.'],['Left esotropia increases on leftward gaze','That follows lateral rectus weakness at either site.'],['Left-eye vision remains normal','Both nuclear and peripheral motor lesions may preserve vision.']],
    ['Left abduction failure alone can result from either nuclear or peripheral sixth-nerve dysfunction.','The left abducens nucleus also coordinates right medial rectus activation through internuclear connections.','Added right adduction failure on left gaze therefore favors a conjugate gaze circuit lesion.'],
    'A neighboring gaze-center lesion can produce a similar conjugate deficit.',
    'Failure of contralateral adduction converts an isolated deficit into a gaze palsy.','Peripheral sixth palsy is less favored because it does not paralyze the other eye’s adduction.',['cx-sixth']);

  add('brainstem','Facial weakness with a gaze deficit','Advanced','Localize',
    'A patient cannot close the left eye or wrinkle the left forehead. Both eyes also fail to look left.',
    ['Rightward conjugate gaze intact','No hearing loss','Limb power remains normal'],
    'Which compact site best combines these deficits?',
    ['Left dorsal caudal pons','Facial fibers loop around the abducens nucleus here.'],
    [['Left ventral caudal pons','Fascicular VI injury alone does not explain a conjugate gaze palsy.'],['Left cerebellopontine angle','This can affect VII, but a conjugate gaze palsy favors intra-axial circuitry.'],['Right dorsal caudal pons','That predicts rightward gaze and right facial deficits.']],
    ['Weak forehead and eye closure indicate left facial lower motor neuron pathway dysfunction.','Failure of both eyes to look left implicates the adjacent left conjugate gaze circuitry.','Facial fibers loop near the abducens nucleus in dorsal caudal pons, explaining both despite preserved limb strength.'],
    'Normal limb power does not exclude a small pontine lesion.',
    'Both eyes lose leftward gaze, rather than just left-eye abduction.','A left CPA lesion is less favored because it does not directly contain the conjugate gaze circuit.',['cx-facial-colliculus']);

  add('brainstem','Difficulty looking upward','Advanced','Localize',
    'A patient has difficulty looking upward. Attempted upward saccades produce brief convergence with globe retraction.',
    ['Horizontal movements preserved','No down-and-out resting eye','Pupils respond better to near effort than light'],
    'Which region is most implicated?',
    ['Dorsal rostral midbrain','Upgaze and pretectal pupillary circuitry converge here.'],
    [['Ventral rostral midbrain','A fascicular third-nerve pattern would be more expected.'],['Dorsal caudal pons','This more directly affects horizontal gaze circuitry.'],['Bilateral cavernous sinuses','Peripheral ocular palsies do not explain the coordinated retraction pattern.']],
    ['Convergence-retraction on attempted upgaze indicates coordinated gaze dysfunction rather than isolated muscle weakness.','Vertical gaze and pretectal light-reflex pathways lie in the dorsal rostral midbrain.','Their combined disturbance fits preserved horizontal movement, but does not establish the cause.'],
    'No particular cause is established by a dorsal midbrain pattern.',
    'Convergence-retraction occurs during attempted upgaze.','Bilateral peripheral third-nerve lesions are less favored because horizontal motility is preserved.',['cx-parinaud']);

  add('brainstem','Reading down the page','Advanced','Discriminate',
    'A patient has slow, limited voluntary downgaze. You want to determine whether the deficit is supranuclear.',
    ['No ptosis','Pupils reactive','Horizontal gaze relatively preserved'],
    'Which clinician-observed finding most supports that level?',
    ['Reflex vertical movements overcome the voluntary limitation','The motor apparatus can move when driven through a reflex route.'],
    [['Reflex and voluntary vertical movements are equally absent','That offers less evidence for preserved downstream motor pathways.'],['One eye alone fails to depress in adduction','That suggests an individual muscle or nerve pattern.'],['Downward limitation changes with monocular occlusion','That may reflect alignment or fusion effects rather than level.']],
    ['Voluntary limitation alone does not distinguish command pathways from motor nuclei, nerves, or muscles.','Preserved reflex movement demonstrates that downstream motor machinery can still produce the missing range.','The voluntary–reflex dissociation therefore favors supranuclear dysfunction without identifying a specific disease.'],
    'This is an examination principle, not a self-test or a disease diagnosis.',
    'Reflex range is preserved despite voluntary gaze failure.','Nuclear or peripheral paralysis is less favored because the same muscles move reflexly.',['cx-gaze']);

  add('brainstem','Vertigo with altered hearing','Advanced','Localize',
    'Continuous vertigo is accompanied by new right-sided hearing reduction and right facial weakness.',
    ['Right facial pain-temperature loss','Left body pain-temperature loss','Voice and palatal movement preserved'],
    'Which site best fits the combined findings?',
    ['Right lateral caudal pons','Facial and auditory structures with crossed sensory pathways fit this level.'],
    [['Right lateral medulla','Auditory and facial motor involvement favors a more rostral level.'],['Right medial caudal pons','Medial motor and lemniscal findings would be more expected.'],['Right peripheral vestibular apparatus','A peripheral lesion does not explain crossed body sensory loss.']],
    ['Right facial and left body sensory loss combine ipsilateral trigeminal and crossed ascending body pathways.','Right facial motor and auditory deficits add structures associated with lateral caudal pons.','Preserved palatal function makes lateral medulla less fitting, although hearing symptoms alone are not specific.'],
    'Auditory symptoms alone do not distinguish central from peripheral disease.',
    'Crossed sensation accompanies ipsilateral auditory and facial motor deficits.','Lateral medulla is less favored because hearing and facial motor structures favor the pons.',['cx-brainstem']);

  add('brainstem','Weakness with altered position sense','Advanced','Discriminate',
    'A patient has right limb weakness and impaired right vibration and position sense. Facial sensation and eye movements are normal.',
    ['No aphasia or neglect','Left medullary localization is being considered','No major pain-temperature deficit'],
    'Which added finding most strongly supports that proposed site?',
    ['Left tongue weakness with denervation signs','An ipsilateral hypoglossal lower motor neuron deficit supports medial medulla.'],
    [['Right lower facial weakness with preserved forehead','That would instead strengthen a supramedullary motor localization.'],['Left whole-face weakness with reduced eye closure','That shifts attention toward facial pathways in the pons.'],['Left eye adduction failure on rightward gaze','That favors MLF involvement rather than this medial medullary pattern.']],
    ['Right weakness and dorsal-column modality loss could reflect several left-sided central sites.','Medial medulla places corticospinal and medial lemniscal pathways near ipsilateral hypoglossal structures.','Added left tongue denervation supplies the crossed cranial sign that favors this level over capsule.'],
    'Tongue deviation alone is less specific than a supported lower motor neuron pattern.',
    'The sought sign is ipsilateral hypoglossal denervation.','A capsular lesion is less favored when a crossed hypoglossal lower motor neuron deficit is added.',['cx-medulla']);

  add('brainstem','Double vision in either direction','Advanced','Localize',
    'Horizontal saccades show slow adduction of either eye, while the abducting eye develops nystagmus.',
    ['Vertical movements full','Convergence preserved','No ptosis or fatigability during repeated examination'],
    'Which paired pathways best fit?',
    ['Bilateral medial longitudinal fasciculi','Bilateral internuclear dysfunction disrupts conjugate adduction.'],
    [['Bilateral abducens nuclei','That would impair abduction and conjugate gaze.'],['Bilateral oculomotor fascicles','Additional vertical or eyelid deficits would be more expected.'],['Bilateral peripheral medial rectus pathways','Preserved convergence supports functioning medial rectus motor output.']],
    ['Slow adduction with nystagmus of the abducting eye suggests disrupted internuclear coordination on each side.','Each MLF carries signals linking the opposite abducens nucleus to ipsilateral medial rectus activation.','Preserved convergence supports available medial rectus output, favoring bilateral MLF dysfunction over peripheral weakness.'],
    'Convergence is supportive when preserved, but is not preserved in every INO.',
    'Adduction fails during conjugate gaze but remains available for near effort.','Bilateral peripheral medial rectus weakness is less favored because convergence is preserved.',['cx-ino']);

  add('cranial','Double vision with facial numbness','Advanced','Localize',
    'A patient has progressive right ophthalmoplegia involving several eye movements, with numbness over the forehead and cheek.',
    ['Right III, IV, and VI functions affected','Right V1 and V2 sensation reduced','Acuity, color vision, and optic discs preserved'],
    'Which compartment best combines the affected structures?',
    ['Right cavernous sinus','Ocular motor nerves and both V1 and V2 traverse this compartment.'],
    [['Right superior orbital fissure','V2 does not pass through that fissure.'],['Right orbital apex','Optic involvement would strengthen this site; V2 involvement favors cavernous sinus.'],['Right midbrain tegmentum','This does not compactly combine III, IV, VI, V1, and V2.']],
    ['Several ocular motor deficits suggest a shared compartment rather than one isolated nerve.','V1 and V2 accompany ocular motor nerves at the cavernous sinus; V2 bypasses the superior orbital fissure.','Preserved optic function further favors a cavernous center, while extension across compartments remains possible.'],
    'Lesions may extend between adjacent compartments; this is the best center of localization.',
    'V2 joins the ocular motor deficits while optic function is preserved.','Superior orbital fissure is less favored because V2 lies outside it.',['cx-cavernous']);

  add('cranial','Visual decline with restricted movement','Advanced','Localize',
    'Several left-eye movements become restricted while vision in that eye deteriorates.',
    ['Left relative afferent pupillary defect','Reduced left color vision and acuity','V1 sensory loss; V2 sensation preserved'],
    'Which compartment is the best unifying site?',
    ['Left orbital apex','Optic and ocular motor pathways meet in this region.'],
    [['Left superior orbital fissure','An isolated fissure lesion should spare the optic nerve.'],['Left cavernous sinus alone','The optic nerve lies outside the sinus itself.'],['Left optic canal alone','This accounts for optic dysfunction but not the multiple ocular motor deficits.']],
    ['Reduced color vision, acuity, and afferent pupil input identify accompanying optic pathway dysfunction.','The orbital apex groups the optic canal with nearby ocular motor and V1 pathways.','It therefore unifies vision loss and ophthalmoplegia better than an isolated fissure or optic-canal lesion.'],
    'Adjacent lesions can spread; a compartment label does not identify the cause.',
    'Optic dysfunction accompanies multiple ocular motor deficits.','Superior orbital fissure is less favored because it excludes the optic canal.',['cx-apex']);

  add('cranial','Different responses to corneal stimulation','Intermediate','Localize',
    'During a clinician’s examination, gentle stimulation of the left cornea produces no blink in either eye; right corneal stimulation produces bilateral blinking.',
    ['Voluntary eye closure strong bilaterally','No corneal injury or local anesthetic','Forehead sensation reduced on the left'],
    'Which limb of the reflex is impaired?',
    ['Left ophthalmic trigeminal afferent','The response depends on which cornea supplies the input.'],
    [['Left facial motor efferent','The left eye could not blink normally to right-sided stimulation.'],['Right ophthalmic trigeminal afferent','Right-sided stimulation successfully activates both responses.'],['Right facial motor efferent','The right eye could not blink normally to right-sided stimulation.']],
    ['Bilateral blinking after right stimulation demonstrates that both facial motor outputs can function.','Failure after left stimulation therefore tracks the input side rather than a single weak eyelid.','Left V1 afferent dysfunction explains the pattern and accompanying forehead sensory deficit.'],
    'The case assumes intact corneas and a properly performed clinical examination.',
    'Both eyes respond normally when the right cornea supplies the stimulus.','Left facial weakness is less favored because left blinking is demonstrably possible.',['cx-corneal']);

  add('cranial','Eye closure is weak on one side','Intermediate','Predict',
    'A patient has an isolated right facial motor lesion. Corneal sensation is intact on both sides.',
    ['Right orbicularis oculi markedly weak','Left eye closure normal','Trigeminal afferent pathways preserved'],
    'What blink pattern is expected when either cornea is stimulated?',
    ['Left blink present; right blink weak or absent','Either input reaches the intact left efferent pathway.'],
    [['Both blink only with left corneal stimulation','That would suggest a right afferent problem.'],['Both blink only with right corneal stimulation','That would suggest a left afferent problem.'],['Right blink present; left blink weak or absent','That reverses the affected efferent side.']],
    ['Either intact corneal afferent can recruit bilateral brainstem blink pathways.','Right facial motor damage prevents effective right orbicularis contraction regardless of the stimulated side.','Left blinking therefore remains possible from either input; this pattern alone cannot distinguish nerve from nucleus.'],
    'A peripheral facial lesion and its nucleus can share this reflex pattern.',
    'The right efferent limb is impaired with bilateral afferents intact.','Right V1 dysfunction is less favored because the predicted response must follow motor side.',['cx-trigeminal-reflex']);

  add('cranial','Images separate while reading','Advanced','Localize',
    'A patient reports vertical diplopia when reading. The right eye is hypertropic, especially in left gaze and on right head tilt.',
    ['Right eye depression weakest in adduction','Horizontal movements and pupils normal','No orbital restriction on specialist examination'],
    'Which isolated muscle weakness best matches?',
    ['Right superior oblique weakness','Its depressive action is strongest when the eye is adducted.'],
    [['Right inferior rectus weakness','Depression would be more impaired in abduction.'],['Left superior rectus weakness','The gaze and tilt pattern fits less well.'],['Left inferior oblique weakness','That would impair elevation in adduction, not right-eye depression.']],
    ['The right eye lies higher and depresses poorly, identifying a deficient right depressor action.','Superior oblique depression is tested most effectively in adduction, where this deficit is greatest.','The gaze and tilt pattern supports right superior oblique weakness, with restrictive mimics specifically excluded.'],
    'Skew and restrictive disorders can mimic three-step patterns; the full examination matters.',
    'The right eye depresses poorly specifically in adduction.','Right inferior rectus weakness is less favored because abduction is not the weakest position.',['cx-fourth']);

  add('cranial','Voice and shoulder changes','Advanced','Predict',
    'Progressive hoarseness accompanies left palatal weakness and wasting of the left sternocleidomastoid and trapezius.',
    ['Left pharyngeal sensation reduced','Tongue bulk and strength preserved','No crossed limb sensory or pyramidal signs'],
    'Which new deficit would imply spread beyond the jugular-foramen nerve group?',
    ['Left tongue wasting and weakness','XII exits separately through the hypoglossal canal.'],
    [['More pronounced left palatal weakness','This remains within vagal function.'],['Further loss of left shoulder elevation','This remains within spinal accessory function.'],['Further loss of left pharyngeal sensation','This remains within glossopharyngeal sensory function.']],
    ['Pharyngeal, palatal, and shoulder findings group glossopharyngeal, vagal, and spinal accessory functions.','IX, X, and XI traverse the jugular foramen, while XII exits through a separate canal.','New ipsilateral tongue denervation would therefore add a nerve outside the initial group, without uniquely locating the lesion compartment.'],
    'The same nerve grouping can be affected near the foramen; examination alone may not specify the compartment.',
    'New XII dysfunction falls outside the initial IX–X–XI group.','Additional palatal weakness is less favored because it extends an already affected vagal deficit.',['cx-jugular']);

  add('cranial','Unequal pupils in changing light','Intermediate','Discriminate',
    'The left pupil is smaller and the left lid mildly droops. Eye movements and near responses are intact.',
    ['Anisocoria increases in darkness','Both pupils constrict to light','No substantial fatigability'],
    'Which additional observation supports impaired sympathetic input?',
    ['Delayed left pupil dilation after lights are dimmed','Dilation lag supports reduced sympathetic activity.'],
    [['Delayed left pupil constriction to bright light','That favors a parasympathetic or afferent issue instead.'],['Left pupil constricts more slowly during near effort','That does not explain the failure to dilate in darkness.'],['Left ptosis worsens with repeated upgaze','Fatigability would instead raise a junctional alternative.']],
    ['Greater anisocoria in darkness indicates that the smaller pupil is failing to dilate.','Sympathetic input drives dilation and contributes to eyelid elevation, linking the small pupil and mild ptosis.','Dilation lag supports this pathway deficit, but does not identify which part of its long course is affected.'],
    'Dilation lag can be intermittent and does not by itself locate the full sympathetic pathway.',
    'The smaller pupil fails to enlarge promptly in darkness.','A third-nerve parasympathetic deficit is less favored because that pupil would usually be larger.',['cx-horner']);

  add('vision','Similar visual loss in both eyes','Intermediate','Predict',
    'A specialist confirms bilateral optic neuropathy with equal afferent impairment. Both eyes have moderate central and color-vision loss.',
    ['No meaningful intereye difference in afferent function','Iris and ocular motor pathways intact','Some light response remains in both eyes'],
    'What is expected during the swinging-flashlight test?',
    ['No relative defect despite bilateral impairment','The test detects unequal afferent input, not total visual function.'],
    [['Right relative defect despite equal impairment','A right defect would require relatively weaker right afferent input.'],['Left relative defect despite equal impairment','A left defect would require relatively weaker left afferent input.'],['Alternating right and left relative defects','Equal stable impairment does not create alternating afferent asymmetry.']],
    ['Each optic nerve provides input to the light reflex; both inputs are impaired here.','Swinging the light compares the two inputs, which the stem specifies are equal.','No relative defect is therefore expected, so its absence cannot exclude bilateral optic neuropathy.'],
    'A relative afferent test measures asymmetry; it is not a test of normal vision.',
    'The afferent impairment is specifically symmetric.','A unilateral relative defect is less favored because neither eye supplies weaker afferent input.',['cx-bilateral-optic']);

  add('vision','A field defect with a pupil clue','Advanced','Localize',
    'Formal fields show right homonymous hemianopia. Acuity is good in both eyes, and retinal examination is normal.',
    ['Right relative afferent pupillary defect','No separate optic neuropathy identified','Field defects are somewhat incongruous'],
    'Which left-sided site is most favored?',
    ['Optic tract','A contralateral afferent defect strengthens a pregeniculate tract localization.'],
    [['Temporal optic radiations','They do not usually affect the pupillary afferent pathway.'],['Parietal optic radiations','The pupil finding favors a site before the geniculate relay.'],['Occipital visual cortex','An isolated cortical lesion usually preserves afferent pupil responses.']],
    ['Right homonymous loss places the visual lesion behind the chiasm on the left.','An optic tract lesion can also cause a relative afferent defect in the contralateral eye.','The paired field and pupil pattern therefore favors left tract, after excluding separate ocular causes.'],
    'Field congruity alone is imperfect; coexisting ocular disease must be excluded.',
    'A right afferent defect accompanies a right homonymous field defect.','Left occipital injury is less favored because it poorly explains the afferent pupil asymmetry.',['cx-tract-pupil']);

  add('vision','Unequal loss between the eyes','Advanced','Localize',
    'Testing reveals severe left central visual loss and a smaller right superior-temporal field defect.',
    ['Left afferent pupillary defect','Right central acuity preserved','Retinal examination unremarkable'],
    'Which region best accounts for both eyes?',
    ['Left optic nerve–chiasm junction','Adjacent prechiasmal and crossing fibers can produce this asymmetric combination.'],
    [['Left optic nerve within the orbit','That cannot account for a right-eye field defect.'],['Central chiasm alone','A purely central lesion more often produces bitemporal loss.'],['Left optic tract behind the chiasm','That would favor a right homonymous pattern.']],
    ['Severe left central loss and afferent asymmetry identify substantial left optic nerve dysfunction.','The additional right temporal deficit requires involvement of crossing fibers beyond an isolated orbital nerve lesion.','Their junction near the chiasm best unifies both eyes; the exact field pattern can vary.'],
    'Junctional patterns vary; a historical looping-fiber model is not required.',
    'Severe ipsilateral optic dysfunction coexists with contralateral temporal loss.','An isolated left optic nerve lesion is less favored because the other eye is also affected.',['cx-junction']);

  add('vision','A missing lower corner','Advanced','Localize',
    'A patient misses the left lower quadrant with either eye. Single-touch sensation is preserved, but left touch extinguishes with bilateral stimulation.',
    ['No afferent pupil defect','Spatial construction impaired','No ocular motor palsy'],
    'Which region best unifies the visual and nonvisual findings?',
    ['Right parietal region and superior radiations','Inferior field loss plus parietal attention signs supports this region.'],
    [['Right temporal region and inferior radiations','Temporal radiations more characteristically carry superior-field information.'],['Right occipital upper calcarine region','This could explain the field, but not the nonvisual attentional deficit as directly.'],['Right optic tract and adjacent midbrain','The cortical attention findings favor a more posterior hemispheric site.']],
    ['A left inferior homonymous deficit points to right-sided superior visual representations behind the chiasm.','Tactile extinction and construction difficulty add parietal association dysfunction beyond the field defect.','Right parietal cortex and superior radiations best unify both, while an isolated field defect would be less specific.'],
    'An isolated inferior quadrantanopia does not uniquely prove a parietal lesion.',
    'Tactile extinction accompanies the inferior homonymous defect.','Right upper occipital cortex is less favored as a unifying site because tactile attention is also impaired.',['cx-homonymous','cx-neglect']);

  add('vision','After a temporal lesion','Intermediate','Predict',
    'MRI shows a circumscribed left anterior temporal white-matter lesion affecting Meyer’s loop while sparing the optic tract.',
    ['Primary ocular examination normal','Optic nerves intact','No parietal extension'],
    'Which field defect is most expected?',
    ['Right superior homonymous quadrantanopia','Inferior temporal radiations carry contralateral upper-field information.'],
    [['Right inferior homonymous quadrantanopia','That favors superior parietal radiations or corresponding cortex.'],['Left superior homonymous quadrantanopia','The hemisphere-to-field relationship is reversed.'],['Left inferior homonymous quadrantanopia','Both field side and radiation subdivision are reversed.']],
    ['A left retrochiasmal pathway carries information from the right visual hemifield of both eyes.','Inferior retinal fibers representing the upper field travel through temporal Meyer’s loop.','A specified left-loop lesion therefore predicts right superior homonymous loss; real lesion boundaries vary.'],
    'Real radiation anatomy and lesion extent vary; the question specifies the tract involved.',
    'The left inferior radiation is affected, not the superior radiation.','Right inferior field loss is less favored because the involved radiation carries the upper field.',['cx-visual-path']);

  add('vision','Central fixation survives','Advanced','Localize',
    'Reliable perimetry shows a highly congruous left hemianopia with reproducible central sparing.',
    ['No afferent pupil defect','No neglect or somatosensory deficit','No additional temporal-lobe symptoms'],
    'Which site is most favored among these choices?',
    ['Right primary visual cortex','Congruity and central sparing favor an occipital localization.'],
    [['Right optic tract','A less congruous field or afferent asymmetry would strengthen this site.'],['Right temporal optic radiations','A superiorly weighted deficit would be more characteristic.'],['Right parietal optic radiations','An inferiorly weighted deficit or parietal signs would strengthen this site.']],
    ['Left homonymous loss establishes a right retrochiasmal lesion rather than monocular ocular disease.','High congruity and verified central sparing favor occipital visual cortex among the supplied sites.','Absent neighboring deficits supports that choice, but macular sparing does not exclude optic radiation injury.'],
    'Macular sparing favors occipital cortex but is not anatomically exclusive.',
    'A congruous isolated hemianopia has verified central sparing.','Optic radiations remain possible, but the total pattern favors occipital cortex.',['cx-hemianopia']);

  add('vision','Severe loss with reactive pupils','Advanced','Localize',
    'An alert patient cannot consciously detect targets in either visual field. The eyes themselves appear structurally normal.',
    ['Pupillary light responses brisk bilaterally','Eye movements full','MRI lesions centered on both calcarine cortices'],
    'Which disrupted function explains the visual loss?',
    ['Bilateral striate cortical processing','Cortical visual loss can coexist with an intact subcortical light reflex.'],
    [['Bilateral optic nerve transmission','Severe bilateral afferent failure would also weaken light responses.'],['Bilateral retinal light detection','The normal ocular examination and intact afferent responses weigh against this.'],['Bilateral geniculocalcarine transmission','That can preserve pupils, but the demonstrated lesions are cortical.']],
    ['Brisk light responses demonstrate functioning afferent input to subcortical pupil pathways despite absent conscious vision.','Those reflex pathways diverge before striate cortex, so cortical damage can spare the pupils.','Bilateral calcarine lesions provide the corroborating localization; reactive pupils alone would be insufficient.'],
    'Reactive pupils alone do not establish cortical blindness; the case supplies corroborating imaging.',
    'Bilateral occipital injury leaves the subcortical light reflex functioning.','Severe bilateral optic nerve failure is less favored because afferent light responses are preserved.',['cx-cortical-blind']);

  add('vision','Lines look bent','Intermediate','Localize',
    'One eye sees straight lines as distorted around fixation. Peripheral fields and the other eye are unaffected.',
    ['No afferent pupil defect','No pain with eye movement','OCT shows focal foveal structural change'],
    'Which site best explains the symptom?',
    ['Macular retina of the affected eye','Foveal distortion directly matches the localized retinal finding.'],
    [['Retrobulbar optic nerve of that eye','The documented foveal change provides a more direct explanation.'],['Optic tract opposite the missing field','No homonymous field loss is present.'],['Occipital cortex representing central vision','A cortical lesion should affect corresponding fields from both eyes.']],
    ['A symptom confined to one eye favors ocular or prechiasmal rather than homonymous pathway dysfunction.','The fovea represents central vision, matching distortion around fixation and the demonstrated OCT abnormality.','This direct structure–symptom match favors macula; absence of an afferent defect alone would be less decisive.'],
    'A normal afferent test does not exclude every optic neuropathy.',
    'The monocular perceptual distortion matches a focal foveal lesion.','Optic neuropathy is less favored because imaging demonstrates a corresponding retinal abnormality.',['cx-macula']);

  add('cerebellum','Walking worsens without visual cues','Intermediate','Discriminate',
    'A patient walks unsteadily. You are separating a sensory contribution from a predominantly cerebellar syndrome.',
    ['No major limb weakness','The history alone is insufficient','Both sensory and coordination testing are possible'],
    'Which finding most specifically supports sensory ataxia?',
    ['Impaired joint position with finger drift after eye closure','Loss of proprioceptive input explains visual dependence and pseudoathetosis.'],
    [['Dysmetria persists with eyes open and position sense intact','That more strongly supports cerebellar dysfunction.'],['Gaze-evoked nystagmus accompanies broken pursuit','That points toward central ocular motor circuitry.'],['Truncal sway persists while sitting with eyes open','That favors axial coordination dysfunction.']],
    ['Impaired joint position establishes a deficient sensory signal needed to guide limb posture.','Removing vision eliminates compensation, allowing finger drift despite adequate basic motor power.','This supports a sensory contribution to ataxia, without uniquely identifying posterior columns over peripheral sensory pathways.'],
    'Sensory, vestibular, and cerebellar impairments can coexist.',
    'Objective proprioceptive loss is present, not merely an unsteady gait.','A pure cerebellar explanation is less favored when impaired sensory input accounts for the instability.',['cx-ataxia']);

  add('cerebellum','The image drifts during fixation','Advanced','Localize',
    'A patient has downbeat nystagmus and broken pursuit. During rotation, a target moves together with the head and body, but the eyes drift off it.',
    ['Limb position sense preserved','No isolated ocular muscle palsy','Appendicular dysmetria is mild'],
    'Which cerebellar region is most implicated?',
    ['Flocculus–paraflocculus circuitry','Gaze holding, pursuit, and VOR suppression cluster in this region.'],
    [['Dorsal vermis–fastigial circuitry','Saccadic accuracy would be a stronger defining feature.'],['Lateral dentate–hemispheric circuitry','Limb coordination would generally be more prominent.'],['Anterior vermis–spinocerebellar circuitry','Predominant gait and lower-limb dysfunction would fit better.']],
    ['A target moving with the head requires suppression of the usual compensatory vestibulo-ocular reflex.','Failure of that suppression together with broken pursuit implicates floccular tracking circuitry.','Downbeat nystagmus supports the pattern, but overlapping territories prevent a unique microscopic localization.'],
    'Functional territories overlap; this pattern does not identify a single microscopic focus.',
    'Pursuit and VOR suppression are both impaired.','Dorsal vermis is less favored because the major failure is sustained tracking and gaze holding.',['cx-flocculus']);

  add('cerebellum','Gaze jumps past the target','Advanced','Predict',
    'A small lesion involves the dorsal oculomotor vermis and nearby posterior fastigial circuitry.',
    ['Visual acuity and fields preserved','Extraocular muscles have full range','No peripheral ocular nerve palsy'],
    'Which additional abnormality is most expected?',
    ['Saccades repeatedly overshoot or undershoot targets','This circuit contributes to the accuracy of rapid gaze shifts.'],
    [['Adduction fails only during horizontal conjugate gaze','That favors an internuclear pathway deficit.'],['One eye fails to abduct through its full range','That favors lateral rectus or sixth-nerve dysfunction.'],['Both pupils lose light responses but retain near responses','That favors pretectal circuitry.']],
    ['Full movement range shows that the eyes can reach positions despite possible errors in targeting them.','Dorsal vermis and fastigial circuitry calibrate rapid saccadic movements.','Their injury therefore predicts overshoot or undershoot, with direction depending on lesion location and extent.'],
    'The direction of saccadic error depends on lesion location and extent.',
    'The lesion involves a circuit for saccadic accuracy.',
    'MLF dysfunction is less favored because it produces a conjugate adduction deficit rather than calibration error.',['cx-ocular-cerebellum']);

  add('cerebellum','The surroundings bounce while walking','Advanced','Localize',
    'A patient reports oscillopsia while walking and unsteadiness in the dark, but little discomfort when seated still.',
    ['Bilateral corrective saccades on head impulses','Quantitative testing confirms reduced VOR bilaterally','Position sense, limb coordination, pursuit, and saccades preserved'],
    'Which system best explains the pattern?',
    ['Bilateral peripheral vestibular system','Bilateral deficient gaze stabilization explains movement-related oscillopsia.'],
    [['Unilateral peripheral vestibular system','The demonstrated physiological deficit is bilateral.'],['Posterior-column proprioceptive system','Sensory loss does not explain bilateral reduced vestibulo-ocular responses.'],['Cerebellar hemispheric coordination system','Isolated limb-calibration disease does not fit the measured vestibular deficit.']],
    ['Oscillopsia during walking suggests insufficient gaze stabilization as the head moves.','Bilateral corrective saccades and quantitatively reduced VOR supply physiological evidence of bilateral vestibular failure.','Preserved proprioception and cerebellar tests favor that system over sensory or limb-coordination causes, without establishing etiology.'],
    'This pattern localizes a system; it does not identify the cause or exclude additional disease.',
    'Bilateral low VOR is documented with preserved proprioception.','Sensory ataxia is less favored because joint position is normal and gaze stabilization is impaired.',['cx-bilateral-vestibular']);

  add('cortex','Reaching for a visible object','Advanced','Localize',
    'A patient reaches inaccurately for peripheral visual targets but can touch their own nose accurately without vision.',
    ['Normal strength and joint position sense','Cannot describe several objects in one scene together','Visual acuity and basic eye-movement range preserved'],
    'Which network is most implicated?',
    ['Bilateral posterior parietal visuospatial network','Visually guided reaching and multi-object attention are jointly affected.'],
    [['Bilateral cerebellar limb-coordination network','Inaccuracy should not be restricted to visually guided actions.'],['Bilateral primary occipital visual network','Primary visual loss would be more expected than selective scene integration failure.'],['Bilateral ventral temporal recognition network','Object recognition loss alone does not explain the reaching dissociation.']],
    ['Accurate nonvisual movement with impaired visually guided reaching argues against a general limb coordination deficit.','Posterior parietal networks integrate visual location with action and attention across a scene.','Combined reaching and multi-object integration failure favors bilateral involvement, even without the full Bálint triad.'],
    'Partial Bálint patterns occur; the full classical triad need not be present.',
    'Visual guidance fails while nonvisual coordination and basic vision remain intact.','Cerebellar ataxia is less favored because nonvisual limb coordination is preserved.',['cx-balint']);

  window.NL_CASE_EXPANSIONS = window.NL_CASE_EXPANSIONS || [];
  window.NL_CASE_EXPANSIONS.push({sources,cases});
}());
