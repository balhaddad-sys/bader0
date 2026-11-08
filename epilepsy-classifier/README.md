# Epilepsy Classifier

Clinician-facing decision support that takes seizure types, semiology, EEG, MRI, genetics, development and course, and maps them to the **current ILAE frameworks**:

| Step | Framework | What the app does |
|---|---|---|
| 1. Seizure type | **ILAE 2025** seizure classification (Beniczky et al.) | Names the class/type of each seizure entered (focal / generalized / epileptic spasms), applies the *consciousness = awareness + responsiveness* rule, flags unknown-onset tonic–clonic |
| 2. Epilepsy type | **ILAE 2017** (Scheffer et al.) | Generalized · focal · combined generalized-and-focal · unknown, with the reasoning |
| 3. Syndrome | **ILAE 2022** syndrome papers (Wirrell, Zuberi, Specchio, Riney, Hirsch) | Scores **38 syndromes** against their published *Mandatory / Alert / Exclusionary* tables |
| 4. Etiology | ILAE 2017 categories; 2022 etiology-specific syndromes; 2026 Terminology Commission | Structural / genetic / infectious / metabolic / immune clues from the data |

It also raises time-critical flags (epileptic spasms, super-refractory status) and suggests next investigations.

> **Not a medical device and not clinically validated.** It is a transparent aid for clinicians and trainees. It does not diagnose, and specialist judgement always prevails. Everything runs in the browser; nothing is transmitted or stored.

## Run

```bash
# no build step — open the file directly
open index.html            # or: npm run serve  →  http://localhost:8080

npm test                   # 63 tests (Node ≥ 20, no dependencies)
```

## Deploy (Vercel)

Static site, no build step. **The Vercel project's Root Directory must be `epilepsy-classifier`** (the repository root contains unrelated files that Vercel cannot build).

```bash
cd epilepsy-classifier
npx vercel deploy --prod       # first run links/creates the project
```

Or import the GitHub repo in the Vercel dashboard → *Root Directory* = `epilepsy-classifier`, Framework = *Other*, leave build/install commands empty.

`vercel.json` sets a strict Content-Security-Policy (`default-src 'none'`, `connect-src 'none'`, no inline script/style) plus `nosniff`, `no-referrer`, `X-Frame-Options: DENY`. This makes the privacy claim enforceable by the browser: the page **cannot** make any network request, so no patient data can leave the device. Keep it that way if you add features (no analytics, no remote fonts/CDNs).

## Android app (APK)

`android/` wraps the same offline web app in a minimal native shell — **no Gradle/Android Studio needed**:

```bash
sudo apt-get install -y default-jdk-headless aapt apksigner zipalign dalvik-exchange libandroid-23-java android-sdk-platform-23
./android/build.sh          # → android/build/epilepsy-classifier.apk  (~70 KB)
```

* **Install:** copy the APK to the phone, open it, and allow *Install unknown apps* for your file manager/browser. Play Protect may warn because the app is not from the Play Store.
* **Privacy by construction:** the manifest declares **no permissions** (no `INTERNET`), so Android itself blocks all network access; the WebView additionally disables network loads and only serves bundled assets. Nothing is stored (no DOM storage, cache or form data).
* **Signing:** the script generates a throw-away key in `android/.signing/` (git-ignored). An update only installs over an existing copy if signed with the **same key**, so for a long-lived app create your own key once (`keytool -genkeypair …`) and run `KEYSTORE=… KS_ALIAS=… KS_PASS=… ./android/build.sh`.
* **Bundled files** are exactly `index.html`, `styles.css` and `src/*.js` — the code covered by `npm test`.
* Targets API 34, min API 21 (Android 5.0+). Not distributable on Google Play as-is (needs an upload key, listing, and — because it presents clinical decision support — a regulatory/medical-device review).

## Physical signs and body size

