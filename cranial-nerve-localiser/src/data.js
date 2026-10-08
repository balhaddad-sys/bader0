
'use strict';
const SITES_A = [
  {id:'optic-nerve',name:'Optic nerve',eponym:'Prechiasmal optic neuropathy',zone:'optic',side:'ipsilateral',prior:9,w:{monocular:3,rapd:3,retroOrbital:1},ex:['bitemporal','homonymous','junctional'],causes:'Optic neuritis, ischaemic optic neuropathy, compression or infiltration.',investigation:'Visual acuity, colour vision, pupils, fundus and formal fields; MRI brain and orbits with contrast when inflammatory or compressive disease is suspected. Sudden loss needs urgent ophthalmic assessment.',pearl:'A relative afferent pupillary defect with reduced colour vision supports asymmetric optic nerve dysfunction, although severe retinal disease can also cause it. A normal disc does not exclude a retrobulbar lesion. Establish the visual field pattern and inspect the retina before attributing all monocular loss to the nerve.'},
  {id:'junctional',name:'Optic nerve–chiasm junction',eponym:'Junctional scotoma',zone:'optic',side:'ipsilateral',prior:6,w:{junctional:3,monocular:3,rapd:2},ex:['homonymous'],causes:'Pituitary or suprasellar tumour, meningioma, aneurysm or other anterior chiasmal compression.',investigation:'Formal perimetry and contrast MRI of the optic pathways and sellar region; pituitary hormone assessment if a sellar lesion is found.',pearl:'Look for central visual loss in the eye on the lesion side together with a superotemporal defect in the other eye. Always test both eyes separately: the subtle fellow-eye defect is the localising clue. The clinical pattern is useful without requiring the traditional, disputed explanation of Wilbrand’s knee.'},
  {id:'chiasm',name:'Optic chiasm',eponym:'Chiasmal syndrome',zone:'optic',side:'midline',prior:8,w:{bitemporal:3,rapd:1,monocular:1},ex:['homonymous'],causes:'Pituitary adenoma, craniopharyngioma, meningioma, aneurysm or pituitary apoplexy.',investigation:'Formal visual fields, contrast MRI of the sellar and suprasellar region and pituitary hormones. Acute headache with visual loss or ophthalmoplegia requires emergency assessment for apoplexy.',pearl:'Temporal field loss in both eyes suggests injury to crossing nasal retinal fibres. Early loss may be incomplete or asymmetric, so confrontation alone can miss it. Check acuity, colour and endocrine symptoms; a rapidly evolving visual deficit with severe headache may represent pituitary apoplexy.'},
  {id:'retrochiasmal',name:'Retrochiasmal visual pathway',eponym:'Optic tract, radiation or occipital cortex',zone:'hemisphere',side:'contralateral',prior:9,w:{homonymous:3,ipsiWeak:1,umn7:1,vascular:1,rapd:1},ex:['bitemporal','monocular'],causes:'Posterior cerebral or middle cerebral artery infarction, haemorrhage, tumour or demyelination.',investigation:'Formal fields; urgent stroke imaging for sudden onset, followed by MRI brain to define optic tract, radiation or occipital involvement.',pearl:'A homonymous field defect lies behind the chiasm, opposite the lost visual hemifield. Increasing congruity often favours a more posterior lesion, but is not an absolute rule. An optic tract lesion can produce an afferent pupillary defect; an isolated occipital lesion generally preserves pupillary responses.'},
  {id:'weber',name:'Ventral midbrain',eponym:'Weber syndrome',zone:'midbrain-ventral',side:'ipsilateral',prior:7,w:{iii:3,ptosis:2,pupil:1,contraWeak:3,vascular:1,dysarthria:1},ex:['lmn7','xii'],causes:'Paramedian midbrain infarction, haemorrhage or focal compression.',investigation:'Emergency stroke assessment when acute; MRI brain with diffusion imaging and CTA or MRA of the posterior circulation.',pearl:'An ipsilateral third nerve palsy with opposite limb weakness places the lesion where III fascicles pass beside the cerebral peduncle. Document whether ataxia is independent of weakness, because prominent tremor or dysmetria suggests tegmental extension. The eponym describes anatomy; it does not establish the cause.'},
  {id:'claude',name:'Midbrain tegmentum and cerebellar outflow',eponym:'Claude syndrome',zone:'midbrain-tegmentum',side:'ipsilateral',prior:5,w:{iii:3,ptosis:2,contraAtaxia:3,pupil:1,gaitAtaxia:1,vascular:1},ex:['lmn7'],causes:'Paramedian midbrain infarction, demyelination or tumour.',investigation:'MRI brain with diffusion and thin brainstem sections; acute vascular imaging when onset is sudden.',pearl:'Third nerve palsy with opposite limb dysmetria points to the midbrain tegmentum and cerebellar outflow pathways. In the useful bedside distinction, ataxia dominates Claude and a coarse involuntary movement suggests Benedikt. Real lesions overlap, and terminology varies; describe the ocular and limb findings alongside the eponym.'},
  {id:'benedikt',name:'Midbrain tegmentum and red nucleus region',eponym:'Benedikt syndrome',zone:'midbrain-tegmentum',side:'ipsilateral',prior:4,w:{iii:3,ptosis:2,contraAtaxia:3,contraWeak:2,pupil:1,dcml:1,vascular:1},ex:['lmn7'],causes:'Midbrain infarction, haemorrhage, tumour or inflammatory lesion.',investigation:'MRI brain with diffusion and susceptibility sequences; urgent posterior circulation imaging for an acute presentation.',pearl:'Ipsilateral III dysfunction with contralateral tremor, involuntary movement or ataxia suggests injury around the red nucleus and neighbouring pathways. Weakness indicates extension towards descending motor fibres. Because this tool groups tremor and ataxia together, it cannot reliably separate Benedikt from Claude on that chip alone.'},
  {id:'nothnagel',name:'Dorsal midbrain and superior cerebellar peduncle',eponym:'Nothnagel syndrome',zone:'midbrain-dorsal',side:'ipsilateral',prior:3,w:{iii:3,ipsiAtaxia:3,gaitAtaxia:2,bilateralPtosis:1,ophthalmoplegia:1,upgaze:1,papilloedema:1},ex:[],causes:'Tectal or pineal-region mass, obstructive hydrocephalus, less often vascular disease.',investigation:'Contrast MRI of the dorsal midbrain, pineal region and ventricular system; urgent assessment if hydrocephalus is suspected.',pearl:'A dorsal midbrain process involving III pathways and the superior cerebellar peduncle can combine ocular palsy with ataxia, sometimes bilaterally. Consider a mass or hydrocephalus when the course is progressive. Laterality and historical definitions vary, so confirm the actual peduncular and nuclear involvement on imaging.'},
  {id:'parinaud',name:'Dorsal rostral midbrain',eponym:'Parinaud syndrome',zone:'midbrain-dorsal',side:'midline',prior:7,w:{upgaze:3,lightNear:3,convergenceRetraction:3,lidRetraction:2,papilloedema:1},ex:[],causes:'Pineal-region mass, hydrocephalus, midbrain infarction or demyelination.',investigation:'MRI brain focused on the tectum, posterior commissure, pineal region and aqueduct; urgent imaging if pressure symptoms are present.',pearl:'The combination of impaired upgaze, convergence–retraction on attempted upgaze, light–near dissociation and lid retraction is much more informative than upgaze limitation alone. Inspect the pupils and lids before calling this an isolated muscle palsy. Imaging must include the aqueduct because obstructive hydrocephalus may be the underlying driver.'},
  {id:'nuclear-iii',name:'Oculomotor nuclear complex',eponym:'Nuclear III syndrome',zone:'midbrain-tegmentum',side:'midline',prior:4,w:{iii:3,bilateralPtosis:3,ophthalmoplegia:2,upgaze:1,pupil:1},ex:['fatigability'],causes:'Paramedian midbrain infarction, inflammatory disease or tumour.',investigation:'MRI brain with thin midbrain and diffusion sequences; assess associated vertical gaze and long-tract signs.',pearl:'Bilateral ptosis is a clue because the central caudal subnucleus supplies both levators. Superior rectus fibres cross, so a nuclear lesion can weaken elevation in the opposite eye as well. The pattern may therefore violate the simple rule that one third nerve lesion affects only one eye.'},
  {id:'compressive-iii',name:'Subarachnoid oculomotor nerve compression',eponym:'Posterior communicating artery aneurysm',zone:'subarachnoid',side:'ipsilateral',prior:8,w:{iii:3,ptosis:2,pupil:3,painfulEye:2,retroOrbital:1,thunderclap:1},ex:['fatigability'],causes:'Posterior communicating artery aneurysm; other aneurysm, mass or meningeal compression.',investigation:'Urgent CTA or MRA for an acute acquired III palsy. Thunderclap headache requires an emergency subarachnoid haemorrhage pathway; specialist angiography may be needed if suspicion persists.',pearl:'A painful third nerve palsy with a dilated pupil is an aneurysm warning pattern. Pupil sparing does not safely exclude compression, especially with partial or early palsy, and pain also occurs in microvascular palsy. Arrange prompt neurovascular assessment for a new acquired III palsy regardless of this fit score.'},
  {id:'microvascular-iii',name:'Ischaemic peripheral oculomotor nerve',eponym:'Microvascular III palsy',zone:'subarachnoid',side:'ipsilateral',prior:9,w:{iii:3,ptosis:2,vascular:1,retroOrbital:1,painfulEye:1},ex:['pupil','v1','v2','vi','contraWeak','fatigability'],causes:'Small-vessel ischaemia associated with diabetes, hypertension and other vascular risks.',investigation:'Prompt neurovascular imaging to exclude aneurysm in a new acquired III palsy; glucose/HbA1c, blood pressure and planned clinical follow-up. Reassess progression or failure to recover.',pearl:'Relative pupil sparing in an otherwise isolated III palsy supports microvascular ischaemia, particularly in an older patient with vascular risk. It is a pattern clue, not clearance from aneurysm investigation. Marking the pupil tested and normal improves this model’s fit, but cannot establish the diagnosis or its safety.'},
  {id:'uncal',name:'Tentorial edge and compressed III nerve',eponym:'Uncal herniation',zone:'subarachnoid',side:'ipsilateral',prior:5,w:{pupil:3,consciousness:3,iii:2,ptosis:1,contraWeak:2,ipsiWeak:1,papilloedema:1},ex:[],causes:'Expanding haematoma, tumour, oedema or other supratentorial mass effect.',investigation:'Immediate emergency and neurosurgical assessment with urgent CT brain; resuscitation and treatment must not wait for a teaching tool.',pearl:'Declining consciousness with a dilating pupil is an emergency. Usually the pupil is on the mass side and weakness is opposite. Kernohan’s notch can compress the opposite cerebral peduncle against the tentorium, producing weakness on the same side as the mass: a classic false-localising exception.'},
  {id:'trochlear',name:'Peripheral trochlear nerve',eponym:'Isolated IV palsy',zone:'subarachnoid',side:'ipsilateral',prior:8,w:{iv:3,vascular:1},ex:['iii','vi','v1','lmn7','contraWeak','fatigability'],causes:'Decompensated congenital palsy, trauma, microvascular ischaemia or compression.',investigation:'Orthoptic and neuro-ophthalmic examination; review old photographs and trauma history. MRI is appropriate for acquired unexplained, progressive or non-isolated palsy.',pearl:'Superior oblique weakness causes vertical or torsional diplopia, often worse on looking down and in, with compensatory head tilt away. Old photographs can reveal longstanding compensation. This card describes the peripheral nerve; a trochlear nuclear lesion is on the opposite side because its fibres cross before leaving the midbrain.'},
  {id:'microvascular-vi',name:'Ischaemic peripheral abducens nerve',eponym:'Microvascular VI palsy',zone:'subarachnoid',side:'ipsilateral',prior:9,w:{vi:3,vascular:1,retroOrbital:1},ex:['gaze','lmn7','v1','v2','horner','papilloedema','bilateralVi','contraWeak'],causes:'Microvascular ischaemia associated with diabetes, hypertension or other vascular risks.',investigation:'Complete ocular and neurological examination, vascular risk assessment and specialist review; MRI for young patients, non-isolated or atypical palsy, progression or failure to recover.',pearl:'An isolated abduction deficit gives horizontal diplopia, worse at distance and towards the weak lateral rectus. A VI nerve palsy affects one eye; a VI nuclear lesion impairs conjugate gaze. Examine the optic discs and other cranial nerves before assigning a peripheral microvascular explanation.'},
  {id:'raised-icp-vi',name:'Abducens stretch from raised intracranial pressure',eponym:'False-localising VI palsy',zone:'subarachnoid',side:'none',prior:7,w:{papilloedema:3,bilateralVi:3,vi:2,consciousness:1},ex:[],causes:'Intracranial mass, hydrocephalus, cerebral venous thrombosis or idiopathic intracranial hypertension.',investigation:'Urgent brain imaging with venous imaging when indicated, plus formal visual assessment. Lumbar puncture for opening pressure only after imaging and clinical assessment establish safety.',pearl:'One or both sixth nerves can fail when pressure distorts their long intracranial course. The side of the diplopia therefore need not identify the side of the primary lesion. Papilloedema supports raised pressure but may be absent early; find the cause before considering lumbar puncture.'},
  {id:'gradenigo',name:'Petrous apex',eponym:'Gradenigo syndrome',zone:'petrous',side:'ipsilateral',prior:5,w:{vi:3,otitis:3,retroOrbital:3,hearing:1,v1:1,v2:1},ex:['gaze'],causes:'Petrous apicitis from middle-ear infection; occasionally a petrous-apex tumour or inflammatory lesion.',investigation:'Urgent ENT and neurological assessment, contrast MRI of the petrous apex and skull base, and CT temporal bone; evaluate infection and intracranial complications.',pearl:'Think petrous apex when otitis is accompanied by deep trigeminal or retro-orbital pain and a sixth nerve palsy. Infection can affect the nerve near Dorello’s canal and irritate nearby trigeminal structures. The full classic triad is often incomplete, so absence of one component should not delay investigation.'},
  {id:'cavernous',name:'Cavernous sinus',eponym:'Cavernous sinus syndrome',zone:'cavernous',side:'ipsilateral',prior:8,w:{iii:2,iv:2,vi:3,v1:2,v2:2,horner:2,ptosis:1,pupil:1,corneal:1,painfulEye:1,retroOrbital:1,proptosis:1},ex:['v3','vmotor','lmn7','contraWeak'],causes:'Thrombosis, carotid-cavernous fistula, aneurysm, tumour or inflammatory disease.',investigation:'Contrast MRI of brain, cavernous sinuses and orbits; CTA/MRA or venography according to vascular or infectious suspicion. Fever, orbital congestion or rapid progression requires urgent assessment.',pearl:'III, IV, VI, V1 and V2 share this compartment; V3 does not. VI plus Horner is particularly useful because sympathetic fibres run close to VI beside the internal carotid artery. Vision loss suggests extension towards the orbital apex or optic pathway, rather than an isolated cavernous sinus lesion.'},
  {id:'sof',name:'Superior orbital fissure',eponym:'Superior orbital fissure syndrome',zone:'orbit',side:'ipsilateral',prior:5,w:{iii:2,iv:2,vi:2,v1:3,corneal:2,ptosis:1,pupil:1,painfulEye:1,proptosis:1},ex:['monocular','rapd','v2','v3','vmotor'],causes:'Trauma, tumour, orbital inflammation or invasive infection.',investigation:'Contrast MRI of the orbits and skull base; CT for fracture or bony disease. Record acuity, colour vision and pupils to assess optic nerve involvement.',pearl:'Ocular motor palsies together with V1 sensory loss fit the superior orbital fissure. The optic nerve uses the optic canal, so optic neuropathy moves the localisation towards the orbital apex. V2 also lies outside the fissure; its involvement favours a more posterior or extensive lesion.'},
  {id:'orbital-apex',name:'Orbital apex',eponym:'Orbital apex syndrome',zone:'orbit',side:'ipsilateral',prior:6,w:{monocular:3,rapd:3,iii:2,iv:2,vi:2,v1:2,corneal:1,ptosis:1,painfulEye:1,proptosis:1},ex:['v3','vmotor','contraWeak'],causes:'Tumour, invasive sinus infection, inflammatory disease or trauma.',investigation:'Urgent ophthalmic assessment and contrast MRI of the orbits, sinuses and skull base; CT for sinus or bone disease and targeted microbiological or tissue diagnosis when indicated.',pearl:'Optic neuropathy added to ophthalmoplegia is the decisive clue to the orbital apex. Examine acuity, colour vision and the afferent pupil response in every patient with multiple ocular motor palsies. Rapid painful visual loss, especially with sinus disease or immunocompromise, warrants urgent investigation for invasive infection.'},
  {id:'tolosa-hunt',name:'Inflammatory cavernous sinus or orbital fissure',eponym:'Tolosa–Hunt syndrome',zone:'cavernous',side:'ipsilateral',prior:3,w:{painfulEye:3,retroOrbital:3,iii:2,vi:2,iv:1,v1:1,v2:1,ptosis:1,horner:1},ex:['otitis','contraWeak'],causes:'Idiopathic granulomatous inflammation, diagnosed only after excluding secondary causes.',investigation:'Contrast MRI of the cavernous sinuses and orbital apex with vascular imaging and targeted infection, neoplastic and inflammatory work-up; interval imaging and specialist follow-up.',pearl:'Painful ophthalmoplegia is a syndrome, not a diagnosis of Tolosa–Hunt. Exclude aneurysm, thrombosis, tumour and infection before accepting idiopathic inflammation. A steroid response is not diagnostic because important mimics may also improve temporarily. Clinical and imaging follow-up matters, especially when the course is atypical or recurrent.'},
  {id:'thyroid-eye',name:'Orbital extraocular muscles',eponym:'Thyroid eye disease',zone:'orbit',side:'bilateral',prior:7,w:{proptosis:3,lidRetraction:3,ophthalmoplegia:2,upgaze:1,vi:1,painfulEye:1,monocular:1,rapd:1},ex:['pupil','v1','v2','fatigability'],causes:'Autoimmune thyroid-associated orbitopathy; may occur with normal thyroid function.',investigation:'Visual acuity, colour and pupil assessment, thyroid function and receptor antibodies; orbital CT or MRI for atypical disease or possible optic nerve compression.',pearl:'Lid retraction, proptosis and restrictive motility favour an orbital process. Disease is often bilateral but asymmetric, and restriction may imitate a cranial nerve palsy. Reduced colour vision, acuity or an afferent pupil defect raises concern for compressive optic neuropathy and needs prompt specialist assessment.'},
  {id:'millard-gubler',name:'Ventral caudal pons',eponym:'Millard–Gubler syndrome',zone:'pons-ventral',side:'ipsilateral',prior:6,w:{lmn7:3,contraWeak:3,vi:2,corneal:1,dysarthria:1,vascular:1},ex:['gaze'],causes:'Pontine infarction, haemorrhage, demyelination or tumour.',investigation:'Emergency stroke imaging for sudden onset; MRI with diffusion and posterior circulation CTA/MRA.',pearl:'A whole-face palsy with opposite limb weakness can be central: VII fascicles traverse the pons next to descending motor fibres. An ipsilateral VI palsy may accompany it. Test conjugate gaze; a gaze palsy suggests dorsal nuclear or gaze-centre involvement beyond this predominantly ventral pattern.'},
  {id:'raymond',name:'Ventral medial caudal pons',eponym:'Raymond syndrome',zone:'pons-ventral',side:'ipsilateral',prior:5,w:{vi:3,contraWeak:3,vascular:1,dysarthria:1},ex:['lmn7','gaze'],causes:'Paramedian pontine infarction, haemorrhage or focal mass.',investigation:'Urgent stroke assessment, MRI brain with diffusion and posterior circulation vascular imaging.',pearl:'An abducens fascicular palsy with opposite limb weakness points to the ventromedial pons. Relative facial sparing separates the classic Raymond pattern from neighbouring VII involvement in Millard–Gubler. Test each eye and conjugate gaze: an isolated lateral rectus deficit is different from a sixth nerve nuclear gaze palsy.'},
  {id:'foville',name:'Dorsomedial caudal pons with motor tract extension',eponym:'Foville syndrome',zone:'pons-dorsal',side:'ipsilateral',prior:5,w:{gaze:3,lmn7:3,contraWeak:3,ino:1,dcml:1,ipsiAtaxia:1,vascular:1,dysarthria:1},ex:[],causes:'Pontine infarction or haemorrhage; less often demyelination or tumour.',investigation:'Urgent brain and posterior circulation imaging; MRI diffusion sequences define dorsal and ventral extension.',pearl:'Ipsilateral horizontal gaze palsy and whole-face weakness identify adjacent pontine structures; opposite hemiparesis indicates extension to the corticospinal tract. A gaze palsy affects both eyes looking towards the lesion. Examine for INO and sensory loss to map how far the lesion extends beyond the classic triad.'},
  {id:'facial-colliculus',name:'Facial colliculus',eponym:'Dorsal pontine VI nucleus–VII fascicle syndrome',zone:'pons-dorsal',side:'ipsilateral',prior:5,w:{gaze:3,lmn7:3,corneal:1,ino:1,vascular:1},ex:['contraWeak'],causes:'Small dorsal pontine infarction, demyelination or tumour.',investigation:'MRI brain with thin dorsal pontine and diffusion sequences; acute vascular assessment for sudden symptoms.',pearl:'The facial colliculus is formed by VII fibres looping around the VI nucleus, not by the facial nucleus itself. Damage produces an ipsilateral conjugate gaze palsy and LMN facial weakness. Limb power may be preserved if the ventral corticospinal tract is spared; additional INO suggests nearby MLF involvement.'},
  {id:'ino',name:'Medial longitudinal fasciculus',eponym:'Internuclear ophthalmoplegia',zone:'pons-dorsal',side:'ipsilateral',prior:8,w:{ino:3,vascular:1},ex:['pupil','ptosis','gaze'],causes:'Brainstem infarction, multiple sclerosis or another focal inflammatory lesion.',investigation:'MRI brain with diffusion and thin pontine and midbrain sequences; assess for demyelinating disease according to age and clinical context.',pearl:'Name the side by the eye that cannot adduct normally: that is the injured MLF side. Look for slowed adducting saccades and abducting nystagmus in the fellow eye. Convergence may be preserved but is not an absolute discriminator. INO can arise in the pons or midbrain; the map uses the common pontine region.'},
  {id:'one-and-half',name:'Pontine gaze centre and adjacent MLF',eponym:'One-and-a-half syndrome',zone:'pons-dorsal',side:'ipsilateral',prior:6,w:{gaze:3,ino:3,lmn7:1,vascular:1},ex:['pupil'],causes:'Pontine infarction, demyelination, haemorrhage or focal mass.',investigation:'MRI brain with diffusion and thin dorsal pontine sections; acute posterior circulation stroke assessment when appropriate.',pearl:'A gaze palsy towards the lesion plus ipsilateral INO leaves only the opposite eye’s abduction available in horizontal gaze. The lesion involves the PPRF or VI nucleus and the adjacent MLF. Add an ipsilateral LMN VII palsy and the pattern is often called eight-and-a-half syndrome.'},
  {id:'aica',name:'Lateral caudal pons',eponym:'AICA territory syndrome',zone:'pons-lateral',side:'ipsilateral',prior:7,w:{lmn7:3,hearing:3,vertigo:1,ipsiAtaxia:2,spinothalamic:2,dissociatedFace:2,horner:1,corneal:1,tinnitus:1,vascular:1,gaitAtaxia:1},ex:[],causes:'Anterior inferior cerebellar artery or basilar artery ischaemia; less often haemorrhage.',investigation:'Emergency stroke pathway, posterior circulation CTA/MRA and MRI diffusion imaging; assess hearing as well as vestibular and facial signs.',pearl:'New hearing loss with an acute vestibular syndrome is a valuable vascular clue because AICA commonly supplies the inner ear. Add whole-face weakness, limb ataxia and crossed sensory findings to localise the lateral caudal pons. A peripheral-appearing vestibular deficit does not exclude an AICA stroke.'},
  {id:'lateral-midpons',name:'Lateral mid-pons',eponym:'Trigeminal–cerebellar pontine syndrome',zone:'pons-lateral',side:'ipsilateral',prior:4,w:{v1:2,v2:2,v3:2,vmotor:3,corneal:2,ipsiAtaxia:3,spinothalamic:2,dissociatedFace:1,horner:1,vertigo:1,vascular:1},ex:['iii','xii'],causes:'Lateral pontine infarction, demyelination or intrinsic tumour.',investigation:'MRI brain with diffusion and thin pontine sections; posterior circulation vascular imaging if acute.',pearl:'Trigeminal sensory and motor findings with ipsilateral cerebellar dysfunction suggest the lateral mid-pons, where V enters beside cerebellar connections. Opposite body pain and temperature loss strengthens a brainstem localisation. Distinguish sensory loss across all modalities from a selective pain–temperature deficit to refine which trigeminal structures are involved.'},
  {id:'cpa',name:'Cerebellopontine angle',eponym:'CPA syndrome',zone:'cpa',side:'ipsilateral',prior:7,w:{hearing:3,tinnitus:2,lmn7:2,corneal:2,v1:2,v2:1,v3:1,ipsiAtaxia:2,gaitAtaxia:1,vertigo:1,vi:1},ex:['iii'],causes:'Vestibular schwannoma, meningioma, epidermoid or another CPA mass.',investigation:'Audiometry and contrast MRI brain with dedicated internal auditory canal and CPA sequences; diffusion imaging helps identify an epidermoid.',pearl:'Progressive unilateral hearing symptoms followed by V or VII findings suggest a growing CPA lesion. Corneal sensation and limb coordination help identify spread beyond the internal auditory canal. Hearing loss alone is not specific for a mass, and substantial facial weakness may indicate a different lesion or more extensive disease.'},
  {id:'iam',name:'Internal auditory meatus',eponym:'VII–VIII canal syndrome',zone:'cpa',side:'ipsilateral',prior:7,w:{hearing:3,tinnitus:2,lmn7:2,vertigo:1,taste:1,tearing:1,hyperacusis:1},ex:['v1','v2','v3','ipsiAtaxia','contraWeak'],causes:'Intracanalicular vestibular schwannoma, facial nerve schwannoma, inflammation or temporal bone trauma.',investigation:'Audiometry, facial nerve assessment and MRI with dedicated internal auditory canal sequences; CT temporal bone for trauma or bony disease.',pearl:'VII and VIII travel together through the internal auditory canal. A confined lesion can combine hearing or vestibular symptoms with facial dysfunction while sparing trigeminal sensation and limb coordination. Those additional findings suggest extension into the CPA or another site, though not every canal lesion affects both nerves.'}
];

