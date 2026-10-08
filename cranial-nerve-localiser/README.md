# Cranial nerve localiser

An offline teaching atlas for Android. Mark examination findings and it ranks
the anatomical sites that best explain them, shows the involved brainstem
structures, and lets you practise on generated cases. It is a teaching aid, not
a diagnostic tool.

## What is in 3.3

- **Coma assessment.** A step-by-step sheet, opened from the Conscious level
  area or Reference: treat first, score the Glasgow Coma Scale, then pupils,
  eye movements, brainstem reflexes, motor responses, breathing and clues to
  the cause. Each sign records straight into the examination and the leading
  pattern shows at the foot of the sheet.
- **GCS calculator** with the structured descriptors, not-testable and
  intubated (VT) options and a severity band. Scoring marks reduced
  consciousness and, for M3 or M2, the matching posturing; it is saved, copied
  into the summary and undone with the findings. Open eyes with M1–2 prompts a
  check for locked-in syndrome.
- **21 new signs** in four coma groups and the context group: small reactive
  pupils, roving eyes, ocular bobbing, doll's eye and caloric responses,
  calorics provoking nystagmus, seizures, five breathing patterns (Cheyne–Stokes,
  hyperventilation, apneustic, ataxic, slow), neck stiffness, fever, the Cushing
  response, drugs, low glucose, cardiac arrest, head injury, plus reduced
  pharyngeal sensation (IX) and a weak cough for the gag and cough reflexes.
- **11 new localisations** in a Coma & consciousness practice topic: central
  and tonsillar herniation, subarachnoid haemorrhage, bacterial meningitis, HSV
  encephalitis, non-convulsive status, opioid toxicity, functional
  unresponsiveness, hypoxic-ischaemic injury, akinetic mutism and cerebellar
  haemorrhage. With pinpoint pupils alone, opioid toxicity now leads; bobbing
  and weakness of all four limbs move it to the pons.
- **Coma, level by level:** pupils (drawn), eye movements, motor responses and
  breathing traces for uncal herniation, diencephalon, midbrain, pons and
  medulla. **Brainstem reflexes:** afferent, centre and efferent diagrams for the
  light, corneal, doll's eye and caloric, gag and cough reflexes and the drive to
  breathe, with a note on brainstem death testing.
- The medulla section gains the respiratory centres, and foramen magnum sites
  now show it. 104 sites, 119 findings and 59 cases in all.

## What is in 3.2

- **Consciousness and coma.** A new area groups reduced consciousness with
  locked-in state, pinpoint and fixed mid-position pupils, flexor and extensor
  posturing, absent oculocephalic responses and asterixis. Five sites use them:
  brainstem (reticular activating system) coma, pontine haemorrhage, locked-in
  syndrome, artery of Percheron infarction and toxic or metabolic
  encephalopathy. The midbrain and mid-pons sections now show the reticular
  formation.
- **Gag reflex.** A reduced gag can be marked on the right, left or both sides.
  It supports lower cranial nerve lesions (IX and X) on that side and is linked
  to nucleus ambiguus in the medulla section.
- Six new classic cases (Vernet, basilar coma, pontine haemorrhage, locked-in,
  Percheron and metabolic coma): 93 sites, 98 findings and 47 cases in all.

## What is in 3.1

- **Atlas-style sections.** Nuclei are drawn as grey matter and tracts with a
  fibre texture; the fourth ventricle, aqueduct and central canal are shown as
  CSF. Labels sit in a column with leader lines, involved structures glow,
  the leading region is hatched, and a legend explains the shading. Tapping a
  label works like tapping the structure.
- **The result card shows the lesion.** For brainstem and cord sites the
  leading card draws the axial section with the lesion and involved structures,
  in place of the generic sagittal sketch.
- **Nerve cards** in Reference carry a small brainstem diagram marking the
  level of each nucleus and where the nerve leaves.
- Joined R / L / Both control, a practice accuracy ring, and single-column
  finding rows on wide screens.

## What is in 3.0

- **A side for every sign.** Each sided finding has Right, Left and Both
  buttons. Tapping the sign marks it on the last side used; tapping again marks
  it tested normal. Every site's expected signs are defined relative to the
  lesion (same side, opposite side, either or both), and one-sided sites are
  scored with the lesion on each side, so results name the lesion side and
  separate look-alikes such as Brown-Séquard and medial medulla, or frontal and
  pontine gaze palsies.
