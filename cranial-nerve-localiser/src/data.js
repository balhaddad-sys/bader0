'use strict';
/*
 * Sites. `side` is 'unilateral', 'midline', 'bilateral' or 'none'; `lesionSides`
 * limits a unilateral site to one hemisphere ('L' or 'R'). Weights are keyed by
 * finding id with an optional relation to the lesion: ':i' same side, ':c' opposite
 * side, ':a' either side, ':b' both sides. Without one, sided findings default to
 * ':i' at unilateral sites and ':a' elsewhere. Weights: 3 defining, 2 typical,
 * 1 supportive. `ex` lists excluding findings in the same notation.
 */
const SITES_A = [
  {
    id: "optic-nerve", name: "Optic nerve", eponym: "Prechiasmal optic neuropathy", zone: "optic", side: "unilateral", prior: 9,
    w: {monocular: 3, rapd: 3, retroOrbital: 1}, ex: ["bitemporal", "homonymous", "junctional:c"],
    causes: "Optic neuritis, ischaemic optic neuropathy, compression or infiltration.",
    investigation: "Visual acuity, colour vision, pupils, fundus and formal fields; MRI brain and orbits with contrast when inflammatory or compressive disease is suspected. Sudden loss needs urgent ophthalmic assessment.",
    pearl: "A relative afferent pupillary defect with reduced colour vision supports asymmetric optic nerve dysfunction, although severe retinal disease can also cause it. A normal disc does not exclude a retrobulbar lesion. Establish the visual field pattern and inspect the retina before attributing all monocular loss to the nerve."
  },
  {
    id: "junctional", name: "Optic nerve–chiasm junction", eponym: "Junctional scotoma", zone: "optic", side: "unilateral", prior: 6,
    w: {"junctional:c": 3, monocular: 3, rapd: 2}, ex: ["homonymous"],
    causes: "Pituitary or suprasellar tumour, meningioma, aneurysm or other anterior chiasmal compression.",
    investigation: "Formal perimetry and contrast MRI of the optic pathways and sellar region; pituitary hormone assessment if a sellar lesion is found.",
    pearl: "Look for central visual loss in the eye on the lesion side together with a superotemporal defect in the other eye. Always test both eyes separately: the subtle fellow-eye defect is the localising clue. The clinical pattern is useful without requiring the traditional, disputed explanation of Wilbrand’s knee."
  },
  {
    id: "chiasm", name: "Optic chiasm", eponym: "Chiasmal syndrome", zone: "optic", side: "midline", prior: 8,
    w: {bitemporal: 3, rapd: 1, monocular: 1, seesaw: 2}, ex: ["homonymous"],
    causes: "Pituitary adenoma, craniopharyngioma, meningioma, aneurysm or pituitary apoplexy.",
    investigation: "Formal visual fields, contrast MRI of the sellar and suprasellar region and pituitary hormones. Acute headache with visual loss or ophthalmoplegia requires emergency assessment for apoplexy.",
    pearl: "Temporal field loss in both eyes suggests injury to crossing nasal retinal fibres. Early loss may be incomplete or asymmetric, so confrontation alone can miss it. Check acuity, colour and endocrine symptoms; a rapidly evolving visual deficit with severe headache may represent pituitary apoplexy."
  },
  {
    id: "retrochiasmal", name: "Retrochiasmal visual pathway", eponym: "Optic tract, radiation or occipital cortex", zone: "hemisphere", side: "unilateral", prior: 9,
    w: {"homonymous:c": 3, "weak:c": 1, "umn7:c": 1, vascular: 1, "rapd:c": 1}, ex: ["bitemporal", "monocular:c"],
    causes: "Posterior cerebral or middle cerebral artery infarction, haemorrhage, tumour or demyelination.",
    investigation: "Formal fields; urgent stroke imaging for sudden onset, followed by MRI brain to define optic tract, radiation or occipital involvement.",
    pearl: "A homonymous field defect lies behind the chiasm, opposite the lost visual hemifield. Increasing congruity often favours a more posterior lesion, but is not an absolute rule. An optic tract lesion can produce an afferent pupillary defect; an isolated occipital lesion generally preserves pupillary responses."
  },
  {
    id: "weber", name: "Ventral midbrain", eponym: "Weber syndrome", zone: "midbrain-ventral", side: "unilateral", prior: 7,
    w: {iii: 3, ptosis: 2, pupil: 1, "weak:c": 3, vascular: 1, dysarthria: 1}, ex: ["lmn7", "xii"],
    causes: "Paramedian midbrain infarction, haemorrhage or focal compression.",
    investigation: "Emergency stroke assessment when acute; MRI brain with diffusion imaging and CTA or MRA of the posterior circulation.",
    pearl: "An ipsilateral third nerve palsy with opposite limb weakness places the lesion where III fascicles pass beside the cerebral peduncle. Document whether ataxia is independent of weakness, because prominent tremor or dysmetria suggests tegmental extension. The eponym describes anatomy; it does not establish the cause."
  },
  {
    id: "claude", name: "Midbrain tegmentum and cerebellar outflow", eponym: "Claude syndrome", zone: "midbrain-tegmentum", side: "unilateral", prior: 5,
    w: {iii: 3, ptosis: 2, "limbAtaxia:c": 3, pupil: 1, gaitAtaxia: 1, vascular: 1}, ex: ["lmn7"],
    causes: "Paramedian midbrain infarction, demyelination or tumour.",
    investigation: "MRI brain with diffusion and thin brainstem sections; acute vascular imaging when onset is sudden.",
    pearl: "Third nerve palsy with opposite limb dysmetria points to the midbrain tegmentum and cerebellar outflow pathways. In the useful bedside distinction, ataxia dominates Claude and a coarse involuntary movement suggests Benedikt. Real lesions overlap, and terminology varies; describe the ocular and limb findings alongside the eponym."
  },
  {
    id: "benedikt", name: "Midbrain tegmentum and red nucleus region", eponym: "Benedikt syndrome", zone: "midbrain-tegmentum", side: "unilateral", prior: 4,
    w: {iii: 3, ptosis: 2, "limbAtaxia:c": 3, "weak:c": 2, pupil: 1, "dcml:c": 1, vascular: 1}, ex: ["lmn7"],
    causes: "Midbrain infarction, haemorrhage, tumour or inflammatory lesion.",
    investigation: "MRI brain with diffusion and susceptibility sequences; urgent posterior circulation imaging for an acute presentation.",
    pearl: "Ipsilateral III dysfunction with contralateral tremor, involuntary movement or ataxia suggests injury around the red nucleus and neighbouring pathways. Weakness indicates extension towards descending motor fibres. Because this tool groups tremor and ataxia together, it cannot reliably separate Benedikt from Claude on that chip alone."
  },
  {
    id: "nothnagel", name: "Dorsal midbrain and superior cerebellar peduncle", eponym: "Nothnagel syndrome", zone: "midbrain-dorsal", side: "unilateral", prior: 3,
    w: {iii: 3, limbAtaxia: 3, gaitAtaxia: 2, "ptosis:b": 1, ophthalmoplegia: 1, upgaze: 1, papilloedema: 1}, ex: [],
    causes: "Tectal or pineal-region mass, obstructive hydrocephalus, less often vascular disease.",
    investigation: "Contrast MRI of the dorsal midbrain, pineal region and ventricular system; urgent assessment if hydrocephalus is suspected.",
    pearl: "A dorsal midbrain process involving III pathways and the superior cerebellar peduncle can combine ocular palsy with ataxia, sometimes bilaterally. Consider a mass or hydrocephalus when the course is progressive. Laterality and historical definitions vary, so confirm the actual peduncular and nuclear involvement on imaging."
  },
  {
    id: "parinaud", name: "Dorsal rostral midbrain", eponym: "Parinaud syndrome", zone: "midbrain-dorsal", side: "midline", prior: 7,
    w: {upgaze: 3, lightNear: 3, convergenceRetraction: 3, lidRetraction: 2, papilloedema: 1}, ex: [],
    causes: "Pineal-region mass, hydrocephalus, midbrain infarction or demyelination.",
    investigation: "MRI brain focused on the tectum, posterior commissure, pineal region and aqueduct; urgent imaging if pressure symptoms are present.",
    pearl: "The combination of impaired upgaze, convergence–retraction on attempted upgaze, light–near dissociation and lid retraction is much more informative than upgaze limitation alone. Inspect the pupils and lids before calling this an isolated muscle palsy. Imaging must include the aqueduct because obstructive hydrocephalus may be the underlying driver."
  },
  {
    id: "nuclear-iii", name: "Oculomotor nuclear complex", eponym: "Nuclear III syndrome", zone: "midbrain-tegmentum", side: "midline", prior: 4,
    w: {iii: 3, "ptosis:b": 3, ophthalmoplegia: 2, upgaze: 1, pupil: 1}, ex: ["fatigability"],
    causes: "Paramedian midbrain infarction, inflammatory disease or tumour.",
    investigation: "MRI brain with thin midbrain and diffusion sequences; assess associated vertical gaze and long-tract signs.",
    pearl: "Bilateral ptosis is a clue because the central caudal subnucleus supplies both levators. Superior rectus fibres cross, so a nuclear lesion can weaken elevation in the opposite eye as well. The pattern may therefore violate the simple rule that one third nerve lesion affects only one eye."
  },
  {
    id: "compressive-iii", name: "Subarachnoid oculomotor nerve compression", eponym: "Posterior communicating artery aneurysm", zone: "subarachnoid", side: "unilateral", prior: 8,
    w: {iii: 3, ptosis: 2, pupil: 3, painfulEye: 2, retroOrbital: 1, thunderclap: 1}, ex: ["fatigability"],
    causes: "Posterior communicating artery aneurysm; other aneurysm, mass or meningeal compression.",
    investigation: "Urgent CTA or MRA for an acute acquired III palsy. Thunderclap headache requires an emergency subarachnoid haemorrhage pathway; specialist angiography may be needed if suspicion persists.",
    pearl: "A painful third nerve palsy with a dilated pupil is an aneurysm warning pattern. Pupil sparing does not safely exclude compression, especially with partial or early palsy, and pain also occurs in microvascular palsy. Arrange prompt neurovascular assessment for a new acquired III palsy regardless of this fit score."
  },
  {
    id: "microvascular-iii", name: "Ischaemic peripheral oculomotor nerve", eponym: "Microvascular III palsy", zone: "subarachnoid", side: "unilateral", prior: 9,
    w: {iii: 3, ptosis: 2, vascular: 1, retroOrbital: 1, painfulEye: 1}, ex: ["pupil", "v1", "v2", "vi", "weak:c", "fatigability"],
    causes: "Small-vessel ischaemia associated with diabetes, hypertension and other vascular risks.",
    investigation: "Prompt neurovascular imaging to exclude aneurysm in a new acquired III palsy; glucose/HbA1c, blood pressure and planned clinical follow-up. Reassess progression or failure to recover.",
    pearl: "Relative pupil sparing in an otherwise isolated III palsy supports microvascular ischaemia, particularly in an older patient with vascular risk. It is a pattern clue, not clearance from aneurysm investigation. Marking the pupil tested and normal improves this model’s fit, but cannot establish the diagnosis or its safety."
  },
  {
    id: "uncal", name: "Tentorial edge and compressed III nerve", eponym: "Uncal herniation", zone: "subarachnoid", side: "unilateral", prior: 5,
    w: {pupil: 3, consciousness: 3, iii: 2, ptosis: 1, "weak:c": 2, weak: 1, papilloedema: 1}, ex: [],
    causes: "Expanding haematoma, tumour, oedema or other supratentorial mass effect.",
    investigation: "Immediate emergency and neurosurgical assessment with urgent CT brain; resuscitation and treatment must not wait for a teaching tool.",
    pearl: "Declining consciousness with a dilating pupil is an emergency. Usually the pupil is on the mass side and weakness is opposite. Kernohan’s notch can compress the opposite cerebral peduncle against the tentorium, producing weakness on the same side as the mass: a classic false-localising exception."
  },
  {
    id: "trochlear", name: "Peripheral trochlear nerve", eponym: "Isolated IV palsy", zone: "subarachnoid", side: "unilateral", prior: 8,
    w: {iv: 3, vascular: 1}, ex: ["iii", "vi", "v1", "lmn7", "weak:c", "fatigability"],
    causes: "Decompensated congenital palsy, trauma, microvascular ischaemia or compression.",
    investigation: "Orthoptic and neuro-ophthalmic examination; review old photographs and trauma history. MRI is appropriate for acquired unexplained, progressive or non-isolated palsy.",
    pearl: "Superior oblique weakness causes vertical or torsional diplopia, often worse on looking down and in, with compensatory head tilt away. Old photographs can reveal longstanding compensation. This card describes the peripheral nerve; a trochlear nuclear lesion is on the opposite side because its fibres cross before leaving the midbrain."
  },
  {
    id: "microvascular-vi", name: "Ischaemic peripheral abducens nerve", eponym: "Microvascular VI palsy", zone: "subarachnoid", side: "unilateral", prior: 9,
    w: {vi: 3, vascular: 1, retroOrbital: 1}, ex: ["gaze", "lmn7", "v1", "v2", "horner", "papilloedema", "vi:b", "weak:c"],
    causes: "Microvascular ischaemia associated with diabetes, hypertension or other vascular risks.",
    investigation: "Complete ocular and neurological examination, vascular risk assessment and specialist review; MRI for young patients, non-isolated or atypical palsy, progression or failure to recover.",
    pearl: "An isolated abduction deficit gives horizontal diplopia, worse at distance and towards the weak lateral rectus. A VI nerve palsy affects one eye; a VI nuclear lesion impairs conjugate gaze. Examine the optic discs and other cranial nerves before assigning a peripheral microvascular explanation."
  },
  {
    id: "raised-icp-vi", name: "Abducens stretch from raised intracranial pressure", eponym: "False-localising VI palsy", zone: "subarachnoid", side: "none", prior: 7,
    w: {papilloedema: 3, "vi:b": 3, vi: 2, consciousness: 1}, ex: [],
    causes: "Intracranial mass, hydrocephalus, cerebral venous thrombosis or idiopathic intracranial hypertension.",
    investigation: "Urgent brain imaging with venous imaging when indicated, plus formal visual assessment. Lumbar puncture for opening pressure only after imaging and clinical assessment establish safety.",
    pearl: "One or both sixth nerves can fail when pressure distorts their long intracranial course. The side of the diplopia therefore need not identify the side of the primary lesion. Papilloedema supports raised pressure but may be absent early; find the cause before considering lumbar puncture."
  },
  {
    id: "gradenigo", name: "Petrous apex", eponym: "Gradenigo syndrome", zone: "petrous", side: "unilateral", prior: 5,
    w: {vi: 3, otitis: 3, retroOrbital: 3, hearing: 1, "v1": 1, "v2": 1}, ex: ["gaze"],
    causes: "Petrous apicitis from middle-ear infection; occasionally a petrous-apex tumour or inflammatory lesion.",
    investigation: "Urgent ENT and neurological assessment, contrast MRI of the petrous apex and skull base, and CT temporal bone; evaluate infection and intracranial complications.",
    pearl: "Think petrous apex when otitis is accompanied by deep trigeminal or retro-orbital pain and a sixth nerve palsy. Infection can affect the nerve near Dorello’s canal and irritate nearby trigeminal structures. The full classic triad is often incomplete, so absence of one component should not delay investigation."
  },
  {
    id: "cavernous", name: "Cavernous sinus", eponym: "Cavernous sinus syndrome", zone: "cavernous", side: "unilateral", prior: 8,
    w: {iii: 2, iv: 2, vi: 3, "v1": 2, "v2": 2, horner: 2, ptosis: 1, pupil: 1, corneal: 1, painfulEye: 1, retroOrbital: 1, proptosis: 1}, ex: ["v3", "vmotor", "lmn7", "weak:c"],
    causes: "Thrombosis, carotid-cavernous fistula, aneurysm, tumour or inflammatory disease.",
    investigation: "Contrast MRI of brain, cavernous sinuses and orbits; CTA/MRA or venography according to vascular or infectious suspicion. Fever, orbital congestion or rapid progression requires urgent assessment.",
    pearl: "III, IV, VI, V1 and V2 share this compartment; V3 does not. VI plus Horner is particularly useful because sympathetic fibres run close to VI beside the internal carotid artery. Vision loss suggests extension towards the orbital apex or optic pathway, rather than an isolated cavernous sinus lesion."
  },
  {
    id: "sof", name: "Superior orbital fissure", eponym: "Superior orbital fissure syndrome", zone: "orbit", side: "unilateral", prior: 5,
    w: {iii: 2, iv: 2, vi: 2, "v1": 3, corneal: 2, ptosis: 1, pupil: 1, painfulEye: 1, proptosis: 1}, ex: ["monocular", "rapd", "v2", "v3", "vmotor"],
    causes: "Trauma, tumour, orbital inflammation or invasive infection.",
    investigation: "Contrast MRI of the orbits and skull base; CT for fracture or bony disease. Record acuity, colour vision and pupils to assess optic nerve involvement.",
    pearl: "Ocular motor palsies together with V1 sensory loss fit the superior orbital fissure. The optic nerve uses the optic canal, so optic neuropathy moves the localisation towards the orbital apex. V2 also lies outside the fissure; its involvement favours a more posterior or extensive lesion."
  },
  {
    id: "orbital-apex", name: "Orbital apex", eponym: "Orbital apex syndrome", zone: "orbit", side: "unilateral", prior: 6,
    w: {monocular: 3, rapd: 3, iii: 2, iv: 2, vi: 2, "v1": 2, corneal: 1, ptosis: 1, painfulEye: 1, proptosis: 1}, ex: ["v3", "vmotor", "weak:c"],
    causes: "Tumour, invasive sinus infection, inflammatory disease or trauma.",
    investigation: "Urgent ophthalmic assessment and contrast MRI of the orbits, sinuses and skull base; CT for sinus or bone disease and targeted microbiological or tissue diagnosis when indicated.",
    pearl: "Optic neuropathy added to ophthalmoplegia is the decisive clue to the orbital apex. Examine acuity, colour vision and the afferent pupil response in every patient with multiple ocular motor palsies. Rapid painful visual loss, especially with sinus disease or immunocompromise, warrants urgent investigation for invasive infection."
  },
  {
    id: "tolosa-hunt", name: "Inflammatory cavernous sinus or orbital fissure", eponym: "Tolosa–Hunt syndrome", zone: "cavernous", side: "unilateral", prior: 3,
    w: {painfulEye: 3, retroOrbital: 3, iii: 2, vi: 2, iv: 1, "v1": 1, "v2": 1, ptosis: 1, horner: 1}, ex: ["otitis", "weak:c"],
    causes: "Idiopathic granulomatous inflammation, diagnosed only after excluding secondary causes.",
    investigation: "Contrast MRI of the cavernous sinuses and orbital apex with vascular imaging and targeted infection, neoplastic and inflammatory work-up; interval imaging and specialist follow-up.",
    pearl: "Painful ophthalmoplegia is a syndrome, not a diagnosis of Tolosa–Hunt. Exclude aneurysm, thrombosis, tumour and infection before accepting idiopathic inflammation. A steroid response is not diagnostic because important mimics may also improve temporarily. Clinical and imaging follow-up matters, especially when the course is atypical or recurrent."
  },
  {
    id: "thyroid-eye", name: "Orbital extraocular muscles", eponym: "Thyroid eye disease", zone: "orbit", side: "bilateral", prior: 7,
    w: {proptosis: 3, lidRetraction: 3, ophthalmoplegia: 2, upgaze: 1, vi: 1, painfulEye: 1, monocular: 1, rapd: 1}, ex: ["pupil", "v1", "v2", "fatigability"],
    causes: "Autoimmune thyroid-associated orbitopathy; may occur with normal thyroid function.",
    investigation: "Visual acuity, colour and pupil assessment, thyroid function and receptor antibodies; orbital CT or MRI for atypical disease or possible optic nerve compression.",
    pearl: "Lid retraction, proptosis and restrictive motility favour an orbital process. Disease is often bilateral but asymmetric, and restriction may imitate a cranial nerve palsy. Reduced colour vision, acuity or an afferent pupil defect raises concern for compressive optic neuropathy and needs prompt specialist assessment."
  },
  {
    id: "millard-gubler", name: "Ventral caudal pons", eponym: "Millard–Gubler syndrome", zone: "pons-ventral", side: "unilateral", prior: 6,
    w: {"lmn7": 3, "weak:c": 3, vi: 2, corneal: 1, dysarthria: 1, vascular: 1}, ex: ["gaze"],
    causes: "Pontine infarction, haemorrhage, demyelination or tumour.",
    investigation: "Emergency stroke imaging for sudden onset; MRI with diffusion and posterior circulation CTA/MRA.",
    pearl: "A whole-face palsy with opposite limb weakness can be central: VII fascicles traverse the pons next to descending motor fibres. An ipsilateral VI palsy may accompany it. Test conjugate gaze; a gaze palsy suggests dorsal nuclear or gaze-centre involvement beyond this predominantly ventral pattern."
  },
  {
    id: "raymond", name: "Ventral medial caudal pons", eponym: "Raymond syndrome", zone: "pons-ventral", side: "unilateral", prior: 5,
    w: {vi: 3, "weak:c": 3, vascular: 1, dysarthria: 1}, ex: ["lmn7", "gaze"],
    causes: "Paramedian pontine infarction, haemorrhage or focal mass.",
    investigation: "Urgent stroke assessment, MRI brain with diffusion and posterior circulation vascular imaging.",
    pearl: "An abducens fascicular palsy with opposite limb weakness points to the ventromedial pons. Relative facial sparing separates the classic Raymond pattern from neighbouring VII involvement in Millard–Gubler. Test each eye and conjugate gaze: an isolated lateral rectus deficit is different from a sixth nerve nuclear gaze palsy."
  },
  {
    id: "foville", name: "Dorsomedial caudal pons with motor tract extension", eponym: "Foville syndrome", zone: "pons-dorsal", side: "unilateral", prior: 5,
    w: {gaze: 3, "lmn7": 3, "weak:c": 3, ino: 1, "dcml:c": 1, limbAtaxia: 1, vascular: 1, dysarthria: 1}, ex: [],
    causes: "Pontine infarction or haemorrhage; less often demyelination or tumour.",
    investigation: "Urgent brain and posterior circulation imaging; MRI diffusion sequences define dorsal and ventral extension.",
    pearl: "Ipsilateral horizontal gaze palsy and whole-face weakness identify adjacent pontine structures; opposite hemiparesis indicates extension to the corticospinal tract. A gaze palsy affects both eyes looking towards the lesion. Examine for INO and sensory loss to map how far the lesion extends beyond the classic triad."
  },
  {
    id: "facial-colliculus", name: "Facial colliculus", eponym: "Dorsal pontine VI nucleus–VII fascicle syndrome", zone: "pons-dorsal", side: "unilateral", prior: 5,
    w: {gaze: 3, "lmn7": 3, corneal: 1, ino: 1, vascular: 1}, ex: ["weak:c"],
    causes: "Small dorsal pontine infarction, demyelination or tumour.",
    investigation: "MRI brain with thin dorsal pontine and diffusion sequences; acute vascular assessment for sudden symptoms.",
    pearl: "The facial colliculus is formed by VII fibres looping around the VI nucleus, not by the facial nucleus itself. Damage produces an ipsilateral conjugate gaze palsy and LMN facial weakness. Limb power may be preserved if the ventral corticospinal tract is spared; additional INO suggests nearby MLF involvement."
  },
  {
    id: "ino", name: "Medial longitudinal fasciculus", eponym: "Internuclear ophthalmoplegia", zone: "pons-dorsal", side: "unilateral", prior: 8,
    w: {ino: 3, skew: 1, vascular: 1}, ex: ["pupil", "ptosis", "gaze"],
    causes: "Brainstem infarction, multiple sclerosis or another focal inflammatory lesion.",
    investigation: "MRI brain with diffusion and thin pontine and midbrain sequences; assess for demyelinating disease according to age and clinical context.",
    pearl: "Name the side by the eye that cannot adduct normally: that is the injured MLF side. Look for slowed adducting saccades and abducting nystagmus in the fellow eye. Convergence may be preserved but is not an absolute discriminator. INO can arise in the pons or midbrain; the map uses the common pontine region."
  },
  {
    id: "one-and-half", name: "Pontine gaze centre and adjacent MLF", eponym: "One-and-a-half syndrome", zone: "pons-dorsal", side: "unilateral", prior: 6,
    w: {gaze: 3, ino: 3, "lmn7": 1, vascular: 1}, ex: ["pupil"],
    causes: "Pontine infarction, demyelination, haemorrhage or focal mass.",
    investigation: "MRI brain with diffusion and thin dorsal pontine sections; acute posterior circulation stroke assessment when appropriate.",
    pearl: "A gaze palsy towards the lesion plus ipsilateral INO leaves only the opposite eye’s abduction available in horizontal gaze. The lesion involves the PPRF or VI nucleus and the adjacent MLF. Add an ipsilateral LMN VII palsy and the pattern is often called eight-and-a-half syndrome."
  },
  {
    id: "aica", name: "Lateral caudal pons", eponym: "AICA territory syndrome", zone: "pons-lateral", side: "unilateral", prior: 7,
    w: {"lmn7": 3, hearing: 3, vertigo: 1, limbAtaxia: 2, "spinothalamic:c": 2, dissociatedFace: 2, horner: 1, corneal: 1, tinnitus: 1, headImpulse: 1, skew: 1, vascular: 1, gaitAtaxia: 1}, ex: [],
    causes: "Anterior inferior cerebellar artery or basilar artery ischaemia; less often haemorrhage.",
    investigation: "Emergency stroke pathway, posterior circulation CTA/MRA and MRI diffusion imaging; assess hearing as well as vestibular and facial signs.",
    pearl: "New hearing loss with an acute vestibular syndrome is a valuable vascular clue because AICA commonly supplies the inner ear. Add whole-face weakness, limb ataxia and crossed sensory findings to localise the lateral caudal pons. A peripheral-appearing vestibular deficit does not exclude an AICA stroke."
  },
  {
    id: "lateral-midpons", name: "Lateral mid-pons", eponym: "Trigeminal–cerebellar pontine syndrome", zone: "pons-lateral", side: "unilateral", prior: 4,
    w: {"v1": 2, "v2": 2, "v3": 2, vmotor: 3, corneal: 2, limbAtaxia: 3, "spinothalamic:c": 2, dissociatedFace: 1, horner: 1, vertigo: 1, vascular: 1}, ex: ["iii", "xii"],
    causes: "Lateral pontine infarction, demyelination or intrinsic tumour.",
    investigation: "MRI brain with diffusion and thin pontine sections; posterior circulation vascular imaging if acute.",
    pearl: "Trigeminal sensory and motor findings with ipsilateral cerebellar dysfunction suggest the lateral mid-pons, where V enters beside cerebellar connections. Opposite body pain and temperature loss strengthens a brainstem localisation. Distinguish sensory loss across all modalities from a selective pain–temperature deficit to refine which trigeminal structures are involved."
  },
  {
    id: "cpa", name: "Cerebellopontine angle", eponym: "CPA syndrome", zone: "cpa", side: "unilateral", prior: 7,
    w: {hearing: 3, tinnitus: 2, "lmn7": 2, corneal: 2, "v1": 2, "v2": 1, "v3": 1, limbAtaxia: 2, gaitAtaxia: 1, vertigo: 1, vi: 1, bruns: 2}, ex: ["iii"],
    causes: "Vestibular schwannoma, meningioma, epidermoid or another CPA mass.",
    investigation: "Audiometry and contrast MRI brain with dedicated internal auditory canal and CPA sequences; diffusion imaging helps identify an epidermoid.",
    pearl: "Progressive unilateral hearing symptoms followed by V or VII findings suggest a growing CPA lesion. Corneal sensation and limb coordination help identify spread beyond the internal auditory canal. Hearing loss alone is not specific for a mass, and substantial facial weakness may indicate a different lesion or more extensive disease."
  },
  {
    id: "iam", name: "Internal auditory meatus", eponym: "VII–VIII canal syndrome", zone: "cpa", side: "unilateral", prior: 7,
    w: {hearing: 3, tinnitus: 2, "lmn7": 2, vertigo: 1, taste: 1, tearing: 1, hyperacusis: 1}, ex: ["v1", "v2", "v3", "limbAtaxia", "weak:c"],
    causes: "Intracanalicular vestibular schwannoma, facial nerve schwannoma, inflammation or temporal bone trauma.",
    investigation: "Audiometry, facial nerve assessment and MRI with dedicated internal auditory canal sequences; CT temporal bone for trauma or bony disease.",
    pearl: "VII and VIII travel together through the internal auditory canal. A confined lesion can combine hearing or vestibular symptoms with facial dysfunction while sparing trigeminal sensation and limb coordination. Those additional findings suggest extension into the CPA or another site, though not every canal lesion affects both nerves."
  }
];