const SITES_B = [
  {
    id: "bells", name: "Peripheral facial nerve", eponym: "Bell’s palsy pattern", zone: "petrous", side: "ipsilateral", prior: 10,
    w: {lmn7: 3, taste: 1, hyperacusis: 1, tearing: 1, corneal: 1}, ex: ["vesicles", "parotid", "contraWeak", "gaze"],
    causes: "Idiopathic inflammatory facial neuropathy; Bell’s palsy remains a clinical diagnosis after excluding identifiable causes.",
    investigation: "Examine the ear, cornea and other cranial nerves. Routine imaging is unnecessary in a typical new presentation; obtain contrast MRI for progressive, recurrent or otherwise atypical palsy.",
    pearl: "A peripheral pattern weakens the forehead, eye closure and lower face together. Taste change and hyperacusis can accompany Bell’s palsy, but a parotid mass, vesicles, other cranial neuropathies or long tract signs demand another explanation. Assess eye closure and corneal exposure at the bedside."
  },
  {
    id: "proximal-facial", name: "Facial nerve above the geniculate", eponym: "Proximal intratemporal VII", zone: "petrous", side: "ipsilateral", prior: 5,
    w: {lmn7: 3, tearing: 3, hyperacusis: 2, taste: 2, corneal: 1}, ex: ["parotid", "contraWeak", "gaze"],
    causes: "Labyrinthine-segment inflammation, temporal bone trauma, facial nerve schwannoma or geniculate-region disease.",
    investigation: "Contrast MRI along the facial nerve; high-resolution temporal bone CT when trauma or bony disease is suspected. Assess hearing and corneal protection.",
    pearl: "Reduced lacrimation with facial weakness, taste loss and hyperacusis suggests damage before the greater petrosal branch leaves near the geniculate ganglion. Tear testing is imperfect: poor blinking may cause reflex watering despite impaired secretion. Use this branch pattern as a guide, then correlate with imaging."
  },
  {
    id: "ramsay-hunt", name: "Geniculate region with zoster", eponym: "Ramsay Hunt syndrome", zone: "petrous", side: "ipsilateral", prior: 7,
    w: {lmn7: 3, vesicles: 3, hearing: 2, taste: 1, hyperacusis: 1, tearing: 1, vertigo: 1, tinnitus: 1, corneal: 1}, ex: ["contraWeak", "gaze"],
    causes: "Varicella-zoster reactivation affecting VII, sometimes with adjacent VIII or other cranial nerves.",
    investigation: "Prompt clinical/ENT assessment, inspection of the canal and palate, corneal assessment and audiometry if hearing is affected; MRI if the presentation is atypical.",
    pearl: "Look inside the ear canal and mouth for vesicles when facial palsy is painful. Hearing loss or vertigo supports associated VIII involvement. The eruption may follow weakness, and zoster sine herpete has no visible rash, so an initially normal skin examination does not exclude this diagnosis."
  },
  {
    id: "tympanic-facial", name: "Tympanic facial canal", eponym: "VII before the stapedius branch", zone: "petrous", side: "ipsilateral", prior: 5,
    w: {lmn7: 3, hyperacusis: 3, taste: 2, otitis: 1, corneal: 1}, ex: ["tearing", "parotid", "contraWeak"],
    causes: "Middle-ear infection, cholesteatoma, temporal bone trauma or operative injury.",
    investigation: "Otoscopy and audiometry; high-resolution temporal bone CT, with contrast MRI for suspected nerve or soft-tissue pathology.",
    pearl: "The tympanic segment is downstream of the greater petrosal branch but upstream of stapedius and chorda tympani. Thus facial weakness, hyperacusis and taste loss with preserved lacrimation support this level. Similar findings can arise in the upper mastoid segment; examination alone cannot resolve every millimetre of the canal."
  },
  {
    id: "mastoid-facial", name: "Mastoid facial canal", eponym: "Below stapedius, above chorda tympani", zone: "petrous", side: "ipsilateral", prior: 5,
    w: {lmn7: 3, taste: 3, otitis: 1, corneal: 1}, ex: ["hyperacusis", "tearing", "parotid", "contraWeak"],
    causes: "Mastoid or middle-ear disease, temporal bone fracture, facial nerve tumour or surgical injury.",
    investigation: "ENT examination, audiometry and high-resolution temporal bone CT; add contrast MRI if tumour or inflammatory neuropathy is suspected.",
    pearl: "This pattern refers specifically to the segment between the stapedius and chorda tympani branches: facial movement and anterior tongue taste are affected, with stapedius function and tearing preserved. A still more distal mastoid lesion may spare taste too, so the whole mastoid segment does not have one invariant pattern."
  },
  {
    id: "stylomastoid", name: "Stylomastoid foramen or parotid", eponym: "Extracranial VII", zone: "extracranial", side: "ipsilateral", prior: 6,
    w: {lmn7: 3, parotid: 3, corneal: 1}, ex: ["taste", "hyperacusis", "tearing", "contraWeak"],
    causes: "Parotid malignancy, surgery, trauma or an extracranial facial nerve lesion.",
    investigation: "Inspect and palpate the parotid and skin; contrast MRI/ultrasound of the parotid with ENT assessment and tissue sampling when indicated.",
    pearl: "After the stylomastoid foramen, VII carries motor fibres to facial expression; the taste, stapedius and lacrimal branches have already left. A distal lesion can affect selected facial branches. Facial weakness accompanying a parotid mass is a malignancy warning sign and warrants prompt specialist assessment."
  },
  {
    id: "supranuclear-vii", name: "Corticobulbar pathway to VII", eponym: "Supranuclear facial weakness", zone: "hemisphere", side: "contralateral", prior: 8,
    w: {umn7: 3, ipsiWeak: 2, homonymous: 1, dysarthria: 1, vascular: 1}, ex: ["lmn7", "hyperacusis", "taste"],
    causes: "Hemispheric or capsular infarction, haemorrhage, tumour or demyelination.",
    investigation: "Urgent stroke assessment and brain/vascular imaging for sudden onset; MRI for other presentations.",
    pearl: "A supranuclear lesion typically weakens the opposite lower face, with relative forehead and eye-closure sparing from bilateral cortical input. Limb weakness is on the same side as the weak face. Forehead sparing is a useful pattern, not an absolute test; combine it with the rest of the examination."
  },
  {
    id: "pseudobulbar", name: "Bilateral corticobulbar pathways", eponym: "Pseudobulbar palsy", zone: "hemisphere", side: "bilateral", prior: 6,
    w: {jawJerk: 3, lability: 3, dysphagia: 2, dysarthria: 2, umn7: 1, palate: 1}, ex: ["xii"],
    causes: "Bilateral strokes, motor neuron disease, demyelination or other bilateral corticobulbar injury.",
    investigation: "Brain MRI, swallowing assessment and evaluation for upper/lower motor neuron involvement; EMG if motor neuron disease is suspected.",
    pearl: "A brisk jaw jerk, slow spastic tongue and strained speech support bilateral corticobulbar injury. Involuntary laughing or crying can accompany the syndrome but is not obligatory. Tongue atrophy and fasciculations favour additional lower motor neuron disease; mixed bulbar and pseudobulbar signs may coexist in ALS."
  },
  {
    id: "bulbar", name: "Bulbar lower motor neurons or nerves", eponym: "Bulbar palsy pattern", zone: "diffuse", side: "none", prior: 5,
    w: {xii: 3, palate: 2, dysphagia: 3, hoarseness: 2, dysarthria: 2, xi: 1}, ex: ["jawJerk", "lability"],
    causes: "Motor neuron disease, lower cranial polyneuropathy or structural medullary/skull-base disease.",
    investigation: "Assess swallowing and respiratory function promptly; MRI brain/skull base and EMG guided by the pattern and time course.",
    pearl: "Flaccid dysarthria, palatal weakness and a wasted or fasciculating tongue indicate lower motor neuron involvement. Bulbar palsy describes a pattern rather than one small anatomical site. Examine limbs and reflexes for a wider motor neuron disorder, and prioritise airway protection and swallowing safety when symptoms are significant."
  },
  {
    id: "wallenberg", name: "Lateral medulla", eponym: "Wallenberg syndrome", zone: "medulla-lateral", side: "ipsilateral", prior: 9,
    w: {palate: 2, dysphagia: 3, hoarseness: 3, dissociatedFace: 3, spinothalamic: 3, horner: 2, ipsiAtaxia: 2, vertigo: 1, gaitAtaxia: 1, hiccups: 1, dysarthria: 1, vascular: 1}, ex: ["dcml", "xii"],
    causes: "Vertebral or PICA territory infarction, including vertebral dissection; less often demyelination or tumour.",
    investigation: "Urgent stroke pathway with MRI diffusion and head/neck vascular imaging; assess swallowing before oral intake.",
    pearl: "Crossed pain/temperature loss, bulbar weakness, ipsilateral Horner and ataxia form the lateral medullary pattern. The face loses pain/temperature on the lesion side while the body loses them opposite. Marked limb weakness is atypical of a pure lateral lesion but can occur with extension into corticospinal fibres."
  },
  {
    id: "dejerine", name: "Medial medulla", eponym: "Dejerine syndrome", zone: "medulla-medial", side: "ipsilateral", prior: 8,
    w: {xii: 3, contraWeak: 3, dcml: 3, dysarthria: 1, vascular: 1}, ex: ["dissociatedFace", "spinothalamic", "horner"],
    causes: "Paramedian vertebral/anterior spinal artery territory infarction; less often demyelination or a mass.",
    investigation: "Urgent brain MRI with diffusion and head/neck vascular imaging; acute stroke assessment.",
    pearl: "The classic triad combines ipsilateral XII weakness with opposite limb weakness and loss of vibration/joint position sense. It links hypoglossal fibres, the pyramid and medial lemniscus. The protruded tongue points toward the lesion; absence of the complete triad does not rule out a small medial medullary infarct."
  },
  {
    id: "avellis", name: "Lateral medulla, ambiguus and spinothalamic", eponym: "Avellis syndrome", zone: "medulla-lateral", side: "ipsilateral", prior: 3,
    w: {palate: 3, hoarseness: 3, dysphagia: 2, spinothalamic: 3, dysarthria: 1, vascular: 1}, ex: ["xii", "dcml"],
    causes: "Focal medullary infarction; occasionally tumour, inflammation or demyelination.",
    investigation: "Urgent diffusion MRI and vascular imaging for acute onset; laryngoscopy and swallowing assessment where indicated.",
    pearl: "Palatal or vocal-fold weakness on one side with pain/temperature loss in the opposite body links nucleus ambiguus output to the spinothalamic tract. This is a restricted lateral medullary pattern. Additional facial sensory loss, Horner or ipsilateral ataxia makes the broader Wallenberg description more useful."
  },
  {
    id: "jackson", name: "Ventral medial medulla", eponym: "Jackson syndrome, motor variant", zone: "medulla-medial", side: "ipsilateral", prior: 3,
    w: {xii: 3, contraWeak: 3, dysarthria: 1, vascular: 1}, ex: ["dissociatedFace", "spinothalamic"],
    causes: "Paramedian medullary infarction affecting XII fascicles and the pyramid.",
    investigation: "Urgent stroke assessment, diffusion MRI and head/neck vascular imaging.",
    pearl: "Here Jackson denotes XII palsy with opposite limb weakness, without requiring medial lemniscal loss. Historical use of this eponym varies, including other lower cranial nerve combinations. Describe the actual nerve and tract deficits in handover; added vibration or position loss gives the fuller Dejerine pattern."
  },
  {
    id: "vernet", name: "Jugular foramen", eponym: "Vernet syndrome", zone: "skull-base", side: "ipsilateral", prior: 6,
    w: {palate: 3, dysphagia: 2, hoarseness: 3, xi: 3, dysarthria: 1}, ex: ["xii", "horner", "contraWeak"],
    causes: "Paraganglioma, schwannoma, metastasis, skull-base fracture or jugular-region infection/thrombosis.",
    investigation: "Contrast MRI of skull base and upper neck; CT for bone disease, laryngoscopy and swallowing assessment.",
    pearl: "IX, X and XI travel through the jugular foramen, linking palatal/laryngeal dysfunction with SCM and trapezius weakness. XII exits through a separate nearby canal. Tongue wasting or deviation therefore suggests extension beyond the jugular foramen rather than a strictly confined Vernet pattern."
  },
  {
    id: "collet-sicard", name: "Jugular foramen and hypoglossal canal", eponym: "Collet–Sicard syndrome", zone: "skull-base", side: "ipsilateral", prior: 5,
    w: {palate: 3, dysphagia: 2, hoarseness: 3, xi: 3, xii: 3, dysarthria: 1}, ex: ["horner", "contraWeak"],
    causes: "Skull-base tumour/metastasis, fracture, infection or upper cervical vascular pathology.",
    investigation: "Contrast MRI skull base and upper neck; CT bone windows and vascular imaging according to suspected cause.",
    pearl: "Adding XII palsy to a IX–XI pattern implicates the neighbouring hypoglossal canal or adjacent extracranial lower nerves. A focal side is more informative than the eponym alone. Associated Horner syndrome suggests sympathetic involvement and shifts the description toward Villaret, often in the upper carotid or retroparotid space."
  },
  {
    id: "villaret", name: "Retroparotid and upper carotid space", eponym: "Villaret syndrome", zone: "extracranial", side: "ipsilateral", prior: 5,
    w: {palate: 3, dysphagia: 2, hoarseness: 3, xi: 3, xii: 3, horner: 3, dysarthria: 1}, ex: ["contraWeak", "dcml"],
    causes: "Skull-base/upper neck tumour, carotid dissection, trauma or deep neck infection.",
    investigation: "Contrast MRI skull base and upper neck; urgent CTA/MRA for acute painful onset or suspected carotid dissection.",
    pearl: "Lower cranial palsies IX–XII plus ipsilateral Horner link the nerves to the adjacent sympathetic pathway in the retroparotid or upper carotid space. Map palate, voice, shoulder and tongue separately. Acute neck pain is an important clue to dissection; slow progression raises concern for an infiltrating mass."
  },
  {
    id: "tapia", name: "Extracranial X and XII", eponym: "Tapia syndrome", zone: "extracranial", side: "ipsilateral", prior: 4,
    w: {hoarseness: 3, xii: 3, dysphagia: 2, dysarthria: 1}, ex: ["xi", "palate", "contraWeak"],
    causes: "Compression or stretch around intubation/neck positioning, trauma or a local upper neck lesion.",
    investigation: "Laryngoscopy to document vocal-fold palsy; MRI brain/skull base/neck if the cause is uncertain, with swallowing assessment.",
    pearl: "The usual peripheral Tapia pattern pairs ipsilateral tongue weakness with vocal-fold paralysis, often after airway instrumentation or prolonged positioning. Palatal movement is usually preserved because the pharyngeal vagal branches are spared. New postoperative dysphonia plus tongue deviation should prompt examination of both nerves and assessment for aspiration."
  },
  {
    id: "isolated-xii", name: "Hypoglossal canal or extracranial XII", eponym: "Isolated hypoglossal neuropathy", zone: "skull-base", side: "ipsilateral", prior: 5,
    w: {xii: 3, dysarthria: 1, dysphagia: 1}, ex: ["contraWeak", "dcml", "palate", "xi"],
    causes: "Skull-base malignancy, trauma, surgery, carotid dissection or inflammatory neuropathy.",
    investigation: "Contrast MRI following XII from medulla to upper neck; CT of the hypoglossal canal and CTA/MRA if indicated.",
    pearl: "An LMN XII lesion produces ipsilateral tongue wasting and weakness; protrusion deviates toward the weak side. Search for adjacent lower cranial palsies and opposite limb signs before calling it isolated. Persistent unexplained XII palsy requires investigation of the full nerve course, especially the skull base."
  },
  {
    id: "recurrent-laryngeal", name: "Recurrent laryngeal nerve", eponym: "Distal vagal branch", zone: "extracranial", side: "ipsilateral", prior: 6,
    w: {hoarseness: 3, dysphagia: 1}, ex: ["palate", "xi", "xii", "contraWeak"],
    causes: "Thyroid/neck or thoracic surgery, malignancy, aortic pathology, trauma or idiopathic neuropathy.",
    investigation: "Laryngoscopy first; image the vagal/recurrent laryngeal course through the neck and relevant thorax if unexplained. Stridor requires urgent airway assessment.",
    pearl: "Hoarseness alone does not establish a nerve lesion: confirm vocal-fold immobility. A recurrent laryngeal lesion should spare palatal elevation. The left nerve loops under the aortic arch and the right under the subclavian artery, so an unexplained left vocal-fold palsy may originate within the chest."
  },
  {
    id: "trigeminal-ganglion", name: "Trigeminal ganglion and Meckel’s cave", eponym: "Multidivisional V neuropathy", zone: "skull-base", side: "ipsilateral", prior: 6,
    w: {v1: 2, v2: 2, v3: 2, chin: 1, corneal: 2, vmotor: 1}, ex: ["dissociatedFace", "contraWeak"],
    causes: "Schwannoma, meningioma, perineural tumour spread, inflammation or infection.",
    investigation: "Contrast MRI of trigeminal roots, Meckel’s cave and skull base; investigate malignancy/inflammation according to history.",
    pearl: "Sensory loss involving several V divisions suggests a proximal site, particularly when V3 joins V1 and V2. The motor root bypasses the sensory ganglion, so chewing weakness implies adjacent root or V3 involvement. Map pinprick and touch separately; dissociated loss points more strongly toward brainstem trigeminal pathways."
  },
  {
    id: "foramen-ovale", name: "Foramen ovale and proximal V3", eponym: "Mandibular neuropathy", zone: "skull-base", side: "ipsilateral", prior: 5,
    w: {v3: 3, chin: 1, vmotor: 3}, ex: ["v1", "v2", "corneal", "dissociatedFace"],
    causes: "Skull-base lesion, perineural tumour spread, trauma or iatrogenic injury.",
    investigation: "Contrast MRI of V3 and the skull base, with CT for bony disease and examination of oral/dental structures.",
    pearl: "V3 carries both mandibular sensation and the muscles of mastication through the foramen ovale. Combined numbness and chewing weakness therefore support a proximal V3 lesion. On opening, the jaw deviates toward the weak pterygoid. V1, V2 or corneal sensory loss argues for a more extensive process."
  },
  {
    id: "numb-chin", name: "Mental or inferior alveolar nerve", eponym: "Numb chin syndrome", zone: "extracranial", side: "ipsilateral", prior: 3,
    w: {chin: 3, v3: 1}, ex: ["v1", "v2", "vmotor", "corneal"],
    causes: "Dental injury/infection, mandibular disease, medication-related osteonecrosis or malignant infiltration.",
    investigation: "Dental and mandibular assessment; if unexplained or progressive, targeted mandibular/skull-base imaging and evaluation for malignancy.",
    pearl: "Map the sensory change carefully: a mental neuropathy affects the chin and lower lip, while broader V3 loss suggests a more proximal site. New unexplained numb chin can signal mandibular metastasis, haematological malignancy or proximal infiltration. Persistent symptoms without a dental explanation warrant investigation, even in someone without known cancer."
  },
  {
    id: "isolated-v2", name: "Foramen rotundum or distal V2", eponym: "Isolated maxillary neuropathy", zone: "skull-base", side: "ipsilateral", prior: 5,
    w: {v2: 3}, ex: ["v1", "v3", "vmotor", "corneal"],
    causes: "Maxillary/sinonasal disease, infraorbital trauma, skull-base mass or perineural tumour spread.",
    investigation: "Examine maxillary teeth, palate, sinus and facial skin; contrast MRI along V2 and CT of facial bones/sinuses as indicated.",
    pearl: "V2 is sensory and reaches the pterygopalatine fossa through the foramen rotundum. Isolated cheek, upper lip, upper dental or palatal numbness can arise anywhere along this route. Persistent progressive numbness warrants a search for perineural tumour spread, even when the initial skin or dental examination is unrevealing."
  },
  {
    id: "isolated-horner", name: "Oculosympathetic pathway", eponym: "Isolated Horner syndrome", zone: "extracranial", side: "ipsilateral", prior: 5,
    w: {horner: 3, ptosis: 1, retroOrbital: 1}, ex: ["pupil", "iii"],
    causes: "Carotid dissection, apical chest or neck disease, prior surgery; central lesions remain possible.",
    investigation: "Acute painful Horner needs urgent head/neck CTA or MRA for dissection. Otherwise direct imaging along the sympathetic pathway using the clinical context.",
    pearl: "Miosis and mild ptosis indicate sympathetic dysfunction; anisocoria is greater in the dark. An isolated Horner pattern cannot determine which of the three neurons is affected, despite its peripheral map grouping here. Acute orbital, facial or neck pain should raise immediate concern for internal carotid dissection."
  },
  {
    id: "myasthenia", name: "Neuromuscular junction", eponym: "Myasthenia gravis pattern", zone: "diffuse", side: "none", prior: 8,
    w: {fatigability: 3, ptosis: 2, bilateralPtosis: 2, ophthalmoplegia: 2, dysphagia: 1, dysarthria: 1, hoarseness: 1, bilateral7: 1}, ex: ["pupil", "v1", "v2", "v3", "areflexia", "dcml", "spinothalamic"],
    causes: "Autoimmune postsynaptic neuromuscular transmission failure, commonly AChR- or MuSK-associated.",
    investigation: "AChR/MuSK antibodies and repetitive stimulation or single-fibre EMG; assess respiratory function urgently if bulbar or breathing weakness is present.",
    pearl: "Variable fatigable ptosis or diplopia can imitate almost any ocular motor palsy and may be asymmetric. Pupils and sensation should be preserved, with usually normal tendon reflexes. Seek fluctuation and objective fatigability; swallowing or respiratory symptoms require prompt assessment even when limb strength seems good."
  },
  {
    id: "miller-fisher", name: "Peripheral anti-GQ1b spectrum", eponym: "Miller Fisher syndrome", zone: "diffuse", side: "bilateral", prior: 6,
    w: {ophthalmoplegia: 3, gaitAtaxia: 3, areflexia: 3, bilateralPtosis: 1, bilateral7: 1, dysphagia: 1, dysarthria: 1, pupil: 1, corneal: 1}, ex: ["jawJerk"],
    causes: "Usually postinfectious immune neuropathy within the Guillain–Barré/anti-GQ1b spectrum.",
    investigation: "Urgent neurological assessment, anti-GQ1b antibodies, nerve conduction studies and CSF when appropriate; monitor respiratory and autonomic function.",
    pearl: "Ophthalmoplegia, ataxia and areflexia are the defining triad, often after infection. Unlike myasthenia, reflexes are reduced and ataxia is prominent; pupils may be involved. Negative early CSF or antibody testing does not exclude it. Encephalopathy or hyperreflexia suggests Bickerstaff overlap or another central process."
  },
  {
    id: "wernicke", name: "Diencephalic and brainstem networks", eponym: "Wernicke encephalopathy", zone: "diffuse", side: "bilateral", prior: 5,
    w: {ophthalmoplegia: 3, bilateralVi: 2, gaitAtaxia: 3, consciousness: 3, upgaze: 1, areflexia: 1}, ex: ["fatigability"],
    causes: "Thiamine deficiency from malnutrition, alcohol use disorder, prolonged vomiting, bariatric surgery or other nutritional compromise.",
    investigation: "Urgent clinical assessment of nutrition and metabolic status; MRI may support the diagnosis but a normal scan must not delay treatment under local protocol.",
    pearl: "The triad of eye movement abnormalities, gait ataxia and altered mental state is often incomplete. Ask about poor intake, vomiting and gastrointestinal surgery as well as alcohol. This is a time-sensitive clinical diagnosis: neither a normal MRI nor lack of the full triad reliably excludes it."
  },
  {
    id: "bilateral-lmn-vii", name: "Bilateral facial nerves", eponym: "Bifacial lower motor neuron palsy", zone: "diffuse", side: "bilateral", prior: 5,
    w: {bilateral7: 3, areflexia: 2, taste: 1, tearing: 1, hyperacusis: 1, corneal: 1}, ex: ["umn7"],
    causes: "Guillain–Barré spectrum, Lyme disease, sarcoidosis, HIV, meningeal disease or bilateral structural neuropathy.",
    investigation: "Assess reflexes and respiratory function; targeted infection/inflammation testing, contrast MRI, CSF and nerve conduction studies guided by context.",
    pearl: "Bilateral facial weakness may hide asymmetry, so test eye closure, forehead movement and cheek inflation directly. Consider systemic neuropathy, infection or meningeal disease before assigning bilateral Bell’s palsy. Areflexia supports a Guillain–Barré spectrum disorder; exposure history and other cranial signs help direct further investigation."
  }
];