* **Physical signs** (`#/physical`): 11 examination findings with labelled drawings — facial capillary malformation (port-wine stain) in V1 with the trigeminal territories, microcephaly (head-size schematic), dysmorphology survey, facial asymmetry; hypomelanotic (ash-leaf) macules, facial angiofibromas and café-au-lait macules; hypotonia (typical vs hypotonic posture, head lag), hemiparesis / hemiatrophy / Todd paresis, visual-field deficit (homonymous hemianopia); ataxia and paroxysmal dyskinesia. Each shows which ILAE criteria use the sign (derived from the knowledge base), a pitfall, and a basis line.
* **Sources differ by entry, and each says so.** ILAE-sourced: the V1 capillary malformation (Sturge–Weber alert; HHE and Rasmussen criteria), microcephaly → SLC2A1/GLUT1 testing, dysmorphism → chromosomal disorder (MEI exclusion; microarray in drug-resistant IGE), central hypotonia / cortical visual impairment in early DEE, hemiparesis and hemianopia (HHE, Rasmussen), contralateral facial weakness (MTLE-HS), movement disorders (GLUT1DS, PRRT2). **The skin signs of tuberous sclerosis and neurofibromatosis are not described in the ILAE syndrome papers**; they follow the international consensus criteria (Northrup 2021, *Pediatr Neurol* 123:50–66; Legius 2021, *Genet Med* 23:1506–1513, both confirmed in PubMed) and are not scored.
* **In the assessment:** new optional findings (microcephaly, facial asymmetry, hypomelanotic macules, angiofibromas, café-au-lait) feed *Etiology clues* (neurocutaneous disorder; Sturge–Weber) and *Next steps* (GLUT1 testing with microcephaly; genetics review with dysmorphism). Every examination finding has a figure button.
* **Body size:** the Movements tab can draw every figure as an **infant, child or adult** (head ≈ ¼, ⅙, ⅛ of body length; limbs and trunk scale about the ground line). Entries that are infant-specific (spasms) keep infant proportions. Standard anatomy, not ILAE content.
* Skin signs vary with skin tone and age, and drawings are schematic; they are no substitute for dermatological examination.

## Movements & poses

* **Movements & poses** (`#/movements`): 25 seizure movements and postures — tonic, fencing posture, figure-of-4, dystonic posturing, version, focal/hemiclonic, tonic–clonic phases, myoclonic jerks, myoclonic absence ("ratcheting up"), epileptic spasms (flexor/extensor/cluster), atonic head-drop/collapse, myoclonic–atonic drop, negative myoclonus, hyperkinetic movements, the CDKL5 hyperkinetic→tonic→spasms sequence, automatisms, eyelid myoclonia, reading-induced orofacial myoclonia, SeLECTS facial seizures, gelastic, ictal vomiting, fearful screaming, absence/behavioural arrest and ictal paresis. Each has 1–3 labelled **frames** (a stylised mannequin or close-up face; the patient's right is on the viewer's left; orange marks the moving parts), features, lateralizing value where it has been studied, a pitfall and a *basis* line.
* **Verified lateralization figures:** figure-of-4 — extended elbow contralateral to ictal onset in 35 of 39 patients (Kotagal 2000); unilateral dystonic posturing in temporal lobe epilepsy — contralateral with PPV 92%, versus 40% for tonic posturing (Bleasel 1997). Both were checked against their PubMed abstracts.
* **Source caveat:** the ILAE 2022 semiology glossary (Beniczky et al., *Epileptic Disord* 24:447–495, doi:10.1684/epd.2022.1430) could not be read in this build environment (its repository sits behind a bot-challenge page). Movement wording is therefore taken from the ILAE 2025 paper and the 2022 syndrome papers where they describe it, and otherwise from standard semiology teaching — each entry says which. **Please verify the standard-teaching entries against the glossary.**
* New optional findings in the form: fencing posture, figure-of-4, dystonic posturing, automatisms, ictal paresis and negative myoclonus. Focal-only postures imply the focal seizure class (ILAE 2025 descriptors); each movement finding has a figure button that opens its card.
* Figures are generated by `src/figures.js` (two-bone inverse kinematics, so poses are specified by where the hand or foot goes); data are in `src/semio.js`.

## EEG atlas and diagrams