const SITES_B = [
  {
    id: "bells", name: "Peripheral facial nerve", eponym: "Bell’s palsy pattern", zone: "petrous", side: "unilateral", prior: 10,
    w: {"lmn7": 3, taste: 1, hyperacusis: 1, tearing: 1, corneal: 1}, ex: ["vesicles", "parotid", "weak:c", "gaze"],
    causes: "Idiopathic inflammatory facial neuropathy; Bell’s palsy remains a clinical diagnosis after excluding identifiable causes.",
    investigation: "Examine the ear, cornea and other cranial nerves. Routine imaging is unnecessary in a typical new presentation; obtain contrast MRI for progressive, recurrent or otherwise atypical palsy.",
    pearl: "A peripheral pattern weakens the forehead, eye closure and lower face together. Taste change and hyperacusis can accompany Bell’s palsy, but a parotid mass, vesicles, other cranial neuropathies or long tract signs demand another explanation. Assess eye closure and corneal exposure at the bedside."
  },
  {
    id: "proximal-facial", name: "Facial nerve above the geniculate", eponym: "Proximal intratemporal VII", zone: "petrous", side: "unilateral", prior: 5,
    w: {"lmn7": 3, tearing: 3, hyperacusis: 2, taste: 2, corneal: 1}, ex: ["parotid", "weak:c", "gaze"],
    causes: "Labyrinthine-segment inflammation, temporal bone trauma, facial nerve schwannoma or geniculate-region disease.",
    investigation: "Contrast MRI along the facial nerve; high-resolution temporal bone CT when trauma or bony disease is suspected. Assess hearing and corneal protection.",
    pearl: "Reduced lacrimation with facial weakness, taste loss and hyperacusis suggests damage before the greater petrosal branch leaves near the geniculate ganglion. Tear testing is imperfect: poor blinking may cause reflex watering despite impaired secretion. Use this branch pattern as a guide, then correlate with imaging."
  },
  {
    id: "ramsay-hunt", name: "Geniculate region with zoster", eponym: "Ramsay Hunt syndrome", zone: "petrous", side: "unilateral", prior: 7,
    w: {"lmn7": 3, vesicles: 3, hearing: 2, taste: 1, hyperacusis: 1, tearing: 1, vertigo: 1, tinnitus: 1, corneal: 1}, ex: ["weak:c", "gaze"],
    causes: "Varicella-zoster reactivation affecting VII, sometimes with adjacent VIII or other cranial nerves.",
    investigation: "Prompt clinical/ENT assessment, inspection of the canal and palate, corneal assessment and audiometry if hearing is affected; MRI if the presentation is atypical.",
    pearl: "Look inside the ear canal and mouth for vesicles when facial palsy is painful. Hearing loss or vertigo supports associated VIII involvement. The eruption may follow weakness, and zoster sine herpete has no visible rash, so an initially normal skin examination does not exclude this diagnosis."
  },
  {
    id: "tympanic-facial", name: "Tympanic facial canal", eponym: "VII before the stapedius branch", zone: "petrous", side: "unilateral", prior: 5,
    w: {"lmn7": 3, hyperacusis: 3, taste: 2, otitis: 1, corneal: 1}, ex: ["tearing", "parotid", "weak:c"],
    causes: "Middle-ear infection, cholesteatoma, temporal bone trauma or operative injury.",
    investigation: "Otoscopy and audiometry; high-resolution temporal bone CT, with contrast MRI for suspected nerve or soft-tissue pathology.",
    pearl: "The tympanic segment is downstream of the greater petrosal branch but upstream of stapedius and chorda tympani. Thus facial weakness, hyperacusis and taste loss with preserved lacrimation support this level. Similar findings can arise in the upper mastoid segment; examination alone cannot resolve every millimetre of the canal."
  },
  {
    id: "mastoid-facial", name: "Mastoid facial canal", eponym: "Below stapedius, above chorda tympani", zone: "petrous", side: "unilateral", prior: 5,
    w: {"lmn7": 3, taste: 3, otitis: 1, corneal: 1}, ex: ["hyperacusis", "tearing", "parotid", "weak:c"],
    causes: "Mastoid or middle-ear disease, temporal bone fracture, facial nerve tumour or surgical injury.",
    investigation: "ENT examination, audiometry and high-resolution temporal bone CT; add contrast MRI if tumour or inflammatory neuropathy is suspected.",
    pearl: "This pattern refers specifically to the segment between the stapedius and chorda tympani branches: facial movement and anterior tongue taste are affected, with stapedius function and tearing preserved. A still more distal mastoid lesion may spare taste too, so the whole mastoid segment does not have one invariant pattern."
  },
  {
    id: "stylomastoid", name: "Stylomastoid foramen or parotid", eponym: "Extracranial VII", zone: "extracranial", side: "unilateral", prior: 6,
    w: {"lmn7": 3, parotid: 3, corneal: 1}, ex: ["taste", "hyperacusis", "tearing", "weak:c"],
    causes: "Parotid malignancy, surgery, trauma or an extracranial facial nerve lesion.",
    investigation: "Inspect and palpate the parotid and skin; contrast MRI/ultrasound of the parotid with ENT assessment and tissue sampling when indicated.",
    pearl: "After the stylomastoid foramen, VII carries motor fibres to facial expression; the taste, stapedius and lacrimal branches have already left. A distal lesion can affect selected facial branches. Facial weakness accompanying a parotid mass is a malignancy warning sign and warrants prompt specialist assessment."
  },
  {
    id: "supranuclear-vii", name: "Corticobulbar pathway to VII", eponym: "Supranuclear facial weakness", zone: "hemisphere", side: "unilateral", prior: 8,
    w: {"umn7:c": 3, "weak:c": 2, "homonymous:c": 1, dysarthria: 1, vascular: 1}, ex: ["lmn7:c", "hyperacusis:c", "taste:c"],
    causes: "Hemispheric or capsular infarction, haemorrhage, tumour or demyelination.",
    investigation: "Urgent stroke assessment and brain/vascular imaging for sudden onset; MRI for other presentations.",
    pearl: "A supranuclear lesion typically weakens the opposite lower face, with relative forehead and eye-closure sparing from bilateral cortical input. Limb weakness is on the same side as the weak face. Forehead sparing is a useful pattern, not an absolute test; combine it with the rest of the examination."
  },
  {
    id: "pseudobulbar", name: "Bilateral corticobulbar pathways", eponym: "Pseudobulbar palsy", zone: "hemisphere", side: "bilateral", prior: 6,
    w: {jawJerk: 3, lability: 3, dysphagia: 2, dysarthria: 2, "umn7": 1, palate: 1}, ex: ["xii"],
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
    id: "wallenberg", name: "Lateral medulla", eponym: "Wallenberg syndrome", zone: "medulla-lateral", side: "unilateral", prior: 9,
    w: {palate: 2, dysphagia: 3, hoarseness: 3, dissociatedFace: 3, "spinothalamic:c": 3, horner: 2, limbAtaxia: 2, vertigo: 1, skew: 1, gaitAtaxia: 1, hiccups: 1, dysarthria: 1, vascular: 1}, ex: ["dcml:c", "xii"],
    causes: "Vertebral or PICA territory infarction, including vertebral dissection; less often demyelination or tumour.",
    investigation: "Urgent stroke pathway with MRI diffusion and head/neck vascular imaging; assess swallowing before oral intake.",
    pearl: "Crossed pain/temperature loss, bulbar weakness, ipsilateral Horner and ataxia form the lateral medullary pattern. The face loses pain/temperature on the lesion side while the body loses them opposite. Marked limb weakness is atypical of a pure lateral lesion but can occur with extension into corticospinal fibres."
  },
  {
    id: "dejerine", name: "Medial medulla", eponym: "Dejerine syndrome", zone: "medulla-medial", side: "unilateral", prior: 8,
    w: {xii: 3, "weak:c": 3, "dcml:c": 3, dysarthria: 1, vascular: 1}, ex: ["dissociatedFace", "spinothalamic:c", "horner"],
    causes: "Paramedian vertebral/anterior spinal artery territory infarction; less often demyelination or a mass.",
    investigation: "Urgent brain MRI with diffusion and head/neck vascular imaging; acute stroke assessment.",
    pearl: "The classic triad combines ipsilateral XII weakness with opposite limb weakness and loss of vibration/joint position sense. It links hypoglossal fibres, the pyramid and medial lemniscus. The protruded tongue points toward the lesion; absence of the complete triad does not rule out a small medial medullary infarct."
  },
  {
    id: "avellis", name: "Lateral medulla, ambiguus and spinothalamic", eponym: "Avellis syndrome", zone: "medulla-lateral", side: "unilateral", prior: 3,
    w: {palate: 3, hoarseness: 3, dysphagia: 2, "spinothalamic:c": 3, dysarthria: 1, vascular: 1}, ex: ["xii", "dcml:c"],
    causes: "Focal medullary infarction; occasionally tumour, inflammation or demyelination.",
    investigation: "Urgent diffusion MRI and vascular imaging for acute onset; laryngoscopy and swallowing assessment where indicated.",
    pearl: "Palatal or vocal-fold weakness on one side with pain/temperature loss in the opposite body links nucleus ambiguus output to the spinothalamic tract. This is a restricted lateral medullary pattern. Additional facial sensory loss, Horner or ipsilateral ataxia makes the broader Wallenberg description more useful."
  },
  {
    id: "jackson", name: "Ventral medial medulla", eponym: "Jackson syndrome, motor variant", zone: "medulla-medial", side: "unilateral", prior: 3,
    w: {xii: 3, "weak:c": 3, dysarthria: 1, vascular: 1}, ex: ["dissociatedFace", "spinothalamic:c"],
    causes: "Paramedian medullary infarction affecting XII fascicles and the pyramid.",
    investigation: "Urgent stroke assessment, diffusion MRI and head/neck vascular imaging.",
    pearl: "Here Jackson denotes XII palsy with opposite limb weakness, without requiring medial lemniscal loss. Historical use of this eponym varies, including other lower cranial nerve combinations. Describe the actual nerve and tract deficits in handover; added vibration or position loss gives the fuller Dejerine pattern."
  },
  {
    id: "vernet", name: "Jugular foramen", eponym: "Vernet syndrome", zone: "skull-base", side: "unilateral", prior: 6,
    w: {palate: 3, dysphagia: 2, hoarseness: 3, xi: 3, dysarthria: 1}, ex: ["xii", "horner", "weak:c"],
    causes: "Paraganglioma, schwannoma, metastasis, skull-base fracture or jugular-region infection/thrombosis.",
    investigation: "Contrast MRI of skull base and upper neck; CT for bone disease, laryngoscopy and swallowing assessment.",
    pearl: "IX, X and XI travel through the jugular foramen, linking palatal/laryngeal dysfunction with SCM and trapezius weakness. XII exits through a separate nearby canal. Tongue wasting or deviation therefore suggests extension beyond the jugular foramen rather than a strictly confined Vernet pattern."
  },
  {
    id: "collet-sicard", name: "Jugular foramen and hypoglossal canal", eponym: "Collet–Sicard syndrome", zone: "skull-base", side: "unilateral", prior: 5,
    w: {palate: 3, dysphagia: 2, hoarseness: 3, xi: 3, xii: 3, dysarthria: 1}, ex: ["horner", "weak:c"],
    causes: "Skull-base tumour/metastasis, fracture, infection or upper cervical vascular pathology.",
    investigation: "Contrast MRI skull base and upper neck; CT bone windows and vascular imaging according to suspected cause.",
    pearl: "Adding XII palsy to a IX–XI pattern implicates the neighbouring hypoglossal canal or adjacent extracranial lower nerves. A focal side is more informative than the eponym alone. Associated Horner syndrome suggests sympathetic involvement and shifts the description toward Villaret, often in the upper carotid or retroparotid space."
  },
  {
    id: "villaret", name: "Retroparotid and upper carotid space", eponym: "Villaret syndrome", zone: "extracranial", side: "unilateral", prior: 5,
    w: {palate: 3, dysphagia: 2, hoarseness: 3, xi: 3, xii: 3, horner: 3, dysarthria: 1}, ex: ["weak:c", "dcml:c"],
    causes: "Skull-base/upper neck tumour, carotid dissection, trauma or deep neck infection.",
    investigation: "Contrast MRI skull base and upper neck; urgent CTA/MRA for acute painful onset or suspected carotid dissection.",
    pearl: "Lower cranial palsies IX–XII plus ipsilateral Horner link the nerves to the adjacent sympathetic pathway in the retroparotid or upper carotid space. Map palate, voice, shoulder and tongue separately. Acute neck pain is an important clue to dissection; slow progression raises concern for an infiltrating mass."
  },
  {
    id: "tapia", name: "Extracranial X and XII", eponym: "Tapia syndrome", zone: "extracranial", side: "unilateral", prior: 4,
    w: {hoarseness: 3, xii: 3, dysphagia: 2, dysarthria: 1}, ex: ["xi", "palate", "weak:c"],
    causes: "Compression or stretch around intubation/neck positioning, trauma or a local upper neck lesion.",
    investigation: "Laryngoscopy to document vocal-fold palsy; MRI brain/skull base/neck if the cause is uncertain, with swallowing assessment.",
    pearl: "The usual peripheral Tapia pattern pairs ipsilateral tongue weakness with vocal-fold paralysis, often after airway instrumentation or prolonged positioning. Palatal movement is usually preserved because the pharyngeal vagal branches are spared. New postoperative dysphonia plus tongue deviation should prompt examination of both nerves and assessment for aspiration."
  },
  {
    id: "isolated-xii", name: "Hypoglossal canal or extracranial XII", eponym: "Isolated hypoglossal neuropathy", zone: "skull-base", side: "unilateral", prior: 5,
    w: {xii: 3, dysarthria: 1, dysphagia: 1}, ex: ["weak:c", "dcml:c", "palate", "xi"],
    causes: "Skull-base malignancy, trauma, surgery, carotid dissection or inflammatory neuropathy.",
    investigation: "Contrast MRI following XII from medulla to upper neck; CT of the hypoglossal canal and CTA/MRA if indicated.",
    pearl: "An LMN XII lesion produces ipsilateral tongue wasting and weakness; protrusion deviates toward the weak side. Search for adjacent lower cranial palsies and opposite limb signs before calling it isolated. Persistent unexplained XII palsy requires investigation of the full nerve course, especially the skull base."
  },
  {
    id: "recurrent-laryngeal", name: "Recurrent laryngeal nerve", eponym: "Distal vagal branch", zone: "extracranial", side: "unilateral", prior: 6,
    w: {hoarseness: 3, dysphagia: 1}, ex: ["palate", "xi", "xii", "weak:c"],
    causes: "Thyroid/neck or thoracic surgery, malignancy, aortic pathology, trauma or idiopathic neuropathy.",
    investigation: "Laryngoscopy first; image the vagal/recurrent laryngeal course through the neck and relevant thorax if unexplained. Stridor requires urgent airway assessment.",
    pearl: "Hoarseness alone does not establish a nerve lesion: confirm vocal-fold immobility. A recurrent laryngeal lesion should spare palatal elevation. The left nerve loops under the aortic arch and the right under the subclavian artery, so an unexplained left vocal-fold palsy may originate within the chest."
  },
  {
    id: "trigeminal-ganglion", name: "Trigeminal ganglion and Meckel’s cave", eponym: "Multidivisional V neuropathy", zone: "skull-base", side: "unilateral", prior: 6,
    w: {"v1": 2, "v2": 2, "v3": 2, chin: 1, corneal: 2, vmotor: 1}, ex: ["dissociatedFace", "weak:c"],
    causes: "Schwannoma, meningioma, perineural tumour spread, inflammation or infection.",
    investigation: "Contrast MRI of trigeminal roots, Meckel’s cave and skull base; investigate malignancy/inflammation according to history.",
    pearl: "Sensory loss involving several V divisions suggests a proximal site, particularly when V3 joins V1 and V2. The motor root bypasses the sensory ganglion, so chewing weakness implies adjacent root or V3 involvement. Map pinprick and touch separately; dissociated loss points more strongly toward brainstem trigeminal pathways."
  },
  {
    id: "foramen-ovale", name: "Foramen ovale and proximal V3", eponym: "Mandibular neuropathy", zone: "skull-base", side: "unilateral", prior: 5,
    w: {"v3": 3, chin: 1, vmotor: 3}, ex: ["v1", "v2", "corneal", "dissociatedFace"],
    causes: "Skull-base lesion, perineural tumour spread, trauma or iatrogenic injury.",
    investigation: "Contrast MRI of V3 and the skull base, with CT for bony disease and examination of oral/dental structures.",
    pearl: "V3 carries both mandibular sensation and the muscles of mastication through the foramen ovale. Combined numbness and chewing weakness therefore support a proximal V3 lesion. On opening, the jaw deviates toward the weak pterygoid. V1, V2 or corneal sensory loss argues for a more extensive process."
  },
  {
    id: "numb-chin", name: "Mental or inferior alveolar nerve", eponym: "Numb chin syndrome", zone: "extracranial", side: "unilateral", prior: 3,
    w: {chin: 3, "v3": 1}, ex: ["v1", "v2", "vmotor", "corneal"],
    causes: "Dental injury/infection, mandibular disease, medication-related osteonecrosis or malignant infiltration.",
    investigation: "Dental and mandibular assessment; if unexplained or progressive, targeted mandibular/skull-base imaging and evaluation for malignancy.",
    pearl: "Map the sensory change carefully: a mental neuropathy affects the chin and lower lip, while broader V3 loss suggests a more proximal site. New unexplained numb chin can signal mandibular metastasis, haematological malignancy or proximal infiltration. Persistent symptoms without a dental explanation warrant investigation, even in someone without known cancer."
  },
  {
    id: "isolated-v2", name: "Foramen rotundum or distal V2", eponym: "Isolated maxillary neuropathy", zone: "skull-base", side: "unilateral", prior: 5,
    w: {"v2": 3}, ex: ["v1", "v3", "vmotor", "corneal"],
    causes: "Maxillary/sinonasal disease, infraorbital trauma, skull-base mass or perineural tumour spread.",
    investigation: "Examine maxillary teeth, palate, sinus and facial skin; contrast MRI along V2 and CT of facial bones/sinuses as indicated.",
    pearl: "V2 is sensory and reaches the pterygopalatine fossa through the foramen rotundum. Isolated cheek, upper lip, upper dental or palatal numbness can arise anywhere along this route. Persistent progressive numbness warrants a search for perineural tumour spread, even when the initial skin or dental examination is unrevealing."
  },
  {
    id: "isolated-horner", name: "Oculosympathetic pathway", eponym: "Isolated Horner syndrome", zone: "extracranial", side: "unilateral", prior: 5,
    w: {horner: 3, ptosis: 1, retroOrbital: 1}, ex: ["pupil", "iii"],
    causes: "Carotid dissection, apical chest or neck disease, prior surgery; central lesions remain possible.",
    investigation: "Acute painful Horner needs urgent head/neck CTA or MRA for dissection. Otherwise direct imaging along the sympathetic pathway using the clinical context.",
    pearl: "Miosis and mild ptosis indicate sympathetic dysfunction; anisocoria is greater in the dark. An isolated Horner pattern cannot determine which of the three neurons is affected, despite its peripheral map grouping here. Acute orbital, facial or neck pain should raise immediate concern for internal carotid dissection."
  },
  {
    id: "myasthenia", name: "Neuromuscular junction", eponym: "Myasthenia gravis pattern", zone: "diffuse", side: "none", prior: 8,
    w: {fatigability: 3, ptosis: 2, "ptosis:b": 2, ophthalmoplegia: 2, dysphagia: 1, dysarthria: 1, hoarseness: 1, "lmn7:b": 1}, ex: ["pupil", "v1", "v2", "v3", "areflexia", "dcml", "spinothalamic"],
    causes: "Autoimmune postsynaptic neuromuscular transmission failure, commonly AChR- or MuSK-associated.",
    investigation: "AChR/MuSK antibodies and repetitive stimulation or single-fibre EMG; assess respiratory function urgently if bulbar or breathing weakness is present.",
    pearl: "Variable fatigable ptosis or diplopia can imitate almost any ocular motor palsy and may be asymmetric. Pupils and sensation should be preserved, with usually normal tendon reflexes. Seek fluctuation and objective fatigability; swallowing or respiratory symptoms require prompt assessment even when limb strength seems good."
  },
  {
    id: "miller-fisher", name: "Peripheral anti-GQ1b spectrum", eponym: "Miller Fisher syndrome", zone: "diffuse", side: "bilateral", prior: 6,
    w: {ophthalmoplegia: 3, gaitAtaxia: 3, areflexia: 3, "ptosis:b": 1, "lmn7:b": 1, dysphagia: 1, dysarthria: 1, pupil: 1, corneal: 1}, ex: ["jawJerk"],
    causes: "Usually postinfectious immune neuropathy within the Guillain–Barré/anti-GQ1b spectrum.",
    investigation: "Urgent neurological assessment, anti-GQ1b antibodies, nerve conduction studies and CSF when appropriate; monitor respiratory and autonomic function.",
    pearl: "Ophthalmoplegia, ataxia and areflexia are the defining triad, often after infection. Unlike myasthenia, reflexes are reduced and ataxia is prominent; pupils may be involved. Negative early CSF or antibody testing does not exclude it. Encephalopathy or hyperreflexia suggests Bickerstaff overlap or another central process."
  },
  {
    id: "wernicke", name: "Diencephalic and brainstem networks", eponym: "Wernicke encephalopathy", zone: "diffuse", side: "bilateral", prior: 5,
    w: {ophthalmoplegia: 3, "vi:b": 2, gaitAtaxia: 3, consciousness: 3, upgaze: 1, areflexia: 1, upbeat: 1}, ex: ["fatigability"],
    causes: "Thiamine deficiency from malnutrition, alcohol use disorder, prolonged vomiting, bariatric surgery or other nutritional compromise.",
    investigation: "Urgent clinical assessment of nutrition and metabolic status; MRI may support the diagnosis but a normal scan must not delay treatment under local protocol.",
    pearl: "The triad of eye movement abnormalities, gait ataxia and altered mental state is often incomplete. Ask about poor intake, vomiting and gastrointestinal surgery as well as alcohol. This is a time-sensitive clinical diagnosis: neither a normal MRI nor lack of the full triad reliably excludes it."
  },
  {
    id: "bilateral-lmn-vii", name: "Bilateral facial nerves", eponym: "Bifacial lower motor neuron palsy", zone: "diffuse", side: "bilateral", prior: 5,
    w: {"lmn7:b": 3, areflexia: 2, taste: 1, tearing: 1, hyperacusis: 1, corneal: 1}, ex: ["umn7"],
    causes: "Guillain–Barré spectrum, Lyme disease, sarcoidosis, HIV, meningeal disease or bilateral structural neuropathy.",
    investigation: "Assess reflexes and respiratory function; targeted infection/inflammation testing, contrast MRI, CSF and nerve conduction studies guided by context.",
    pearl: "Bilateral facial weakness may hide asymmetry, so test eye closure, forehead movement and cheek inflation directly. Consider systemic neuropathy, infection or meningeal disease before assigning bilateral Bell’s palsy. Areflexia supports a Guillain–Barré spectrum disorder; exposure history and other cranial signs help direct further investigation."
  }
];