const NERVES = [
  {
    roman: 'I', name: 'Olfactory',
    nucleus: 'Olfactory bulb and forebrain pathways; no brainstem nucleus.',
    course: 'Olfactory filaments cross the cribriform plate to the bulb, then the olfactory tract.',
    function: 'Smell.',
    test: 'Check each nostril separately with a familiar, non-irritant odour and confirm nasal patency.',
    signs: 'Anosmia or reduced smell. Nasal disease is common; trauma can shear fibres at the cribriform plate.'
  },
  {
    roman: 'II', name: 'Optic',
    nucleus: 'Retinal ganglion cells; central relays include the lateral geniculate nucleus and pretectum.',
    course: 'Optic canal → chiasm, where nasal retinal fibres cross → optic tract.',
    function: 'Vision and the afferent limb of the pupil light reflex.',
    test: 'Acuity, colour vision, fields, swinging-flashlight test and fundus.',
    signs: 'Monocular loss and RAPD suggest asymmetric retinal/optic nerve dysfunction; bitemporal loss suggests chiasm, homonymous loss a retrochiasmal lesion.'
  },
  {
    roman: 'III', name: 'Oculomotor',
    nucleus: 'Midbrain at the superior colliculus: oculomotor complex and Edinger–Westphal nucleus.',
    course: 'Interpeduncular cistern near PComm → cavernous sinus wall → superior orbital fissure.',
    function: 'Most eye movements, lid elevation, pupil constriction and accommodation.',
    test: 'Lids, pupils in light and dark, adduction, elevation and depression.',
    signs: 'Ptosis and a down-and-out eye; the pupil may be dilated. Nuclear lesions can cause bilateral ptosis and contralateral superior rectus weakness.'
  },
  {
    roman: 'IV', name: 'Trochlear',
    nucleus: 'Caudal midbrain at the inferior colliculus; fibres cross before their dorsal exit.',
    course: 'Around the midbrain → cavernous sinus wall → superior orbital fissure.',
    function: 'Superior oblique: intorsion and depression of the adducted eye.',
    test: 'Depression in adduction; assess vertical diplopia and head-tilt pattern.',
    signs: 'Vertical/torsional diplopia, often worse downstairs. Peripheral palsy is ipsilateral; a nuclear lesion affects the opposite eye.'
  },
  {
    roman: 'V', name: 'Trigeminal',
    nucleus: 'Principal sensory and motor nuclei in pons; spinal trigeminal nucleus extends into medulla and upper cervical cord; mesencephalic nucleus carries proprioception.',
    course: 'Meckel’s cave; V1 through superior orbital fissure, V2 through foramen rotundum, V3 through foramen ovale.',
    function: 'Facial sensation, corneal afferent limb and mastication.',
    test: 'Compare V1/V2/V3 light touch and pinprick; corneal reflex, jaw opening and masseter strength.',
    signs: 'Facial sensory loss or weak chewing; jaw deviates toward a weak pterygoid. Dissociated pain/temperature loss suggests the spinal trigeminal pathway.'
  },
  {
    roman: 'VI', name: 'Abducens',
    nucleus: 'Dorsal caudal pons, beneath the facial colliculus.',
    course: 'Pontomedullary junction → clivus/Dorello’s canal → cavernous sinus → superior orbital fissure.',
    function: 'Lateral rectus; its nucleus also coordinates conjugate gaze to that side.',
    test: 'Abduction and horizontal gaze of both eyes.',
    signs: 'Nerve/fascicle lesion: ipsilateral abduction weakness. Nuclear lesion: ipsilateral conjugate gaze palsy. Raised pressure can cause a false-localising VI palsy.'
  },
  {
    roman: 'VII', name: 'Facial',
    nucleus: 'Caudal pontine motor nucleus; superior salivatory nucleus and solitary nucleus connections.',
    course: 'Loops around VI nucleus → CPA/internal auditory meatus → facial canal → stylomastoid foramen → parotid.',
    function: 'Facial movement, corneal efferent limb, taste anterior two-thirds, stapedius, tears and salivation.',
    test: 'Raise brows, close eyes firmly, smile and puff cheeks; ask about taste, sound sensitivity and tearing.',
    signs: 'LMN palsy weakens upper and lower face. Supranuclear weakness usually predominates in the contralateral lower face; forehead sparing is not absolute.'
  },
  {
    roman: 'VIII', name: 'Vestibulocochlear',
    nucleus: 'Cochlear nuclei at the pontomedullary junction; vestibular nuclei in pons and medulla.',
    course: 'Cochlear and vestibular organs → internal auditory meatus with VII → CPA.',
    function: 'Hearing, balance and vestibulo-ocular reflexes.',
    test: 'Hearing comparison, Weber/Rinne when indicated, eye movements, nystagmus and gait.',
    signs: 'Sensorineural hearing loss, tinnitus or vestibular dysfunction. Hearing loss plus VII/V signs suggests CPA or internal auditory meatus.'
  },
  {
    roman: 'IX', name: 'Glossopharyngeal',
    nucleus: 'Medulla: nucleus ambiguus, inferior salivatory, solitary and spinal trigeminal nuclei.',
    course: 'Postolivary medulla → jugular foramen → pharynx; tympanic branch toward the otic ganglion.',
    function: 'Pharyngeal sensation, gag afferent limb, posterior tongue taste, stylopharyngeus and parotid secretion.',
    test: 'Assess pharyngeal sensation and swallowing with X; gag reflex if clinically indicated.',
    signs: 'Reduced pharyngeal sensation or afferent gag; isolated IX palsy is uncommon. An absent gag alone is unreliable.'
  },
  {
    roman: 'X', name: 'Vagus',
    nucleus: 'Medulla: nucleus ambiguus, dorsal motor vagal and solitary nuclei.',
    course: 'Postolivary medulla → jugular foramen → carotid sheath; laryngeal branches continue into the neck/chest.',
    function: 'Palate, pharynx and larynx; visceral sensation and parasympathetic outflow.',
    test: 'Listen to voice and cough, observe palate on “ah”; assess swallowing safely and arrange laryngoscopy for hoarseness.',
    signs: 'Ipsilateral palatal weakness, dysphagia or vocal fold palsy. The uvula may deviate away from a unilateral weak palate.'
  },
  {
    roman: 'XI', name: 'Spinal accessory',
    nucleus: 'Spinal accessory nucleus in upper cervical cord, approximately C1–C5/6.',
    course: 'Rootlets ascend through foramen magnum, exit jugular foramen, then cross the posterior neck triangle.',
    function: 'Sternocleidomastoid and trapezius.',
    test: 'Shoulder shrug and head turn against resistance; right SCM turns the face left.',
    signs: 'Ipsilateral shoulder droop, weak shrug and weak head turn away from the lesion. Consider posterior triangle surgery or trauma.'
  },
  {
    roman: 'XII', name: 'Hypoglossal',
    nucleus: 'Medial medulla beneath the floor of the fourth ventricle.',
    course: 'Between pyramid and olive → hypoglossal canal → tongue.',
    function: 'Tongue movement, except palatoglossus, which is supplied by X.',
    test: 'Inspect at rest for wasting/fasciculations; protrusion, side-to-side movement and pressure against the cheek.',
    signs: 'LMN injury causes ipsilateral wasting and deviation toward the weak side on protrusion. Add contralateral weakness/DCML loss to localise medial medulla.'
  }
];

