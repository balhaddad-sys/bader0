/* Original synthetic cases: anatomy and examination reasoning, not individual medical advice. */
(function () {
  'use strict';
  const sources = [];
  function ref(id, title, organization, url, note) {
    sources.push({id, title, organization, url, accessed: '2026-10-08', note});
  }
  const indexed = 'Relevant indexed source excerpts reviewed; supports anatomy and examination reasoning.';
  ref('px-median', 'Median Mononeuropathies', 'AAPM&R / PM&R KnowledgeNow', 'https://now.aapmr.org/median-nerve-mononeuropathies/', indexed);
  ref('px-brachial', 'Brachial Plexopathy: Differential Diagnosis and Treatment', 'AAPM&R / PM&R KnowledgeNow', 'https://now.aapmr.org/brachial-plexopathy-differential-diagnosis-and-treatment-2/', indexed);
  ref('px-traumatic-brachial', 'Traumatic Brachial Plexopathy', 'AAPM&R / PM&R KnowledgeNow', 'https://now.aapmr.org/traumatic-brachial-plexopathy/', indexed);
  ref('px-proximal-leg', 'Proximal Lower Extremity Mononeuropathies', 'AAPM&R / PM&R KnowledgeNow', 'https://now.aapmr.org/proximal-lower-extremity-mononeuropathies-2/', indexed);
  ref('px-proximal-arm', 'Upper Extremity Proximal Mononeuropathies', 'AAPM&R / PM&R KnowledgeNow', 'https://now.aapmr.org/upper-extremity-proximal-mononeuropathies/', 'Source page text reviewed, including motor branches and sensory territories.');
  ref('px-radiculopathy-edx', 'Electrodiagnosis of Radiculopathies (Cervical, Thoracic, and Lumbar)', 'AAPM&R / PM&R KnowledgeNow', 'https://now.aapmr.org/electrodiagnosis-of-radiculopathies-cervical-thoracic-and-lumbar/', 'Relevant indexed excerpts reviewed, including timing, sensitivity, and sensory-response exceptions.');
  ref('px-lumbosacral', 'Lumbosacral Plexopathy and Sciatic Neuropathy: Differential Diagnosis and Treatment', 'AAPM&R / PM&R KnowledgeNow', 'https://now.aapmr.org/lumbosacral-plexopathy-and-sciatic-neuropathy-differential-diagnosis-and-treatment/', 'Source page text reviewed, including electrodiagnostic distribution and sciatic versus plexus anatomy.');
  ref('px-spinal-shock', 'Spinal Shock', 'StatPearls / NCBI Bookshelf', 'https://www.ncbi.nlm.nih.gov/books/NBK448163/', indexed);
  ref('px-sensory-neuronopathy', 'The pattern and diagnostic criteria of sensory neuronopathy: a case-control study', 'Brain / PubMed', 'https://pubmed.ncbi.nlm.nih.gov/19506068/', 'Original study abstract/indexed excerpt reviewed. Pattern supports localization; it does not determine the cause.');
  ref('px-small-fiber', 'Definition and diagnosis of small fiber neuropathy: consensus from the Peripheral Neuropathy Scientific Department of the Brazilian Academy of Neurology', 'Arquivos de Neuro-Psiquiatria / PubMed', 'https://pubmed.ncbi.nlm.nih.gov/29809227/', 'Consensus abstract/indexed excerpt reviewed; routine nerve conduction studies assess mainly large fibers.');
  ref('px-small-fiber-testing', 'Review: small-fiber neuropathy', 'Muscle & Nerve / PubMed', 'https://pubmed.ncbi.nlm.nih.gov/12803683/', 'Review abstract/indexed excerpt reviewed; specialized tests may be needed despite normal routine studies.');
  ref('px-motor-neuron', 'Amyotrophic Lateral Sclerosis (ALS) and Other Motor Neuron Diseases (MNDs)', 'Merck Manual Professional', 'https://www.merckmanuals.com/professional/neurologic-disorders/peripheral-nervous-system-and-motor-unit-disorders/amyotrophic-lateral-sclerosis-als-and-other-motor-neuron-diseases-mnds', 'Relevant indexed excerpts reviewed for upper and lower motor neuron patterns; no disease diagnosis is inferred from a vignette alone.');
  ref('px-muscle-pattern', 'Hereditary and Sporadic Inclusion Body Myositis', 'AAPM&R / PM&R KnowledgeNow', 'https://now.aapmr.org/hereditary-and-sporadic-inclusion-body-myositis/', 'Relevant indexed excerpts reviewed for selective muscle distributions and myopathic electrodiagnostic findings.');
  ref('px-mg', 'Myasthenia Gravis', 'AAPM&R / PM&R KnowledgeNow', 'https://now.aapmr.org/myasthenia-gravis/', indexed);
  ref('px-nmj-edx', 'Electrodiagnostic Studies in Neuromuscular Junction Disorders', 'AAPM&R / PM&R KnowledgeNow', 'https://now.aapmr.org/electrodiagnostic-studies-in-neuromuscular-junction-disorders/', 'Relevant indexed excerpts reviewed for fatigability and post-exercise facilitation; confirmation requires appropriate clinical assessment.');
  ref('px-nmj-physiology', 'Neuromuscular Junction Physiology', 'AAPM&R / PM&R KnowledgeNow', 'https://now.aapmr.org/neuromuscular-physiology/', indexed);
  ref('px-axillary', 'Anatomy, Shoulder and Upper Limb, Axillary Nerve', 'StatPearls / NCBI Bookshelf', 'https://www.ncbi.nlm.nih.gov/books/NBK493212/', indexed);
  ref('px-obturator', 'Obturator Nerve', 'U.S. National Library of Medicine / MeSH', 'https://ncbi.nlm.nih.gov/mesh/68009776', 'Official anatomical indexing definition reviewed for L2–L4 origin, adduction, and medial thigh sensation.');
  ref('px-medial-thigh', 'Anatomy, Bony Pelvis and Lower Limb: Medial Thigh Muscles', 'StatPearls / NCBI Bookshelf', 'https://www.ncbi.nlm.nih.gov/books/NBK534775/', indexed);
  ref('px-femoral', 'Anatomy, Abdomen and Pelvis: Femoral Triangle', 'StatPearls / NCBI Bookshelf', 'https://www.ncbi.nlm.nih.gov/books/NBK541140/', indexed);
  ref('px-tarsal', 'Electrodiagnostic Evaluation of Tarsal Tunnel Neuropathy', 'StatPearls / NCBI Bookshelf', 'https://www.ncbi.nlm.nih.gov/books/NBK563278/', indexed);
  ref('px-arm-nerves', 'Anatomy, Shoulder and Upper Limb, Nerves', 'StatPearls / NCBI Bookshelf', 'https://www.ncbi.nlm.nih.gov/books/NBK526056/', indexed);
  ref('px-deep-fibular', 'Anatomy, Bony Pelvis and Lower Limb: Calf Deep Peroneal Nerve (Deep Fibular Nerve)', 'StatPearls / NCBI Bookshelf', 'https://www.ncbi.nlm.nih.gov/books/NBK526033/', indexed);
  ref('px-distal-leg', 'Distal Lower Extremity Mononeuropathies', 'AAPM&R / PM&R KnowledgeNow', 'https://now.aapmr.org/distal-lower-extremity-mononeuropathies-2/', indexed);

  const cases = [];
  function add(topicId, title, difficulty, stem, findings, correct, distractors, reasoning, pearl, sourceIds, taskType, question, discriminator, alternative) {
    const answerIndex = cases.length % 4;
    const options = distractors.slice();
    options.splice(answerIndex, 0, correct);
    cases.push({
      id: 'case-' + String(81 + cases.length).padStart(3, '0'), topicId, title, difficulty, stem, findings,
      question: question || 'Which localization best explains the complete pattern?',
      options: options.map((o, i) => ({id: 'abcd'[i], text: o[0], explanation: o[1]})),
      answerId: 'abcd'[answerIndex], reasoning, pearl, sourceIds,
      taskType: taskType || 'Localize', discriminator, alternative
    });
  }

  add('cord', 'Buttons and stairs', 'Advanced',
    'A 62-year-old develops hand clumsiness over five months, then notices a stiff gait.',
    ['Small hand muscles are wasted; ankle reflexes are brisk with extensor plantar responses.', 'There is a reproducible upper-trunk pin sensory boundary; facial sensation and jaw reflex are normal.'],
    ['Cervical spinal cord', 'Segmental hand motor loss with long tract and sensory findings below favors the cervical cord.'],
    [['Bilateral lower cervical roots', 'Roots can explain hand wasting but not leg upper motor neuron signs.'], ['Bilateral lower brachial plexuses', 'Plexus lesions do not account for a truncal level and spastic legs.'], ['Widespread motor neuron system', 'Mixed motor signs fit, but an objective truncal sensory level requires another explanation.']],
    ['First combine the hand and leg findings rather than assigning separate nerve lesions.', 'The sensory level supports cord involvement; its cutaneous boundary does not precisely identify a vertebra.'],
    'Segmental lower motor neuron signs can coexist with long tract signs in myelopathy.', ['cs-myelopathy', 'cs-numbness'], 'Localize', null,
    'Hand wasting occurs above leg upper motor neuron signs and a truncal sensory change.', 'A motor neuron disorder explains the motor mixture less well once a reproducible sensory level is included.');

  add('cord', 'One-sided change', 'Advanced',
    'After a focal thoracic cord injury, the right leg is spastic and right toe position sense is reduced. The arms are normal.',
    ['Imaging describes a predominantly right-sided incomplete cord lesion.', 'The examination is being extended to pain and temperature.'],
    ['Reduced left leg pain and temperature', 'Body pain-temperature fibers have crossed before ascending through the right thoracic cord.'],
    [['Reduced right leg pain and temperature', 'This is not the expected below-lesion spinothalamic pattern for a right hemicord injury.'], ['Reduced left leg vibration and position', 'Below the medulla, dorsal column signals ascend on the same side.'], ['Reduced right arm pain and temperature', 'A thoracic lesion does not interrupt incoming cervical arm pathways below their entry.']],
    ['Motor and dorsal column deficits are ipsilateral below a hemicord lesion.', 'Contralateral pain-temperature loss may start several segments below; incomplete lesions need not show every feature.'],
    'Separate tract laterality from the exact dermatome where a deficit begins.', ['cs-cord-syndromes', 'cs-spinal-morphology'], 'Predict', 'Which additional finding is most consistent with this tract pattern?',
    'The lesion is right thoracic; spinothalamic and dorsal column pathways cross at different levels.', 'Ipsilateral leg pain-temperature loss would suggest different or additional pathway involvement.');

  add('sensory', 'Walking without looking', 'Advanced',
    'A 45-year-old has severe unsteadiness in darkness. Toe position sense is poor, but power and pain sensation are preserved.',
    ['Two candidate sites are the posterior spinal cord and large peripheral sensory fibers.', 'Closing the eyes markedly worsens stance.'],
    ['A reproducible truncal sensory boundary', 'A body-level boundary favors a spinal pathway over a distal peripheral process.'],
    [['Greater sway with the eyes closed', 'Both posterior cord and large-fiber peripheral disorders can produce this.'], ['Poor great-toe movement detection', 'This confirms proprioceptive loss but occurs at either candidate site.'], ['Improved walking while watching the feet', 'Visual compensation can help sensory ataxia from either site.']],
    ['Recognizing sensory ataxia is only the first localization step.', 'Map the distribution and examine reflexes to distinguish cord from peripheral afferents.'],
    'A positive Romberg test does not by itself locate the lesion in the cord.', ['cs-numbness', 'cs-spinal-morphology'], 'Discriminate', 'Which additional bedside finding would most favor a spinal cord site?',
    'A consistent truncal boundary adds anatomical distribution to the modality deficit.', 'Large-fiber neuropathy remains plausible from Romberg and toe position testing alone.');

  add('cord', 'The first examination', 'Advanced',
    'Within hours of a thoracic injury, a 29-year-old has weak, floppy legs and absent leg tendon reflexes.',
    ['Pin sensation is reduced below a clear mid-trunk boundary.', 'New bladder dysfunction accompanies the weakness; arm examination is normal.'],
    ['Acute thoracic cord dysfunction', 'Acute cord dysfunction can initially suppress tone and reflexes below the lesion.'],
    [['Acute lumbosacral polyradiculopathy', 'Areflexia fits, but a reproducible mid-trunk level favors the cord.'], ['Bilateral sacral plexus dysfunction', 'Sacral plexuses do not explain a thoracic sensory boundary.'], ['Acute diffuse peripheral neuropathy', 'The level and immediate injury relationship outweigh the nonspecific areflexia.']],
    ['Do not require spasticity on the earliest examination of a cord injury.', 'The level, timing, and distribution localize more strongly than reflex loss alone.'],
    'Spinal shock describes transient neurological suppression; it is not synonymous with circulatory shock.', ['px-spinal-shock', 'cs-cord-syndromes'], 'Localize', null,
    'A clear trunk sensory level remains present despite flaccidity.', 'Polyradiculopathy can be areflexic but does not usually create this truncal boundary.');

  add('cord', 'Mixed signs at the lower end', 'Advanced',
    'A 51-year-old develops perineal numbness, bladder difficulty, and bilateral leg weakness over days.',
    ['Ankle reflexes are reduced, but plantar responses are extensor and knees are brisk.', 'Saddle sensory loss is nearly symmetric; the arms are unaffected.'],
    ['Distal spinal cord and adjacent segments', 'Sacral sensory-autonomic involvement with definite long tract signs favors distal cord involvement.'],
    [['Cauda equina roots alone', 'Roots alone do not explain extensor plantar responses from long tract dysfunction.'], ['Bilateral lumbosacral plexuses', 'Plexus lesions produce peripheral signs without this upper motor neuron component.'], ['Bilateral proximal sciatic nerves', 'Sciatic lesions spare sacral sphincter pathways and do not cause extensor plantar responses.']],
    ['Distal cord lesions can mix segmental lower motor neuron and descending tract signs.', 'Conus and cauda findings overlap; symmetry alone is insufficient to separate them.'],
    'Use the entire motor-sensory-autonomic pattern, not a single textbook conus feature.', ['cs-cauda', 'cs-cord-syndromes'], 'Localize', null,
    'Extensor plantar responses establish a component above the peripheral roots.', 'Cauda equina disease fits saddle loss but needs an additional explanation for the long tract signs.');

  add('roots', 'Several territories', 'Advanced',
    'Over six weeks, a 56-year-old develops asymmetric painful leg weakness involving several myotomes, saddle sensory loss, and reduced ankle reflexes.',
    ['There is no reproducible trunk sensory level or extensor plantar response.', 'The leading alternatives are multiple lumbosacral roots and a plexus lesion.'],
    ['Paraspinal denervation with preserved sensory responses', 'This combination supports a preganglionic root process, though neither finding is absolute.'],
    [['Reduced sural and superficial fibular sensory responses', 'This more strongly suggests postganglionic sensory axon involvement.'], ['Denervation limited to calf and foot muscles', 'These muscles alone cannot reliably separate roots from a plexus or sciatic lesion.'], ['A reduced Achilles reflex on the weaker side', 'Both root and postganglionic lesions can interrupt this reflex arc.']],
    ['Sensory neuron cell bodies lie in dorsal root ganglia, distal to most root lesions.', 'Electrodiagnostic interpretation requires an adequate muscle sample, appropriate timing, and clinical context.'],
    'Normal sensory responses support a root site; they do not prove it.', ['px-radiculopathy-edx', 'cs-cauda'], 'Discriminate', 'Which study pattern would most support the root alternative?',
    'Paraspinal involvement and preserved distal sensory responses point toward roots together.', 'A plexus lesion more often reduces sensory responses and spares paraspinal muscles when pure.');

  add('cord', 'An unusual sensory map', 'Intermediate',
    'A 34-year-old repeatedly fails to notice hot water on patches of both forearms and hands.',
    ['Pain-temperature perception is reduced across several cervical dermatomes.', 'Vibration and joint position remain intact; trunk and leg sensation are preserved.'],
    ['Crossing fibers in the central cervical cord', 'Segmental bilateral pain-temperature loss with dorsal column sparing fits crossing sensory fibers.'],
    [['Both posterior columns in the cervical cord', 'This would preferentially impair vibration and proprioception.'], ['One lateral spinothalamic tract in the cervical cord', 'A unilateral ascending tract lesion predicts contralateral deficits extending below the lesion.'], ['Several bilateral cervical dorsal roots', 'Root lesions are less likely to selectively spare position and vibration across this suspended pattern.']],
    ['Identify both the sensory modality and its suspended segmental distribution.', 'The pattern suggests central cord anatomy without establishing a specific structural cause.'],
    'A central cord process may be partial and need not produce a full cape-shaped deficit.', ['cs-syrinx', 'cs-spinal-morphology'], 'Localize', null,
    'Pain-temperature loss is bilateral and segmental, with dorsal column modalities preserved.', 'A posterior column lesion predicts the opposite modality emphasis.');

  add('approach', 'Beyond the hands', 'Intermediate',
    'A 70-year-old reports numb hands and trouble with keys. Weakness spans median and ulnar hand muscles on both sides.',
    ['Bilateral root or nerve lesions are being considered.', 'There is no clear single-nerve sensory distribution.'],
    ['Leg tone, plantar responses, and gait', 'Long tract signs below the hands would move localization toward cervical cord.'],
    [['Thumb opposition and finger abduction again', 'These confirm the hand deficit but do not test for a cord component below it.'], ['Median and ulnar fingertip sensation again', 'Useful mapping may still leave bilateral roots versus cord unresolved.'], ['Biceps and triceps tendon reflexes alone', 'Arm reflex changes may be segmental and miss long tract abnormalities in the legs.']],
    ['A hand complaint does not restrict the examination to the hands.', 'Seek findings outside the proposed root or nerve distribution before multiplying lesions.'],
    'Examine below a suspected cervical lesion.', ['cs-approach', 'cs-myelopathy'], 'Discriminate', 'Which next examination most directly tests for an additional cord component?',
    'The decisive examination samples descending pathways below the symptomatic region.', 'Bilateral peripheral lesions remain possible if the rest of the examination is normal.');

  add('sensory', 'Uneven ground', 'Intermediate',
    'An older adult feels unsteady on rough ground after a year of gradually numb feet.',
    ['Vibration and toe position are reduced distally; ankle reflexes are absent.', 'Distal sensory nerve responses are reduced in both legs; motor responses are relatively preserved.', 'There is no sensory level or extensor plantar response.'],
    ['Large peripheral sensory fibers', 'Distal sensory axon abnormalities and areflexia support a peripheral afferent localization.'],
    [['Posterior columns of the spinal cord', 'This explains proprioceptive loss but not reduced distal sensory nerve responses.'], ['Bilateral dorsal roots before the ganglia', 'A pure preganglionic lesion usually preserves distal sensory responses.'], ['Small peripheral sensory fibers', 'Isolated small-fiber dysfunction would not explain this loss of position sense and routine sensory responses.']],
    ['The ataxia is sensory because position input is impaired.', 'Nerve responses and distal distribution move the site from cord to peripheral sensory fibers.'],
    'Large-fiber sensory loss can impair balance even when strength is nearly normal.', ['cs-polyneuropathy', 'cs-pns'], 'Localize', null,
    'Reduced distal sensory responses accompany proprioceptive loss and absent ankle reflexes.', 'Posterior column disease can cause similar gait difficulty but does not directly lower peripheral sensory responses.');

  add('sensory', 'Hands before feet', 'Advanced',
    'A 48-year-old develops patchy numbness in the left hand, then the right arm and one foot over eight months.',
    ['Position sense is markedly impaired in the hands; strength is preserved.', 'Sensory responses are disproportionately low in several arm nerves; motor conduction is preserved.', 'There is no truncal level.'],
    ['Non-length-dependent sensory neuron pattern', 'Asymmetric widespread sensory loss, arm predominance, and sensory ataxia suggest a ganglion-level pattern.'],
    [['Length-dependent distal sensory axon pattern', 'This usually emphasizes the longest fibers, making early marked hand predominance less typical.'], ['Multilevel preganglionic sensory root pattern', 'Low distal sensory responses argue against a purely preganglionic process.'], ['Posterior spinal cord sensory tract pattern', 'A cord lesion alone does not explain reduced sensory nerve responses in multiple arms.']],
    ['First recognize a non-length-dependent distribution rather than assuming stocking-glove neuropathy.', 'The pattern raises sensory neuronopathy; it does not establish the cause or exclude mimics.'],
    'Sensory ataxia plus asymmetric arm involvement deserves more than a length-dependent label.', ['px-sensory-neuronopathy', 'cs-pns'], 'Localize', null,
    'Early arm-predominant sensory axon loss is out of proportion to leg involvement.', 'A distal length-dependent neuropathy is less consistent with this sequence and distribution.');

  add('roots', 'A radiating ache', 'Intermediate',
    'A 39-year-old develops neck-to-thumb pain and arm weakness over four weeks.',
    ['Elbow flexion and wrist extension are weak; the brachioradialis reflex is reduced.', 'Median and radial sensory responses are preserved; needle examination finds compatible cervical paraspinal abnormalities.'],
    ['C6-predominant cervical root', 'A shared myotome across different nerves, with supporting paraspinal findings, favors a root.'],
    [['Upper trunk of the brachial plexus', 'The motor overlap is plausible, but preserved sensory responses and paraspinal findings favor a root.'], ['Proximal radial nerve', 'The radial nerve does not supply biceps-mediated elbow flexion.'], ['Proximal musculocutaneous nerve', 'This nerve does not supply wrist extensors or the brachioradialis reflex efferent limb.']],
    ['Compare muscles sharing roots but traveling through different terminal nerves.', 'No single myotome or electrodiagnostic finding is perfectly specific.'],
    'Use converging motor, reflex, sensory, and paraspinal evidence.', ['cs-roots', 'px-radiculopathy-edx', 'px-brachial'], 'Localize', null,
    'Weak muscles cross terminal nerves while the supportive findings remain root-level.', 'An upper trunk lesion is the closest motor mimic but fits the electrodiagnostic combination less well.');

  add('roots', 'Testing a shared movement', 'Intermediate',
    'A 43-year-old has weak elbow and finger extension with a diminished triceps reflex.',
    ['A C7-predominant root lesion and a proximal radial neuropathy are both plausible.', 'Pain and sensory mapping have not resolved the distinction.'],
    ['Forearm pronation against resistance', 'Pronators receive median nerve supply, so weakness extends beyond the radial nerve while sampling overlapping roots.'],
    [['Finger extension against resistance', 'Finger extensors are radial-innervated and may be weak with either lesion.'], ['Elbow extension against resistance', 'Triceps is already abnormal and receives radial nerve supply.'], ['Wrist extension against resistance', 'Radial wrist extensors do not by themselves distinguish these two sites.']],
    ['The best differentiating muscle uses another peripheral nerve but shares relevant root contributions.', 'Interpret pronation with the rest of the pattern; isolated weak effort is not diagnostic.'],
    'Shared root, different nerve is a useful examination strategy.', ['cs-roots', 'cs-radial'], 'Discriminate', 'Which additional strength test best looks beyond the radial nerve territory?',
    'Forearm pronation samples median-innervated muscles outside the radial distribution.', 'Radial neuropathy remains plausible if non-radial muscles are consistently spared.');

  add('roots', 'Small finger, larger map', 'Intermediate',
    'A pianist has weak finger spreading and tingling in the ring and little fingers.',
    ['An ulnar lesion and a broader C8–T1 process are being compared.', 'The examiner wants a motor test outside the ulnar nerve.'],
    ['Weak thumb palmar abduction', 'Abductor pollicis brevis is usually median-innervated, sampling overlapping lower cervical roots.'],
    [['Weak little-finger abduction', 'Abductor digiti minimi is ulnar-innervated and does not extend the sampled territory.'], ['Weak index-finger abduction', 'First dorsal interosseous is another ulnar-innervated muscle.'], ['Weak thumb adduction', 'Adductor pollicis is also ulnar-innervated, unlike palmar abduction.']],
    ['Separate thumb adduction from palmar abduction when selecting a test.', 'Median muscle weakness broadens localization, but roots versus lower plexus still needs further evidence.'],
    'A broader motor map is evidence against an isolated ulnar lesion, not proof of radiculopathy.', ['cs-ulnar-wrist', 'px-median', 'px-brachial'], 'Discriminate', 'Which finding would most challenge an isolated ulnar motor lesion?',
    'A weak median-innervated hand muscle crosses the ulnar nerve boundary.', 'A lower trunk plexus process can also weaken both median and ulnar hand muscles.');

  add('roots', 'Knee giving way', 'Advanced',
    'Six weeks after the onset of back-to-anterior-thigh pain, a 57-year-old has difficulty climbing steps.',
    ['Knee extension and hip adduction are weak; the knee reflex is reduced.', 'Saphenous sensory responses are preserved; lumbar paraspinal and affected limb muscles show compatible denervation.'],
    ['Upper lumbar roots, predominantly L3–L4', 'Femoral and obturator motor involvement with paraspinal findings favors roots.'],
    [['Femoral nerve near the pelvis', 'Femoral dysfunction does not explain obturator-mediated hip adduction weakness.'], ['Lumbar plexus in the pelvis', 'This explains both muscle groups, but the paraspinal and sensory-response pattern favors roots.'], ['Obturator nerve near the pelvis', 'This explains adductor weakness but not quadriceps weakness and a reduced knee reflex.']],
    ['The weakness spans femoral and obturator distributions.', 'Electrodiagnostic findings help separate a shared root pattern from plexus disease.'],
    'Test an adductor when knee extension is weak.', ['px-medial-thigh', 'px-femoral', 'px-radiculopathy-edx'], 'Localize', null,
    'Adductor involvement defeats a femoral-only explanation; paraspinal findings then favor roots.', 'A lumbar plexus lesion is the closest anatomical competitor but usually spares paraspinals when pure.');

  add('roots', 'Foot clearance', 'Intermediate',
    'A 36-year-old has foot drop after several weeks of lateral leg discomfort.',
    ['Dorsiflexion and toe extension are weak.', 'The working alternatives are L5 radiculopathy and common fibular neuropathy.'],
    ['Hip abduction against resistance', 'Gluteus medius uses the superior gluteal nerve and can reveal L5 dysfunction outside the fibular nerve.'],
    [['Great-toe extension against resistance', 'This deep fibular movement can be weak at either site.'], ['Ankle eversion against resistance', 'Fibular-innervated evertors can also be affected at either site.'], ['First-web-space sensory comparison', 'Sensory overlap and variability make this less discriminating than a proximal non-fibular muscle.']],
    ['Move proximally and outside the suspected terminal nerve.', 'Hip abduction weakness supports a broader process; assess pain and effort before interpreting it.'],
    'Foot drop is a movement deficit, not a localization.', ['cs-fibular', 'cs-back'], 'Discriminate', 'Which next examination best seeks evidence outside the common fibular nerve?',
    'Hip abduction tests a separate nerve carrying relevant L5 fibers.', 'Common fibular neuropathy should spare true superior gluteal motor function.');

  add('roots', 'Pushing off', 'Advanced',
    'A 46-year-old has back-to-posterior-leg pain and reduced push-off over five weeks.',
    ['Plantar flexion, knee flexion, and hip extension are weak; the Achilles reflex is reduced.', 'Toe dorsiflexion is relatively preserved; appropriately sampled low lumbar/lumbosacral paraspinal muscles show denervation.'],
    ['S1-predominant lumbosacral root', 'The pattern includes tibial, sciatic hamstring, and inferior gluteal territories with paraspinal support.'],
    [['Proximal tibial nerve', 'A tibial lesion cannot account for gluteus maximus weakness.'], ['Proximal sciatic nerve', 'A sciatic lesion can affect hamstrings and calf but should spare the inferior gluteal nerve.'], ['Sacral plexus', 'This can span the motor territories, but compatible paraspinal denervation favors root involvement.']],
    ['Gluteus maximus is supplied through a branch outside the sciatic nerve.', 'A coherent myotomal distribution plus paraspinal involvement is more informative than the Achilles reflex alone.'],
    'Check gluteal function when separating roots, plexus, and sciatic nerve.', ['cs-roots', 'px-lumbosacral', 'px-radiculopathy-edx'], 'Localize', null,
    'Hip extension weakness and paraspinal abnormalities extend beyond a sciatic lesion.', 'Sacral plexopathy remains a close motor mimic but fits the paraspinal findings less well.');

  add('plexus', 'After the shoulder pull', 'Advanced',
    'Six weeks after a traction injury, a 24-year-old has weak shoulder abduction, external rotation, and elbow flexion.',
    ['Deltoid, infraspinatus, and biceps show denervation; distal hand muscles are spared.', 'Lateral antebrachial cutaneous sensory response is low; sampled cervical paraspinals are normal.'],
    ['Upper trunk of the brachial plexus', 'Multiple upper-trunk branches and a postganglionic sensory abnormality fit this site.'],
    [['C5–C6 cervical roots', 'The motor pattern fits, but the reduced sensory response favors a postganglionic site.'], ['Axillary nerve proximally', 'It cannot explain infraspinatus and biceps involvement.'], ['Musculocutaneous nerve proximally', 'It cannot explain deltoid and infraspinatus involvement.']],
    ['The affected muscles cross axillary, suprascapular, and musculocutaneous nerves.', 'Sensory and paraspinal data support the plexus but must be interpreted with study quality and timing.'],
    'Postganglionic sensory evidence is useful when root and trunk motor patterns overlap.', ['px-brachial', 'px-proximal-arm', 'cs-plexus-edx'], 'Localize', null,
    'Three terminal nerve territories share an upper trunk pattern with an abnormal sensory response.', 'C5–C6 roots are the closest motor mimic but usually preserve the distal sensory response.');

  add('plexus', 'A hand and forearm pattern', 'Advanced',
    'A 60-year-old develops progressive hand weakness and medial forearm numbness.',
    ['Both thumb palmar abduction and finger abduction are weak.', 'Medial antebrachial cutaneous and ulnar sensory responses are reduced; paraspinal sampling is normal.', 'Proximal shoulder and elbow strength is preserved.'],
    ['Lower brachial plexus', 'Median and ulnar motor involvement with medial forearm sensory loss favors lower plexus.'],
    [['Ulnar nerve at the elbow', 'It does not supply thumb palmar abduction or medial forearm skin.'], ['Median nerve in the proximal forearm', 'It does not explain ulnar intrinsic weakness and medial antebrachial sensory loss.'], ['C8–T1 roots before the ganglia', 'The motor overlap is plausible, but reduced sensory responses support postganglionic involvement.']],
    ['Medial forearm skin is not the ulnar nerve territory.', 'The pattern supports lower plexus involvement without precisely separating every trunk and cord component.'],
    'Do not extend an ulnar sensory map up the medial forearm.', ['cs-ulnar-wrist', 'px-brachial', 'cs-plexus-edx'], 'Localize', null,
    'Medial forearm sensation and median motor involvement exceed an isolated ulnar lesion.', 'C8–T1 root disease fits the muscles but less well explains the abnormal distal sensory responses.');

  add('plexus', 'Three weak movements', 'Advanced',
    'After shoulder trauma, a 32-year-old cannot lift the arm normally, straighten the elbow strongly, or extend the wrist.',
    ['Deltoid, triceps, and wrist extensors are weak.', 'Biceps and infraspinatus strength are preserved; radial sensory response is reduced.'],
    ['Posterior cord of the brachial plexus', 'Combined axillary and radial dysfunction with spared non-posterior-cord muscles fits this grouping.'],
    [['Proximal radial nerve', 'Radial injury accounts for extensors but not deltoid weakness.'], ['Proximal axillary nerve', 'Axillary injury accounts for deltoid but not triceps and wrist extensors.'], ['Upper trunk of the brachial plexus', 'A substantial upper trunk lesion would more likely involve biceps and infraspinatus.']],
    ['Group affected terminal nerves by their upstream plexus connection.', 'Preserved muscles with similar root contributions make the posterior cord pattern more convincing.'],
    'Spared muscles can be as useful as weak muscles in plexus localization.', ['px-traumatic-brachial', 'px-axillary'], 'Localize', null,
    'Axillary and radial motor deficits coexist while suprascapular and musculocutaneous muscles are preserved.', 'A high radial lesion cannot include deltoid weakness without a second lesion.');

  add('plexus', 'A broad anterior thigh deficit', 'Advanced',
    'A 67-year-old develops unilateral thigh pain and weakness over several weeks after a pelvic procedure.',
    ['Hip adduction and knee extension are weak; sensation is reduced over anterior and medial thigh.', 'Saphenous sensory response is reduced; affected adductors and quadriceps show denervation.', 'Lumbar paraspinal sampling is normal.'],
    ['Lumbar plexus', 'Femoral and obturator involvement with postganglionic sensory loss favors lumbar plexus.'],
    [['Femoral nerve', 'Femoral dysfunction does not explain substantial adductor longus weakness.'], ['Obturator nerve', 'Obturator dysfunction does not explain quadriceps weakness and saphenous sensory loss.'], ['Upper lumbar roots', 'Roots can span both muscle groups, but the sensory response and paraspinal pattern favor plexus.']],
    ['Map each weak muscle to both its root and terminal nerve.', 'The combined distribution exceeds a single terminal nerve without proving the cause of the plexus lesion.'],
    'A pelvic context is supporting evidence; the examination still does the localization.', ['px-lumbosacral', 'px-proximal-leg', 'px-medial-thigh'], 'Localize', null,
    'Femoral and obturator deficits coexist with a reduced distal sensory response.', 'A root lesion is the closest distributional mimic but is less consistent with the sensory study.');

  add('nerves', 'The pinch task', 'Intermediate',
    'A 28-year-old cannot make a rounded thumb-index pinch. Thumb interphalangeal and index distal interphalangeal flexion are weak.',
    ['Other median hand muscles are strong; thumb opposition is preserved.', 'The motor distribution points to anterior interosseous fibers.'],
    ['Preserved cutaneous sensation throughout the hand', 'Anterior interosseous motor fibers do not supply a cutaneous sensory territory.'],
    [['Reduced sensation at the index fingertip', 'This suggests involvement of median sensory fibers beyond the anterior interosseous distribution.'], ['Reduced sensation over the thenar eminence', 'This implicates median palmar cutaneous fibers, not an isolated anterior interosseous pattern.'], ['Reduced sensation in the dorsal first web space', 'This is a radial cutaneous territory unrelated to anterior interosseous motor fibers.']],
    ['Identify the weak thumb and index long flexors rather than calling this nonspecific grip weakness.', 'The motor pattern does not by itself distinguish a distal branch lesion from selective fascicular involvement higher up.'],
    'A motor branch pattern is not automatic proof of focal entrapment.', ['px-median', 'cs-carpal'], 'Predict', 'Which sensory examination is most compatible with this isolated motor pattern?',
    'The weak long flexors share anterior interosseous motor fibers, with other median functions spared.', 'A broader median lesion becomes more likely if a matching cutaneous sensory deficit is present.');

  add('nerves', 'Straightening the fingers', 'Intermediate',
    'A 54-year-old notices difficulty releasing objects over three weeks.',
    ['Finger and thumb extension are weak; wrist extension remains possible with radial deviation.', 'Triceps is strong, and hand cutaneous sensation is normal.'],
    ['Posterior interosseous motor distribution', 'Finger extensors are affected while more proximal radial wrist extension and cutaneous sensation are preserved.'],
    [['Radial nerve at the spiral groove', 'A broader radial lesion commonly affects wrist extension and may affect superficial radial sensation.'], ['Superficial radial sensory branch', 'This branch cannot produce finger extensor weakness.'], ['Posterior cord of the brachial plexus', 'A substantial posterior cord lesion would be expected to involve additional radial or axillary functions.']],
    ['Preserved wrist extension does not exclude a radial-system motor lesion.', 'Radial deviation reflects unequal preservation of wrist extensor muscles.'],
    'Separate the posterior interosseous motor branch from the superficial radial sensory branch.', ['cs-radial', 'px-arm-nerves'], 'Localize', null,
    'Weak finger extension occurs with preserved sensation and partially preserved wrist extension.', 'A spiral-groove radial lesion is less consistent with the selective distal motor pattern.');

  add('nerves', 'More than fingertip tingling', 'Intermediate',
    'A 41-year-old has median-side hand numbness and difficulty using a screwdriver.',
    ['Thumb opposition, long thumb flexion, and forearm pronation are weak.', 'Sensation is reduced at the index fingertip and over the thenar eminence.', 'Ulnar hand muscles and radial wrist extension are normal.'],
    ['Median nerve proximal to forearm branches', 'Forearm median muscles and palmar cutaneous sensation extend the deficit above the wrist.'],
    [['Median nerve within the carpal tunnel', 'This site should spare proximal forearm motor branches and usually the thenar skin territory.'], ['Anterior interosseous motor fibers alone', 'This does not explain cutaneous sensory loss or thenar muscle weakness.'], ['Lower trunk of the brachial plexus', 'The preserved ulnar muscles and predominantly median distribution make this less coherent.']],
    ['Distinguish thenar muscle function from thenar skin sensation.', 'The findings place dysfunction proximally within the median system without proving one entrapment site.'],
    'Thenar skin sensation travels through a branch that leaves before the carpal tunnel.', ['px-median', 'cs-carpal'], 'Localize', null,
    'Proximal median muscles and thenar skin are affected along with the fingers.', 'Carpal tunnel disease explains fingertip symptoms but not the forearm weakness and palm sensory deficit.');

  add('nerves', 'A selective hand deficit', 'Advanced',
    'A 33-year-old cyclist develops weak key pinch and index-finger spreading.',
    ['First dorsal interosseous and adductor pollicis are weak; abductor digiti minimi is preserved.', 'Ulnar finger flexors, wrist flexion, and cutaneous sensation are normal.'],
    ['Distal deep ulnar motor branch', 'Selective interosseous and adductor weakness can occur beyond branches to hypothenar muscles.'],
    [['Ulnar nerve proximal to the elbow', 'The selective distal motor pattern with preserved hypothenar and sensory function is less consistent.'], ['Superficial ulnar branch at the wrist', 'This predominantly sensory branch does not supply the affected deep intrinsic muscles.'], ['Lower trunk of the brachial plexus', 'This should usually extend beyond selected deep ulnar motor targets.']],
    ['The preserved hypothenar muscle helps refine localization within the ulnar motor system.', 'Anatomical variation and selective fascicular lesions can complicate exact branch-level inference.'],
    'Normal sensation does not exclude a focal ulnar motor lesion.', ['cs-ulnar-wrist', 'px-arm-nerves'], 'Localize', null,
    'Selected deep ulnar intrinsic muscles are weak while hypothenar, proximal ulnar, and sensory functions are spared.', 'A more proximal ulnar lesion requires selective involvement to reproduce this narrower pattern.');

  add('nerves', 'At the wrist or above it', 'Intermediate',
    'A 50-year-old has ring- and little-finger tingling with interosseous weakness. Testing is consistent with ulnar dysfunction in Guyon canal.',
    ['The question is which sensory territory should remain outside this lesion.', 'There is no evidence of another neuropathy.'],
    ['Sensation over the dorsal ulnar hand', 'The dorsal cutaneous branch normally leaves proximal to Guyon canal.'],
    [['Sensation over the palmar little finger', 'This travels through the superficial ulnar branch at the wrist and may be affected.'], ['Sensation over the ulnar ring fingertip', 'This digital territory may be affected by an ulnar lesion within Guyon canal.'], ['Sensation over the little-finger pad', 'This is also supplied by distal ulnar digital fibers passing through the wrist region.']],
    ['Follow branch takeoffs before interpreting a sensory map.', 'Dorsal sparing supports a distal site but does not exclude selective lesions farther proximally.'],
    'Compare palmar and dorsal ulnar territories when refining the level.', ['cs-ulnar', 'cs-ulnar-wrist'], 'Predict', 'Which territory is most likely to retain sensation in an isolated Guyon canal lesion?',
    'The dorsal cutaneous branch has already separated before the nerve enters Guyon canal.', 'An elbow-level lesion may involve dorsal ulnar sensation as well as digital territories.');

  add('nerves', 'Turning the palm upward', 'Intermediate',
    'After an upper-arm injury, a 22-year-old has weak elbow flexion and supination.',
    ['Biceps is wasted; the biceps reflex is reduced.', 'There is lateral forearm sensory loss, but deltoid, infraspinatus, and brachioradialis are strong.'],
    ['Musculocutaneous nerve', 'Biceps weakness and lateral forearm sensory loss share this nerve and its cutaneous continuation.'],
    [['C5–C6 cervical roots', 'Preserved muscles in other nerves sharing these roots make a restricted terminal nerve lesion more likely.'], ['Upper trunk of the brachial plexus', 'This usually extends to axillary or suprascapular muscles when sufficiently involved.'], ['Lateral antebrachial cutaneous nerve alone', 'An isolated distal sensory branch lesion cannot cause biceps weakness.']],
    ['Combine the motor deficit with the lateral forearm sensory territory.', 'Compare muscles with similar roots that use different nerves.'],
    'Lateral forearm sensation can link a motor deficit to the musculocutaneous nerve.', ['px-proximal-arm', 'px-brachial'], 'Localize', null,
    'Biceps and lateral forearm sensation are affected while other C5–C6 muscles are spared.', 'An upper trunk lesion is less likely because suprascapular and axillary functions remain intact.');

  add('nerves', 'After the shoulder injury', 'Intermediate',
    'A 59-year-old has persistent shoulder weakness after a dislocation has been reduced.',
    ['Deltoid is weak and wasted, with reduced sensation over the lateral deltoid region.', 'Electrodiagnostic abnormalities involve deltoid and teres minor; infraspinatus and biceps are preserved.', 'Triceps, wrist extensors, and finger extensors are strong.'],
    ['Axillary nerve', 'Deltoid, teres minor, and lateral shoulder sensation fit the axillary distribution.'],
    [['Suprascapular nerve', 'This supplies supraspinatus and infraspinatus, not deltoid skin sensation or deltoid muscle.'], ['Upper trunk of the brachial plexus', 'Preserved infraspinatus and biceps favor a narrower terminal nerve lesion.'], ['Posterior cord of the brachial plexus', 'This broader site would more often include radial or other posterior-cord functions.']],
    ['External rotation has several muscular contributors; identify which muscle is affected.', 'Muscle sampling distinguishes neighboring shoulder nerves more precisely than movement labels alone.'],
    'Pain-limited shoulder movement and true nerve weakness require careful separation.', ['px-axillary', 'px-proximal-arm'], 'Localize', null,
    'Deltoid and teres minor share axillary supply, with a matching cutaneous patch.', 'Suprascapular neuropathy predicts a different rotator-cuff muscle pattern and no deltoid skin deficit.');

  add('nerves', 'Pushing a door', 'Intermediate',
    'A 26-year-old has trouble pushing heavy doors after several weeks of shoulder discomfort.',
    ['The medial scapular border becomes prominent during forward pushing; serratus anterior activation is weak.', 'Shoulder shrug and scapular retraction are strong; arm sensation is normal.'],
    ['Long thoracic nerve', 'Serratus anterior weakness with preserved trapezius and rhomboid function favors this motor nerve.'],
    [['Spinal accessory nerve', 'A trapezius deficit would more likely impair shrug and produce a different scapular movement pattern.'], ['Dorsal scapular nerve', 'A rhomboid deficit should impair scapular retraction rather than selectively weakening serratus.'], ['Suprascapular nerve', 'This supplies rotator-cuff muscles rather than serratus anterior.']],
    ['Scapular winging is a sign with several possible muscular causes.', 'Identify the weak stabilizer and examine the muscles that its alternatives supply.'],
    'Name the weak scapular muscle before naming its nerve.', ['px-proximal-arm', 'px-arm-nerves'], 'Localize', null,
    'Forward pushing unmasks serratus weakness while shrug and retraction remain strong.', 'Spinal accessory neuropathy is less consistent with preserved trapezius function.');

  add('nerves', 'An ankle that turns inward', 'Intermediate',
    'After a lateral calf injury, a 30-year-old notices that the foot rolls inward while walking.',
    ['Eversion is weak; dorsiflexion and great-toe extension are strong.', 'Sensation is reduced over much of the dorsum of the foot, with the first web space preserved.'],
    ['Superficial fibular nerve proximally', 'Evertor weakness and dorsal foot sensory loss with deep fibular sparing fit this branch.'],
    [['Deep fibular nerve proximally', 'This would preferentially weaken dorsiflexion and toe extension with first-web sensory loss.'], ['Common fibular nerve at the knee', 'A substantial lesion would more often include the spared deep fibular functions.'], ['L5 root', 'The selective branch motor-sensory pattern is more restricted than a typical L5 myotomal deficit.']],
    ['Compare superficial and deep fibular motor functions.', 'The spared first web space reinforces the branch-level sensory boundary.'],
    'Eversion weakness with preserved dorsiflexion points away from the usual common-fibular foot drop pattern.', ['cs-fibular', 'px-distal-leg'], 'Localize', null,
    'Superficial fibular functions are affected while deep fibular motor and sensory functions are intact.', 'Common fibular neuropathy is possible if selective, but the narrower branch fits best.');

  add('nerves', 'A narrow foot-drop pattern', 'Advanced',
    'A 44-year-old develops difficulty lifting the forefoot after an anterior leg injury.',
    ['Dorsiflexion and toe extension are weak; eversion, inversion, and hip abduction are preserved.', 'Sensory loss is confined to the first dorsal web space.'],
    ['Deep fibular nerve in the leg', 'The involved dorsiflexors and sensory territory fit a lesion proximal to its leg motor branches.'],
    [['Deep fibular nerve at the ankle', 'A lesion this distal generally spares the long dorsiflexors supplied higher in the leg.'], ['Common fibular nerve at the knee', 'This would more often add eversion weakness and broader dorsal foot sensory loss.'], ['L5 root', 'Preserved non-deep-fibular L5 muscles and the narrow sensory territory favor a peripheral branch.']],
    ['The same named nerve has different deficits at different lesion levels.', 'A distal deep fibular lesion cannot explain weakness of branches that have already left proximally.'],
    'Use branch departure points to separate leg-level from ankle-level lesions.', ['cs-fibular', 'px-deep-fibular'], 'Localize', null,
    'Long dorsiflexors are weak, locating deep fibular dysfunction above their motor branch takeoffs.', 'An ankle-level deep fibular lesion can affect foot intrinsic muscles and web-space sensation but not these long dorsiflexors.');

  add('nerves', 'Sole symptoms', 'Intermediate',
    'A 53-year-old has plantar foot numbness and weakness of small plantar muscles. The leading site is tibial branches at the tarsal tunnel.',
    ['The examination is being checked for evidence of a more proximal lesion.', 'Dorsal foot sensation is preserved.'],
    ['Preserved ankle plantar flexion and Achilles reflex', 'Calf motor branches and the reflex arc lie proximal to a tarsal tunnel lesion.'],
    [['Weak ankle plantar flexion and absent Achilles reflex', 'This suggests dysfunction proximal to the distal plantar branches.'], ['Weak ankle eversion and reduced dorsal foot sensation', 'This adds fibular territory rather than supporting an isolated tibial lesion at the ankle.'], ['Weak knee flexion and reduced lateral calf sensation', 'This extends the deficit above the ankle and beyond the expected local branch pattern.']],
    ['Test muscles supplied before the suspected lesion level.', 'Heel sensation is less reliable for a rigid level rule because calcaneal branch anatomy varies.'],
    'Proximal muscle and reflex preservation can sharpen a distal nerve localization.', ['px-tarsal', 'px-lumbosacral'], 'Predict', 'Which additional finding best fits an isolated tarsal tunnel localization?',
    'An ankle-level lesion is distal to the calf motor and Achilles reflex pathways.', 'A proximal tibial lesion becomes more plausible if true calf weakness or reflex loss accompanies the plantar symptoms.');

  add('nerves', 'Rising from a low seat', 'Intermediate',
    'A 64-year-old develops unilateral knee buckling after a pelvic procedure.',
    ['Knee extension is weak and the knee reflex is reduced.', 'Hip adduction is strong; medial lower-leg sensation and the saphenous sensory response are reduced.', 'Lumbar paraspinal sampling is normal.'],
    ['Femoral nerve', 'Quadriceps and saphenous involvement with obturator sparing favor femoral neuropathy.'],
    [['Obturator nerve', 'This would emphasize hip adduction rather than knee extension and saphenous sensation.'], ['Upper lumbar plexus', 'A broader plexus lesion may involve obturator functions, which are preserved here.'], ['L3–L4 roots', 'The motor overlap is plausible, but the reduced sensory response and spared adduction favor femoral nerve.']],
    ['The saphenous nerve is the sensory continuation of the femoral system.', 'Preserved adductors narrow a shared upper-lumbar pattern to a terminal nerve.'],
    'A reduced knee reflex localizes a reflex arc, not a single lesion site.', ['px-femoral', 'px-proximal-leg', 'cs-reflexes'], 'Localize', null,
    'Femoral motor and sensory findings coexist while obturator muscles remain strong.', 'L3–L4 radiculopathy is less consistent with the distal sensory response and restricted motor pattern.');

  add('nerves', 'Crossing the legs', 'Intermediate',
    'A 47-year-old develops difficulty bringing one thigh inward after pelvic surgery.',
    ['Adductor longus and gracilis are weak, with a small patch of medial thigh sensory loss.', 'Knee extension, hip flexion, and the knee reflex are preserved.'],
    ['Obturator nerve', 'The affected adductors and small medial thigh sensory territory fit obturator dysfunction.'],
    [['Femoral nerve', 'Its major knee-extensor function and associated reflex are preserved.'], ['L2–L4 roots', 'A root lesion substantial enough to cause this deficit may extend to other muscles sharing those roots.'], ['Lumbar plexus', 'The preserved femoral functions favor a more limited obturator distribution.']],
    ['Localize using specific adductors rather than every movement around the hip.', 'The obturator cutaneous patch may be small or variable; motor findings carry more weight.'],
    'A small or absent sensory patch does not exclude obturator motor dysfunction.', ['px-obturator', 'px-medial-thigh'], 'Localize', null,
    'Hip adductors are weak while neighboring femoral functions and their reflex are intact.', 'Lumbar plexopathy can include obturator fibers, but the observed deficit fits a narrower terminal nerve.');

  add('nerves', 'Both sides of the ankle', 'Advanced',
    'Six weeks after a hip injury, a 37-year-old has foot weakness greater in dorsiflexion than plantar flexion.',
    ['Inversion, eversion, and knee flexion are also weak.', 'Hip abduction and gluteus maximus strength are preserved; medial lower-leg sensation is intact.', 'Sural and superficial fibular sensory responses are reduced; paraspinals are normal.'],
    ['Sciatic nerve proximal in the thigh', 'Both tibial and fibular divisions plus hamstrings are involved, with gluteal branches spared.'],
    [['Common fibular nerve at the knee', 'This does not explain plantar flexion, inversion, or hamstring weakness.'], ['L5–S1 roots', 'The reduced sensory responses and preserved gluteal muscles favor a postganglionic sciatic site.'], ['Broad sacral plexus', 'This can mimic sciatic injury, but spared gluteal branches favor the narrower site.']],
    ['A fibular-predominant sciatic lesion can initially look like common fibular neuropathy.', 'Test tibial functions, hamstrings, and gluteal muscles to reveal its boundaries.'],
    'Medial lower-leg sensation is supplied through the femoral-saphenous system, outside sciatic territory.', ['px-lumbosacral', 'px-proximal-leg', 'cs-fibular'], 'Localize', null,
    'Tibial and fibular functions plus hamstrings are affected, but gluteal and saphenous territories are spared.', 'A sacral plexus lesion is the closest proximal competitor; broader branch involvement would favor it.');

  add('sensory', 'Burning feet, normal tracing', 'Intermediate',
    'A 42-year-old has months of burning feet and discomfort from bedsheets.',
    ['Pin and temperature are reduced distally, but vibration, joint position, strength, and ankle reflexes are preserved.', 'Routine sensory and motor nerve conduction studies are normal.'],
    ['Small peripheral sensory fibers', 'Selective pain-temperature abnormalities can occur despite normal studies that mainly sample large fibers.'],
    [['Large peripheral sensory fibers', 'These would more often affect proprioception, vibration, reflexes, or routine sensory responses.'], ['Posterior columns of the spinal cord', 'These carry the relatively preserved vibration and position modalities.'], ['Several lumbosacral sensory roots', 'The symmetric distal pattern without radicular distribution favors peripheral small fibers.']],
    ['Match the impaired modalities to the fiber types rather than treating all sensation as one system.', 'The pattern supports small-fiber involvement; appropriate specialized assessment is needed for confirmation.'],
    'Normal routine nerve conduction does not exclude every peripheral sensory disorder.', ['px-small-fiber', 'px-small-fiber-testing'], 'Localize', null,
    'Pain-temperature loss coexists with preserved large-fiber functions and routine studies.', 'Large-fiber neuropathy is less consistent with intact position sense, reflexes, and sensory responses.');

  add('motor', 'Testing a motor-only hypothesis', 'Advanced',
    'A 58-year-old has slowly progressive focal wasting, fasciculations, and weakness with reduced reflexes.',
    ['An anterior horn cell process is one possibility.', 'The examiner is checking whether the abnormalities are confined to the motor system.'],
    ['Reproducible sensory loss with reduced sensory responses', 'This adds peripheral sensory axon involvement, which an isolated anterior horn process does not explain.'],
    [['Visible fasciculations in weak muscles', 'These can accompany lower motor neuron dysfunction and do not challenge the proposed site.'], ['Reduced recruitment with large motor units', 'This is compatible with chronic neurogenic motor-unit loss and reinnervation.'], ['Reduced tendon reflexes in the weak limb', 'Loss of the motor limb of a reflex arc fits lower motor neuron involvement.']],
    ['Anterior horn cells are motor neurons; sensory abnormalities require an additional or alternative localization.', 'Fasciculations alone are nonspecific and never establish a disease diagnosis.'],
    'Test what a proposed localization should spare.', ['px-motor-neuron', 'cs-pns'], 'Discriminate', 'Which additional finding most challenges a process confined to anterior horn cells?',
    'Objective sensory axon dysfunction is outside the anterior horn motor system.', 'A motor-predominant peripheral neuropathy becomes more plausible when sensory fibers are also affected.');

  add('motor', 'Findings in separate regions', 'Advanced',
    'A 65-year-old develops progressive hand wasting and leg stiffness over ten months.',
    ['Tongue wasting and fasciculations coexist with a brisk jaw reflex.', 'Legs are spastic with extensor plantar responses; hand reflexes are brisk despite wasting.', 'Sensation is preserved, with no truncal level or sphincter symptoms.'],
    ['Upper and lower motor neuron systems', 'Combined bulbar and limb findings span both motor systems across multiple regions.'],
    [['Cervical cord segments and descending tracts alone', 'A cervical lesion cannot account for both tongue lower motor neuron signs and a brisk jaw reflex.'], ['Anterior horn cells and motor cranial nuclei alone', 'This explains wasting but not definite upper motor neuron signs.'], ['Motor roots and peripheral motor nerves alone', 'These sites do not explain spasticity, extensor plantar responses, or corticobulbar signs.']],
    ['Map upper and lower motor neuron evidence independently across bulbar and limb regions.', 'The combined motor localization warrants evaluation of motor neuron disorders and mimics; it is not a diagnosis by itself.'],
    'A cervical explanation becomes incomplete when motor signs extend above the cervical cord.', ['px-motor-neuron', 'cs-myelopathy'], 'Localize', null,
    'Bulbar and limb findings contain both upper and lower motor neuron signs with sensory sparing.', 'Cervical myelopathy explains some limb signs but cannot unify the bulbar motor findings.');

  add('nmj', 'A voice that fades', 'Intermediate',
    'A 31-year-old reports intermittent double vision and a voice that becomes nasal during long conversations.',
    ['Sustained upgaze increases ptosis; a brief rest improves it.', 'Pupils, sensation, tendon reflexes, and baseline limb power are normal.', 'There is no fixed cranial nerve pattern or limb atrophy.'],
    ['Neuromuscular transmission', 'Reproducible use-related ocular and bulbar fatigability with sensory and pupillary sparing favors the junction.'],
    [['Several ocular and bulbar cranial nerves', 'Multiple neuropathies usually give more fixed nerve-pattern deficits than this reversible fatigability.'], ['Ocular and bulbar muscle fibers', 'Myopathy can overlap, but rapid use-rest fluctuation favors transmission dysfunction.'], ['Bulbar motor nuclei and motor pathways', 'A structural motor pathway lesion is less consistent with reversible activity-linked ptosis and normal long tract findings.']],
    ['Fluctuation must be demonstrated as weakness, not simply reported tiredness.', 'The pattern favors a neuromuscular junction site; confirmation and cause require further assessment.'],
    'Fatigability is a change in performance during use, not a synonym for fatigue.', ['px-mg', 'cs-mg'], 'Localize', null,
    'Weakness varies reproducibly with muscle use and rest across ocular and bulbar functions.', 'Ocular myopathy can look similar but usually has a more fixed weakness pattern.');

  add('nmj', 'The second attempt', 'Advanced',
    'A 63-year-old has proximal leg weakness, dry mouth, and low tendon reflexes with preserved sensation.',
    ['A presynaptic transmission disorder is being compared with a primary myopathy.', 'The examiner repeats reflex testing after a brief strong voluntary contraction.'],
    ['Transiently stronger tendon reflexes', 'Post-activation facilitation supports impaired presynaptic transmission in the appropriate clinical pattern.'],
    [['Persistently low tendon reflexes', 'This can occur at several motor sites and supplies less specific evidence than facilitation.'], ['Increasing weakness without reflex facilitation', 'Fatigability can occur in transmission disorders but does not specifically favor a presynaptic site.'], ['Unchanged strength after brief activation', 'A fixed response offers less support for activity-dependent transmission failure; it does not exclude it.']],
    ['Combine autonomic symptoms, low reflexes, and a use-related change rather than relying on proximal weakness alone.', 'The bedside response supports a presynaptic hypothesis; electrodiagnostic confirmation is still needed.'],
    'Brief facilitation and sustained fatigability ask different physiological questions.', ['px-nmj-edx', 'px-nmj-physiology', 'cs-lems'], 'Predict', 'Which immediate response would most support the presynaptic hypothesis?',
    'Reflexes transiently facilitate after activation in this motor-autonomic pattern.', 'Myopathy explains proximal weakness but less well explains autonomic features with post-activation reflex facilitation.');

  add('muscle', 'Grip and knee control', 'Advanced',
    'A 69-year-old has slowly worsening grip and knee buckling over three years, somewhat worse on one side.',
    ['Finger flexors and quadriceps are selectively weak; sensation is preserved.', 'Several affected muscles show short-duration, low-amplitude motor units with early recruitment.', 'There are no extensor plantar responses or clear nerve-territory sensory changes.'],
    ['Muscle fibers in a selective myopathic pattern', 'The cross-nerve muscle distribution and early recruitment with small short units favor myopathy.'],
    [['Multiple peripheral motor nerves', 'A neuropathic pattern more often shows motor-unit loss and reduced recruitment rather than this myopathic combination.'], ['Several cervical and lumbar motor roots', 'The distribution is not neatly myotomal, and the motor-unit pattern favors muscle.'], ['Neuromuscular transmission', 'Transmission disorders can cause weakness, but this fixed selective distribution and myopathic study favor muscle.']],
    ['Myopathy need not be symmetric or exclusively proximal.', 'A selective pattern narrows a differential; it does not establish one muscle disease without further assessment.'],
    'Do not reject muscle localization just because finger flexors are prominently affected.', ['px-muscle-pattern', 'cs-myopathy'], 'Localize', null,
    'Fixed selective weakness crosses nerve territories and is supported by myopathic recruitment.', 'A motor neuropathy is less consistent with early recruitment of small, short-duration units in this distribution.');

  // A final case-specific step explicitly connects the conclusion to its practical limits.
  const finalReasoning = {
    'case-081': 'A cervical cord site can affect hand motor segments locally and leg pathways passing through; a hand nerve lesion cannot unite both regions.',
    'case-082': 'Dorsal column fibers from the right leg have not yet crossed in the thorax, whereas ascending pain-temperature fibers there carry left-sided body input.',
    'case-083': 'The eyes-closed deterioration shows dependence on visual compensation. It does not distinguish peripheral afferents from their central spinal continuation.',
    'case-084': 'Reflexes can evolve after acute cord injury. A peripheral-looking motor examination must therefore be weighed against the strong spinal sensory distribution.',
    'case-085': 'A distal cord explanation is preferred to roots alone, but the exact segment and any accompanying root involvement cannot be settled from this examination.',
    'case-086': 'Real disease can cross root and plexus boundaries. These study findings compare the proposed predominant sites rather than guarantee a pure lesion.',
    'case-087': 'Crossing pain-temperature fibers lie near the central cord. Damage there can interrupt selected entering segments while sparing dorsal columns farther posteriorly.',
    'case-088': 'Leg spasticity or extensor plantar responses would connect the hand symptoms to a cervical long tract process; repeated hand tests cannot supply that link.',
    'case-089': 'Reduced sensory nerve responses are generated outside the spinal cord. They anchor the proprioceptive problem in peripheral afferents rather than the posterior columns alone.',
    'case-090': 'Several unrelated sensory nerves are affected while motor studies remain preserved. This is broader than entrapment of one arm nerve and different from a pure motor syndrome.',
    'case-091': 'C6 is a predominant root assignment, not a claim that each weak muscle belongs exclusively to C6; neighboring root contributions overlap.',
    'case-092': 'Weak pronation alongside radial-innervated C7 functions would support a lesion upstream of one terminal nerve, although a plexus process still needs consideration.',
    'case-093': 'A non-ulnar weak muscle defeats the isolated ulnar hypothesis. Sensory distributions and electrodiagnostic testing can then help distinguish lower roots from lower plexus.',
    'case-094': 'The patellar reflex alone cannot distinguish femoral nerve from lumbar roots. Adductor weakness and paraspinal findings provide the missing anatomical separation.',
    'case-095': 'Ankle inversion through tibialis posterior is another non-fibular L5 function. A consistent abnormality in either region is more useful than repeatedly testing toe extension.',
    'case-096': 'A low Achilles reflex only identifies dysfunction somewhere in its arc. Proximal non-sciatic muscles and paraspinals make the root interpretation more coherent.',
    'case-097': 'Normal paraspinal sampling does not exclude radiculopathy. The reduced sensory response and the multi-nerve upper-trunk pattern supply the stronger combined evidence.',
    'case-098': 'Lower plexus is the justified level of precision here. The supplied findings do not reliably establish one tiny structural lesion or its cause.',
    'case-099': 'The posterior cord is a brachial plexus division, not the posterior spinal cord. It groups axillary and radial fibers after the trunks have divided.',
    'case-100': 'No isolated sensory response or normal paraspinal sample proves plexopathy. Their value comes from agreement with weakness across femoral and obturator territories.',
    'case-101': 'Joint or tendon problems can also impair pinch. Concordant weakness across anterior interosseous muscles, including pronator quadratus when tested, strengthens a neural interpretation.',
    'case-102': 'The superficial radial sensory branch is anatomically separate from the posterior interosseous motor pathway, explaining why substantial extensor weakness can coexist with normal skin sensation.',
    'case-103': 'A proximal median site unites forearm and hand deficits. The examination establishes this broader level more confidently than it identifies a particular compressing structure.',
    'case-104': 'The deep ulnar branch supplies intrinsic hand muscles after entering the wrist. Sparing muscles reached earlier suggests a distal branch pattern rather than whole-nerve failure.',
    'case-105': 'A preserved dorsal patch supports the branch-takeoff logic, but selective proximal fascicular injury can mimic distal sparing. Combine it with proximal muscle testing.',
    'case-106': 'The lateral antebrachial cutaneous branch continues from the musculocutaneous nerve. A lesion limited to that distal branch would cause sensation changes without the biceps weakness.',
    'case-107': 'The shared axillary pattern is more specific than shoulder abduction weakness alone. Sparing infraspinatus argues against suprascapular or broader upper-trunk involvement.',
    'case-108': 'Preserved shrug argues against major trapezius weakness, and preserved retraction argues against major rhomboid weakness. Together they narrow the scapular deficit to serratus anterior.',
    'case-109': 'The first dorsal web space is the deep fibular sensory territory. Its preservation agrees with normal toe extension and strengthens the superficial-branch interpretation.',
    'case-110': 'First-web sensory loss links the weakness to deep fibular fibers, while spared eversion and hip abduction make a broader common-fibular or root lesion less economical.',
    'case-111': 'An isolated lesion near the ankle can affect plantar sensory and intrinsic motor fibers without interrupting calf innervation. This explains the predicted preservation of push-off and reflex.',
    'case-112': 'Reduced saphenous sensory amplitude supports postganglionic involvement. Combined with normal adduction, this favors femoral nerve over a broader shared-root or plexus pattern.',
    'case-113': 'Obturator and femoral nerves share upper lumbar roots but supply different major muscle groups. Testing both converts a vague thigh complaint into a branch-level comparison.',
    'case-114': 'The sciatic nerve divides into tibial and common fibular components. Their joint involvement explains deficits on both sides of the ankle without requiring two separate distal injuries.',
    'case-115': 'Routine conduction studies mainly assess large myelinated axons. Small-fiber involvement therefore remains possible when objective pin-temperature changes accompany otherwise preserved large-fiber tests.',
    'case-116': 'Sensory abnormalities would not eliminate every motor neuron disorder or exclude coexisting disease. They would invalidate the claim that one isolated anterior horn process explains everything.',
    'case-117': 'Preserved sensation supports a motor-system emphasis but does not establish a specific disorder. Structural, peripheral, and other mimics still require clinical evaluation.',
    'case-118': 'Normal sensation and pupils help delimit the pattern; the reproducible use-rest behavior supplies the positive evidence for neuromuscular transmission rather than merely absence of other signs.',
    'case-119': 'An increase after brief activation differs from a fixed myopathic deficit. Failure to demonstrate facilitation on one attempt would not by itself rule out a presynaptic disorder.',
    'case-120': 'The motor-unit findings support muscle localization, while the selective finger-flexor and quadriceps distribution refines the pattern. Neither feature alone names the cause.'
  };
  cases.forEach(c => c.reasoning.push(finalReasoning[c.id]));
  window.NL_CASE_EXPANSIONS = window.NL_CASE_EXPANSIONS || [];
  window.NL_CASE_EXPANSIONS.push({sources, cases});
})();