* **EEG atlas** (`#/atlas`): 23 EEG morphologies — background, burst/chaotic, generalized, focal and provoked/ictal patterns. Each has a labelled multichannel **schematic waveform**, features (frequency, field, state, significance), the syndrome criteria that use it, a common pitfall, and a *basis* line saying whether the wording comes from the ILAE papers or from standard EEG teaching. Every EEG finding in the form has an activity-icon button that opens the same card in a dialog, and checklist rows link to the patterns they reference.
* **Diagrams** (`#/diagrams`): (1) age-at-onset window for all 38 syndromes, **derived from the knowledge base's own age criteria** (so it cannot disagree with the scorer), with alert ranges and the patient's onset marked; (2) the ILAE 2025 seizure classification tree (4 classes, 21 types); (3) a flow diagram of how mandatory / alert / exclusionary criteria combine. A one-row onset window also appears in the leading-syndrome card.
* **Honesty about the figures:** waveforms are *stylised schematics* generated deterministically from a seeded model (negative up), not recordings. The "used by" lists are computed from `src/kb.js` and are polarity-aware (e.g. "alert when absent"). Two patterns (`eeg.ppr`, `eeg.temporal_spikes`) are reference-only: no ILAE syndrome table scores them.
* **Not covered yet:** MRI/imaging morphology diagrams and seizure-semiology diagrams.

## Design notes

* **Layout:** input on the left, a sticky *Assessment* panel on the right that mirrors the ILAE ladder — **1 Seizure type → 2 Epilepsy type → 3 Syndrome → 4 Etiology** — with the best-fitting syndrome as a hero card (mandatory-criteria meter, alerts, unchecked exclusions) and a criterion-by-criterion checklist. On phones the panel sits below the form with a bottom bar showing the leading syndrome.
* **Speed:** the *Filter findings* box searches all ~150 findings; answered rows are highlighted; every entered finding can be removed with one tap from the *Findings entered* chips.
* **Accessibility:** WCAG AA contrast in light and dark themes (checked numerically), keyboard-operable controls with visible focus, status conveyed by icon *and* text (never colour alone), `prefers-reduced-motion` respected.
* **No external assets:** icons are an inline SVG sprite; the Inter typeface (SIL OFL, `fonts-OFL.txt`) is embedded as a data URI in `fonts.css` (regenerate with `tools/make-fonts-css.sh`). No inline styles/scripts, so the strict CSP in `vercel.json` holds.
* **Print / PDF:** a purpose-built report layout (about 3 pages): leading syndrome's full checklist, ruled-out syndromes as one-liners.

## How a syndrome is scored

Every finding is **tri-state**: present / absent / not assessed. Missing information is *never* treated as absence — unless you tick a section's **"reviewed — treat unticked as absent"** box (this is how you tell the app "I looked, and these were not present").

For each syndrome the ILAE table is evaluated criterion by criterion:

* **Mandatory** — all must be met → *"Mandatory criteria met"*. Any unmet → *not consistent*. Unknown → *"Possible — data missing"*.
* **Exclusionary** — any present → *not consistent* (the reason is shown).
* **Alerts** — criteria that are rare in the syndrome; they do not exclude but lower confidence ("rethink the diagnosis").
* **Course-dependent** items (e.g. "drug-resistant epilepsy", "remission by adolescence") are marked ⏳ and never block an early diagnosis.
* A syndrome is only considered when its **defining criterion** is met (e.g. typical absences for CAE; a KCNQ2 variant for KCNQ2-DEE), so the output is not a wall of irrelevant candidates.

Ranking: criteria-met syndromes first (fewer alerts / unassessed exclusions first), then possible ones (more mandatory criteria satisfied first).

## Knowledge base

`src/kb.js` is a plain-text, human-auditable encoding of the ILAE tables:

```
## CAE | Childhood absence epilepsy | CAE | IGE | hirsch2022 | Table 3 | Generalized
M sz    | Typical absence seizures                          :: sz.abs_typical @core
M eeg   | 3 Hz (2.5–4 Hz) generalized spike-wave …          :: eeg.gsw_3hz
A sz    | Staring spells >30 s, or postictal confusion …    :: ctx.staring_gt30s
E onset | Onset <2 or >13 years                             :: age<2y | age>13y
```

Expressions use finding IDs from `src/vocab.js`, `& | ! ( )`, and age predicates (`age<2y`, `age[2y,3y]`, `now>4m`). A criterion with `::  -` is shown for manual checking but not scored. To change a rule, edit one line; `npm test` verifies that the file parses, that every referenced finding exists, and that eight worked vignettes (`src/examples.js`) still reach the expected syndrome.

