# NeuroConvert

Evidence-based medication converters for neurology. Every conversion shows **how strong its support is** and **exactly where it came from**: FDA prescribing information, pharmacokinetic data, clinical studies, or consensus tables.

> **Review status.** The numbers were curated from primary sources with AI assistance and are covered by automated tests, but they have **not yet been independently reviewed by a licensed clinical pharmacist or neurologist**, and the app is **not a regulated medical device**. Do not rely on it for patient care until that review is done, and always confirm against current prescribing information.

## What it converts

| Module | Conversions | Main sources |
| --- | --- | --- |
| **Antiseizure medications** | IV ⇄ oral for levetiracetam, lacosamide, brivaracetam, valproate, phenobarbital, carbamazepine, phenytoin/fosphenytoin (mg PE). Formulation switches: divalproex DR → ER (label table), valproic acid ⇄ divalproex, carbamazepine tablet → XR / suspension, lamotrigine IR → XR, levetiracetam IR ⇄ ER, oxcarbazepine IR → XR, topiramate IR ⇄ XR, perampanel and clobazam tablet ⇄ suspension, phenytoin sodium ⇄ free acid | FDA labels; Nelson 1982; Vickery 2018; Lambrecht 2011 |
| **Drug levels** | µg/mL ⇄ µmol/L for 21 antiseizure analytes; phenytoin low-albumin correction (with the evidence against it shown) | PubChem + FDA labels; Kiang 2016, Kane 2013, Buckley 2016 |
| **Benzodiazepines** | 23 agents relative to diazepam 10 mg, as a range where Ashton and the 2025 joint guideline disagree | Ashton table; Brunner 2025 |
| **Parkinson's disease** | LEDD calculator (28 agents, correct COMT / istradefylline sequencing); dopamine-agonist equivalence; levodopa IR → CR / Rytary, ropinirole IR → ER, pramipexole IR → ER and salt ⇄ base; **Vyalev and Duopa pump settings** | Jost 2023 (Table 1); FDA labels |
| **Corticosteroids** | Glucocorticoid equivalence; oral ⇄ IV methylprednisolone in MS relapse | Liu 2013; COPOUSEP (Le Page 2015) |
| **Botulinum toxins** | onabotulinumtoxinA : incobotulinumtoxinA : abobotulinumtoxinA unit ratios, shown beside every label's "not interchangeable" warning | Scaglione 2016 and four randomised trials |
| **Dementia agents** | Rivastigmine oral → patch; memantine IR → XR; memantine + donepezil → Namzaric | FDA labels |
| **Pregabalin** | Lyrica → Lyrica CR table, with the gabapentin non-substitution warnings | Lyrica CR, Gralise, Horizant labels |
| **Immunoglobulin (CIDP)** | HyQvia and Hizentra starting doses | HyQvia and Hizentra labels |

101 individually sourced rules (listed on the in-app Methods page), each with an evidence tier and full references (PubMed / DOI / DailyMed links). The research behind them, including what was searched for and deliberately not added, is in [`docs/RESEARCH.md`](docs/RESEARCH.md).

### Evidence tiers

These are this app's own transparent rubric, **not** a GRADE assessment.

| Tier | Meaning |
| --- | --- |
| **A** Regulatory label | Stated in current FDA prescribing information |
| **B** Pharmacokinetic | Derived from bioavailability / exposure data (not a labelled instruction) |
| **C** Clinical evidence | Supported by clinical studies or reviews; may conflict with labelling |
| **D** Expert consensus | Approximate equivalence from consensus or clinical-experience tables |

A **derived** flag marks numbers that are arithmetic on source data rather than stated by the source (for example the reverse of a one-direction label conversion).

### Deliberate omissions

Where no evidence-based conversion could be traced, the app says so instead of guessing. Examples: dose equivalence *between different* antiseizure drugs (none exists), pyridostigmine/neostigmine route equivalence (no verifiable source), topiramate IR → ER (labels give no instruction), rimabotulinumtoxinB and other botulinum products. The full list, with reasons, is on the in-app **Methods** page.

## Features

- Result as a single value, a **range** (when sources only bound the value) or **"no conversion defined"** (when a label table does not cover the dose; the app never interpolates)
- The workings are shown for every result; copy a plain-text summary **with sources**; shareable links; print stylesheet
- One layout throughout: a converter menu on the left (a slide-in menu on phones), numbered steps (drug, switch, dose) on the left of the page and the answer beside them. The answer names the drug and the switch, shows the evidence tier, and keeps the main caution directly under it; evidence, further cautions, workings and sources are in a single "Evidence & sources" section. Evidence tiers, the full rules index and references are on the Reliability and References pages
- Searchable by drug name, from the home page or from the menu, with each hit opening the right converter with that drug already chosen
- Numbers can be typed the way your phone keyboard produces them: Arabic-Indic or Persian digits (٨٠٠), decimal commas (0,5), thousands separators (1,000 or 1 000). Ambiguous entries such as `1,2,3` are rejected instead of guessed, and the screen states how an entry was read ("Read as 0.5")
- Input validation (positive numbers only, sanity cap), accessible (labels, `aria-live` results, focus states, keyboard-only use, skip link), responsive, light/dark
- Works **offline** (service worker) and as a **single HTML file** you can open from disk
- No accounts, no analytics, no network calls with your inputs

