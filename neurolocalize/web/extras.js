'use strict';
/* NeuroLocalize 1.2 additions: diagram-linked recall cards and the Pattern Finder teaching heuristic.
   Sources reference ids already defined in the curriculum and case banks. */
window.NL_EXTRAS = {
 cards: [
  {id:'x01',topicId:'motor',front:'Which signs point to an upper rather than a lower motor neuron lesion?',back:'Increased tone, brisk reflexes and an extensor plantar response, with weakness in a pyramidal pattern and little early wasting.',sourceIds:['s-weakness','cs-reflexes']},
  {id:'x02',topicId:'motor',front:'Why can an acute central lesion resemble a lower motor neuron lesion?',back:'Soon after an acute lesion, tone and reflexes can be reduced before spasticity and brisk reflexes develop.',sourceIds:['s-weakness','s-cord']},
  {id:'x03',topicId:'cranial',front:'Why is the forehead often spared in a central facial palsy?',back:'Upper-face motor neurons receive input from both hemispheres, so a one-sided lesion above the nucleus mainly weakens the opposite lower face.',sourceIds:['cs-facial','s-cranial']},
  {id:'x04',topicId:'vision',front:'Which field defect follows a central chiasmal lesion?',back:'A bitemporal hemianopia, from interrupted crossing nasal retinal fibers.',sourceIds:['s-vision','cs-fields']},
  {id:'x05',topicId:'vision',front:'A right temporal lesion involving Meyer loop causes which field defect?',back:'A left (contralateral) superior homonymous quadrantanopia.',sourceIds:['s-vision','cx-homonymous']},
  {id:'x06',topicId:'brainstem',front:"Name the four medial structures in the brainstem 'rule of 4'.",back:'Motor pathway, medial lemniscus, medial longitudinal fasciculus and the motor nuclei of III, IV, VI or XII.',sourceIds:['s-brainstem','cs-medial-medulla']},
  {id:'x07',topicId:'brainstem',front:"Name the four lateral structures in the brainstem 'rule of 4'.",back:'Spinocerebellar connections, spinothalamic tract, sensory nucleus of V and the descending sympathetic pathway.',sourceIds:['s-brainstem','cs-lateral-medulla']},
  {id:'x08',topicId:'cranial',front:'How does an abducens nucleus lesion differ from an abducens nerve lesion?',back:'The nucleus lesion causes a same-side horizontal gaze palsy of both eyes; the nerve lesion weakens abduction of one eye only.',sourceIds:['rw-abducens-nucleus','cs-sixth']},
  {id:'x09',topicId:'cranial',front:'In a left internuclear ophthalmoplegia, which eye fails to adduct?',back:'The left eye, on gaze to the right, often with nystagmus of the abducting right eye.',sourceIds:['cx-ino','cs-ino']},
  {id:'x10',topicId:'cord',front:'Which modalities are spared in an anterior cord syndrome?',back:'Vibration and joint position sense, carried in the dorsal columns.',sourceIds:['cs-cord-syndromes','s-cord']},
  {id:'x11',topicId:'sensory',front:'Where do the dorsal column and spinothalamic pathways cross?',back:'Dorsal column fibers cross in the medulla; spinothalamic fibers cross within a few segments of their entry into the cord.',sourceIds:['s-dorsal','s-somatosensory']},
  {id:'x12',topicId:'roots',front:'Weak great-toe extension with a normal ankle reflex points most to which root?',back:'L5. It has no reliable routine reflex, whereas the ankle reflex depends mainly on S1.',sourceIds:['s-roots','cs-reflexes']},
  {id:'x13',topicId:'roots',front:'Which root does the triceps reflex mainly test?',back:'C7.',sourceIds:['cs-reflexes','s-roots']},
  {id:'x14',topicId:'plexus',front:'Which cords combine to form the median nerve?',back:'The lateral and medial cords.',sourceIds:['s-plexus','px-brachial']},
  {id:'x15',topicId:'plexus',front:'Which terminal nerves arise from the posterior cord?',back:'The axillary and radial nerves.',sourceIds:['s-plexus','px-brachial']},
  {id:'x16',topicId:'nmj',front:'Which reflex behavior favors Lambert–Eaton over myasthenia gravis?',back:'Reduced reflexes that can increase after a brief maximal contraction.',sourceIds:['s-lems','px-nmj-edx']},
  {id:'x17',topicId:'cortex',front:'Which classic aphasias impair repetition?',back:'Broca, Wernicke, conduction and global aphasia: the types involving the perisylvian language loop.',sourceIds:['cx-language','cx-conduction']},
  {id:'x18',topicId:'cortex',front:'Fluent speech, good comprehension, poor repetition: which aphasia?',back:'Conduction aphasia.',sourceIds:['cx-conduction','cs-aphasia']},
  {id:'x19',topicId:'cortex',front:'Which arterial territory classically gives contralateral leg-predominant weakness?',back:'The anterior cerebral artery, which supplies the medial frontal and parietal cortex where the leg is represented.',sourceIds:['cs-cerebral','s-cortex']},
  {id:'x20',topicId:'brainstem',front:'Where do second-order sympathetic fibers to the eye travel?',back:'From the upper thoracic cord, near the lung apex, up to the superior cervical ganglion.',sourceIds:['cx-horner']},
  {id:'x21',topicId:'nerves',front:'What does a stocking-and-glove sensory pattern suggest?',back:'A length-dependent polyneuropathy, which affects the longest nerves first.',sourceIds:['s-poly','s-numbness']}
 ],
 finder: {
  levels: [
   {id:'cortex',title:'Cerebral cortex',topic:'cortex',diagram:'cortex',test:'Look for language, neglect, field or cortical sensory signs that subcortical lesions rarely produce alone.'},
   {id:'deep',title:'Deep hemisphere (capsule, thalamus)',topic:'subcortex',diagram:'compact',test:'A dense face–arm–leg pattern without cortical signs favors compact deep pathways.'},
   {id:'brainstem',title:'Brainstem',topic:'brainstem',diagram:'brainstem-rule',test:'A cranial nerve or gaze sign sets the level; look for crossed sensory or limb findings.'},
   {id:'cord',title:'Spinal cord',topic:'cord',diagram:'cord-syndromes',test:'Search for a sensory level, bilateral long-tract signs and sphincter change; the face is spared.'},
   {id:'root',title:'Nerve root',topic:'roots',diagram:'root-signatures',test:'Compare muscles that share a root but use different nerves, and check the matching reflex.'},
   {id:'plexus',title:'Plexus',topic:'plexus',diagram:'brachial-plexus',test:'Deficits span several nerves and more than one root within one limb.'},
   {id:'nerve',title:'Single peripheral nerve',topic:'nerves',diagram:'peripheral',test:'Weakness and sensory loss map onto one named nerve and its branches.'},
   {id:'poly',title:'Polyneuropathy',topic:'nerves',diagram:'body-patterns',test:'Distal, symmetric, length-dependent findings with reduced ankle reflexes.'},
   {id:'nmj',title:'Neuromuscular junction',topic:'nmj',diagram:'nmj-compare',test:'Fatigable weakness with eye or bulbar involvement and normal sensation.'},
   {id:'muscle',title:'Muscle',topic:'muscle',diagram:'motor-unit',test:'Symmetric proximal weakness, normal sensation, reflexes preserved until late.'},
   {id:'cerebellum',title:'Cerebellum and its connections',topic:'cerebellum',diagram:'coordination',test:'Ataxia with preserved strength and position sense; check eye movements.'}
  ],
  groups: ['Motor','Sensory','Other clues'],
  findings: [
   {id:'umn',group:'Motor',label:'Brisk reflexes, spasticity or an extensor plantar',w:{cortex:2,deep:2,brainstem:2,cord:2,root:-3,plexus:-3,nerve:-3,poly:-3,nmj:-3,muscle:-3,cerebellum:-1}},
   {id:'lmn',group:'Motor',label:'Reduced reflexes, wasting or fasciculation in weak muscles',w:{root:2,plexus:2,nerve:2,poly:2,cord:1,cortex:-2,deep:-2,brainstem:-1,cerebellum:-1}},
   {id:'hemi',group:'Motor',label:'Face, arm and leg weak on the same side',w:{cortex:2,deep:3,brainstem:1,cord:-3,root:-3,plexus:-3,nerve:-3,poly:-3,nmj:-2,muscle:-3,cerebellum:-2}},
   {id:'para',group:'Motor',label:'Both legs weak, arms spared',w:{cord:3,root:1,deep:-1,brainstem:-1,nerve:-3,plexus:-2,nmj:-1,cerebellum:-2}},
   {id:'proximal',group:'Motor',label:'Symmetric proximal weakness (shoulders, hips)',w:{muscle:3,nmj:2,poly:-1,nerve:-3,root:-2,plexus:-2,cortex:-3,deep:-3,brainstem:-2,cerebellum:-3}},
   {id:'fatigue',group:'Motor',label:'Fatigable weakness, fluctuating ptosis or double vision',w:{nmj:4,brainstem:1,cortex:-2,deep:-2,cord:-2,root:-2,plexus:-2,nerve:-1,poly:-1,cerebellum:-2}},
   {id:'limb',group:'Motor',label:'Weakness across several nerves in one limb',w:{plexus:3,root:1,nerve:-1,brainstem:-1,poly:-2,nmj:-2,muscle:-2,cerebellum:-2}},
   {id:'single',group:'Motor',label:'Weakness and numbness in one named nerve territory',w:{nerve:4,root:1,poly:-1,cortex:-2,deep:-2,brainstem:-2,cord:-2,nmj:-3,muscle:-3,cerebellum:-3}},
   {id:'cortical',group:'Sensory',label:'Aphasia, neglect or impaired stereognosis with intact primary sensation',w:{cortex:4,deep:1,brainstem:-2,cord:-3,root:-3,plexus:-3,nerve:-3,poly:-3,nmj:-3,muscle:-3,cerebellum:-3}},
   {id:'field',group:'Sensory',label:'Homonymous visual field defect',w:{cortex:2,deep:2,brainstem:-2,cord:-3,root:-3,plexus:-3,nerve:-3,poly:-3,nmj:-3,muscle:-3,cerebellum:-3}},
   {id:'crossed',group:'Sensory',label:'Face affected on one side, body on the other',w:{brainstem:4,cortex:-3,deep:-3,cord:-3,root:-3,plexus:-3,nerve:-3,poly:-3,nmj:-3,muscle:-3,cerebellum:-3}},
   {id:'level',group:'Sensory',label:'A sensory level on the trunk',w:{cord:4,root:-1,poly:-2,cortex:-3,deep:-3,brainstem:-3,plexus:-3,nerve:-3,nmj:-3,muscle:-3,cerebellum:-3}},
   {id:'dissociated',group:'Sensory',label:'Pain loss on one side, vibration loss on the other',w:{cord:3,brainstem:2,cortex:-3,deep:-3,root:-3,plexus:-3,nerve:-3,poly:-3,nmj:-3,muscle:-3,cerebellum:-3}},
   {id:'dermatomal',group:'Sensory',label:'Radiating limb pain or a dermatomal strip of numbness',w:{root:4,plexus:1,nerve:1,cortex:-2,deep:-2,brainstem:-2,poly:-2,nmj:-2,muscle:-2,cerebellum:-2}},
   {id:'stocking',group:'Sensory',label:'Distal symmetric stocking-and-glove sensory loss',w:{poly:4,root:-1,cortex:-2,deep:-2,brainstem:-2,plexus:-2,nerve:-2,nmj:-2,muscle:-2,cerebellum:-2}},
   {id:'nosensory',group:'Sensory',label:'Sensation entirely normal',w:{muscle:2,nmj:2,cerebellum:1,brainstem:-1,cord:-1,root:-1,plexus:-2,nerve:-2,poly:-3}},
   {id:'cranial',group:'Other clues',label:'Cranial nerve or gaze palsy with opposite-side limb signs',w:{brainstem:4,cortex:-3,deep:-3,cord:-3,root:-3,plexus:-3,nerve:-3,poly:-3,nmj:-3,muscle:-3,cerebellum:-2}},
   {id:'ataxia',group:'Other clues',label:'Same-side limb ataxia with normal strength and position sense',w:{cerebellum:4,brainstem:2,cortex:-2,cord:-2,root:-2,plexus:-2,nerve:-2,poly:-2,nmj:-2,muscle:-2}},
   {id:'sphincter',group:'Other clues',label:'Early bladder or bowel change with leg signs',w:{cord:3,root:1,deep:-2,brainstem:-2,plexus:-2,nerve:-2,poly:-2,nmj:-2,muscle:-2,cerebellum:-2}},
   {id:'bulbar',group:'Other clues',label:'Weak swallowing or slurred, weak articulation',w:{brainstem:2,nmj:2,muscle:1,cord:-2,root:-3,plexus:-3,nerve:-2,poly:-1,cerebellum:-1}}
  ]
 }
};
