/* Decorative sagittal atlas schematic. Highlights denote a level, never a point lesion. */
function anatomyArt(zoneId = '', idPrefix = 'atlas') {
  const prefix = String(idPrefix).replace(/[^a-zA-Z0-9_-]/g, '') || 'atlas';
  const level = ['hemisphere','optic','frontal','cerebellum'].includes(zoneId) ? zoneId
    : ['frontal-lobe','parietal','temporal','occipital','deep'].includes(zoneId) ? 'hemisphere'
    : String(zoneId).startsWith('cord-') || zoneId === 'cauda' ? 'cord'
    : zoneId === 'foramen-magnum' ? 'medulla'
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
      <path d="M145 101C160 96 174 102 181 113C190 128 181 144 166 149C157 153 148 150 140 144L134 128Z" fill="${fill('cerebellum')}" fill-opacity="${active('cerebellum') ? '.3' : '.045'}" stroke="${stroke('cerebellum')}" stroke-width="${active('cerebellum') ? '1.6' : '1.15'}" opacity="${active('cerebellum') ? '.95' : '.65'}"/>
      <g clip-path="url(#${prefix}-cerebellum)" stroke="currentColor" stroke-width=".75" opacity=".4">
        <path d="M139 108C154 102 172 109 181 118M138 112C154 106 173 114 184 122M137 116C153 111 172 119 186 127M136 120C152 115 171 125 185 131M136 125C151 120 166 130 182 136M138 130C151 125 164 136 178 140M140 135C151 131 160 141 171 145M144 140C152 138 160 145 165 150"/>
        <path d="M140 127C148 124 155 118 158 108M149 124C158 125 166 122 173 118M150 127C158 134 160 140 160 149" stroke-width="1.2"/>
      </g>
      <path d="${midbrain}" fill="${fill('midbrain')}" fill-opacity="${opacity('midbrain')}" stroke="${stroke('midbrain')}" stroke-width="${active('midbrain') ? '1.6' : '1'}" stroke-opacity="${active('midbrain') ? '.95' : '.65'}"/>
      <path d="${pons}" fill="${fill('pons')}" fill-opacity="${opacity('pons')}" stroke="${stroke('pons')}" stroke-width="${active('pons') ? '1.6' : '1'}" stroke-opacity="${active('pons') ? '.95' : '.65'}"/>
      <path d="${medulla}" fill="${fill('medulla')}" fill-opacity="${opacity('medulla')}" stroke="${stroke('medulla')}" stroke-width="${active('medulla') ? '1.6' : '1'}" stroke-opacity="${active('medulla') ? '.95' : '.65'}"/>
      <path d="M126 164C130 170 132 177 133 182M137 159C140 167 142 174 143 182" stroke="${stroke('cord')}" stroke-width="${active('cord') ? '2.2' : '1.2'}" opacity="${active('cord') ? '.95' : '.55'}"/>
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
      <g stroke="${stroke('frontal')}" stroke-width="${active('frontal') ? '1.75' : '1'}" opacity="${active('frontal') ? '.95' : '.5'}">
        <path d="M45 89C55 87 66 85 77 83C84 82 88 80 92 78"/>
        <ellipse cx="44" cy="89.5" rx="4.5" ry="2.2" transform="rotate(-8 44 89.5)" fill="${active('frontal') ? fill('frontal') : 'none'}" fill-opacity=".5"/>
      </g>
      <g stroke="${stroke('optic')}" stroke-width="${active('optic') ? '1.75' : '1.1'}" opacity="${active('optic') ? '.95' : '.55'}">
        <path d="M98 83C90 89 85 94 76 94C63 94 61 91 52 94L37 100M92 86C88 96 78 97 71 100C61 104 51 103 42 105"/>
        <ellipse cx="32" cy="101" rx="6" ry="4.7" transform="rotate(-15 32 101)"/>
      </g>
    </g>
  </svg>`;
}

/* ---------------------------------------------------------------------------
 * Axial brainstem sections: schematic, in MRI orientation (anterior at the top,
 * the patient's right on the viewer's left). Each structure is drawn once for the
 * patient's right half (x < 160) and mirrored for the left. Lesions in this model
 * sit on the side of the cranial nerve signs, so involved structures are shaded on
 * that side; long-tract signs on the opposite body still map to the same side here.
 * ------------------------------------------------------------------------- */
const STRUCTURES = {
  cst: {name:'Corticospinal tract', short:'CST', does:'Voluntary movement of the opposite limbs; the fibres cross lower down, at the pyramidal decussation.', lesion:'Weakness of the opposite limbs.', findings:['weak:c']},
  ml: {name:'Medial lemniscus', short:'ML', does:'Vibration and joint position sense from the opposite body, which crossed in the caudal medulla.', lesion:'Loss of vibration and proprioception on the opposite side.', findings:['dcml:c']},
  mlf: {name:'Medial longitudinal fasciculus', short:'MLF', does:'Links the abducens nucleus to the opposite oculomotor subnucleus so the eyes move together horizontally.', lesion:'Internuclear ophthalmoplegia: the eye on the lesion side fails to adduct.', findings:['ino']},
  stt: {name:'Spinothalamic tract', short:'STT', does:'Pain and temperature from the opposite body, which crossed in the spinal cord.', lesion:'Pain and temperature loss over the opposite limbs and trunk.', findings:['spinothalamic:c']},
  sp5: {name:'Spinal trigeminal nucleus and tract', short:'Sp V', does:'Pain and temperature from the same side of the face.', lesion:'Loss of facial pain and temperature on the lesion side, often with touch spared.', findings:['dissociatedFace','corneal']},
  symp: {name:'Descending sympathetic fibres', short:'Symp', does:'Uncrossed hypothalamospinal fibres for pupil dilation, lid tone and facial sweating.', lesion:'Horner syndrome on the lesion side.', findings:['horner']},
  na: {name:'Nucleus ambiguus', short:'NA', does:'Motor nucleus for the palate, pharynx and larynx, through IX and X.', lesion:'Palatal and vocal fold weakness on the lesion side, with dysphagia and hoarseness.', findings:['palate','gag','dysphagia','hoarseness']},
  xii: {name:'Hypoglossal nucleus and fascicle', short:'XII', does:'Supplies the same side of the tongue; the fibres leave between the pyramid and the olive.', lesion:'Tongue weakness and wasting, deviating towards the lesion.', findings:['xii']},
  dmx: {name:'Dorsal motor nucleus of X', short:'DMX', does:'Parasympathetic output to the heart, lungs and gut.', lesion:'No reliable bedside sign.', findings:[]},
  nts: {name:'Nucleus of the solitary tract', short:'NTS', does:'Receives taste and visceral sensation from VII, IX and X.', lesion:'Taste loss on the lesion side, rarely noticed at the bedside.', findings:['taste']},
  vest: {name:'Vestibular nuclei', short:'Vest', does:'Balance, gaze holding and the vestibulo-ocular reflex.', lesion:'Vertigo, central nystagmus, skew deviation and imbalance.', findings:['vertigo','centralNystagmus','skew','peripheralNystagmus:c']},
  icp: {name:'Inferior cerebellar peduncle', short:'ICP', does:'Carries spinal and olivary input into the cerebellum on the same side.', lesion:'Limb ataxia on the lesion side.', findings:['limbAtaxia']},
  olive: {name:'Inferior olive', short:'IO', does:'Sends climbing fibres to the opposite cerebellum.', lesion:'No reliable acute sign; palatal tremor can follow damage to its connections.', findings:[]},
  mcp: {name:'Middle cerebellar peduncle', short:'MCP', does:'Carries crossed pontocerebellar fibres into the cerebellum.', lesion:'Limb ataxia on the lesion side.', findings:['limbAtaxia']},
  vi: {name:'Abducens fascicle', short:'VI', does:'Axons from the VI nucleus to the lateral rectus of the same eye.', lesion:'Abduction deficit of the eye on the lesion side.', findings:['vi']},
  gaze: {name:'Abducens nucleus and PPRF', short:'VI n', does:'The horizontal gaze centre, driving both eyes towards the same side.', lesion:'Conjugate gaze palsy towards the lesion.', findings:['gaze']},
  vii: {name:'Facial nucleus and fascicle', short:'VII', does:'Facial expression on the same side; the fibres loop around the VI nucleus.', lesion:'Lower motor neuron facial weakness on the lesion side.', findings:['lmn7']},
  coch: {name:'Cochlear nuclei', short:'Co', does:'First relay for hearing from the same ear, at the pontomedullary junction.', lesion:'Hearing loss in the ear on the lesion side.', findings:['hearing','tinnitus']},
  vsens: {name:'Principal sensory nucleus and root of V', short:'V s', does:'Touch from the same side of the face and the afferent limb of the corneal reflex.', lesion:'Facial numbness and a reduced corneal reflex on the lesion side.', findings:['v1','v2','v3','corneal']},
  vmot: {name:'Trigeminal motor nucleus', short:'V m', does:'The muscles of mastication on the same side.', lesion:'Weak chewing; the jaw deviates towards the lesion on opening.', findings:['vmotor']},
  scp: {name:'Superior cerebellar peduncle', short:'SCP', does:'Cerebellar outflow, which crosses lower in the midbrain.', lesion:'Limb ataxia on the lesion side when damaged before its crossing.', findings:['limbAtaxia']},
  iii: {name:'Oculomotor nucleus and fascicles', short:'III', does:'Most eye movements, lid elevation and, through the Edinger–Westphal nucleus, pupil constriction.', lesion:'III palsy on the lesion side; a nuclear lesion can add bilateral ptosis.', findings:['iii','ptosis','pupil']},
  rn: {name:'Red nucleus and cerebellar outflow', short:'RN', does:'Receives crossed outflow from the opposite cerebellar hemisphere.', lesion:'Ataxia or tremor of the opposite limbs.', findings:['limbAtaxia:c']},
  sn: {name:'Substantia nigra', short:'SN', does:'Dopaminergic input to the basal ganglia.', lesion:'Parkinsonism of the opposite limbs; seldom an acute sign.', findings:[]},
  lcst: {name:'Lateral corticospinal tract', short:'LCST', does:'Voluntary movement below this level on the same side; it crossed in the medulla.', lesion:'Upper motor neuron weakness on the same side, below the lesion.', findings:['weak','hyperreflexia','paraparesis','quadriparesis']},
  dc: {name:'Dorsal columns', short:'DC', does:'Vibration and joint position sense from the same side, ascending uncrossed to the medulla.', lesion:'Loss of vibration and proprioception on the same side below the lesion; sensory ataxia.', findings:['dcml','romberg']},
  alst: {name:'Spinothalamic tract', short:'STT', does:'Pain and temperature from the opposite side, crossed within a segment or two of entry.', lesion:'Pain and temperature loss on the opposite side, starting a segment or two below the lesion.', findings:['spinothalamic:c']},
  ah: {name:'Anterior horn', short:'AH', does:'Lower motor neurons for the muscles of this segment.', lesion:'Wasting, fasciculation and areflexia at the level of the lesion.', findings:['lmnArms']},
  awc: {name:'Anterior white commissure', short:'AWC', does:'Where pain and temperature fibres cross, just in front of the central canal.', lesion:'Bilateral, cape-like pain and temperature loss at the level of the lesion, as in syringomyelia.', findings:['capeLoss']},
  rf: {name:'Reticular activating system', short:'RF', does:'Paramedian reticular formation projecting through the thalamus to keep the cortex awake; nearby pontine neurons shape the rhythm of breathing.', lesion:'Drowsiness or coma, usually with eye movement or pupil signs from neighbouring nuclei; sustained hyperventilation or apneustic breathing.', findings:['consciousness','hyperventilation','apneustic']},
  resp: {name:'Medullary respiratory centres', short:'Resp', does:'The ventral and dorsal respiratory groups set the rhythm of breathing; neighbouring vasomotor neurons hold the blood pressure and heart rate.', lesion:'Ataxic breathing and apnoea; compression from above produces the Cushing response.', findings:['ataxicBreathing','slowBreathing','cushing']},
  tectum: {name:'Tectum and pretectal area', short:'SC', does:'Superior colliculi, posterior commissure and pretectal nuclei for vertical gaze and the pupillary light reflex.', lesion:'Parinaud syndrome: upgaze palsy, light–near dissociation, convergence–retraction nystagmus, lid retraction.', findings:['upgaze','lightNear','convergenceRetraction','lidRetraction']}
};

/*
 * Geometry for the patient's right half. `outline` starts on the midline at the
 * front and runs down the side to the midline at the back as cubic segments.
 * Labels are [x, y, anchor, text?] and are shown on the side without the lesion.
 */
const SECTIONS = [
  {
    id: 'midbrain', name: 'Midbrain', level: 'Superior colliculus', nerves: 'III',
    outline: [[160,64],[156,52,148,40,136,32],[122,22,102,20,88,28],[72,38,64,60,62,84],[60,110,66,136,78,156],[90,176,108,190,126,195],[140,198,150,194,160,190]],
    midline: '<ellipse class="pag" cx="160" cy="160" rx="22" ry="20"/><ellipse class="csf" cx="160" cy="163" rx="4.5" ry="6.5"/>',
    parts: {
      cst: '<ellipse cx="112" cy="44" rx="28" ry="9.5" transform="rotate(33 112 44)"/>',
      sn: '<ellipse cx="114" cy="64" rx="27" ry="5" transform="rotate(33 114 64)"/>',
      rn: '<circle cx="140" cy="102" r="13"/>',
      iii: '<ellipse cx="151" cy="146" rx="7" ry="9"/><path class="fib" d="M149 138C143 122 137 104 143 88C146 78 151 71 156 66"/>',
      mlf: '<ellipse cx="139" cy="144" rx="3.5" ry="6"/>',
      ml: '<ellipse cx="103" cy="104" rx="17" ry="5" transform="rotate(-58 103 104)"/>',
      stt: '<ellipse cx="85" cy="128" rx="7" ry="6"/>',
      tectum: '<ellipse cx="133" cy="183" rx="19" ry="10"/>',
      rf: '<ellipse cx="124" cy="132" rx="8" ry="7"/>'
    },
    labels: {cst:[[106,42,'middle']], sn:[[110,64.5,'middle']], rn:[[140,104.5,'middle']], iii:[[151,148.5,'middle']], mlf:[[133,146,'end']], ml:[[103,106.5,'middle']], stt:[[85,130.5,'middle']], tectum:[[133,185.5,'middle']], rf:[[124,134.5,'middle']]},
    zones: {
      'midbrain-ventral': 'M160 64C156 52 148 40 136 32C122 22 102 20 88 28C78 36 78 58 92 72C108 84 136 84 160 82Z',
      'midbrain-tegmentum': 'M160 82C136 84 108 84 92 72C72 80 66 112 76 136C100 152 132 158 160 156Z',
      'midbrain-dorsal': 'M160 156C132 158 100 152 76 136C82 162 104 188 126 195C140 198 150 194 160 190Z'
    }
  },
  {
    id: 'pons-mid', name: 'Mid pons', level: 'Trigeminal nuclei', nerves: 'V',
    outline: [[160,29],[140,18,110,15,86,21],[56,29,34,54,29,84],[25,112,36,136,56,150],[72,161,94,168,108,176],[116,182,124,190,136,190],[146,190,152,180,160,178]],
    midline: '<path class="fibres" d="M50 58C110 46 210 46 270 58M40 84C110 72 210 72 280 84M46 108C110 98 210 98 274 108"/>',
    parts: {
      cst: '<ellipse cx="136" cy="56" rx="9" ry="7"/><ellipse cx="114" cy="73" rx="9" ry="7"/><ellipse cx="140" cy="90" rx="8" ry="6"/>',
      mcp: '<path d="M76 30C50 44 34 70 34 98C34 120 42 136 58 148C60 112 64 70 88 26Z"/>',
      vsens: '<ellipse cx="92" cy="148" rx="8" ry="7"/><path class="fib" d="M88 142C78 128 64 114 50 104C42 99 36 97 29 96"/>',
      vmot: '<ellipse cx="112" cy="150" rx="7" ry="6"/>',
      ml: '<ellipse cx="130" cy="122" rx="24" ry="5"/>',
      stt: '<ellipse cx="98" cy="128" rx="7" ry="6"/>',
      symp: '<ellipse cx="113" cy="137" rx="4" ry="4"/>',
      mlf: '<ellipse cx="153" cy="160" rx="3.5" ry="6"/>',
      scp: '<ellipse cx="120" cy="174" rx="12" ry="8" transform="rotate(25 120 174)"/>',
      rf: '<ellipse cx="136" cy="146" rx="7" ry="6"/>'
    },
    labels: {cst:[[114,75.5,'middle']], mcp:[[52,92,'middle']], vsens:[[92,150.5,'middle']], vmot:[[112,152.5,'middle']], ml:[[130,124.5,'middle']], stt:[[98,130.5,'middle']], symp:[[107,139.5,'end']], mlf:[[153,151,'middle']], scp:[[120,176.5,'middle']], rf:[[136,148.5,'middle']]},
    zones: {
      'pons-ventral': 'M160 29C140 18 110 15 88 21C88 60 92 96 104 128L160 128Z',
      'pons-lateral': 'M88 21C60 30 36 54 30 84C26 112 36 136 56 150C72 161 94 168 108 176C108 158 110 140 118 128L104 128C92 96 88 60 88 21Z',
      'pons-dorsal': 'M160 128L118 128C110 144 108 160 108 176C120 190 142 192 160 178Z'
    }
  },
  {
    id: 'pons-caudal', name: 'Caudal pons', level: 'Facial colliculus', nerves: 'VI, VII, VIII',
    outline: [[160,31],[146,22,118,18,94,23],[66,30,44,50,36,76],[30,98,32,120,44,138],[52,154,62,170,80,178],[96,186,120,188,136,185],[146,183,152,177,160,176]],
    midline: '<path class="fibres" d="M56 60C110 50 210 50 264 60M44 86C110 76 210 76 276 86M48 108C110 100 210 100 272 108"/>',
    parts: {
      cst: '<ellipse cx="138" cy="58" rx="9" ry="7"/><ellipse cx="116" cy="76" rx="9" ry="7"/><ellipse cx="141" cy="93" rx="8" ry="6"/>',
      mcp: '<path d="M74 40C52 54 40 76 40 100C40 118 46 132 56 144C58 112 62 74 86 34Z"/>',
      ml: '<ellipse cx="134" cy="122" rx="22" ry="5"/>',
      stt: '<ellipse cx="99" cy="128" rx="7" ry="6"/>',
      symp: '<ellipse cx="90" cy="141" rx="4" ry="4"/>',
      vii: '<ellipse cx="106" cy="146" rx="7" ry="7"/><path class="fib" d="M111 151C121 158 134 157 146 164C152 169 149 180 139 181C129 182 121 175 113 168C104 162 92 160 80 154C66 147 56 141 45 138"/>',
      gaze: '<circle cx="138" cy="170" r="7"/><ellipse cx="143" cy="149" rx="7" ry="5.5"/>',
      mlf: '<ellipse cx="155" cy="162" rx="3.2" ry="6"/>',
      vi: '<path class="fib" d="M136 163C134 140 132 112 136 80C138 60 142 42 144 26"/>',
      sp5: '<ellipse cx="80" cy="155" rx="8.5" ry="8.5"/>',
      vest: '<ellipse cx="107" cy="177" rx="12" ry="6"/>',
      coch: '<ellipse cx="70" cy="167" rx="5" ry="6"/>'
    },
    labels: {cst:[[116,78.5,'middle']], mcp:[[56,96,'middle']], ml:[[134,124.5,'middle']], stt:[[99,130.5,'middle']], symp:[[84,139,'end']], vii:[[106,148.5,'middle']], gaze:[[138,172.5,'middle','VI n'],[134,151.5,'end','PPRF']], mlf:[[155,153,'middle']], vi:[[131,106,'end']], sp5:[[80,157.5,'middle']], vest:[[107,179.5,'middle']], coch:[[70,169.5,'middle']]},
    zones: {
      'pons-ventral': 'M160 31C146 22 118 18 94 23C88 56 92 96 102 128L160 128Z',
      'pons-lateral': 'M94 23C66 30 44 50 36 76C30 98 32 120 44 138C52 154 62 170 80 178C96 186 112 188 126 186C114 168 112 146 118 128L102 128C92 96 88 56 94 23Z',
      'pons-dorsal': 'M160 128L118 128C112 146 114 168 126 186C138 186 150 180 160 176Z'
    }
  },
  {
    id: 'medulla', name: 'Medulla', level: 'Inferior olive', nerves: 'IX, X, XII',
    outline: [[160,47],[156,39,152,33,145,33],[137,33,131,38,129,47],[120,43,103,42,92,49],[80,57,74,73,76,88],[77,98,73,105,69,109],[59,117,54,133,56,149],[58,165,67,178,81,185],[96,190,112,180,127,174],[138,170,148,174,160,168]],
    midline: '<path class="raphe" d="M160 47V168"/>',
    parts: {
      cst: '<ellipse cx="145" cy="47" rx="11.5" ry="11"/>',
      ml: '<ellipse cx="150" cy="84" rx="6" ry="20"/>',
      mlf: '<ellipse cx="151" cy="126" rx="4.5" ry="8"/>',
      xii: '<ellipse cx="147" cy="157" rx="8" ry="6"/><path class="fib" d="M144 151C140 124 135 84 130 50"/>',
      dmx: '<ellipse cx="131" cy="160" rx="6" ry="5"/>',
      nts: '<ellipse cx="116" cy="155" rx="5.5" ry="6"/>',
      vest: '<ellipse cx="99" cy="172" rx="13" ry="7"/>',
      olive: '<path class="fib" d="M114 60c-5-4-11-3-14 0-6-2-11 2-12 7-5 3-6 9-3 14-1 6 3 11 9 12 4 4 11 4 15 0"/>',
      na: '<ellipse cx="104" cy="118" rx="5" ry="6"/><path class="fib" d="M100 115C92 108 82 106 71 107"/>',
      stt: '<ellipse cx="81" cy="124" rx="8" ry="8.5"/>',
      symp: '<ellipse cx="94" cy="135" rx="4.5" ry="4"/>',
      sp5: '<ellipse cx="70" cy="148" rx="9.5" ry="11"/>',
      icp: '<ellipse cx="74" cy="171" rx="12" ry="9"/>',
      resp: '<ellipse cx="121" cy="132" rx="6" ry="7"/>'
    },
    labels: {cst:[[145,49.5,'middle']], ml:[[150,86.5,'middle']], mlf:[[144,128,'end']], xii:[[147,159.5,'middle']], dmx:[[131,166,'middle']], nts:[[116,156,'middle']], vest:[[99,174.5,'middle']], olive:[[103,77,'middle']], na:[[104,120.5,'middle']], stt:[[81,126.5,'middle']], symp:[[94,144,'middle']], sp5:[[70,150.5,'middle']], icp:[[74,173.5,'middle']], resp:[[121,134.5,'middle']]},
    zones: {
      'medulla-medial': 'M160 47C156 39 152 33 145 33C137 33 131 38 129 47L139 171C146 173 153 171 160 168Z',
      'medulla-lateral': 'M76 88C90 96 108 100 122 100L127 174C112 180 96 190 81 185C67 178 58 165 56 149C54 133 59 117 69 109C72 104 75 96 76 88Z',
      'foramen-magnum': 'M160 47C156 39 152 33 145 33C137 33 131 38 129 47C120 43 103 42 92 49C80 57 74 73 76 88C77 98 73 105 69 109C59 117 54 133 56 149C58 165 67 178 81 185C96 190 112 180 127 174C138 170 148 174 160 168Z'
    }
  },
  {
    id: 'cord', name: 'Cervical cord', level: 'Cervical enlargement', nerves: 'C6',
    outline: [[160,40],[150,34,120,33,100,39],[72,47,57,71,55,104],[53,137,72,161,104,171],[124,177,146,177,160,172]],
    midline: '<path class="raphe" d="M160 40V58M160 172V128"/><circle class="csf" cx="160" cy="106" r="2.6"/>',
    decor: '<path class="grey" d="M158 99C150 98 145 92 140 84C134 74 124 64 113 68C103 72 104 88 114 96C122 102 128 104 130 110C128 120 122 134 116 148C112 156 112 162 116 164C121 166 126 158 131 148C138 134 146 120 152 114C155 112 157 112 158 112Z"/>',
    parts: {
      lcst: '<ellipse cx="80" cy="118" rx="15" ry="18"/>',
      alst: '<ellipse cx="86" cy="76" rx="13" ry="10"/>',
      dc: '<ellipse cx="148" cy="147" rx="8" ry="21"/>',
      ah: '<ellipse cx="122" cy="82" rx="12" ry="10"/>',
      awc: '<ellipse cx="153" cy="99" rx="6" ry="3.6"/>'
    },
    labels: {lcst:[[80,120.5,'middle']], alst:[[86,78.5,'middle']], dc:[[148,149.5,'middle']], ah:[[122,84.5,'middle']], awc:[[146,92,'end']]},
    zones: {
      'cord-anterior': 'M160 40C150 34 120 33 100 39C72 47 57 71 55 104C55 110 56 115 57 120L160 120Z',
      'cord-central': 'M160 88C149 88 141 96 141 106C141 116 149 124 160 124Z',
      'cord-posterior': 'M160 172C152 175 146 176 140 175C138 160 137 140 140 126L160 126Z',
      'cord-lateral': 'M160 40C150 34 120 33 100 39C72 47 57 71 55 104C53 137 72 161 104 171C124 177 146 177 160 172Z',
      'cord-transverse': 'M160 40C150 34 120 33 100 39C72 47 57 71 55 104C53 137 72 161 104 171C124 177 146 177 160 172Z'
    }
  }
].map(s=>({...s,structures:Object.keys(s.parts)}));
const SECTION_BY_ID = new Map(SECTIONS.map(s=>[s.id,s]));

/* Drawing style (grey-matter nucleus or white-matter tract) and the label used beside each section. */
const STRUCTURE_STYLE = {
  cst:['tract','Corticospinal'], ml:['tract','Med. lemniscus'], mlf:['tract','MLF'], stt:['tract','Spinothalamic'],
  sp5:['nucleus','Spinal V'], symp:['tract','Sympathetic'], na:['nucleus','N. ambiguus'], xii:['nucleus','XII nucleus'],
  dmx:['nucleus','Dorsal X'], nts:['nucleus','Solitary n.'], vest:['nucleus','Vestibular n.'], icp:['tract','Inf. peduncle'],
  olive:['nucleus','Inf. olive'], mcp:['tract','Mid. peduncle'], vi:['tract','VI fascicle'], gaze:['nucleus','VI n. · PPRF'],
  vii:['nucleus','VII nucleus'], coch:['nucleus','Cochlear n.'], vsens:['nucleus','Sensory V'], vmot:['nucleus','Motor V'],
  scp:['tract','Sup. peduncle'], iii:['nucleus','III nucleus'], rn:['nucleus','Red nucleus'], sn:['nucleus','S. nigra'],
  tectum:['nucleus','Sup. colliculus'], lcst:['tract','Lat. CST'], dc:['tract','Dorsal columns'], alst:['tract','Spinothalamic'],
  ah:['nucleus','Anterior horn'], awc:['tract','Commissure'], rf:['nucleus','Reticular form.'], resp:['nucleus','Respiratory ctr.']
};
for(const [id,[kind,tag]] of Object.entries(STRUCTURE_STYLE))Object.assign(STRUCTURES[id],{kind,tag});
/* The fourth ventricle sits behind the pons and medulla; the tissue outline hides its front half. */
const VENTRICLES = {'pons-mid':[160,186,32,10],'pons-caudal':[160,186,58,13],medulla:[160,183,66,14]};

function sectionForSite(site){
  if(site.zone.startsWith('midbrain-'))return 'midbrain';
  if(site.zone.startsWith('pons-'))return site.id==='lateral-midpons'?'pons-mid':'pons-caudal';
  if(site.zone.startsWith('medulla-')||site.zone==='foramen-magnum')return 'medulla';
  if(site.zone.startsWith('cord-'))return 'cord';
  return null;
}
/*
 * Map of 'structure:R' / 'structure:L' to 'involved' or 'spared'. A sided finding
 * involves the structure on the side its link implies (':i' same, ':c' opposite).
 * Unsided findings, such as dysphagia, involve `unsidedSides` (the leading lesion's
 * sides when known). A structure is 'spared' when a linked finding was tested normal.
 */
function structureStates(sectionId,findings,unsidedSides=['R','L']){
  const states=new Map();
  for(const id of SECTION_BY_ID.get(sectionId).structures){
    const links=STRUCTURES[id].findings.map(key=>parseLink(key,'i'));
    const tested=links.some(l=>findings[l.id]==='N');
    for(const side of ['R','L']){
      const involved=links.some(l=>{
        const v=findings[l.id];
        if(!v||v==='N')return false;
        if(!l.rel||v==='P')return unsidedSides.includes(side);
        return v==='B'||v===(l.rel==='c'?OTHER_SIDE[side]:side);
      });
      if(involved)states.set(`${id}:${side}`,'involved');
      else if(tested)states.set(`${id}:${side}`,'spared');
    }
  }
  return states;
}

function symmetricOutline([start,...segments]){
  const mirror=(x,y)=>`${320-x} ${y}`;
  let d=`M${start[0]} ${start[1]}`;
  for(const [a,b,c,e,x,y] of segments)d+=`C${a} ${b} ${c} ${e} ${x} ${y}`;
  for(let i=segments.length-1;i>=0;i--){
    const [a,b,c,e]=segments[i],[px,py]=i?segments[i-1].slice(4):start;
    d+=`C${mirror(c,e)} ${mirror(a,b)} ${mirror(px,py)}`;
  }
  return d+'Z';
}
/* Where a leader line meets a structure: its first ellipse or circle, else its label position. */
function structureAnchor(section,id){
  const m=section.parts[id].match(/c[x]="([\d.]+)"\s+c[y]="([\d.]+)"/);
  return m?[+m[1],+m[2]]:section.labels[id][0].slice(0,2);
}

/*
 * opts.zoneSides: patient sides ('R'/'L') on which to shade opts.zone; opts.states from
 * structureStates; opts.focus: a structure id to outline. opts.mini drops labels for the
 * small copy in the result card. Labels sit in a column on the side without the lesion.
 */
function sectionSvg(sectionId,{zoneSides=[],zone=null,states=new Map(),focus=null,prefix='sec',mini=false}={}){
  const section=SECTION_BY_ID.get(sectionId);
  const pid=String(prefix).replace(/[^a-zA-Z0-9_-]/g,'')||'sec';
  const outline=symmetricOutline(section.outline);
  const flip='matrix(-1 0 0 1 320 0)';
  const labelSide=zoneSides.length===1&&zoneSides[0]==='L'?'R':'L',labelsRight=labelSide==='L';
  // Bounds from the outline's points (control points bound the curve) and the ventricle.
  const points=section.outline.flatMap(p=>p.reduce((pairs,v,i)=>i%2?pairs:[...pairs,[v,p[i+1]]],[]));
  const oMinX=Math.min(...points.map(p=>p[0])),oMaxX=320-oMinX,oMinY=Math.min(...points.map(p=>p[1]));
  const ventricle=VENTRICLES[sectionId];
  const oMaxY=Math.max(...points.map(p=>p[1]),ventricle?ventricle[1]+ventricle[3]:0);
  const column=mini?0:86,pad=mini?4:10;
  const left=oMinX-pad-(labelsRight?14:column),right=oMaxX+pad+(labelsRight?column:14);
  const top=oMinY-(mini?4:18),bottom=oMaxY+(mini?4:16);
  const half=side=>{
    const zoneHere=zoneSides.includes(side)&&zone&&section.zones[zone];
    const zonePath=zoneHere?`<path class="zone" d="${section.zones[zone]}"/><path class="zone-hatch" fill="url(#${pid}-hatch)" d="${section.zones[zone]}"/>`:'';
    const parts=section.structures.map(id=>{
      const state=states.get(`${id}:${side}`)||'',shapes=section.parts[id],kind=STRUCTURES[id].kind;
      const halo=state==='involved'&&!mini?`<g class="halo" filter="url(#${pid}-glow)">${shapes}</g>`:'';
      const texture=kind==='tract'&&state!=='involved'?`<g class="tex" fill="url(#${pid}-fibres)">${shapes}</g>`:'';
      return `<g class="st ${kind} ${state}${focus===id?' focus':''}" data-structure="${id}" data-side="${side}">${halo}<g class="shape">${shapes}</g>${texture}</g>`;
    }).join('');
    return `<g${side==='L'?` transform="${flip}"`:''}>${section.decor||''}${zonePath}${parts}</g>`;
  };
  let labels='';
  if(!mini){
    // Stack labels in a column, in the order of their structures from front to back.
    const gap=11.6,colX=labelsRight?oMaxX+16:oMinX-16,elbowX=labelsRight?oMaxX+7:oMinX-7;
    const items=section.structures.map(id=>{const [x,y]=structureAnchor(section,id);return {id,ax:labelsRight?320-x:x,ay:y};}).sort((a,b)=>a.ay-b.ay);
    let prev=top+8;for(const it of items){it.ly=Math.max(it.ay,prev+gap);prev=it.ly;}
    let next=bottom-6;for(let i=items.length-1;i>=0;i--){items[i].ly=Math.min(items[i].ly,next);next=items[i].ly-gap;}
    labels=items.map(({id,ax,ay,ly})=>{
      const state=states.get(`${id}:${labelSide}`)||'',cls=`${state}${focus===id?' focus':''}`;
      return `<g class="leader ${cls}" data-structure="${id}"><path d="M${ax} ${ay}L${elbowX} ${ly}H${colX+(labelsRight?-3:3)}"/><circle cx="${ax}" cy="${ay}" r="1.4"/><text x="${colX}" y="${ly+3}" text-anchor="${labelsRight?'start':'end'}">${STRUCTURES[id].tag}</text></g>`;
    }).join('');
  }
  const csf=ventricle?`<ellipse class="csf ventricle" cx="${ventricle[0]}" cy="${ventricle[1]}" rx="${ventricle[2]}" ry="${ventricle[3]}"/>`:'';
  const orient=mini?`<text class="orient mini" x="${left+3}" y="${top+16}">R</text><text class="orient mini" x="${right-3}" y="${top+16}" text-anchor="end">L</text>`
    :`<text class="orient" x="${left+2}" y="${top+11}">R</text><text class="orient" x="${right-2}" y="${top+11}" text-anchor="end">L</text><path class="front-mark" d="M156 ${top+9}L160 ${top+3}L164 ${top+9}"/><text class="front-label" x="160" y="${top+17}" text-anchor="middle">front</text>`;
  return `<svg class="section-art${mini?' mini':''}" viewBox="${left} ${top} ${right-left} ${bottom-top}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id="${pid}-clip"><path d="${outline}"/></clipPath>
      <radialGradient id="${pid}-tissue" cx="50%" cy="45%" r="62%"><stop offset="0" class="tissue-a"/><stop offset="1" class="tissue-b"/></radialGradient>
      <pattern id="${pid}-fibres" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-32)"><path class="fibre-line" d="M0 0V3.2"/></pattern>
      <pattern id="${pid}-hatch" width="4.5" height="4.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path class="hatch-line" d="M0 0V4.5"/></pattern>
      <filter id="${pid}-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.6"/></filter>
    </defs>
    ${csf}${ventricle&&!mini?`<text class="csf-label" x="160" y="${ventricle[1]+ventricle[3]-3}" text-anchor="middle">IV</text>`:''}
    <path class="outline" d="${outline}" fill="url(#${pid}-tissue)"/>
    <g clip-path="url(#${pid}-clip)">${section.midline}${half('R')}${half('L')}</g>
    <path class="outline-edge" d="${outline}"/>
    ${labels}${orient}
  </svg>`;
}

/*
 * Small lateral view of the brainstem for the reference cards: the level holding a nerve's
 * nucleus is filled and a dot marks where the nerve leaves. Anterior is to the left.
 */
const NERVE_GLYPHS = {
  I:['forebrain',[11,24]], II:['forebrain',[22,27]], III:['midbrain',[28.5,30.5]], IV:['midbrain',[38.5,29.5]],
  V:['pons',[30,36.5]], VI:['pons',[25.5,40.5]], VII:['pons',[33,41]], VIII:['pons',[35.5,40.8]],
  IX:['medulla',[31.5,43.5]], X:['medulla',[32.5,45]], XI:['cord',[34.5,52]], XII:['medulla',[27,43.5]]
};
function levelGlyph(level,exit){
  const part=(name,d)=>`<path class="glyph-part${level===name?' on':''}" d="${d}"/>`;
  return `<svg class="level-glyph" viewBox="4 13 54 45" aria-hidden="true" focusable="false">
    <path class="glyph-cerebellum" d="M38 33C46 30 54 33 55 39C56 45 50 49 43 48C39 47 37 44 37 41Z"/>
    ${part('forebrain','M5 20C5 10 16 3 30 3C45 3 56 10 56 19C56 25 50 28 44 27C39 26 35 26 31 27C25 29 17 29 11 27C7 25 5 23 5 20Z')}
    ${part('midbrain','M29 27.5C32 27 35 27 38 27.5L37 33C34 34 31 33.5 28.5 32.5Z')}
    ${part('pons','M28.5 32.5C24.5 33.5 23.5 37.5 25.5 40.5C27.5 42.5 32.5 42.5 37 40.5L37 33C34 34 31 33.5 28.5 32.5Z')}
    ${part('medulla','M25.5 40.5C27 43.5 28 45.5 29.5 47.5L35 47C35 45 36 42.5 37 40.5C32.5 42.5 27.5 42.5 25.5 40.5Z')}
    ${part('cord','M29.5 47.5L30.5 57H35.5L35 47Z')}
    ${exit?`<circle class="glyph-exit" cx="${exit[0]}" cy="${exit[1]}" r="2.1"/>`:''}
  </svg>`;
}

/* ---- Coma diagrams ---- */
/* Both pupils as the examiner sees them: the patient's right eye is on the left. */
const PUPIL_SIZES = {pinpoint:[1.1,1.1], small:[2.3,2.3], mid:[4,4], fixed:[5,5], blown:[6,2.8], normal:[3,3]};
function pupilPair(kind){
  const [right,left]=PUPIL_SIZES[kind];
  const eye=(cx,r)=>`<path class="eye-white" d="M${cx-16} 14C${cx-8} 4 ${cx+8} 4 ${cx+16} 14C${cx+8} 24 ${cx-8} 24 ${cx-16} 14Z"/><circle class="iris" cx="${cx}" cy="14" r="7.4"/><circle class="pupil" cx="${cx}" cy="14" r="${r}"/>`;
  return `<svg class="pupil-pair" viewBox="0 0 80 32" aria-hidden="true" focusable="false">${eye(20,right)}${eye(60,left)}<text x="20" y="31">R</text><text x="60" y="31">L</text></svg>`;
}
/* A minute or so of breathing as a chest-movement trace; breaths are [start, width, height, hold]. */
function breathPattern(kind){
  const repeat=(width,make)=>{const out=[];for(let x=3;x+width<=147;x+=width)out.push(...make(x));return out;};
  switch(kind){
    case 'cheyne':return repeat(72,x=>[3,6,10,12,10,6,3].map((h,i)=>[x+i*7,6,h,0]));
    case 'cnh':return repeat(7,x=>[[x,6,12,0]]);
    case 'apneustic':return repeat(23,x=>[[x,5,11,8]]);
    case 'ataxic':return [[3,7,5,0],[13,6,11,0],[21,9,3,0],[44,6,8,0],[53,5,4,0],[78,9,10,0],[93,6,3,0],[101,7,7,0],[127,6,5,0]];
    case 'slow':return repeat(34,x=>[[x,11,4,0]]);
    default:return repeat(15,x=>[[x,10,7,0]]);
  }
}
function breathTrace(kind){
  const base=25;let d=`M0 ${base}`;
  for(const [x,w,h,hold] of breathPattern(kind)){
    const up=w/2;
    d+=`L${x} ${base}C${x+up*.4} ${base-h} ${x+up*.7} ${base-h} ${x+up} ${base-h}`;
    if(hold)d+=`L${x+up+hold} ${base-h}`;
    d+=`C${x+up+hold+up*.3} ${base-h} ${x+up+hold+up*.6} ${base} ${x+w+hold} ${base}`;
  }
  return `<svg class="breath-trace" viewBox="0 0 150 30" aria-hidden="true" focusable="false"><path class="breath-base" d="M0 ${base}H150"/><path class="breath-line" d="${d}L150 ${base}"/></svg>`;
}
/* A reflex loop: afferent nerve in, centre at one brainstem level, efferent nerve out. */
const REFLEX_LEVEL_Y = {midbrain:24, pons:50, medulla:78};
function reflexArc(r){
  const y=REFLEX_LEVEL_Y[r.level];
  const part=(name,d)=>`<path class="arc-part${r.level===name?' on':''}" d="${d}"/>`;
  const edge={midbrain:[103,137], pons:[97,143], medulla:[105,135]}[r.level];
  return `<svg class="reflex-arc" viewBox="0 0 240 104" role="img" aria-label="${r.name}: ${r.afferent} in, centre in the ${r.level}, ${r.efferent} out">
    ${part('midbrain','M104 12C114 9 126 9 136 12L137 36C126 38 114 38 103 36Z')}
    ${part('pons','M103 36C114 38 126 38 137 36C146 42 147 58 137 64C126 66 114 66 103 64C93 58 94 42 103 36Z')}
    ${part('medulla','M103 64C114 66 126 66 137 64L134 90C130 94 110 94 106 90Z')}
    ${[['midbrain',27,'Mid'],['pons',53,'Pons'],['medulla',81,'Med']].map(([name,ty,text])=>`<text class="arc-level${r.level===name?' on':''}" x="120" y="${ty}">${text}</text>`).join('')}
    <path class="arc-in" d="M10 ${y-6}H${edge[0]-4}"/><path class="arc-in-head" d="M${edge[0]-10} ${y-10}L${edge[0]-3} ${y-6}L${edge[0]-10} ${y-2}Z"/>
    <path class="arc-out" d="M${edge[1]+3} ${y+6}H228"/><path class="arc-out-head" d="M222 ${y+2}L230 ${y+6}L222 ${y+10}Z"/>
    <text class="arc-label in" x="12" y="${y-11}">${r.afferent}</text><text class="arc-label out" x="228" y="${y+20}" text-anchor="end">${r.efferent}</text>
  </svg>`;
}