## Develop

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # 188 tests
npm run typecheck
npm run build          # static site in dist/
npm run build:single   # one portable file: dist-single/index.html (works from file://)
npm run verify:references   # re-check all 62 PMIDs/DOIs and DailyMed set IDs against live records (flags label revisions)
```

Requires Node ≥ 20.19 (≥ 22.18 for `verify:references`, which imports the TypeScript data file directly).

## Deploy

NeuroConvert is a static site, so it deploys anywhere. `vercel.json` carries the production settings: a strict Content-Security-Policy (no inline script, no third-party origins), `nosniff`, frame denial, no-referrer, a restrictive Permissions-Policy, immutable caching for hashed assets, no-cache for the HTML shell and service worker, and **`X-Robots-Tag: noindex`**. Remove that header only after the clinical content has had independent review and you want the site discoverable.

**Vercel via Git:** import the repository and set **Root Directory to `neuroconvert`**. This matters because the repository root contains another app's `vercel.json`. The build command and output directory come from this folder's `vercel.json`.

**Vercel via CLI:** `cd neuroconvert && npx vercel --prod`.

**Access:** new Vercel projects have Vercel Authentication enabled, which puts `*.vercel.app` URLs behind a Vercel login. Switch it off under *Settings → Deployment Protection* when you are ready for clinicians without Vercel accounts to open the site.

## How it is built

```
src/
  types.ts                 data model: a rule cannot exist without a tier and references
  engine/                  pure, DOM-free functions (convert, LEDD, formatting)
  data/
    references.ts          64 sources, each with PMID/DOI or DailyMed set ID + version date
    findings.ts            research findings and deliberate omissions shown on the Methods page
    modules/*.ts           one file per clinical module
  ui/                      small dependency-free DOM layer (text only, no innerHTML)
tests/
  engine.test.ts           arithmetic, validation, interval maths, LEDD logic
  data-integrity.test.ts   every rule has a tier + resolvable references; tables are well-formed;
                           reversible conversions round-trip; safety warnings present
  clinical-values.test.ts  every label table / published factor pinned to its source
scripts/verify-references.mjs
```

The tests exist to make transcription errors loud: `clinical-values.test.ts` pins each table and factor to the value in the source (for example all rows of the Depakote DR → ER, ropinirole IR → ER and Rytary label tables, the Jost 2023 LED factors, and the Ashton and Liu tables).

### Adding or changing a conversion

1. Read the **primary source** (the label text on DailyMed, or the paper), not a summary.
2. Add a `Reference` to `src/data/references.ts` (PMID + DOI, or DailyMed set ID + label version date).
3. Add the route / item in the relevant `src/data/modules/*.ts` with a tier, the reference ids and a `locator` saying where in the source the number appears. Mark `derived: true` if it is arithmetic on source data.
4. Pin the value in `tests/clinical-values.test.ts`, then run `npm test` and `npm run verify:references`.

## Curation notes

- Sources were read in full where accessible. Where a recollection or a secondary source disagreed with the primary source, the primary source won. Two examples: the current ropinirole ER label table differs from an older 2011 label (15 mg → 16 mg, 18 mg → 18 mg now), and the Jost 2023 table sets safinamide at a fixed 150 mg LED (Schade 2020 had proposed 100 mg).
- Labels were read from DailyMed on 16 and 19 November 2026; all cited label versions were current when read. Labels change: on 19 November the verification script caught a Keppra injection revision made three days earlier (the switching text was unchanged). Run `npm run verify:references` to see whether any have been revised since.
- **Not verifiable during curation:** IV carbamazepine (Carnexiv) is not listed in DailyMed, so its 70 % figure rests on a published review of the labelling plus a pharmacokinetic study, and is marked accordingly.
- The botulinum toxin ratios come from clinical literature (a review and four randomised trials); every current US label says units cannot be converted. The app shows both.
- Where two sources disagree, the app shows the disagreement instead of picking one: benzodiazepine lorazepam and alprazolam equivalents differ by a factor of two between Ashton and the 2025 joint guideline.

## Reporting an error

A wrong number can harm a patient. Please open an issue with the conversion, the value you expected and the source that supports it.