const RULE_OF_FOUR = [
  { level: 'Above the pons', nerves: 'I–IV in the mnemonic; I–II are forebrain pathways, III–IV arise in midbrain.', medial: 'Midbrain: III/IV motor nuclei near the midline; cerebral peduncle lesions cause opposite weakness.', lateral: 'Tegmental/cerebellar connections can add ataxia or tremor; the lateral “4 S” mnemonic is less reliable here.' },
  { level: 'Pons', nerves: 'V–VIII; VIII nuclei extend across the pontomedullary junction.', medial: 'VI/gaze structures, motor tract, medial lemniscus and MLF: gaze palsy, opposite weakness/DCML loss or INO.', lateral: 'V/VII/VIII with cerebellar pathways: facial sensory/motor signs, hearing/vestibular signs, ataxia and opposite body pain/temperature loss.' },
  { level: 'Medulla', nerves: 'IX–XII in the mnemonic; spinal XI actually originates in upper cervical cord.', medial: 'XII, pyramid and medial lemniscus: ipsilateral tongue weakness with opposite weakness and DCML loss.', lateral: 'IX/X, spinal V, spinothalamic, sympathetic and cerebellar pathways: bulbar signs, crossed pain/temperature loss, Horner and ataxia.' }
];

const RULES = [
  { title: 'Crossed signs point into the brainstem', text: 'An ipsilateral cranial nerve deficit with contralateral limb weakness or sensory loss suggests a brainstem lesion. The nerve helps identify its level; neighbouring long tracts refine the region. Peripheral nerve bundles at the skull base do not usually cause long-tract signs.' },
  { title: 'Use the pupil clue, then image the third nerve', text: 'A dilated pupil with an acute III palsy raises concern for compression, especially a PComm aneurysm. Pupil sparing can occur in compression and does not safely exclude an aneurysm. New acquired III palsy warrants urgent assessment and vascular imaging; do not label it diabetic on the pupil alone.' },
  { title: 'V3 should be spared in the cavernous sinus', text: 'III, IV, VI, V1, V2 and sympathetic fibres meet here. V3 travels outside the sinus through foramen ovale. V3 loss suggests extension toward Meckel’s cave/skull base or another site. Optic neuropathy shifts attention to the orbital apex or a more extensive lesion.' },
  { title: 'VI plus Horner is a compact clue', text: 'An abduction deficit with ipsilateral Horner syndrome strongly suggests the posterior cavernous sinus, where sympathetic fibres briefly accompany VI. Inspect for chemosis and proptosis and image the cavernous sinus and carotid circulation. Other brainstem findings can change this localisation.' },
  { title: 'Follow the branches down the facial canal', text: 'Reduced tearing suggests involvement at or proximal to the greater petrosal branch near the geniculate ganglion. Hyperacusis places the lesion proximal to stapedius; anterior tongue taste loss places it proximal to chorda tympani. A lesion after the stylomastoid foramen is chiefly motor. These clinical branch tests are imperfect.' },
  { title: 'Remember Kernohan’s notch', text: 'A mass with uncal herniation can push the opposite cerebral peduncle against the tentorial edge, producing weakness on the same side as the mass. Ipsilateral III palsy and ipsilateral hemiparesis with impaired consciousness can therefore be a false-localising emergency.' },
  { title: 'A numb chin deserves an explanation', text: 'Chin/lower-lip sensory loss maps to the mental or inferior alveolar nerve, a V3 branch. Dental injury or infection is possible, but persistent unexplained numbness can reveal mandibular, skull-base or leptomeningeal malignancy. Examine the mouth and investigate the whole course when no local cause is clear.' },
  { title: 'A pattern can be diffuse rather than focal', text: 'Variable, fatigable ocular/bulbar weakness with preserved pupils, sensation and reflexes favours myasthenia. Ophthalmoplegia with gait ataxia and areflexia suggests Miller Fisher syndrome. Bilateral or multifocal findings should prompt a diffuse differential instead of forcing every sign into one focal lesion.' }
];

