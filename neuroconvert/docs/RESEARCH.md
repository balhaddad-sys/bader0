# Research log

Second research pass, 19 November 2026 (the first, 16 November, built the original content). Purpose: close the gaps listed as "not provided", cross-check the weakest numbers against independent sources, and add label-defined conversions neurologists use daily.

Everything in the app is traceable to a source read in full where accessible. Nothing here has had independent review by a clinical pharmacist or neurologist: the first job for a reviewer is the list under **Check these first**.

## How it was done

| Source | Used for | How reached |
| --- | --- | --- |
| PubMed (NCBI E-utilities) | Titles, authors, journals, DOIs, abstracts of every cited article | `esearch` / `esummary` / `efetch` |
| PubMed Central | Full text of open-access papers (the 2025 benzodiazepine-tapering guideline) | `efetch db=pmc` |
| DailyMed (FDA labels) | Conversion text, tables, molecular weights, version history | `spls` JSON and XML |
| PubChem (via NCBI) | Molecular formula and weight of each drug analyte | `esearch`/`esummary db=pccompound` |

Not readable here, so not used as a source of numbers: the ILAE therapeutic-drug-monitoring papers (abstracts only), Tomlinson 2010 and Schade 2020 (abstracts only; the factors come from Jost 2023, which is open access), and any publisher-paywalled full text.

`npm run verify:references` re-checks all 62 PubMed and DailyMed references. On 19 November it found that the Keppra injection label had been revised on 16 November; the switching text was unchanged and the citation was updated.

## Findings that changed the app

1. **Benzodiazepine equivalents disagree by a factor of two.** The 2025 joint clinical practice guideline (Brunner et al., *J Gen Intern Med*, PMID 40526204, Table 3 footnotes) equates diazepam 10 mg with clonazepam 0.5 mg, **lorazepam 2 mg** and **alprazolam 1 mg**. Ashton has lorazepam 1 mg and alprazolam 0.5 mg. They agree on clonazepam. The app now keeps both sources per agent and shows a range where they differ (lorazepam 2 mg → diazepam 10–20 mg), computing within each source so that sources which agree on a ratio (alprazolam : lorazepam = 1 : 2) show no false width. The guideline also states that no precise conversion strategy exists, that the equivalents came from patient-reported experience, and that a switch is better made over 1–2 weeks.
2. **Foslevodopa's place in the LED table is confirmed.** Jost 2023 gives foslevodopa/foscarbidopa dose × 0.75. The Vyalev label converts levodopa to foslevodopa × 1.3, whose inverse is 0.77, so the table's dose is the foslevodopa component. It was excluded for ambiguity in the first pass and is now included.
3. **Botulinum toxin ratios now rest on four randomised trials.** Odergren 1998 (n=73): abobotulinumtoxinA at 3× the units gave equivalent efficacy. Yun 2015 (n=103): 2.5 : 1 non-inferior. Ranoux 2002 (n=54): 1 : 3 and 1 : 4 more potent than onabotulinumtoxinA with more adverse events (dysphagia 15.6% and 17.3% vs 3%). Benecke 2005 (n=463): incobotulinumtoxinA non-inferior at the same units. Every current US label still says the units cannot be converted; the app shows both.
4. **The Sheiner–Tozer phenytoin correction performs poorly where it is used most** (Kiang & Ensom 2016 review; Kane 2013; Buckley 2016). It is offered with that evidence displayed above the answer, and a measured free level is preferred.

## New conversions (all verified before inclusion)

| Conversion | Tier | Source |
| --- | --- | --- |
| Drug-level units µg/mL ⇄ µmol/L for 21 analytes (valproic acid, phenytoin, carbamazepine and its epoxide, phenobarbital, primidone, lamotrigine, levetiracetam, MHD, topiramate, zonisamide, lacosamide, brivaracetam, gabapentin, pregabalin, clobazam and N-desmethylclobazam, clonazepam, ethosuximide, rufinamide, perampanel) | B | PubChem molecular weights, matched to FDA labels wherever a label states one |
| Phenytoin albumin correction | D | Kiang & Ensom 2016 (formula as stated in the abstract) |
| Vyalev pump settings (TLD × 1.3 ÷ 240 mg/mL ÷ hours; loading dose; 3,525 mg/day maximum) | A | Vyalev label |
| Duopa day-1 settings (first dose × 0.8 ÷ 20 mg/mL + 3 mL prime; continuous dose; 2,000 mg/day maximum) | A | Duopa label |
| Foslevodopa in the LEDD calculator (× 0.75) | D | Jost 2023, cross-checked with the Vyalev label |
| Namzaric from memantine IR or XR + donepezil 10 mg (including severe renal impairment) | A | Namzaric label §2.1, §2.3 |
| Lyrica → Lyrica CR table | A | Lyrica CR label §2.4 |
| HyQvia and Hizentra starting doses in CIDP | A | HyQvia and Hizentra labels |
| Perampanel tablets ⇄ suspension | A | Fycompa label ("may be used interchangeably") |
| Clobazam tablets ⇄ suspension | B | Onfi label (similar bioavailability) |
| Topiramate IR ⇄ Qudexy XR | B | Lambrecht 2011 (relative bioavailability 91.2%, 90% CI 84–99%); Hoy 2016 review |

## Searched and deliberately not added

| Topic | What was found | Why not added |
| --- | --- | --- |
| Pyridostigmine / neostigmine IV ⇄ oral | Aquilonius 1980: oral bioavailability 7.6 ± 2.4% (n = 2 IV, 5 oral), more than seven-fold variation in steady-state level between patients. A commonly quoted ~1 : 30 clinical ratio could not be verified. The pyridostigmine injection label concerns reversal of neuromuscular block. | Sources conflict and the one PK study is small. A wrong ratio is dangerous in myasthenic crisis. |
| Gabapentin ⇄ pregabalin | No label defines a ratio and PubMed returned no trial. Gralise and Horizant labels say they are not substitutable with other gabapentin products. | No validated ratio exists to cite. |
| Primidone → phenobarbital | Mysoline label gives no equivalence. | No verifiable ratio. |
| Dimethyl fumarate ⇄ diroximel fumarate | A review states MMF exposure is bioequivalent, but no milligram pairing was found in the label or the abstracts read. | Cannot pair doses without the number. |
| Ocrelizumab IV ⇄ SC | The Ocrevus Zunovo label says its dosing differs from IV. | No conversion applies. |
| Reference (therapeutic) ranges for drug levels | ILAE papers readable as abstracts only. | Ranges not verified from the primary source; only units are offered. |
| Hizentra 1.37 factor | Applies to primary immunodeficiency, not CIDP. | Out of scope. |

## Check these first (for a clinical reviewer)

1. Benzodiazepine ranges: confirm the 2025 guideline's Appendix B (supplementary file, not readable here) agrees with the Table 3 footnote values used.
2. LEDD factors against the Jost 2023 paper (Table 1), especially safinamide (fixed 150 mg) and cabergoline (66.67).
3. Vyalev and Duopa formulas against the current labels and pump instructions; the app gives starting settings only.
4. The phenytoin correction wording: is offering it, with these cautions, acceptable to your service?
5. IV carbamazepine (70%): not verifiable in DailyMed; marked pharmacokinetic evidence.
6. Intravenous antiseizure conversions and the Depakote ER table against the label for the product you stock.