const SITES_C = [
  {
    id: "olfactory", name: "Olfactory nerve, bulb or tract", eponym: "Isolated anosmia", zone: "frontal", side: "unilateral", prior: 7,
    w: {anosmia: 3}, ex: [],
    causes: "Sinonasal disease and post-viral loss are commonest; head injury can shear olfactory filaments at the cribriform plate. Neurodegenerative disease and anterior fossa masses are less common.",
    investigation: "Nasal examination or endoscopy first; MRI of the olfactory bulbs and anterior cranial fossa when loss is unilateral, unexplained or accompanied by other neurological signs.",
    pearl: "Test each nostril separately with a familiar, non-irritant odour: ammonia stimulates trigeminal endings and can be detected despite anosmia. Unilateral loss is more localising than bilateral loss, which is usually nasal or post-viral. Reduced smell can precede Parkinson’s disease by years."
  },
  {
    id: "foster-kennedy", name: "Olfactory groove and optic nerve", eponym: "Foster Kennedy syndrome", zone: "frontal", side: "unilateral", prior: 3,
    w: {anosmia: 3, monocular: 2, papilloedema: 2, rapd: 1}, ex: ["bitemporal", "homonymous"],
    causes: "Olfactory groove or sphenoid wing meningioma, frontal glioma or another anterior cranial fossa mass.",
    investigation: "Contrast MRI brain with attention to the anterior cranial fossa and optic canals; acuity, colour vision, fields and fundoscopy of both eyes.",
    pearl: "Optic atrophy in one eye with disc swelling in the other, plus anosmia on the side of the atrophy, suggests a frontal mass compressing one optic nerve while raising intracranial pressure. Smell is rarely tested, so the clue is often missed. Sequential ischaemic optic neuropathy (pseudo-Foster Kennedy) is more common than the true syndrome."
  },
  {
    id: "gca", name: "Arteritic ischaemic optic neuropathy", eponym: "Giant cell arteritis", zone: "optic", side: "unilateral", prior: 6,
    w: {monocular: 3, gcaSymptoms: 3, rapd: 2}, ex: ["bitemporal", "homonymous"],
    causes: "Giant cell arteritis occluding the short posterior ciliary arteries, usually in people over 50.",
    investigation: "Same-day ESR, CRP and platelet count with emergency ophthalmology review. Start high-dose glucocorticoids without waiting for temporal artery ultrasound or biopsy when suspicion is high.",
    pearl: "Sudden painless monocular loss with jaw claudication or scalp tenderness in an older patient is giant cell arteritis until proven otherwise: the fellow eye can be lost within days. A chalky-white swollen disc supports arteritic ischaemia. Normal inflammatory markers make arteritis less likely but do not exclude it, and transient visual loss or diplopia may come first."
  },
  {
    id: "pituitary-apoplexy", name: "Sella and suprasellar region", eponym: "Pituitary apoplexy", zone: "optic", side: "midline", prior: 4,
    w: {bitemporal: 3, iii: 2, vi: 2, ptosis: 1, iv: 1, ophthalmoplegia: 1, monocular: 1, thunderclap: 1, consciousness: 1, seesaw: 1}, ex: ["homonymous"],
    causes: "Haemorrhage or infarction of a pituitary adenoma, often previously unknown; anticoagulation, surgery and pregnancy are recognised precipitants.",
    investigation: "Emergency assessment, urgent pituitary MRI (CT if MRI is unavailable) and immediate cortisol and pituitary hormone testing. Steroid cover should not be delayed in an unwell patient.",
    pearl: "Sudden headache with visual field loss or ophthalmoplegia suggests pituitary apoplexy: the expanding gland compresses the chiasm above and the cavernous sinuses on either side, where III is the nerve most often affected. Acute adrenal insufficiency can be life-threatening and is easily overlooked behind the neuro-ophthalmic signs."
  },
  {
    id: "vestibular-neuritis", name: "Vestibular nerve", eponym: "Vestibular neuritis", zone: "petrous", side: "unilateral", prior: 8,
    w: {headImpulse: 3, vertigo: 1, gaitAtaxia: 1, "peripheralNystagmus:c": 2}, ex: ["skew", "centralNystagmus", "hearing", "limbAtaxia", "weak:c", "dysarthria", "downbeat", "upbeat"],
    causes: "Presumed viral or inflammatory vestibular neuropathy, usually of the superior vestibular nerve.",
    investigation: "Bedside HINTS examination by a trained clinician, hearing assessment and a full neurological examination. Any central sign, new hearing loss or inability to stand needs urgent stroke assessment and MRI with diffusion imaging.",
    pearl: "Acute continuous vertigo with unidirectional horizontal nystagmus, an abnormal head impulse towards the affected side and no skew is the reassuring peripheral pattern. HINTS applies only to that acute vestibular syndrome: without spontaneous nystagmus a normal head impulse is expected, not reassuring. Most patients can still walk, though unsteadily."
  },
  {
    id: "labyrinthitis", name: "Labyrinth: vestibular and cochlear end-organs", eponym: "Labyrinthitis", zone: "petrous", side: "unilateral", prior: 6,
    w: {headImpulse: 3, hearing: 3, vertigo: 1, tinnitus: 1, otitis: 1, "peripheralNystagmus:c": 2}, ex: ["skew", "centralNystagmus", "limbAtaxia", "weak:c", "lmn7", "downbeat", "upbeat"],
    causes: "Viral or bacterial labyrinthitis, including spread from otitis media. Labyrinthine infarction from AICA occlusion can look identical.",
    investigation: "Otoscopy and audiometry; urgent MRI with diffusion and posterior circulation imaging when vascular risk, central signs or other cranial nerve signs are present.",
    pearl: "Vertigo with new sensorineural hearing loss points to the inner ear, but labyrinthine ischaemia can herald an AICA stroke because the labyrinthine artery usually arises from AICA, so a peripheral-looking head impulse does not exclude it. Adding sudden hearing loss to HINTS (“HINTS plus”) catches more of these strokes."
  },
  {
    id: "cerebellar", name: "Inferior cerebellum or vestibular nuclei", eponym: "Central acute vestibular syndrome", zone: "cerebellum", side: "unilateral", prior: 6,
    w: {centralNystagmus: 3, gaitAtaxia: 3, skew: 2, limbAtaxia: 2, vertigo: 1, dysarthria: 1, vascular: 1, downbeat: 1, upbeat: 1}, ex: ["headImpulse"],
    causes: "Posterior circulation infarction, often PICA territory; cerebellar haemorrhage, demyelination or a posterior fossa mass.",
    investigation: "Emergency stroke pathway with MRI diffusion imaging and CTA or MRA of the posterior circulation. Early MRI can miss small infarcts, so repeat it if suspicion persists. A swollen cerebellum can cause hydrocephalus and needs neurosurgical vigilance.",
    pearl: "In acute continuous vertigo with nystagmus, a normal head impulse is a warning sign, as are direction-changing nystagmus, skew deviation and inability to stand unaided. An inferior cerebellar stroke can cause vertigo with no limb ataxia at all. In trained hands HINTS can be more sensitive than MRI in the first 48 hours."
  }
];