/* Decorative sagittal atlas schematic. Highlights denote a level, never a point lesion. */
function anatomyArt(zoneId = '', idPrefix = 'atlas') {
  const prefix = String(idPrefix).replace(/[^a-zA-Z0-9_-]/g, '') || 'atlas';
  const level = zoneId === 'hemisphere' ? 'hemisphere' : zoneId === 'optic' ? 'optic'
    : String(zoneId).startsWith('midbrain-') ? 'midbrain'
    : String(zoneId).startsWith('pons-') ? 'pons'
    : String(zoneId).startsWith('medulla-') ? 'medulla'
    : ['subarachnoid','cpa','petrous','cavernous','orbit','skull-base','extracranial','diffuse'].includes(zoneId) ? 'peripheral' : '';
  const active = part => level === part;
  const fill = part => active(part) ? 'var(--atlas-highlight, #a89bf5)' : 'currentColor';
  const opacity = part => active(part) ? '.3' : '.035';
  const stroke = part => active(part) ? 'var(--atlas-highlight, #a89bf5)' : 'currentColor';
  const hemisphere = 'M40 91C26 82 22 64 29 46C35 25 57 15 79 13C100 8 128 12 147 21C169 30 182 47 183 64C186 79 177 92 162 99C151 104 138 99 129 91C120 83 114 82 104 87C90 94 80 106 64 104C53 103 49 95 40 91Z';
  const midbrain = 'M119 86C123 88 130 92 138 98L134 113C128 117 118 115 112 109C115 101 116 93 119 86Z';
  const pons = 'M112 108C99 108 94 115 98 125C103 135 117 140 128 135L134 113C127 117 118 115 112 108Z';
  const medulla = 'M111 135C115 146 119 154 126 164L137 159C132 150 130 142 128 135C122 138 116 137 111 135Z';
  return `<svg class="anatomy-art" viewBox="0 0 220 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" fill="none">
    <defs>
      <pattern id="${prefix}-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)"><path d="M0 0V4" stroke="currentColor" stroke-width=".55" opacity=".15"/></pattern>
      <clipPath id="${prefix}-cortex"><path d="${hemisphere}"/></clipPath>
      <clipPath id="${prefix}-cerebellum"><path d="M145 101C160 96 174 102 181 113C190 128 181 144 166 149C157 153 148 150 140 144L134 128Z"/></clipPath>
    </defs>
    <g stroke="currentColor" stroke-width=".65" opacity=".14">
      <path d="M18 29H203M18 158H203M44 8V180M176 8V180" stroke-dasharray="2 5"/>
      <path d="M20 20H29M24.5 15.5V24.5M194 170H203M198.5 165.5V174.5"/>
      <path d="M195 48V146M191 48H199M191 80H199M191 113H199M191 146H199"/>
    </g>
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="${hemisphere}" fill="${fill('hemisphere')}" fill-opacity="${opacity('hemisphere')}" stroke="${stroke('hemisphere')}" stroke-opacity="${active('hemisphere') ? '.95' : '.68'}" stroke-width="1.35"/>
      <path d="${hemisphere}" fill="url(#${prefix}-hatch)"/>
      <g clip-path="url(#${prefix}-cortex)" stroke="currentColor" stroke-width=".9" opacity=".43">
        <path d="M36 77C44 68 38 58 47 51C57 45 55 32 66 29C75 27 78 18 91 19M30 60C37 61 40 55 41 47C42 35 49 33 54 29"/>
        <path d="M43 89C47 80 57 80 57 68C57 58 70 61 72 49C73 39 89 44 90 30C91 25 99 21 109 22"/>
        <path d="M58 98C60 84 74 90 80 79C85 70 79 62 90 56C98 51 96 39 106 38C118 36 119 23 129 24"/>
        <path d="M79 101C79 93 87 91 92 86M35 78C41 77 45 77 49 82M56 38C62 39 66 44 72 43M62 73C66 77 73 77 80 74"/>
        <path d="M112 30C112 32 115 36 121 39C129 44 121 52 130 55C140 59 136 70 145 74C154 78 147 86 158 90"/>
        <path d="M135 29C132 37 139 40 145 44C152 49 146 59 156 61C166 65 161 76 170 78M155 36C151 39 155 42 161 46C169 52 161 54 169 60C177 65 176 72 173 77"/>
        <path d="M111 55C106 59 110 65 116 67C126 70 128 80 141 81M122 47C116 50 115 55 120 58M139 63C141 60 146 58 151 58M148 90C148 86 147 81 142 77"/>
      </g>
      <path d="M63 78C66 63 79 52 96 50C111 48 122 57 129 69C120 64 110 60 99 61C87 62 78 69 75 81" stroke="currentColor" stroke-width="1.4" opacity=".65"/>
      <path d="M74 82C85 73 94 70 105 72C113 73 117 78 121 86M88 73C94 79 101 82 109 82" stroke="currentColor" opacity=".5"/>
      <path d="M94 62C91 63 88 68 91 73C95 78 107 80 112 75C116 70 109 64 104 63Z" fill="currentColor" fill-opacity=".05" stroke="currentColor" stroke-width=".8" opacity=".6"/>
      <path d="M145 101C160 96 174 102 181 113C190 128 181 144 166 149C157 153 148 150 140 144L134 128Z" fill="currentColor" fill-opacity=".045" stroke="currentColor" stroke-width="1.15" opacity=".65"/>
      <g clip-path="url(#${prefix}-cerebellum)" stroke="currentColor" stroke-width=".75" opacity=".4">
        <path d="M139 108C154 102 172 109 181 118M138 112C154 106 173 114 184 122M137 116C153 111 172 119 186 127M136 120C152 115 171 125 185 131M136 125C151 120 166 130 182 136M138 130C151 125 164 136 178 140M140 135C151 131 160 141 171 145M144 140C152 138 160 145 165 150"/>
        <path d="M140 127C148 124 155 118 158 108M149 124C158 125 166 122 173 118M150 127C158 134 160 140 160 149" stroke-width="1.2"/>
      </g>
      <path d="${midbrain}" fill="${fill('midbrain')}" fill-opacity="${opacity('midbrain')}" stroke="${stroke('midbrain')}" stroke-width="${active('midbrain') ? '1.6' : '1'}" stroke-opacity="${active('midbrain') ? '.95' : '.65'}"/>
      <path d="${pons}" fill="${fill('pons')}" fill-opacity="${opacity('pons')}" stroke="${stroke('pons')}" stroke-width="${active('pons') ? '1.6' : '1'}" stroke-opacity="${active('pons') ? '.95' : '.65'}"/>
      <path d="${medulla}" fill="${fill('medulla')}" fill-opacity="${opacity('medulla')}" stroke="${stroke('medulla')}" stroke-width="${active('medulla') ? '1.6' : '1'}" stroke-opacity="${active('medulla') ? '.95' : '.65'}"/>
      <path d="M126 164C130 170 132 177 133 182M137 159C140 167 142 174 143 182" stroke="currentColor" stroke-width="1.2" opacity=".55"/>
      <g stroke="currentColor" stroke-width=".65" opacity=".32">
        <path d="M119 95L132 102M118 99L131 106M117 103L130 110M100 116C110 120 120 122 131 120M100 120C111 125 122 127 130 124M104 126C114 130 121 131 128 129M116 141L129 142M118 146L131 147M121 152L133 152M125 158L135 157"/>
        <path d="M127 93C126 111 119 123 123 136C125 146 131 157 135 171"/>
      </g>
      <g stroke="${stroke('peripheral')}" stroke-width="${active('peripheral') ? '1.25' : '.85'}" opacity="${active('peripheral') ? '.8' : '.45'}">
        <path d="M115 102C101 106 92 110 78 108C65 107 56 112 44 112M103 115C87 116 84 125 66 125L37 126M105 122C88 127 93 141 74 142L48 143M113 136C103 139 103 151 89 155L67 162M122 151C114 155 113 167 99 174"/>
        <path d="M67 125L53 119M75 142L64 150M89 155L79 149M102 172L92 164M79 108L67 101" stroke-width=".7"/>
      </g>
      <g fill="${stroke('peripheral')}" opacity="${active('peripheral') ? '.85' : '.4'}">
        <circle cx="44" cy="112" r="1.7"/><circle cx="37" cy="126" r="1.7"/><circle cx="48" cy="143" r="1.7"/><circle cx="67" cy="162" r="1.7"/><circle cx="99" cy="174" r="1.7"/>
      </g>
      <g stroke="${stroke('optic')}" stroke-width="${active('optic') ? '1.75' : '1.1'}" opacity="${active('optic') ? '.95' : '.55'}">
        <path d="M98 83C90 89 85 94 76 94C63 94 61 91 52 94L37 100M92 86C88 96 78 97 71 100C61 104 51 103 42 105"/>
        <ellipse cx="32" cy="101" rx="6" ry="4.7" transform="rotate(-15 32 101)"/>
      </g>
    </g>
  </svg>`;
}