## Provenance and verification status

The 38 criteria tables were extracted from the ILAE-hosted position-paper PDFs (Epilepsia 2022;63:1333–1499) and the ILAE 2025 seizure paper was read in full from PMC. The 2017 paper's text was checked for the epilepsy-type rules used here. The 2026 Terminology Commission etiology report was read at **abstract level only**.

**What has and has not been checked:**

* ✅ Column assignment (Mandatory/Alert/Exclusionary) was parsed by character position under each table header, then each table was read.
* ✅ Automated tests: KB integrity, expression logic, age boundaries, tri-state behaviour, mutation-checked.
* ⚠️ The encoding is by an AI assistant and has **not yet been reviewed line-by-line by an epileptologist**. That review is the most valuable next step.
* ⚠️ **Not validated against real patient cohorts.** No claims of sensitivity/specificity.

**Interpretation choices to be aware of**

* `age>13y` means strictly older than 13.0 years; a range such as "2–3 years" is read as 2.0 to <4.0 years.
* Where the ILAE table gives an "A **OR** B" alert about *lack of* a variant or family history (SeLNE, SeLIE), it is read as "neither present".
* Narrative items that cannot be entered as a finding are shown for manual verification.
* Syndromes without a formal mandatory/exclusionary table are **not** scored: GEFS+, "genetic generalized epilepsy, syndrome not specified", "focal epilepsy, syndrome not specified". The app falls back to the epilepsy type (ILAE 2017 explicitly allows this as the final diagnostic level).
* Neonatal *seizure* classification (Pressler 2021) is outside the 2025 seizure paper's scope and is not implemented; neonatal *syndromes* are.

## Sources

1. Beniczky S, Trinka E, Wirrell E, et al. Updated classification of epileptic seizures: Position paper of the ILAE. *Epilepsia* 2025;66:1804–1823. doi:10.1111/epi.18338
2. Scheffer IE, Berkovic S, Capovilla G, et al. ILAE classification of the epilepsies. *Epilepsia* 2017;58:512–521. doi:10.1111/epi.13709
3. Wirrell EC, Nabbout R, Scheffer IE, et al. Methodology for classification and definition of epilepsy syndromes with list of syndromes. *Epilepsia* 2022;63:1333–1348. doi:10.1111/epi.17237
4. Zuberi SM, Wirrell E, Yozawitz E, et al. … syndromes with onset in neonates and infants. *Epilepsia* 2022;63:1349–1397. doi:10.1111/epi.17239
5. Specchio N, Wirrell EC, Scheffer IE, et al. … syndromes with onset in childhood. *Epilepsia* 2022;63:1398–1442. doi:10.1111/epi.17241
6. Riney K, Bogacz A, Somerville E, et al. … syndromes with onset at a variable age. *Epilepsia* 2022;63:1443–1474. doi:10.1111/epi.17240
7. Hirsch E, French J, Scheffer IE, et al. ILAE definition of the idiopathic generalized epilepsy syndromes. *Epilepsia* 2022;63:1475–1499. doi:10.1111/epi.17236
8. Specchio N, Auvin S, Bisulli F, et al. How should etiology change the classification of the epilepsies? Report from the ILAE 2021–2025 Terminology Commission. *Epilepsia* 2026. doi:10.1002/epi.70467 (abstract only)

## Layout

```
index.html  styles.css
src/vocab.js     finding vocabulary (inputs) + ILAE 2025 seizure mapping
src/kb.js        the 38 syndrome criteria tables
src/engine.js    expression parser, tri-state evaluator, scoring, epilepsy type, flags, next steps
src/examples.js  eight teaching vignettes (also regression fixtures)
src/morph.js     EEG morphology atlas content (23 patterns)
src/diagrams.js  waveform / onset-chart / seizure-tree / flow diagram generators
src/figures.js   mannequin / face figure renderer (inverse kinematics)
src/semio.js     movements & poses content (25 entries)
src/physical.js  physical-signs content (11 entries)
src/views.js     EEG atlas, movements page, diagrams page, dialog, router
src/app.js       UI
tests/           node:test suite
```