- **Nystagmus, spinal cord and cortex.** New finding groups and 21 sites:
  foramen magnum (Chiari), vestibulocerebellar and upbeat nystagmus syndromes;
  Brown-Séquard, anterior, posterior and central cord, syringomyelia,
  transverse myelopathy and cauda equina; dominant and non-dominant MCA,
  Broca and Wernicke aphasia, Gerstmann, ACA, frontal gaze palsy, cortical
  blindness, pure motor and pure sensory lacunes and hemiballismus. There are
  now 88 sites, 90 findings and 41 classic cases.
- **A spinal cord section** joins the four brainstem sections, and structures
  are shaded on the side each finding implies.
- Saved examinations from 2.0 are converted to the new per-side format.

## What was in 2.0

- **Practice tab.** Cases are generated from the atlas and used only when the
  model ranks the intended site, on the intended side, first by at least 0.04.
  Feedback names the key clues, explains why a wrong choice fails and shows the
  section. Score, streak and topic are saved on the device.
- **Brainstem sections** in MRI orientation, browsable in Reference too.
- **Finding guide.** Each finding's ⓘ sheet covers how to examine it and which
  sites it defines; search understands plain words such as "double vision".
- Smell (CN I), Foster Kennedy, giant cell arteritis, pituitary apoplexy and
  the HINTS examination; **Copy summary** for notes.

## Layout

```
src/            the app: index.html with {{placeholders}} for the parts below
  fonts.css     embedded Atkinson Hyperlegible and Spectral (OFL)
  styles.css
  data.js       sites, findings, cases, zones, topics, reference text
  model.js      per-side scoring, ranking, "examine next", practice cases
  anatomy.js    sagittal hero art, brainstem and cord sections and their structures
  app.js        interface
tests/          node tests for data integrity and model behaviour
tools/          build_html.py, build_apk.py, apk.py (packaging and v2 signing)
android/shell/  the prebuilt Android wrapper taken from release 1.2.0
android/version.json
releases/       signed APKs
```

## Build and test

```sh
node --test                           # data and model tests
python3 -m unittest discover -s tests # manifest patching
python3 tools/build_html.py           # writes dist/atlas.html (open it in a browser)
pip install cryptography              # once
CNL_STOREPASS=... python3 tools/build_apk.py --keystore path/to/release.p12
```

`build_apk.py` reuses the compiled shell (`classes.dex`, resources and icons),
sets the version and app id from `android/version.json` in the binary manifest, stores
`resources.arsc` uncompressed and aligned, and signs with APK Signature Scheme
v2, which is enough for the app's minSdk of 26. To check a build independently:

```sh
pip install apksigtool && apksigtool verify dist/cranial-nerve-localiser-3.3.0.apk
```

### Application id and signing

From 2.0.1 the app id is `org.bedsideatlas.craniallocaliser2`, set by
`applicationId` in `android/version.json`. Release 1.2.0 used
`org.bedsideatlas.craniallocaliser` with a different signing key, so 2.0.1
installs as a separate app beside it instead of failing with "App not
installed". You can uninstall 1.2.0 whenever you like; findings saved in it do
not carry over. The compiled classes keep their original Java package, and
`patch_manifest` writes the activity's full class name so the new id still
finds it. Leave `applicationId` out to keep the shell's original id.

Every later release must keep this app id and be signed with the 2.0 keystore,
or Android will refuse to update it in place. Keep the keystore safe and out of
git.

## Website (Vercel)

`vercel.json` builds the static site with `node tools/build_web.mjs`, which
inlines `src/` into `web/index.html` (byte-identical to the APK's page) and
copies the newest APK from `releases/` so visitors can download the Android
app from the footer. No dependencies are installed.

To deploy, import the GitHub repository at https://vercel.com/new and set
**Root Directory** to `cranial-nerve-localiser` (Framework preset: Other; leave
the build settings empty so `vercel.json` applies). The repository root holds a
different project, and its `vercel.json` is not valid JSON, so the root
directory must point here. Vercel deploys the default branch to production and
every other branch as a preview; to put this branch in production, merge it or
set it as the Production Branch under Settings → Git.

With the CLI instead: `cd cranial-nerve-localiser && npx vercel --prod`.

## The Android shell

The wrapper loads `assets/atlas.html` into a WebView. It blocks every
non-`data:` request and opens external `https` links in the browser. Its Back
button runs a fixed script that relies on these elements, so keep them:

- `dialog[open]`, which Back closes;
- `#view-reference`, the wrapper for the Practice and Reference panels; while
  it is visible, Back clicks `#tab-localise`;
- `#marked-review`, `#workspace[data-mobile-view]`, `#mobile-examination`,
  `#finding-search` and `#search-clear`.

New overlays should be `<dialog>` elements and new secondary views should live
inside `#view-reference`.