const GROUPS = [
  {id:'vision',name:'Vision',nerve:'II',hint:'Optic nerve, fields, visual pathways'},
  {id:'eyes',name:'Eye movements & pupils',nerve:'III, IV, VI',hint:'Oculomotor trochlear abducens'},
  {id:'face',name:'Facial sensation & movement',nerve:'V, VII',hint:'Trigeminal facial'},
  {id:'hearing',name:'Hearing & balance',nerve:'VIII',hint:'Vestibulocochlear auditory'},
  {id:'bulbar',name:'Bulbar function',nerve:'IX–XII',hint:'Glossopharyngeal vagus accessory hypoglossal'},
  {id:'tracts',name:'Long tracts & coordination',nerve:'↕',hint:'Motor sensory cerebellar reflexes'},
  {id:'context',name:'Clinical context',nerve:'＋',hint:'Consciousness pressure headache risk'}
];
const FINDINGS = [
  ['monocular','vision','Monocular visual loss on the {s}','Loss of vision in one eye'],
  ['rapd','vision','RAPD on the {s}','Relative afferent pupillary defect'],
  ['junctional','vision','Superotemporal field loss in the {o} eye','Junctional scotoma: fellow-eye defect accompanying selected-side optic neuropathy'],
  ['bitemporal','vision','Bitemporal field loss','Temporal visual hemifield loss in both eyes'],
  ['homonymous','vision','{S} homonymous field loss','Same side of the visual field lost in both eyes'],
  ['ptosis','eyes','Ptosis on the {s}','Drooping upper eyelid'],
  ['iii','eyes','III ophthalmoplegia on the {s}','Oculomotor-pattern weakness: adduction, elevation and depression'],
  ['pupil','eyes','Dilated pupil on the {s}','Mydriasis with impaired light response'],
  ['bilateralPtosis','eyes','Bilateral ptosis','Drooping of both upper eyelids'],
  ['iv','eyes','IV-pattern diplopia on the {s}','Trochlear-pattern vertical or torsional diplopia, worse down and in'],
  ['vi','eyes','Abduction deficit on the {s}','Abducens VI: impaired outward movement of the selected eye'],
  ['bilateralVi','eyes','Bilateral VI palsy','Abduction deficit of both eyes'],
  ['ophthalmoplegia','eyes','Bilateral ophthalmoplegia','Weak eye movements on both sides'],
  ['gaze','eyes','Conjugate gaze palsy to the {s}','Both eyes cannot look towards the selected side'],
  ['ino','eyes','INO on the {s}','Internuclear ophthalmoplegia: impaired adduction of the selected eye'],
  ['upgaze','eyes','Upgaze palsy','Impaired conjugate upward gaze'],
  ['lightNear','eyes','Light–near dissociation','Pupils constrict better for near than to light'],
  ['convergenceRetraction','eyes','Convergence–retraction nystagmus','Convergence and globe retraction on attempted upgaze'],
  ['lidRetraction','eyes','Lid retraction','Abnormally elevated upper lid'],
  ['proptosis','eyes','Proptosis','Forward displacement of the globe'],
  ['painfulEye','eyes','Painful ophthalmoplegia','Eye movement weakness accompanied by pain'],
  ['fatigability','eyes','Fatigability','Weakness worsens with sustained activity and improves with rest'],
  ['horner','eyes','Horner syndrome on the {s}','Miosis, mild ptosis, with or without anhidrosis'],
  ['v1','face','V1 numbness on the {s}','Ophthalmic division: forehead and cornea'],
  ['v2','face','V2 numbness on the {s}','Maxillary division: cheek and upper lip'],
  ['v3','face','V3 numbness on the {s}','Broad mandibular division sensory loss'],
  ['chin','face','Numb chin / lower lip on the {s}','Sensory loss restricted to the mental or inferior alveolar nerve territory'],
  ['corneal','face','Reduced corneal reflex on the {s}','V1 afferent or VII efferent dysfunction; assess both limbs'],
  ['vmotor','face','V motor weakness on the {s}','Weak mastication or jaw deviation toward the weak side'],
  ['dissociatedFace','face','Facial pain/temperature loss on the {s}; touch spared','Dissociated trigeminal sensory loss'],
  ['retroOrbital','face','Retro-orbital pain on the {s}','Deep pain behind the eye'],
  ['lmn7','face','LMN VII weakness on the {s}','Lower motor neuron facial weakness involving upper and lower face'],
  ['umn7','face','UMN VII weakness on the {s}','Predominantly lower-face weakness; relative forehead sparing'],
  ['bilateral7','face','Bilateral VII weakness','Bilateral lower motor neuron facial weakness'],
  ['hyperacusis','face','Hyperacusis on the {s}','Increased sound sensitivity from stapedius weakness'],
  ['taste','face','Anterior two-thirds taste loss','Taste loss on the {s} side of the tongue'],
  ['tearing','face','Reduced tearing on the {s}','Reduced lacrimation'],
  ['vesicles','face','Ear vesicles on the {s}','Vesicular eruption on pinna or in ear canal'],
  ['parotid','face','Parotid mass on the {s}','Mass near the extracranial facial nerve'],
  ['hearing','hearing','Hearing loss on the {s}','Sensorineural hearing loss for VIII localisation; confirm hearing type'],
  ['tinnitus','hearing','Tinnitus on the {s}','Sound perception without an external source'],
  ['vertigo','hearing','Vertigo','Illusory motion or spinning',true],
  ['otitis','hearing','Otitis on the {s}','Middle ear infection or discharge'],
  ['palate','bulbar','Palatal weakness on the {s}','Weak elevation; uvula may deviate away from the weak side'],
  ['dysphagia','bulbar','Dysphagia','Difficulty swallowing'],
  ['hoarseness','bulbar','Hoarseness','Dysphonia or suspected vocal fold weakness'],
  ['dysarthria','bulbar','Dysarthria','Impaired articulation',true],
  ['xi','bulbar','SCM / trapezius weakness on the {s}','Spinal accessory XI: shoulder shrug and head turn'],
  ['xii','bulbar','Tongue deviates to the {s} (LMN XII)','Wasting or fasciculations support a lower motor neuron pattern'],
  ['jawJerk','bulbar','Brisk jaw jerk','Exaggerated jaw reflex; interpret with other bilateral corticobulbar signs'],
  ['lability','bulbar','Emotional lability','Involuntary or disproportionate laughing or crying'],
  ['hiccups','bulbar','Persistent hiccups','Nonspecific; may accompany a medullary lesion',true],
  ['contraWeak','tracts','Hemiparesis on the {o}','Limb weakness opposite to the cranial nerve signs'],
  ['ipsiWeak','tracts','Hemiparesis on the {s}','Limb weakness on the same side as cranial nerve signs'],
  ['dcml','tracts','DCML loss on the {o}','Loss of vibration and joint position sense opposite cranial signs'],
  ['spinothalamic','tracts','Body pain/temperature loss on the {o}','Spinothalamic sensory loss opposite cranial signs'],
  ['ipsiAtaxia','tracts','Limb ataxia on the {s}','Ipsilateral limb dysmetria independent of weakness'],
  ['contraAtaxia','tracts','Ataxia / tremor on the {o}','Contralateral limb dysmetria or tremor'],
  ['gaitAtaxia','tracts','Gait ataxia','Unsteady stance or gait'],
  ['areflexia','tracts','Areflexia','Reduced or absent tendon reflexes'],
  ['consciousness','context','Reduced consciousness','Drowsiness, stupor or coma'],
  ['papilloedema','context','Headache with papilloedema','Optic disc swelling from raised intracranial pressure'],
  ['thunderclap','context','Sudden severe headache','Thunderclap headache',true],
  ['vascular','context','Vascular risk factors','Diabetes, hypertension, smoking or other vascular risk',true]
].map(([id,group,label,hint,soft=false])=>({id,group,label,hint,soft}));
const PRESETS = [
  {id:'wallenberg',name:'Wallenberg',present:['horner','dissociatedFace','spinothalamic','ipsiAtaxia','palate','dysphagia','hoarseness','vertigo','hiccups'],absent:['contraWeak','xii','lmn7','hearing']},
  {id:'weber',name:'Weber',present:['iii','ptosis','contraWeak','vascular'],absent:['contraAtaxia','lmn7','xii']},
  {id:'pcomm',name:'PComm aneurysm',present:['iii','ptosis','pupil','painfulEye','retroOrbital','thunderclap'],absent:['fatigability','contraWeak']},
  {id:'diabetic',name:'Pupil-sparing diabetic III',present:['iii','ptosis','vascular'],absent:['pupil','v1','v2','vi','contraWeak','fatigability']},
  {id:'cavernous',name:'Cavernous sinus',present:['iii','iv','vi','v1','v2','horner','ptosis','painfulEye'],absent:['v3','vmotor','monocular','rapd','lmn7','contraWeak']},
  {id:'cpa',name:'CPA',present:['hearing','tinnitus','lmn7','v1','corneal','ipsiAtaxia'],absent:['iii','contraWeak']},
  {id:'facial-canal',name:'Facial canal segment',present:['lmn7','hyperacusis','taste'],absent:['tearing','vesicles','hearing','parotid']},
  {id:'medial-medulla',name:'Medial medulla',present:['xii','contraWeak','dcml','dysarthria','vascular'],absent:['palate','horner','spinothalamic']},
  {id:'ino',name:'INO',present:['ino'],absent:['pupil','ptosis','gaze']},
  {id:'one-and-half',name:'One-and-a-half',present:['gaze','ino'],absent:['pupil','lmn7']},
  {id:'parinaud',name:'Parinaud',present:['upgaze','lightNear','convergenceRetraction','lidRetraction'],absent:['fatigability']},
  {id:'villaret',name:'Villaret',present:['palate','dysphagia','hoarseness','xi','xii','horner'],absent:['contraWeak','dcml','spinothalamic']},
  {id:'miller-fisher',name:'Miller Fisher',present:['ophthalmoplegia','gaitAtaxia','areflexia'],absent:['fatigability','consciousness','contraWeak']}
];
const ZONES = [
  ['hemisphere','Hemisphere','above'],['optic','Optic pathway','above'],
  ['midbrain-dorsal','Dorsal','midbrain'],['midbrain-tegmentum','Tegmentum','midbrain'],['midbrain-ventral','Ventral','midbrain'],
  ['pons-dorsal','Dorsal','pons'],['pons-lateral','Lateral','pons'],['pons-ventral','Ventral','pons'],
  ['medulla-lateral','Lateral','medulla'],['medulla-medial','Medial','medulla'],
  ['subarachnoid','Subarachnoid','outside'],['cpa','CP angle / IAM','outside'],['petrous','Petrous bone','outside'],['cavernous','Cavernous sinus','outside'],
  ['orbit','Orbit / SOF','outside'],['skull-base','Skull base','outside'],['extracranial','Extracranial','outside'],['diffuse','NMJ / diffuse','outside']
].map(([id,name,level])=>({id,name,level}));