/* 3.0: nystagmus, spinal cord and cerebral localisations. */
const SITES_D = [
  {
    id: "foramen-magnum", name: "Cervicomedullary junction", eponym: "Foramen magnum syndrome", zone: "foramen-magnum", side: "midline", prior: 5,
    w: {downbeat: 3, coughHeadache: 2, capeLoss: 2, gaitAtaxia: 1, quadriparesis: 1, xii: 1, dysphagia: 1, limbAtaxia: 1}, ex: [],
    causes: "Chiari I malformation, foramen magnum meningioma, basilar invagination or another craniocervical junction lesion.",
    investigation: "MRI of the brain and cervical spine including the craniocervical junction and a sagittal view of the cerebellar tonsils; look for an associated syrinx.",
    pearl: "Downbeat nystagmus, worse on looking down and to the side, points to the cervicomedullary junction or the flocculus. A headache brought on by coughing, straining or laughing suggests tonsillar descent, and a cape-like loss of pain and temperature over the shoulders signals an associated syrinx."
  },
  {
    id: "vestibulocerebellum", name: "Flocculus, nodulus and uvula", eponym: "Vestibulocerebellar syndrome", zone: "cerebellum", side: "bilateral", prior: 5,
    w: {centralNystagmus: 3, periodicAlternating: 3, downbeat: 2, gaitAtaxia: 2, dysarthria: 1, limbAtaxia: 1}, ex: [],
    causes: "Alcohol, anticonvulsant or lithium toxicity; degenerative and paraneoplastic cerebellar disease; Chiari malformation, demyelination or a midline posterior fossa lesion.",
    investigation: "Drug history and levels, thiamine status and MRI brain with attention to the cerebellum and craniocervical junction; paraneoplastic antibodies when the course is subacute.",
    pearl: "The flocculus holds the eyes on an eccentric target, so its failure causes gaze-evoked and downbeat nystagmus. The nodulus and uvula control vestibular velocity storage, and damage there can cause periodic alternating nystagmus, which may respond to baclofen. Ask about drugs and alcohol before assuming a structural lesion."
  },
  {
    id: "upbeat-brainstem", name: "Paramedian brainstem tegmentum", eponym: "Upbeat nystagmus", zone: "medulla-medial", side: "midline", prior: 3,
    w: {upbeat: 3, gaitAtaxia: 1, dysarthria: 1, vascular: 1}, ex: [],
    causes: "Medullary or pontomesencephalic infarction, demyelination or tumour; Wernicke encephalopathy and anticonvulsant toxicity are important reversible causes.",
    investigation: "MRI brain with thin brainstem sections. Give thiamine first whenever Wernicke encephalopathy is possible.",
    pearl: "Upbeat nystagmus in the primary position is almost always central. It localises to the paramedian medulla near the hypoglossal nucleus, the pontomesencephalic junction or the anterior vermis. Treat possible Wernicke encephalopathy first: it is common, reversible and easily missed."
  },
  {
    id: "brown-sequard", name: "Hemisection of the spinal cord", eponym: "Brown-Séquard syndrome", zone: "cord-lateral", side: "unilateral", prior: 5,
    w: {weak: 3, dcml: 3, "spinothalamic:c": 3, hyperreflexia: 1, sensoryLevel: 1, sphincter: 1}, ex: ["lmn7:a", "umn7:a", "xii:a", "palate:a", "dissociatedFace:a", "homonymous:a"],
    causes: "Penetrating trauma, disc or tumour compression, demyelination or radiation myelopathy; usually incomplete in practice.",
    investigation: "Urgent MRI of the spine at and above the level suggested by the sensory findings, with trauma imaging where relevant.",
    pearl: "Weakness and loss of vibration and joint position on the side of the lesion, with pain and temperature lost on the other side, reflects where each pathway crosses: the corticospinal tract and dorsal columns in the medulla, the spinothalamic tract within a segment or two of entry. A sensory level and no cranial nerve signs separate it from a brainstem lesion."
  },
  {
    id: "anterior-cord", name: "Anterior two-thirds of the cord", eponym: "Anterior spinal artery syndrome", zone: "cord-anterior", side: "midline", prior: 4,
    w: {paraparesis: 3, "spinothalamic:b": 3, sensoryLevel: 2, sphincter: 2, quadriparesis: 1, vascular: 1}, ex: ["dcml", "romberg"],
    causes: "Anterior spinal artery infarction, often after aortic surgery or dissection, profound hypotension or atherosclerosis; also compression from in front.",
    investigation: "Urgent MRI of the spine, with diffusion imaging where available, and assessment of the aorta; exclude compression.",
    pearl: "Sudden paralysis with loss of pain and temperature below a level but preserved vibration and joint position is the anterior spinal artery pattern: the dorsal columns have their own posterior spinal supply. Back or neck pain at onset is common."
  },
  {
    id: "posterior-cord", name: "Dorsal columns", eponym: "Posterior cord syndrome", zone: "cord-posterior", side: "midline", prior: 5,
    w: {"dcml:b": 3, romberg: 3, gaitAtaxia: 2, paraparesis: 1, "hyperreflexia:b": 1, areflexia: 1}, ex: [],
    causes: "Subacute combined degeneration from vitamin B12 or copper deficiency, including nitrous oxide use; tabes dorsalis; compression from behind.",
    investigation: "B12, methylmalonic acid, homocysteine, copper and syphilis serology; MRI of the spine for dorsal column signal or compression. Ask about nitrous oxide.",
    pearl: "Loss of vibration and joint position with a positive Romberg test is sensory ataxia: the patient falls when vision is removed. B12 deficiency can combine absent ankle jerks with upgoing plantars because it damages nerves and cord together. Nitrous oxide misuse is a modern cause in young adults."
  },
  {
    id: "central-cord", name: "Central cervical cord", eponym: "Central cord syndrome", zone: "cord-central", side: "midline", prior: 5,
    w: {armsWorse: 3, quadriparesis: 2, capeLoss: 1, sphincter: 1, lmnArms: 1}, ex: [],
    causes: "Hyperextension injury of a spondylotic neck, often a fall in an older adult; also intramedullary tumour.",
    investigation: "Urgent MRI of the cervical spine, with immobilisation after trauma.",
    pearl: "Weakness worse in the arms, especially the hands, than the legs after a neck injury suggests central cord damage. Bladder function and sacral sensation are often relatively spared. A fall from standing is enough in a narrowed cervical canal."
  },
  {
    id: "syrinx", name: "Central canal and anterior commissure", eponym: "Syringomyelia", zone: "cord-central", side: "midline", prior: 4,
    w: {capeLoss: 3, lmnArms: 2, armsWorse: 1, coughHeadache: 1, horner: 1}, ex: [],
    causes: "Chiari I malformation is the commonest association; also post-traumatic, post-infective and tumour-related syrinx.",
    investigation: "MRI of the whole spine and craniocervical junction, with contrast if no Chiari malformation is found.",
    pearl: "Pain and temperature fibres cross in the anterior commissure, just in front of the central canal, so an expanding syrinx removes them first, in a cape over the shoulders and arms, while touch and vibration are spared. Painless burns on the hands are the classic history. Later, anterior horn damage causes wasting and areflexia in the arms."
  },
  {
    id: "transverse-cord", name: "Complete transverse cord lesion", eponym: "Transverse myelopathy", zone: "cord-transverse", side: "midline", prior: 7,
    w: {paraparesis: 3, sensoryLevel: 3, sphincter: 2, "spinothalamic:b": 1, "dcml:b": 1, "hyperreflexia:b": 1, quadriparesis: 1}, ex: ["lmn7", "umn7", "expressiveAphasia", "receptiveAphasia", "homonymous"],
    causes: "Spinal cord compression from metastasis, disc, abscess or haematoma; transverse myelitis, demyelination or infarction.",
    investigation: "Emergency MRI of the whole spine. If there is no compression, MRI brain and CSF for inflammatory myelitis, including aquaporin-4 and MOG antibodies.",
    pearl: "Weakness of both legs with a sensory level and bladder involvement is cord compression until proven otherwise. Reflexes can be reduced at first (spinal shock) rather than brisk. The sensory level is the lowest the lesion can be; it may lie several segments higher, so image above it."
  },
  {
    id: "cauda-equina", name: "Cauda equina and conus", eponym: "Cauda equina syndrome", zone: "cauda", side: "midline", prior: 5,
    w: {saddle: 3, sphincter: 3, paraparesis: 2, areflexia: 2}, ex: ["hyperreflexia", "sensoryLevel"],
    causes: "Central lumbar disc prolapse is commonest; also tumour, abscess, haematoma or spinal stenosis.",
    investigation: "Emergency MRI of the lumbosacral spine; record perianal sensation, anal tone and post-void residual volume.",
    pearl: "Saddle numbness with new urinary retention or incontinence is a surgical emergency: outcome depends on decompression before function is lost. The roots are lower motor neuron, so the legs may be weak and areflexic, often asymmetrically, with no sensory level on the trunk."
  },
  {
    id: "mca-dominant", name: "Dominant (left) hemisphere, MCA territory", eponym: "Dominant MCA syndrome", zone: "hemisphere", side: "unilateral", lesionSides: ["L"], prior: 8,
    w: {"weakFaceArm:c": 3, "weak:c": 2, "umn7:c": 2, expressiveAphasia: 2, receptiveAphasia: 2, "gaze:c": 2, "homonymous:c": 1, "corticalSensory:c": 1, "spinothalamic:c": 1, "dcml:c": 1, gerstmann: 1, vascular: 1}, ex: ["lmn7:a", "dissociatedFace:a", "sensoryLevel"],
    causes: "Middle cerebral artery embolism or thrombosis; less often haemorrhage, tumour or abscess.",
    investigation: "Emergency stroke pathway: immediate CT with CT angiography for large vessel occlusion; thrombolysis and thrombectomy decisions depend on the time window and imaging.",
    pearl: "Face and arm weaker than leg with aphasia means the left middle cerebral artery territory in nearly all right-handed people and most left-handed ones. Eyes deviated towards the lesion and a field defect suggest a large territory. Time from onset decides the reperfusion options, so note when the patient was last well."
  },
  {
    id: "mca-nondominant", name: "Non-dominant (right) hemisphere, MCA territory", eponym: "Non-dominant MCA syndrome", zone: "hemisphere", side: "unilateral", lesionSides: ["R"], prior: 7,
    w: {"weakFaceArm:c": 3, "neglect:c": 3, "weak:c": 2, "umn7:c": 2, "gaze:c": 2, "homonymous:c": 1, "corticalSensory:c": 1, "spinothalamic:c": 1, "dcml:c": 1, vascular: 1}, ex: ["expressiveAphasia", "receptiveAphasia", "gerstmann", "lmn7:a", "dissociatedFace:a", "sensoryLevel"],
    causes: "Middle cerebral artery embolism or thrombosis; less often haemorrhage, tumour or abscess.",
    investigation: "Emergency stroke pathway with CT and CT angiography, as for any suspected large vessel occlusion.",
    pearl: "Neglect of the left side of space, often with unawareness of the weakness, points to the right parietal lobe. Neglect can hide the deficit from the patient, so test with line bisection, cancellation and bilateral simultaneous stimuli. The absence of aphasia does not make a right hemisphere stroke minor."
  },
  {
    id: "broca", name: "Dominant inferior frontal gyrus", eponym: "Broca aphasia", zone: "frontal-lobe", side: "unilateral", lesionSides: ["L"], prior: 4,
    w: {expressiveAphasia: 3, "weakFaceArm:c": 2, "umn7:c": 2, "weak:c": 1, vascular: 1}, ex: ["neglect:a", "lmn7:a"],
    causes: "Superior division MCA infarction, haemorrhage, tumour or focal neurodegeneration.",
    investigation: "Stroke imaging for a sudden onset, otherwise MRI brain; speech and language assessment.",
    pearl: "Non-fluent, effortful speech with relatively good comprehension, often with right face and arm weakness because the motor cortex lies next door. Repetition is impaired, which separates it from transcortical motor aphasia. Patients are usually aware of the problem and frustrated by it."
  },
  {
    id: "wernicke-aphasia", name: "Dominant posterior superior temporal gyrus", eponym: "Wernicke aphasia", zone: "temporal", side: "unilateral", lesionSides: ["L"], prior: 4,
    w: {receptiveAphasia: 3, "homonymous:c": 1, vascular: 1}, ex: ["weak:a", "weakFaceArm:a", "neglect:a"],
    causes: "Inferior division MCA infarction, haemorrhage, tumour or abscess.",
    investigation: "Stroke imaging for a sudden onset, otherwise MRI brain.",
    pearl: "Fluent speech full of paraphasias with poor comprehension, often with little awareness and no weakness, so it is easily mistaken for delirium or psychiatric illness. A contralateral upper quadrantanopia can accompany it because Meyer’s loop runs nearby."
  },
  {
    id: "gerstmann", name: "Dominant angular gyrus", eponym: "Gerstmann syndrome", zone: "parietal", side: "unilateral", lesionSides: ["L"], prior: 3,
    w: {gerstmann: 3, receptiveAphasia: 1, "homonymous:c": 1, "corticalSensory:c": 1}, ex: [],
    causes: "Infarction, haemorrhage or tumour of the dominant inferior parietal lobule.",
    investigation: "MRI brain, or the stroke pathway for a sudden onset.",
    pearl: "Acalculia, agraphia, finger agnosia and left–right confusion together point to the dominant angular gyrus. The complete tetrad is uncommon, and mild aphasia or an inferior quadrantanopia often accompanies it."
  },
  {
    id: "aca", name: "Medial frontal lobe, ACA territory", eponym: "Anterior cerebral artery syndrome", zone: "frontal-lobe", side: "unilateral", prior: 4,
    w: {"weakLeg:c": 3, "weak:c": 2, abulia: 2, sphincter: 2, "corticalSensory:c": 1, "dcml:c": 1, vascular: 1}, ex: ["weakFaceArm:a", "lmn7:a", "sensoryLevel"],
    causes: "Anterior cerebral artery embolism or thrombosis, vasospasm after anterior communicating artery aneurysm rupture, or a parafalcine mass.",
    investigation: "Stroke imaging with CT angiography for a sudden onset, otherwise MRI brain.",
    pearl: "The leg area of the motor cortex lies on the medial surface, so ACA infarction weakens the opposite leg more than the arm and spares the face. Abulia and urinary incontinence reflect medial frontal damage. Bilateral ACA infarction weakens both legs and can be mistaken for a cord lesion."
  },
  {
    id: "frontal-eye-field", name: "Frontal eye field", eponym: "Frontal gaze palsy", zone: "frontal-lobe", side: "unilateral", prior: 4,
    w: {"gaze:c": 3, "weak:c": 2, "weakFaceArm:c": 1, "umn7:c": 1, vascular: 1}, ex: ["lmn7:a", "ino:a", "vi:a"],
    causes: "Acute frontal infarction or haemorrhage; during a seizure the eyes can deviate away from the focus instead.",
    investigation: "Emergency stroke imaging.",
    pearl: "Eyes deviated towards the lesion and away from the weak side point to the frontal eye field; after a pontine lesion the eyes look away from the lesion and towards the weak side. The doll’s eye manoeuvre usually overcomes a frontal gaze palsy but not a pontine nuclear one."
  },
  {
    id: "cortical-blindness", name: "Both occipital lobes", eponym: "Cortical blindness", zone: "occipital", side: "bilateral", prior: 3,
    w: {"homonymous:b": 3, consciousness: 1, vascular: 1}, ex: ["rapd", "pupil"],
    causes: "Top of the basilar or bilateral posterior cerebral artery infarction, posterior reversible encephalopathy syndrome, hypoxia or cardiac surgery.",
    investigation: "Emergency stroke imaging including the posterior circulation, then MRI with diffusion; check blood pressure and drugs for PRES.",
    pearl: "Severe visual loss with normal pupillary light reactions and normal fundi places the lesion behind the lateral geniculate body, most often in both occipital lobes. In Anton syndrome the patient denies being blind and confabulates what they see. Macular sparing can leave a small central island of vision."
  },
  {
    id: "lacunar-motor", name: "Posterior limb of the internal capsule", eponym: "Pure motor stroke", zone: "deep", side: "unilateral", prior: 7,
    w: {"weak:c": 3, "umn7:c": 2, dysarthria: 1, vascular: 1}, ex: ["expressiveAphasia", "receptiveAphasia", "gerstmann", "neglect:a", "homonymous:a", "corticalSensory:a", "spinothalamic:a", "dcml:a"],
    causes: "Small vessel (lacunar) infarction linked to hypertension and diabetes, or a small deep haemorrhage.",
    investigation: "Emergency stroke pathway; MRI with diffusion to confirm a small deep infarct, and vascular risk assessment.",
    pearl: "Weakness of the face, arm and leg on one side without aphasia, neglect, field loss or sensory loss suggests a small deep infarct where motor fibres are packed tightly. The same pattern can arise in the ventral pons. Lacunar syndromes can fluctuate or worsen over the first days (capsular warning syndrome)."
  },
  {
    id: "thalamic-sensory", name: "Ventral posterior thalamus", eponym: "Pure sensory stroke", zone: "deep", side: "unilateral", prior: 5,
    w: {"spinothalamic:c": 3, "dcml:c": 3, "v1:c": 1, "v2:c": 1, "v3:c": 1, vascular: 1}, ex: ["weak:a", "expressiveAphasia", "receptiveAphasia", "neglect:a"],
    causes: "Lacunar infarction of thalamogeniculate branches or a small thalamic haemorrhage.",
    investigation: "Emergency stroke pathway and MRI with diffusion.",
    pearl: "Numbness of the face, arm and leg on one side, in all modalities and without weakness, points to the ventral posterior thalamus. The face is affected on the same side as the body, unlike the crossed pattern of a lateral medullary lesion. Weeks later the numb side can become painful (central post-stroke pain)."
  },
  {
    id: "subthalamic", name: "Subthalamic nucleus", eponym: "Hemiballismus", zone: "deep", side: "unilateral", prior: 3,
    w: {"ballism:c": 3, vascular: 1}, ex: [],
    causes: "Small vessel infarction or haemorrhage in or near the subthalamic nucleus; non-ketotic hyperglycaemia is a reversible cause.",
    investigation: "Glucose and HbA1c, then MRI brain, which can show striatal T1 hyperintensity in hyperglycaemic chorea.",
    pearl: "Violent flinging movements of one arm and leg arise from the opposite subthalamic nucleus or nearby basal ganglia. Check the glucose: non-ketotic hyperglycaemia in an older person with diabetes is a well-recognised, reversible cause. The movements often settle over weeks."
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
  { title: 'A pattern can be diffuse rather than focal', text: 'Variable, fatigable ocular/bulbar weakness with preserved pupils, sensation and reflexes favours myasthenia. Ophthalmoplegia with gait ataxia and areflexia suggests Miller Fisher syndrome. Bilateral or multifocal findings should prompt a diffuse differential instead of forcing every sign into one focal lesion.' },
  { title: 'In acute vertigo, a normal head impulse is a warning', text: 'With continuous vertigo and spontaneous nystagmus, an abnormal head impulse, unidirectional horizontal nystagmus and no skew favour vestibular neuritis. A normal head impulse, direction-changing or vertical nystagmus, skew deviation, new hearing loss or inability to stand point to a stroke. HINTS does not apply without spontaneous nystagmus.' },
  { title: 'Sudden loss in one eye over 50: ask about the jaw', text: 'Jaw claudication, scalp tenderness and new headache suggest giant cell arteritis, which can take the other eye within days. Check ESR and CRP the same day and start high-dose steroids when suspicion is high rather than waiting for biopsy.' }
];

const SITES = [...SITES_A, ...SITES_B, ...SITES_C, ...SITES_D];

/* Practice topics; every site belongs to exactly one. */
const TOPICS = [
  {id: 'brainstem', name: 'Brainstem', sites: ['weber','claude','benedikt','nothnagel','parinaud','nuclear-iii','millard-gubler','raymond','foville','facial-colliculus','ino','one-and-half','aica','lateral-midpons','wallenberg','dejerine','avellis','jackson']},
  {id: 'eyes', name: 'Eye movements & orbit', sites: ['compressive-iii','microvascular-iii','uncal','trochlear','microvascular-vi','raised-icp-vi','gradenigo','cavernous','sof','orbital-apex','tolosa-hunt','thyroid-eye','isolated-horner']},
  {id: 'vision', name: 'Vision & smell', sites: ['optic-nerve','junctional','chiasm','retrochiasmal','olfactory','foster-kennedy','gca','pituitary-apoplexy','cortical-blindness']},
  {id: 'face', name: 'Face & ear', sites: ['cpa','iam','bells','proximal-facial','ramsay-hunt','tympanic-facial','mastoid-facial','stylomastoid','supranuclear-vii','trigeminal-ganglion','foramen-ovale','numb-chin','isolated-v2']},
  {id: 'balance', name: 'Vertigo & nystagmus', sites: ['vestibular-neuritis','labyrinthitis','cerebellar','vestibulocerebellum','upbeat-brainstem','foramen-magnum']},
  {id: 'lower', name: 'Lower cranial nerves', sites: ['pseudobulbar','bulbar','vernet','collet-sicard','villaret','tapia','isolated-xii','recurrent-laryngeal']},
  {id: 'cortex', name: 'Cortex & deep', sites: ['mca-dominant','mca-nondominant','broca','wernicke-aphasia','gerstmann','aca','frontal-eye-field','lacunar-motor','thalamic-sensory','subthalamic']},
  {id: 'cord', name: 'Spinal cord', sites: ['brown-sequard','anterior-cord','posterior-cord','central-cord','syrinx','transverse-cord','cauda-equina']},
  {id: 'diffuse', name: 'Diffuse & neuromuscular', sites: ['myasthenia','miller-fisher','wernicke','bilateral-lmn-vii']}
];

const GROUPS = [
  {id:'vision',name:'Vision & smell',nerve:'I, II',hint:'Olfactory optic nerve fields visual pathways'},
  {id:'eyes',name:'Eye movements & pupils',nerve:'III, IV, VI',hint:'Oculomotor trochlear abducens'},
  {id:'nystagmus',name:'Nystagmus',nerve:'≋',hint:'Vestibular cerebellar ocular motor'},
  {id:'face',name:'Facial sensation & movement',nerve:'V, VII',hint:'Trigeminal facial'},
  {id:'hearing',name:'Hearing & balance',nerve:'VIII',hint:'Vestibulocochlear auditory vestibular HINTS'},
  {id:'bulbar',name:'Bulbar function',nerve:'IX–XII',hint:'Glossopharyngeal vagus accessory hypoglossal'},
  {id:'tracts',name:'Long tracts & coordination',nerve:'↕',hint:'Motor sensory cerebellar reflexes'},
  {id:'cortex',name:'Cortex & deep structures',nerve:'Cx',hint:'Cerebral hemisphere language neglect capsule thalamus'},
  {id:'cord',name:'Spinal cord',nerve:'C–S',hint:'Myelopathy cauda equina level sphincter'},
  {id:'context',name:'Clinical context',nerve:'＋',hint:'Consciousness pressure headache risk'}
];

/*
 * Findings. A sided finding is recorded as 'R', 'L' or 'B' (both); others as 'P'
 * (present). 'N' means tested normal, on both sides. `sided` is the label template,
 * `both` the bilateral label (false when "both" makes no sense), `soft` marks a less
 * specific finding, `test` is the bedside technique and `syn` holds search terms.
 */
const FINDINGS = [
  {id:"anosmia",group:"vision",name:"Reduced smell",sided:"Reduced smell on the {side}",both:"Reduced smell in both nostrils",hint:"Hyposmia or anosmia with each nostril tested alone",
    test:"Occlude one nostril and, with the eyes closed, offer a familiar non-irritant odour such as coffee, peppermint or soap to the other; repeat on the other side. Avoid ammonia, which stimulates trigeminal endings.",
    syn:"smell olfactory anosmia hyposmia odour nose"},
  {id:"monocular",group:"vision",name:"Monocular visual loss",sided:"Visual loss in the {side} eye",both:"Visual loss in both eyes",hint:"Reduced acuity or vision in one eye",
    test:"Test acuity in each eye separately with a chart and pinhole, then confirm the loss is monocular by covering each eye in turn.",
    syn:"blind blindness acuity blurred sight eye"},
  {id:"rapd",group:"vision",name:"RAPD",sided:"RAPD in the {side} eye",both:false,hint:"Relative afferent pupillary defect: choose the eye whose pupil dilates as the light swings onto it",
    test:"Swinging-flashlight test in a dim room: move the light briskly between the eyes, pausing two to three seconds on each. The affected pupil dilates as the light swings onto it.",
    syn:"marcus gunn afferent pupil swinging flashlight"},
  {id:"junctional",group:"vision",name:"Superotemporal field loss in one eye",sided:"Superotemporal field loss in the {side} eye",both:false,hint:"Junctional scotoma: the fellow-eye defect that accompanies optic neuropathy in the other eye. Choose the eye with the field defect",
    test:"Test the fields of each eye separately, looking specifically at the upper temporal quadrant of the eye opposite the visual loss. Confirm with formal perimetry.",
    syn:"scotoma wilbrand field quadrant"},
  {id:"bitemporal",group:"vision",label:"Bitemporal field loss",hint:"Temporal visual hemifield loss in both eyes",
    test:"Confront each eye separately; a red target moved across the vertical meridian may show early temporal desaturation. Confirm with formal perimetry.",
    syn:"hemianopia hemianopsia chiasm tunnel peripheral field pituitary"},
  {id:"homonymous",group:"vision",name:"Homonymous field loss",sided:"{Side} homonymous field loss",both:"Bilateral homonymous field loss",hint:"The same side of the visual field lost in both eyes: choose the missing side. Both sides together means cortical blindness",
    test:"Confront each eye separately: a homonymous defect involves the same side of the field in both eyes. Formal perimetry shows its congruity.",
    syn:"hemianopia hemianopsia quadrantanopia field cut occipital"},
  {id:"ptosis",group:"eyes",name:"Ptosis",sided:"Ptosis on the {side}",both:"Bilateral ptosis",hint:"Drooping upper eyelid",
    test:"Compare the upper lid margins with the pupils in primary gaze, then check whether the ptosis worsens on sustained upgaze and whether the pupil is involved.",
    syn:"droopy drooping eyelid lid droop"},
  {id:"iii",group:"eyes",name:"III ophthalmoplegia",sided:"III ophthalmoplegia on the {side}",both:"Bilateral III ophthalmoplegia",hint:"Oculomotor-pattern weakness: adduction, elevation and depression",
    test:"Keep the head still and follow a target through an H pattern, testing adduction, elevation and depression. A complete palsy leaves the eye resting down and out.",
    syn:"oculomotor third nerve down and out double vision diplopia"},
  {id:"pupil",group:"eyes",name:"Dilated pupil",sided:"Dilated {side} pupil",both:"Both pupils dilated and poorly reactive",hint:"Mydriasis with impaired light response",
    test:"Compare pupil size in bright and dim light, then test direct and consensual light responses. Anisocoria greater in bright light points to the larger pupil.",
    syn:"mydriasis blown fixed dilated anisocoria"},
  {id:"iv",group:"eyes",name:"IV-pattern diplopia",sided:"IV palsy on the {side}",both:"Bilateral IV palsy",hint:"Trochlear-pattern vertical or torsional diplopia, worse down and in",
    test:"Ask about vertical diplopia when looking down and towards the nose, then use the three-step test: which eye is higher, in which horizontal gaze, and with which head tilt.",
    syn:"trochlear fourth superior oblique vertical double vision head tilt"},
  {id:"vi",group:"eyes",name:"Abduction deficit",sided:"Abduction deficit on the {side}",both:"Bilateral VI palsy",hint:"Abducens VI: impaired outward movement of the eye",
    test:"Follow a target horizontally and look for incomplete abduction, with horizontal diplopia worse at distance and towards the weak side.",
    syn:"abducens sixth lateral rectus double vision diplopia"},
  {id:"ophthalmoplegia",group:"eyes",label:"Bilateral ophthalmoplegia",hint:"Weak eye movements on both sides",
    test:"Test pursuit and saccades in every direction for each eye, noting whether the deficit follows a single nerve, both sides or no nerve pattern.",
    syn:"external ophthalmoplegia eye movements weak"},
  {id:"gaze",group:"eyes",name:"Conjugate gaze palsy",sided:"Gaze palsy to the {side}",both:"Gaze palsy to both sides",hint:"Both eyes cannot look towards one side: choose that direction. A pontine lesion causes a palsy towards the lesion, a frontal lesion a palsy away from it",
    test:"Ask the patient to look to each side, then test the oculocephalic (doll’s eye) response. A VI nuclear palsy is not overcome by it; a supranuclear gaze palsy often is.",
    syn:"horizontal gaze palsy pprf doll"},
  {id:"ino",group:"eyes",name:"INO",sided:"INO on the {side}",both:"Bilateral INO",hint:"Internuclear ophthalmoplegia: choose the eye that fails to adduct",
    test:"Test fast horizontal saccades: the adducting eye on the lesion side is slow or falls short, often with nystagmus of the abducting fellow eye.",
    syn:"internuclear mlf adduction multiple sclerosis"},
  {id:"upgaze",group:"eyes",label:"Upgaze palsy",hint:"Impaired conjugate upward gaze",
    test:"Test vertical pursuit and saccades, then the oculocephalic response: improvement with head movement suggests a supranuclear cause.",
    syn:"vertical gaze looking up"},
  {id:"lightNear",group:"eyes",label:"Light–near dissociation",hint:"Pupils constrict better for near than to light",
    test:"Compare constriction to a bright light with constriction while converging on a near target held about 15 cm away.",
    syn:"argyll robertson pupil near reaction"},
  {id:"convergenceRetraction",group:"eyes",label:"Convergence–retraction nystagmus",hint:"Convergence and globe retraction on attempted upgaze",
    test:"Ask for a quick upward look, or rotate an optokinetic drum or tape downwards. Watch for the eyes converging and retracting into the orbits.",
    syn:"nystagmus retraction parinaud optokinetic"},
  {id:"lidRetraction",group:"eyes",label:"Lid retraction",hint:"Abnormally elevated upper lid",
    test:"Look for white sclera above the cornea in primary gaze. Lid lag on slow downgaze favours thyroid eye disease.",
    syn:"collier sign stare sclera show"},
  {id:"proptosis",group:"eyes",label:"Proptosis",hint:"Forward displacement of the globe",
    test:"Stand behind the seated patient and look down over the brow to compare how far each globe protrudes; measure with an exophthalmometer if available.",
    syn:"exophthalmos bulging eye"},
  {id:"painfulEye",group:"eyes",label:"Painful ophthalmoplegia",hint:"Eye movement weakness accompanied by pain",
    test:"Ask where the pain is and whether it preceded the diplopia, then examine eye movements and look for chemosis, redness or orbital congestion.",
    syn:"eye pain diplopia orbital"},
  {id:"fatigability",group:"eyes",label:"Fatigability",hint:"Weakness worsens with sustained activity and improves with rest",
    test:"Ask for sustained upgaze for 60 seconds and watch for increasing ptosis or diplopia. An ice pack on the lid for two minutes may improve myasthenic ptosis.",
    syn:"myasthenia fatigue variable fluctuating weakness ice pack"},
  {id:"horner",group:"eyes",name:"Horner syndrome",sided:"Horner syndrome on the {side}",both:"Bilateral Horner syndrome",hint:"Miosis, mild ptosis, with or without anhidrosis",
    test:"Compare pupils in light and dim light: anisocoria greater in the dark, with dilation lag of the smaller pupil. Look for mild ptosis and a slightly raised lower lid.",
    syn:"miosis small pupil sympathetic anhidrosis"},
  {id:"centralNystagmus",group:"nystagmus",label:"Direction-changing nystagmus",hint:"Gaze-evoked nystagmus that reverses with the direction of gaze: a central sign in acute vertigo",
    test:"Observe the eyes in the primary position and 30° to each side. Nystagmus that changes direction with gaze, or is purely vertical or torsional, is central.",
    syn:"nystagmus central direction changing vertical hints"},
  {id:"peripheralNystagmus",group:"nystagmus",name:"Unidirectional horizontal nystagmus",sided:"Horizontal nystagmus beating to the {side}",both:false,hint:"Horizontal–torsional, beating one way in every gaze and suppressed by fixation: choose the direction of the fast phase. Points to a peripheral vestibular loss on the opposite side",
    test:"Look in the primary position and 30° to each side, then remove fixation, for example with Frenzel lenses. Peripheral nystagmus keeps one direction, increases when looking towards the fast phase and grows without fixation.",
    syn:"nystagmus vestibular neuritis peripheral fast phase"},
  {id:"downbeat",group:"nystagmus",label:"Downbeat nystagmus",hint:"Fast phase downwards, usually most obvious on looking down and to the side",
    test:"Observe in the primary position, then on looking down and laterally, where downbeat nystagmus is usually most obvious.",
    syn:"vertical nystagmus chiari foramen magnum"},
  {id:"upbeat",group:"nystagmus",label:"Upbeat nystagmus",hint:"Fast phase upwards in the primary position",
    test:"Observe the eyes in the primary position and on upgaze, noting whether the nystagmus persists in the primary position.",
    syn:"vertical nystagmus"},
  {id:"periodicAlternating",group:"nystagmus",label:"Periodic alternating nystagmus",hint:"Horizontal nystagmus that reverses direction roughly every one to two minutes",
    test:"Watch the eyes in the primary position for at least three minutes: the direction reverses after a brief null period.",
    syn:"pan nodulus uvula"},
  {id:"seesaw",group:"nystagmus",label:"See-saw nystagmus",hint:"One eye rises and intorts while the other falls and extorts, alternating",
    test:"Watch both eyes together in the primary position for alternating vertical and torsional movements in opposite directions.",
    syn:"see saw parasellar chiasm"},
  {id:"bruns",group:"nystagmus",name:"Bruns nystagmus",sided:"Bruns nystagmus, coarse to the {side}",both:false,hint:"Coarse, slow nystagmus on gaze towards a large cerebellopontine angle mass and fine, fast nystagmus on gaze away: choose the coarse side",
    test:"Compare nystagmus on sustained gaze to each side: large, slow beats to one side and small, fast beats to the other.",
    syn:"cerebellopontine angle schwannoma acoustic neuroma"},
  {id:"v1",group:"face",name:"V1 numbness",sided:"V1 numbness on the {side}",both:"Bilateral V1 numbness",hint:"Ophthalmic division: forehead and cornea",
    test:"Compare light touch and pinprick on the forehead and front of the scalp with the other side.",
    syn:"ophthalmic trigeminal forehead numb sensation"},
  {id:"v2",group:"face",name:"V2 numbness",sided:"V2 numbness on the {side}",both:"Bilateral V2 numbness",hint:"Maxillary division: cheek and upper lip",
    test:"Compare light touch and pinprick over the cheek and upper lip, and ask about the upper gum and teeth.",
    syn:"maxillary trigeminal cheek numb sensation"},
  {id:"v3",group:"face",name:"V3 numbness",sided:"V3 numbness on the {side}",both:"Bilateral V3 numbness",hint:"Broad mandibular division sensory loss",
    test:"Compare light touch and pinprick over the lower lip, chin and lower cheek. The angle of the jaw is supplied by C2–C3, not V.",
    syn:"mandibular trigeminal jaw numb sensation"},
  {id:"chin",group:"face",name:"Numb chin / lower lip",sided:"Numb chin on the {side}",both:"Numb chin on both sides",hint:"Sensory loss restricted to the mental or inferior alveolar nerve territory",
    test:"Map light touch and pinprick across the chin and lower lip, then compare with the rest of the V3 territory.",
    syn:"mental nerve lip numbness"},
  {id:"corneal",group:"face",name:"Reduced corneal reflex",sided:"Reduced corneal reflex on the {side}",both:"Both corneal reflexes reduced",hint:"V1 afferent or VII efferent dysfunction; assess both limbs",
    test:"Approach from the side and touch the edge of the cornea, not the sclera, with a wisp of cotton. Watch both eyes blink and ask whether the touch was felt.",
    syn:"blink reflex cornea"},
  {id:"vmotor",group:"face",name:"Jaw (V motor) weakness",sided:"Jaw weakness on the {side}",both:"Bilateral jaw weakness",hint:"Weak mastication; the jaw deviates towards the weak side on opening",
    test:"Feel both masseters as the patient clenches, then ask them to open the mouth against resistance and watch for deviation towards the weak side.",
    syn:"masseter pterygoid chewing jaw deviation"},
  {id:"dissociatedFace",group:"face",name:"Facial pain/temperature loss, touch spared",sided:"Facial pain/temperature loss on the {side}",both:"Facial pain/temperature loss on both sides",hint:"Dissociated trigeminal sensory loss",
    test:"Compare pinprick and a cold tuning fork with light touch on each side of the face. Loss of pain and temperature with preserved touch suggests the spinal trigeminal pathway.",
    syn:"face numb pain temperature spinal trigeminal"},
  {id:"retroOrbital",group:"face",name:"Retro-orbital pain",sided:"Retro-orbital pain on the {side}",both:"Retro-orbital pain on both sides",hint:"Deep pain behind the eye",
    test:"Ask about deep pain behind the eye and its relationship to eye movement; feel for periorbital tenderness.",
    syn:"eye pain headache behind eye"},
  {id:"lmn7",group:"face",name:"LMN VII weakness",sided:"LMN VII weakness on the {side}",both:"Bilateral LMN VII weakness",hint:"Lower motor neuron facial weakness involving upper and lower face",
    test:"Ask the patient to raise the eyebrows, screw the eyes shut, show the teeth and puff out the cheeks. In a lower motor neuron lesion the forehead is weak too.",
    syn:"facial palsy bell droop weakness"},
  {id:"umn7",group:"face",name:"UMN VII weakness",sided:"UMN VII weakness on the {side}",both:"Bilateral UMN facial weakness",hint:"Predominantly lower-face weakness; relative forehead sparing",
    test:"Compare forehead wrinkling and eye closure with the smile. Relative sparing of the forehead favours an upper motor neuron lesion.",
    syn:"facial droop stroke central forehead sparing"},
  {id:"hyperacusis",group:"face",name:"Hyperacusis",sided:"Hyperacusis on the {side}",both:"Hyperacusis in both ears",hint:"Increased sound sensitivity from stapedius weakness",
    test:"Ask whether ordinary sounds are uncomfortably loud in one ear; the stapedial reflex on audiometry confirms it.",
    syn:"loud sounds stapedius"},
  {id:"taste",group:"face",name:"Taste loss, front of tongue",sided:"Taste loss on the {side}, front of tongue",both:"Taste loss on both sides of the tongue",hint:"Anterior two-thirds taste loss",
    test:"Dab a sweet or salty solution on each side of the protruded front of the tongue and have the patient point to the answer before withdrawing it.",
    syn:"taste chorda tympani tongue anterior two thirds"},
  {id:"tearing",group:"face",name:"Reduced tearing",sided:"Reduced tearing on the {side}",both:"Reduced tearing on both sides",hint:"Reduced lacrimation",
    test:"Ask about a dry eye; a Schirmer test compares tear production, although poor blinking can cause reflex watering.",
    syn:"lacrimation dry eye tears schirmer"},
  {id:"vesicles",group:"face",name:"Ear vesicles",sided:"Ear vesicles on the {side}",both:false,hint:"Vesicular eruption on pinna or in ear canal",
    test:"Inspect the pinna and ear canal with an otoscope, and the palate with a torch, for vesicles or crusts.",
    syn:"zoster shingles rash blisters"},
  {id:"parotid",group:"face",name:"Parotid mass",sided:"Parotid mass on the {side}",both:"Bilateral parotid swelling",hint:"Mass near the extracranial facial nerve",
    test:"Inspect and palpate in front of and below the ear, and inside the mouth where indicated.",
    syn:"parotid lump gland swelling"},
  {id:"hearing",group:"hearing",name:"Hearing loss",sided:"Hearing loss on the {side}",both:"Bilateral hearing loss",hint:"Sensorineural hearing loss for VIII localisation; confirm hearing type",
    test:"Whisper numbers at arm’s length while masking the other ear, then use a 512 Hz fork: in sensorineural loss Weber lateralises to the better ear and Rinne stays positive.",
    syn:"deaf deafness hearing ear weber rinne"},
  {id:"tinnitus",group:"hearing",name:"Tinnitus",sided:"Tinnitus on the {side}",both:"Tinnitus in both ears",hint:"Sound perception without an external source",
    test:"Ask about the side, character and whether it is pulsatile, and examine both ears.",
    syn:"ringing ear noise"},
  {id:"vertigo",group:"hearing",label:"Vertigo",hint:"Illusory motion or spinning",soft:true,
    test:"Establish the timing, triggers and whether it is continuous, then look for spontaneous and gaze-evoked nystagmus.",
    syn:"dizziness dizzy spinning giddy"},
  {id:"headImpulse",group:"hearing",name:"Abnormal head impulse",sided:"Abnormal head impulse to the {side}",both:"Abnormal head impulse to both sides",hint:"Corrective catch-up saccade after a rapid head turn: choose the side the head was turned towards. A peripheral vestibular sign",
    test:"With the patient fixing on your nose, turn the head quickly through 10–20° to each side. A catch-up saccade back to your nose after turning to one side marks loss on that side.",
    syn:"hit head thrust halmagyi vestibular hints"},
  {id:"skew",group:"hearing",label:"Skew deviation",hint:"Vertical misalignment on alternate cover testing: a central otolith-pathway sign",
    test:"Alternate cover test: cover each eye in turn while the patient fixes on your nose. A vertical correcting movement of the uncovered eye indicates skew.",
    syn:"vertical misalignment cover test hints"},
  {id:"otitis",group:"hearing",name:"Otitis",sided:"Otitis on the {side}",both:"Bilateral otitis",hint:"Middle ear infection or discharge",
    test:"Inspect the canal and tympanic membrane with an otoscope; note discharge, perforation or mastoid tenderness.",
    syn:"ear infection discharge mastoid"},
  {id:"palate",group:"bulbar",name:"Palatal weakness",sided:"Palatal weakness on the {side}",both:"Bilateral palatal weakness",hint:"Weak elevation; uvula may deviate away from the weak side",
    test:"Ask the patient to say “ah” and watch the soft palate: the weak side fails to rise and the uvula is pulled towards the normal side.",
    syn:"uvula soft palate gag vagus"},
  {id:"dysphagia",group:"bulbar",label:"Dysphagia",hint:"Difficulty swallowing",
    test:"Ask about coughing or choking with fluids and nasal regurgitation. Only screen with water if the patient is alert and it is safe to do so.",
    syn:"swallowing choking aspiration"},
  {id:"hoarseness",group:"bulbar",label:"Hoarseness",hint:"Dysphonia or suspected vocal fold weakness",
    test:"Listen to the voice and a voluntary cough: a weak, breathy “bovine” cough suggests vocal fold palsy. Laryngoscopy confirms it.",
    syn:"voice dysphonia hoarse vocal cord"},
  {id:"dysarthria",group:"bulbar",label:"Dysarthria",hint:"Impaired articulation",soft:true,
    test:"Ask the patient to repeat “pa-pa-pa”, “ta-ta-ta” and “ka-ka-ka” and a short sentence, noting slurred, nasal, strained or ataxic speech.",
    syn:"slurred speech articulation"},
  {id:"xi",group:"bulbar",name:"SCM / trapezius weakness",sided:"SCM / trapezius weakness on the {side}",both:"Bilateral SCM / trapezius weakness",hint:"Spinal accessory XI: shoulder shrug and head turn",
    test:"Ask the patient to shrug against resistance (trapezius) and turn the head against your hand (each SCM turns the head to the opposite side).",
    syn:"accessory shrug shoulder sternocleidomastoid"},
  {id:"xii",group:"bulbar",name:"Tongue deviation (LMN XII)",sided:"Tongue deviates to the {side} (LMN XII)",both:"Bilateral tongue wasting (LMN XII)",hint:"Wasting or fasciculation supports a lower motor neuron pattern: choose the side the tongue deviates to",
    test:"Look at the tongue resting in the mouth for wasting and fasciculation, then ask the patient to stick it out and push it into each cheek.",
    syn:"tongue deviation hypoglossal fasciculation wasting"},
  {id:"jawJerk",group:"bulbar",label:"Brisk jaw jerk",hint:"Exaggerated jaw reflex; interpret with other bilateral corticobulbar signs",
    test:"With the mouth slightly open, rest a finger on the chin and tap it downwards. A brisk jerk suggests bilateral upper motor neuron disease above the pons.",
    syn:"jaw reflex pseudobulbar"},
  {id:"lability",group:"bulbar",label:"Emotional lability",hint:"Involuntary or disproportionate laughing or crying",
    test:"Ask the patient and family about sudden laughing or crying out of keeping with mood.",
    syn:"pseudobulbar affect crying laughing"},
  {id:"hiccups",group:"bulbar",label:"Persistent hiccups",hint:"Nonspecific; may accompany a medullary lesion",soft:true,
    test:"Ask about persistent or intractable hiccups.",
    syn:"singultus"},
  {id:"weak",group:"tracts",name:"Hemiparesis",sided:"Hemiparesis on the {side}",both:"Weakness on both sides",hint:"Weakness of the arm and leg: choose the weak side",
    test:"Look for pronator drift and compare power, tone and reflexes in both arms and legs.",
    syn:"weakness hemiplegia crossed corticospinal limb"},
  {id:"dcml",group:"tracts",name:"Vibration / joint position loss",sided:"DCML loss on the {side}",both:"DCML loss on both sides",hint:"Dorsal column–medial lemniscus loss: vibration and joint position sense",
    test:"Test vibration with a 128 Hz fork at the toes and fingers and joint position at the great toe; add Romberg testing if safe.",
    syn:"vibration proprioception joint position dorsal column medial lemniscus"},
  {id:"spinothalamic",group:"tracts",name:"Body pain/temperature loss",sided:"Body pain/temperature loss on the {side}",both:"Body pain/temperature loss on both sides",hint:"Spinothalamic loss over the limbs and trunk",
    test:"Compare pinprick and a cold tuning fork over the limbs and trunk on both sides.",
    syn:"pain temperature numbness body sensory"},
  {id:"limbAtaxia",group:"tracts",name:"Limb ataxia or tremor",sided:"Limb ataxia on the {side}",both:"Limb ataxia on both sides",hint:"Dysmetria or tremor of the arm and leg, independent of weakness",
    test:"Finger–nose and heel–shin testing on each side with rapid alternating movements, making sure weakness does not explain the clumsiness.",
    syn:"dysmetria cerebellar coordination clumsy intention"},
  {id:"gaitAtaxia",group:"tracts",label:"Gait ataxia",hint:"Unsteady stance or gait",
    test:"Watch the normal gait and tandem walking, and note whether the patient can stand or walk unaided.",
    syn:"unsteady walking balance falls"},
  {id:"areflexia",group:"tracts",label:"Areflexia",hint:"Reduced or absent tendon reflexes",
    test:"Test biceps, triceps, supinator, knee and ankle reflexes, using reinforcement before calling them absent.",
    syn:"reflexes absent hyporeflexia"},
  {id:"hyperreflexia",group:"tracts",name:"Brisk reflexes, upgoing plantar",sided:"Brisk reflexes and upgoing plantar on the {side}",both:"Brisk reflexes and upgoing plantars on both sides",hint:"Upper motor neuron signs in the limbs",
    test:"Compare biceps, knee and ankle reflexes on both sides, look for clonus and stroke the sole for the plantar response.",
    syn:"babinski hyperreflexia clonus umn upper motor neuron"},
  {id:"expressiveAphasia",group:"cortex",label:"Expressive (Broca) aphasia",hint:"Effortful, non-fluent speech with relatively preserved comprehension",
    test:"Listen to spontaneous speech, then test naming, repetition and a three-step command.",
    syn:"aphasia dysphasia speech language broca non fluent"},
  {id:"receptiveAphasia",group:"cortex",label:"Receptive (Wernicke) aphasia",hint:"Fluent speech with paraphasias and poor comprehension",
    test:"Ask the patient to follow commands of increasing complexity and to name objects. Fluent speech that makes little sense, with poor understanding, is receptive aphasia.",
    syn:"aphasia dysphasia comprehension wernicke fluent"},
  {id:"gerstmann",group:"cortex",label:"Gerstmann features",hint:"Acalculia, agraphia, finger agnosia and left–right confusion",
    test:"Ask the patient to do simple sums, write a sentence, name their fingers and touch their left ear with their right hand.",
    syn:"acalculia agraphia finger agnosia angular gyrus"},
  {id:"neglect",group:"cortex",name:"Hemispatial neglect",sided:"Neglect of the {side} side",both:false,hint:"Ignoring one side of space or the body: choose the neglected side",
    test:"Use line bisection, a cancellation task, clock drawing and bilateral simultaneous touch or visual stimuli.",
    syn:"inattention extinction parietal"},
  {id:"corticalSensory",group:"cortex",name:"Cortical sensory loss",sided:"Cortical sensory loss on the {side}",both:"Cortical sensory loss on both sides",hint:"Impaired stereognosis, graphaesthesia or two-point discrimination with basic sensation intact",
    test:"With the eyes closed, ask the patient to identify a coin or key in each hand and numbers traced on each palm.",
    syn:"astereognosis agraphaesthesia parietal"},
  {id:"weakFaceArm",group:"cortex",name:"Face and arm weaker than leg",sided:"Face and arm weaker than leg on the {side}",both:false,hint:"A lateral, middle cerebral artery pattern of weakness: choose the weak side",
    test:"Compare facial movement, grip and shoulder abduction with hip flexion on the weak side.",
    syn:"mca brachiofacial"},
  {id:"weakLeg",group:"cortex",name:"Leg weaker than arm",sided:"Leg weaker than arm on the {side}",both:false,hint:"A medial, anterior cerebral artery pattern of weakness: choose the weak side",
    test:"Compare hip flexion and ankle dorsiflexion with grip and shoulder strength on the weak side.",
    syn:"aca crural"},
  {id:"abulia",group:"cortex",label:"Abulia or frontal release signs",hint:"Apathy, slowness to respond, or grasp and pout reflexes",
    test:"Note spontaneity and response latency, and test for grasp, pout and palmomental reflexes.",
    syn:"apathy frontal grasp"},
  {id:"ballism",group:"cortex",name:"Hemiballismus",sided:"Hemiballismus on the {side}",both:false,hint:"Large, flinging involuntary movements of one arm and leg",
    test:"Watch at rest and while the patient is distracted for wild, proximal flinging movements on one side.",
    syn:"chorea ballism involuntary movement subthalamic"},
  {id:"paraparesis",group:"cord",label:"Weakness of both legs",hint:"Paraparesis, upper or lower motor neuron",
    test:"Compare hip, knee and ankle power on both sides, with tone, reflexes and plantar responses.",
    syn:"paraplegia legs weak walking"},
  {id:"quadriparesis",group:"cord",label:"Weakness of all four limbs",hint:"Tetraparesis",
    test:"Test power in all four limbs and the neck, looking for the highest level of weakness.",
    syn:"tetraparesis tetraplegia quadriplegia"},
  {id:"armsWorse",group:"cord",label:"Arms weaker than legs",hint:"Especially the hands, with relatively strong legs",
    test:"Compare grip and the small hand muscles with hip and knee strength on both sides.",
    syn:"hands weak central cord"},
  {id:"sensoryLevel",group:"cord",label:"Sensory level on the trunk",hint:"A horizontal line below which sensation is reduced",
    test:"Run a pin or cold object up the trunk from the legs on each side and ask the patient to say when it feels normal.",
    syn:"level dermatome myelopathy"},
  {id:"capeLoss",group:"cord",label:"Cape-like pain/temperature loss",hint:"Over the shoulders and arms, with touch and vibration spared",
    test:"Map pinprick and temperature over the neck, shoulders, arms and upper trunk, then compare with light touch.",
    syn:"syrinx syringomyelia shawl burns"},
  {id:"lmnArms",group:"cord",label:"Wasting and areflexia in the arms",hint:"Lower motor neuron signs at the level of a cervical lesion",
    test:"Look for wasting and fasciculation in the hands and arms and test the biceps, supinator and triceps reflexes.",
    syn:"wasting hands fasciculation anterior horn"},
  {id:"romberg",group:"cord",label:"Positive Romberg test",hint:"Steady with eyes open, falls with eyes closed: sensory ataxia",
    test:"Stand the patient with feet together and arms by the sides, staying close to catch them, and compare eyes open with eyes closed.",
    syn:"sensory ataxia proprioception"},
  {id:"sphincter",group:"cord",label:"Bladder or bowel dysfunction",hint:"Retention, incontinence or new constipation",
    test:"Ask about urgency, retention and incontinence, and check a post-void residual volume when cord or cauda equina disease is possible.",
    syn:"urinary retention incontinence bladder bowel"},
  {id:"saddle",group:"cord",label:"Saddle anaesthesia",hint:"Reduced sensation over the perineum, buttocks and inner thighs",
    test:"With consent and a chaperone, test pinprick over the perineum, buttocks and back of the thighs (S2–S5) and assess anal tone.",
    syn:"perianal numbness cauda equina"},
  {id:"consciousness",group:"context",label:"Reduced consciousness",hint:"Drowsiness, stupor or coma",
    test:"Score the Glasgow Coma Scale by its components and repeat it frequently.",
    syn:"gcs drowsy coma confused"},
  {id:"papilloedema",group:"context",label:"Headache with papilloedema",hint:"Optic disc swelling from raised intracranial pressure",
    test:"Fundoscopy for blurred, elevated disc margins, haemorrhages and absent venous pulsation (supportive only). Ask ophthalmology to confirm if unsure.",
    syn:"disc swelling raised pressure icp fundus"},
  {id:"thunderclap",group:"context",label:"Sudden severe headache",hint:"Thunderclap headache",soft:true,
    test:"Ask whether the headache reached its maximum within about a minute.",
    syn:"headache sudden worst subarachnoid"},
  {id:"gcaSymptoms",group:"context",label:"Jaw claudication or scalp tenderness",hint:"Giant cell arteritis features, usually over 50: new headache, pain on chewing, scalp tenderness",
    test:"Ask about pain in the jaw on chewing, scalp tenderness, new headache and shoulder or hip girdle stiffness; feel the temporal arteries for tenderness or a reduced pulse.",
    syn:"giant cell arteritis temporal headache polymyalgia"},
  {id:"vascular",group:"context",label:"Vascular risk factors",hint:"Diabetes, hypertension, smoking or other vascular risk",soft:true,
    test:"Ask about diabetes, hypertension, smoking, hyperlipidaemia, atrial fibrillation and previous stroke.",
    syn:"diabetes hypertension smoking risk"},
  {id:"coughHeadache",group:"context",label:"Headache on coughing or straining",hint:"Brief occipital headache triggered by Valsalva",
    test:"Ask whether coughing, sneezing, laughing or straining brings on a short headache at the back of the head.",
    syn:"valsalva chiari occipital"}
].map(f=>({soft:false,sided:null,syn:'',...f,name:f.name||f.label}));

/* Classic cases. `site` is the localisation the case is built to demonstrate. */
const PRESETS = [
  {id:"wallenberg",name:"Wallenberg",site:"wallenberg",note:"Crossed sensory signs",findings:{horner:'R',dissociatedFace:'R',spinothalamic:'L',limbAtaxia:'R',palate:'R',dysphagia:'P',hoarseness:'P',vertigo:'P',hiccups:'P',weak:'N',xii:'N',lmn7:'N',hearing:'N'}},
  {id:"medial-medulla",name:"Medial medulla",site:"dejerine",note:"Tongue + long tracts",findings:{xii:'R',weak:'L',dcml:'L',dysarthria:'P',vascular:'P',palate:'N',horner:'N',spinothalamic:'N'}},
  {id:"weber",name:"Weber",site:"weber",note:"III palsy + weakness",findings:{iii:'R',ptosis:'R',weak:'L',vascular:'P',limbAtaxia:'N',lmn7:'N',xii:'N'}},
  {id:"parinaud",name:"Parinaud",site:"parinaud",note:"Dorsal midbrain signs",findings:{upgaze:'P',lightNear:'P',convergenceRetraction:'P',lidRetraction:'P',fatigability:'N'}},
  {id:"millard-gubler",name:"Millard–Gubler",site:"millard-gubler",note:"VI + VII + weakness",findings:{lmn7:'R',vi:'R',weak:'L',gaze:'N',hearing:'N'}},
  {id:"ino",name:"INO",site:"ino",note:"An adduction deficit",findings:{ino:'R',pupil:'N',ptosis:'N',gaze:'N'}},
  {id:"one-and-half",name:"One-and-a-half",site:"one-and-half",note:"Gaze palsy + INO",findings:{gaze:'R',ino:'R',pupil:'N',lmn7:'N'}},
  {id:"pcomm",name:"PComm aneurysm",site:"compressive-iii",note:"Pupil-involving III",findings:{iii:'R',ptosis:'R',pupil:'R',painfulEye:'P',retroOrbital:'R',thunderclap:'P',fatigability:'N',weak:'N'}},
  {id:"diabetic",name:"Pupil-sparing diabetic III",site:"microvascular-iii",note:"Pupil-sparing III",findings:{iii:'R',ptosis:'R',vascular:'P',pupil:'N',v1:'N',v2:'N',vi:'N',weak:'N',fatigability:'N'}},
  {id:"cavernous",name:"Cavernous sinus",site:"cavernous",note:"Multiple ocular motor nerves",findings:{iii:'R',iv:'R',vi:'R',v1:'R',v2:'R',horner:'R',ptosis:'R',painfulEye:'P',v3:'N',vmotor:'N',monocular:'N',rapd:'N',lmn7:'N',weak:'N'}},
  {id:"gradenigo",name:"Gradenigo",site:"gradenigo",note:"Ear + VI + deep facial pain",findings:{vi:'R',otitis:'R',retroOrbital:'R',gaze:'N',papilloedema:'N',weak:'N'}},
  {id:"false-vi",name:"Raised pressure",site:"raised-icp-vi",note:"A false-localising sign",findings:{papilloedema:'P',vi:'B',gaze:'N',weak:'N',iii:'N'}},
  {id:"gca",name:"Giant cell arteritis",site:"gca",note:"Sudden loss in one eye",findings:{monocular:'R',rapd:'R',gcaSymptoms:'P',homonymous:'N',bitemporal:'N',retroOrbital:'N'}},
  {id:"apoplexy",name:"Pituitary apoplexy",site:"pituitary-apoplexy",note:"Headache, fields and III",findings:{thunderclap:'P',bitemporal:'P',iii:'R',ptosis:'R',weak:'N',homonymous:'N'}},
  {id:"foster-kennedy",name:"Foster Kennedy",site:"foster-kennedy",note:"Smell + one optic nerve",findings:{anosmia:'R',monocular:'R',rapd:'R',papilloedema:'P',homonymous:'N',bitemporal:'N'}},
  {id:"cpa",name:"CPA",site:"cpa",note:"Hearing + facial signs",findings:{hearing:'R',tinnitus:'R',lmn7:'R',v1:'R',corneal:'R',limbAtaxia:'R',iii:'N',weak:'N'}},
  {id:"facial-canal",name:"Facial canal segment",site:"tympanic-facial",note:"Segmental VII palsy",findings:{lmn7:'R',hyperacusis:'R',taste:'R',tearing:'N',vesicles:'N',hearing:'N',parotid:'N'}},
  {id:"ramsay-hunt",name:"Ramsay Hunt",site:"ramsay-hunt",note:"VII palsy + vesicles",findings:{lmn7:'R',vesicles:'R',hearing:'R',taste:'R',hyperacusis:'R',weak:'N',parotid:'N'}},
  {id:"central-face",name:"Central facial palsy",site:"supranuclear-vii",note:"Forehead sparing",findings:{umn7:'R',weak:'R',dysarthria:'P',lmn7:'N',hyperacusis:'N',taste:'N'}},
  {id:"neuritis",name:"Vestibular neuritis",site:"vestibular-neuritis",note:"Peripheral HINTS",findings:{vertigo:'P',headImpulse:'R',gaitAtaxia:'P',skew:'N',centralNystagmus:'N',hearing:'N',limbAtaxia:'N',dysarthria:'N'}},
  {id:"central-avs",name:"Stroke mimicking neuritis",site:"cerebellar",note:"Central HINTS",findings:{vertigo:'P',centralNystagmus:'P',skew:'P',gaitAtaxia:'P',vascular:'P',headImpulse:'N',hearing:'N',weak:'N'}},
  {id:"villaret",name:"Villaret",site:"villaret",note:"Lower nerves + Horner",findings:{palate:'R',dysphagia:'P',hoarseness:'P',xi:'R',xii:'R',horner:'R',weak:'N',dcml:'N',spinothalamic:'N'}},
  {id:"myasthenia",name:"Myasthenia",site:"myasthenia",note:"Fatigable, pupils spared",findings:{fatigability:'P',ptosis:'R',ophthalmoplegia:'P',dysarthria:'P',pupil:'N',areflexia:'N',v1:'N'}},
  {id:"miller-fisher",name:"Miller Fisher",site:"miller-fisher",note:"Eyes, gait and reflexes",findings:{ophthalmoplegia:'P',gaitAtaxia:'P',areflexia:'P',fatigability:'N',consciousness:'N',weak:'N'}},
  {id:"chiari",name:"Chiari malformation",site:"foramen-magnum",note:"Downbeat + cough headache",findings:{downbeat:'P',coughHeadache:'P',capeLoss:'P',gaitAtaxia:'P'}},
  {id:"brown-sequard",name:"Brown-Séquard",site:"brown-sequard",note:"Crossed body signs, no cranial signs",findings:{weak:'R',dcml:'R',spinothalamic:'L',hyperreflexia:'R',sensoryLevel:'P',lmn7:'N',dissociatedFace:'N',xii:'N'}},
  {id:"anterior-cord",name:"Anterior spinal artery",site:"anterior-cord",note:"Vibration spared",findings:{paraparesis:'P',spinothalamic:'B',sensoryLevel:'P',sphincter:'P',dcml:'N'}},
  {id:"scd",name:"Subacute combined degeneration",site:"posterior-cord",note:"Sensory ataxia",findings:{dcml:'B',romberg:'P',gaitAtaxia:'P',paraparesis:'P',spinothalamic:'N'}},
  {id:"central-cord",name:"Central cord",site:"central-cord",note:"Hands worse than legs",findings:{armsWorse:'P',quadriparesis:'P',sensoryLevel:'N'}},
  {id:"syrinx",name:"Syringomyelia",site:"syrinx",note:"Cape-like loss",findings:{capeLoss:'P',lmnArms:'P',dcml:'N'}},
  {id:"cord-compression",name:"Cord compression",site:"transverse-cord",note:"A level and the bladder",findings:{paraparesis:'P',sensoryLevel:'P',sphincter:'P',hyperreflexia:'B'}},
  {id:"cauda-equina",name:"Cauda equina",site:"cauda-equina",note:"Saddle numbness",findings:{saddle:'P',sphincter:'P',paraparesis:'P',areflexia:'P',hyperreflexia:'N'}},
  {id:"left-mca",name:"Left MCA stroke",site:"mca-dominant",note:"Aphasia + right weakness",findings:{weakFaceArm:'R',weak:'R',umn7:'R',expressiveAphasia:'P',gaze:'R',homonymous:'R'}},
  {id:"right-mca",name:"Right MCA stroke",site:"mca-nondominant",note:"Neglect + left weakness",findings:{weakFaceArm:'L',weak:'L',umn7:'L',neglect:'L',gaze:'L',expressiveAphasia:'N',receptiveAphasia:'N'}},
  {id:"aca",name:"ACA stroke",site:"aca",note:"Leg worse than arm",findings:{weakLeg:'R',weak:'R',abulia:'P',sphincter:'P',weakFaceArm:'N'}},
  {id:"frontal-gaze",name:"Frontal gaze palsy",site:"frontal-eye-field",note:"Gaze palsy on the weak side",findings:{gaze:'L',weak:'L',lmn7:'N',ino:'N'}},
  {id:"wernicke-aphasia",name:"Wernicke aphasia",site:"wernicke-aphasia",note:"Fluent, no weakness",findings:{receptiveAphasia:'P',homonymous:'R',weak:'N'}},
  {id:"lacunar",name:"Pure motor stroke",site:"lacunar-motor",note:"No cortical signs",findings:{weak:'L',umn7:'L',dysarthria:'P',vascular:'P',neglect:'N',homonymous:'N',spinothalamic:'N'}},
  {id:"thalamic",name:"Pure sensory stroke",site:"thalamic-sensory",note:"Face and body, same side",findings:{spinothalamic:'R',dcml:'R',v2:'R',v3:'R',weak:'N'}},
  {id:"cortical-blindness",name:"Cortical blindness",site:"cortical-blindness",note:"Blind, pupils normal",findings:{homonymous:'B',rapd:'N',pupil:'N'}},
  {id:"hemiballismus",name:"Hemiballismus",site:"subthalamic",note:"Flinging movements",findings:{ballism:'L',vascular:'P'}}
];

const ZONES = [
  ['frontal-lobe','Frontal','cortex'],['parietal','Parietal','cortex'],['temporal','Temporal','cortex'],
  ['occipital','Occipital','cortex'],['deep','Capsule · thalamus','cortex'],['hemisphere','Hemisphere','cortex'],
  ['frontal','Anterior fossa','above'],['optic','Optic pathway','above'],
  ['midbrain-dorsal','Dorsal','midbrain'],['midbrain-tegmentum','Tegmentum','midbrain'],['midbrain-ventral','Ventral','midbrain'],
  ['pons-dorsal','Dorsal','pons'],['pons-lateral','Lateral','pons'],['pons-ventral','Ventral','pons'],
  ['medulla-lateral','Lateral','medulla'],['medulla-medial','Medial','medulla'],['foramen-magnum','Foramen magnum','medulla'],
  ['cord-anterior','Anterior','cord'],['cord-central','Central','cord'],['cord-posterior','Posterior','cord'],
  ['cord-lateral','Hemicord','cord'],['cord-transverse','Transverse','cord'],['cauda','Cauda equina','cord'],
  ['subarachnoid','Subarachnoid','outside'],['cpa','CP angle / IAM','outside'],['petrous','Petrous bone','outside'],
  ['cavernous','Cavernous sinus','outside'],['orbit','Orbit / SOF','outside'],['skull-base','Skull base','outside'],
  ['extracranial','Extracranial','outside'],['cerebellum','Cerebellum','outside'],['diffuse','NMJ / diffuse','outside']
].map(([id,name,level])=>({id,name,level}));

const FINDING_BY_ID = new Map(FINDINGS.map(f=>[f.id,f]));
const SITE_BY_ID = new Map(SITES.map(s=>[s.id,s]));
const ZONE_BY_ID = new Map(ZONES.map(z=>[z.id,z]));
const TOPIC_BY_SITE = new Map(TOPICS.flatMap(t=>t.sites.map(id=>[id,t.id])));
