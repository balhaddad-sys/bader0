import type { Reference } from '../types';

/**
 * Reference registry. Every PubMed-indexed article carries a PMID and DOI that
 * were checked against the live PubMed record (run `npm run verify:references`
 * to re-check). Prescribing-information references carry the DailyMed set ID and
 * the label version actually read during curation.
 */

const ACCESSED = '2026-11-16';
/** Sources added in the second research pass. */
const ACCESSED_2 = '2026-11-19';

function article(r: Omit<Reference, 'kind' | 'accessed'> & { accessed?: string }): Reference {
  return { ...r, kind: 'article', accessed: r.accessed ?? ACCESSED };
}

function label(
  id: string,
  citation: string,
  setId: string,
  year: number,
  verifyTitle: string,
  accessed: string = ACCESSED,
): Reference {
  return {
    id,
    kind: 'label',
    citation: `${citation} DailyMed set ID ${setId}.`,
    year,
    setId,
    url: `https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${setId}`,
    verifyTitle,
    accessed,
  };
}

export const REFERENCES: Reference[] = [
  /* ------------------------- Literature ------------------------- */
  article({
    id: 'jost2023',
    citation:
      'Jost ST, Kaldenbach MA, Antonini A, et al. Levodopa dose equivalency in Parkinson’s disease: updated systematic review and proposals. Mov Disord. 2023;38(7):1236-1252. doi:10.1002/mds.29410',
    year: 2023,
    pmid: '37147135',
    doi: '10.1002/mds.29410',
    verifyTitle: 'Levodopa Dose Equivalency in Parkinson',
  }),
  article({
    id: 'tomlinson2010',
    citation:
      'Tomlinson CL, Stowe R, Patel S, Rick C, Gray R, Clarke CE. Systematic review of levodopa dose equivalency reporting in Parkinson’s disease. Mov Disord. 2010;25(15):2649-2653. doi:10.1002/mds.23429',
    year: 2010,
    pmid: '21069833',
    doi: '10.1002/mds.23429',
    verifyTitle: 'Systematic review of levodopa dose equivalency reporting',
  }),
  article({
    id: 'schade2020',
    citation:
      'Schade S, Mollenhauer B, Trenkwalder C. Levodopa equivalent dose conversion factors: an updated proposal including opicapone and safinamide. Mov Disord Clin Pract. 2020;7(3):343-345. doi:10.1002/mdc3.12921',
    year: 2020,
    pmid: '32258239',
    doi: '10.1002/mdc3.12921',
    verifyTitle: 'Levodopa Equivalent Dose Conversion Factors',
  }),
  article({
    id: 'cilia2023',
    citation:
      'Cilia R, et al. Levodopa equivalent dose of safinamide: a multicenter, longitudinal, case-control study. Mov Disord Clin Pract. 2023;10(4):625-635. doi:10.1002/mdc3.13681',
    year: 2023,
    pmid: '37070060',
    doi: '10.1002/mdc3.13681',
    verifyTitle: 'Levodopa Equivalent Dose of Safinamide',
  }),
  article({
    id: 'snineh2020',
    citation:
      'Abu Snineh M, Hajyahya A, Linetsky E, et al. A real-life search for the optimal set of conversion factors to levodopa-equivalent-dose in Parkinson’s disease patients on polytherapy. J Parkinsons Dis. 2020;10(1):173-178. doi:10.3233/JPD-191769',
    year: 2020,
    pmid: '31868682',
    doi: '10.3233/JPD-191769',
    verifyTitle: 'Real-Life Search for the Optimal Set of Conversion Factors',
  }),
  article({
    id: 'liu2013',
    citation:
      'Liu D, Ahmet A, Ward L, et al. A practical guide to the monitoring and management of the complications of systemic corticosteroid therapy. Allergy Asthma Clin Immunol. 2013;9(1):30. doi:10.1186/1710-1492-9-30',
    year: 2013,
    pmid: '23947590',
    doi: '10.1186/1710-1492-9-30',
    verifyTitle: 'practical guide to the monitoring and management of the complications of systemic corticosteroid therapy',
  }),
  article({
    id: 'lepage2015',
    citation:
      'Le Page E, Veillard D, Laplaud DA, et al. Oral versus intravenous high-dose methylprednisolone for treatment of relapses in patients with multiple sclerosis (COPOUSEP): a randomised, controlled, double-blind, non-inferiority trial. Lancet. 2015;386(9997):974-981. doi:10.1016/S0140-6736(15)61137-0',
    year: 2015,
    pmid: '26135706',
    doi: '10.1016/S0140-6736(15)61137-0',
    verifyTitle: 'Oral versus intravenous high-dose methylprednisolone',
  }),
  article({
    id: 'burton2012',
    citation:
      'Burton JM, O’Connor PW, Hohol M, Beyene J. Oral versus intravenous steroids for treatment of relapses in multiple sclerosis. Cochrane Database Syst Rev. 2012;12:CD006921. doi:10.1002/14651858.CD006921.pub3',
    year: 2012,
    pmid: '23235634',
    doi: '10.1002/14651858.CD006921.pub3',
    verifyTitle: 'Oral versus intravenous steroids for treatment of relapses in multiple sclerosis',
  }),
  article({
    id: 'scaglione2016',
    citation:
      'Scaglione F. Conversion ratio between Botox®, Dysport®, and Xeomin® in clinical practice. Toxins (Basel). 2016;8(3):65. doi:10.3390/toxins8030065',
    year: 2016,
    pmid: '26959061',
    doi: '10.3390/toxins8030065',
    verifyTitle: 'Conversion Ratio between Botox',
  }),
  article({
    id: 'nelson1982',
    citation:
      'Nelson E, Powell JR, Conrad K, et al. Phenobarbital pharmacokinetics and bioavailability in adults. J Clin Pharmacol. 1982;22(2-3):141-148. doi:10.1002/j.1552-4604.1982.tb02662.x',
    year: 1982,
    pmid: '7068937',
    doi: '10.1002/j.1552-4604.1982.tb02662.x',
    verifyTitle: 'Phenobarbital pharmacokinetics and bioavailability in adults',
  }),
  article({
    id: 'vickery2018',
    citation:
      'Vickery PB, Tillery EE, DeFalco AP. Intravenous carbamazepine for adults with seizures. Ann Pharmacother. 2018;52(3):285-289. doi:10.1177/1060028017736785',
    year: 2018,
    pmid: '29020805',
    doi: '10.1177/1060028017736785',
    verifyTitle: 'Intravenous Carbamazepine for Adults With Seizures',
  }),
  article({
    id: 'marino2012',
    citation:
      'Marino SE, Birnbaum AK, Leppik IE, et al. Steady-state carbamazepine pharmacokinetics following oral and stable-labeled intravenous administration in epilepsy patients: effects of race and sex. Clin Pharmacol Ther. 2012;91(3):483-488. doi:10.1038/clpt.2011.251',
    year: 2012,
    pmid: '22278332',
    doi: '10.1038/clpt.2011.251',
    verifyTitle: 'Steady-state carbamazepine pharmacokinetics following oral and stable-labeled intravenous',
  }),
  {
    id: 'ashton2007',
    kind: 'web',
    citation:
      'Ashton CH. Benzodiazepine equivalence table (revised April 2007). In: Benzodiazepines: How They Work and How to Withdraw (The Ashton Manual). Benzo.org.uk archive. https://www.benzo.org.uk/bzequiv.htm. Accessed 2026-11-16.',
    year: 2007,
    url: 'https://www.benzo.org.uk/bzequiv.htm',
    accessed: ACCESSED,
  },


  /* ---------------- Second research pass (2026-11-19) ---------------- */
  article({
    id: 'brunner2025',
    short: 'Brunner 2025',
    citation:
      'Brunner E, et al. Joint Clinical Practice Guideline on Benzodiazepine Tapering: considerations when risks outweigh benefits. J Gen Intern Med. 2025;40(12):2814-2859. doi:10.1007/s11606-025-09499-2',
    year: 2025,
    pmid: '40526204',
    doi: '10.1007/s11606-025-09499-2',
    verifyTitle: 'Joint Clinical Practice Guideline on Benzodiazepine Tapering',
    accessed: ACCESSED_2,
  }),
  article({
    id: 'benecke2005',
    short: 'Benecke 2005',
    citation:
      'Benecke R, Jost WH, Kanovsky P, Ruzicka E, Comes G, Grafe S. A new botulinum toxin type A free of complexing proteins for treatment of cervical dystonia. Neurology. 2005;64(11):1949-1951. doi:10.1212/01.WNL.0000163767.99354.C3',
    year: 2005,
    pmid: '15955951',
    doi: '10.1212/01.WNL.0000163767.99354.C3',
    verifyTitle: 'A new botulinum toxin type A free of complexing proteins',
    accessed: ACCESSED_2,
  }),
  article({
    id: 'odergren1998',
    short: 'Odergren 1998',
    citation:
      'Odergren T, Hjaltason H, Kaakkola S, et al. A double blind, randomised, parallel group study to investigate the dose equivalence of Dysport and Botox in the treatment of cervical dystonia. J Neurol Neurosurg Psychiatry. 1998;64(1):6-12. doi:10.1136/jnnp.64.1.6',
    year: 1998,
    pmid: '9436720',
    doi: '10.1136/jnnp.64.1.6',
    verifyTitle: 'dose equivalence of Dysport and Botox',
    accessed: ACCESSED_2,
  }),
  article({
    id: 'ranoux2002',
    short: 'Ranoux 2002',
    citation:
      'Ranoux D, Gury C, Fondarai J, Mas JL, Zuber M. Respective potencies of Botox and Dysport: a double blind, randomised, crossover study in cervical dystonia. J Neurol Neurosurg Psychiatry. 2002;72(4):459-462. doi:10.1136/jnnp.72.4.459',
    year: 2002,
    pmid: '11909903',
    doi: '10.1136/jnnp.72.4.459',
    verifyTitle: 'Respective potencies of Botox and Dysport',
    accessed: ACCESSED_2,
  }),
  article({
    id: 'yun2015',
    short: 'Yun 2015',
    citation:
      'Yun JY, Kim JW, Kim HT, et al. Dysport and Botox at a ratio of 2.5:1 units in cervical dystonia: a double-blind, randomized study. Mov Disord. 2015;30(2):206-213. doi:10.1002/mds.26085',
    year: 2015,
    pmid: '25476727',
    doi: '10.1002/mds.26085',
    verifyTitle: 'Dysport and Botox at a ratio of 2.5:1',
    accessed: ACCESSED_2,
  }),
  article({
    id: 'lambrecht2011',
    short: 'Lambrecht 2011',
    citation:
      'Lambrecht LJ, Shekh-Ahmad T, Todd WM, Halvorsen MB, Bialer M. Comparative pharmacokinetic analysis of USL255, a new once-daily extended-release formulation of topiramate. Epilepsia. 2011;52(10):1877-1883. doi:10.1111/j.1528-1167.2011.03183.x',
    year: 2011,
    pmid: '21770925',
    doi: '10.1111/j.1528-1167.2011.03183.x',
    verifyTitle: 'Comparative pharmacokinetic analysis of USL255',
    accessed: ACCESSED_2,
  }),
  article({
    id: 'hoy2016',
    short: 'Hoy 2016',
    citation:
      'Hoy SM. Topiramate extended release: a review in epilepsy. CNS Drugs. 2016;30(6):559-566. doi:10.1007/s40263-016-0344-5',
    year: 2016,
    pmid: '27224993',
    doi: '10.1007/s40263-016-0344-5',
    verifyTitle: 'Topiramate Extended Release: A Review in Epilepsy',
    accessed: ACCESSED_2,
  }),
  article({
    id: 'patsalos2008',
    short: 'Patsalos 2008',
    citation:
      'Patsalos PN, Berry DJ, Bourgeois BFD, et al. Antiepileptic drugs: best practice guidelines for therapeutic drug monitoring. A position paper by the subcommission on therapeutic drug monitoring, ILAE Commission on Therapeutic Strategies. Epilepsia. 2008;49(7):1239-1276. doi:10.1111/j.1528-1167.2008.01561.x',
    year: 2008,
    pmid: '18397299',
    doi: '10.1111/j.1528-1167.2008.01561.x',
    verifyTitle: 'best practice guidelines for therapeutic drug monitoring',
    accessed: ACCESSED_2,
  }),
  article({
    id: 'patsalos2018',
    short: 'Patsalos 2018',
    citation:
      'Patsalos PN, Spencer EP, Berry DJ. Therapeutic drug monitoring of antiepileptic drugs in epilepsy: a 2018 update. Ther Drug Monit. 2018;40(5):526-548. doi:10.1097/FTD.0000000000000546',
    year: 2018,
    pmid: '29957667',
    doi: '10.1097/FTD.0000000000000546',
    verifyTitle: 'Therapeutic Drug Monitoring of Antiepileptic Drugs in Epilepsy: A 2018 Update',
    accessed: ACCESSED_2,
  }),
  article({
    id: 'kiang2016',
    short: 'Kiang 2016',
    citation:
      'Kiang TKL, Ensom MHH. A comprehensive review on the predictive performance of the Sheiner-Tozer and derivative equations for the correction of phenytoin concentrations. Ann Pharmacother. 2016;50(4):311-325. doi:10.1177/1060028016628166',
    year: 2016,
    pmid: '26825643',
    doi: '10.1177/1060028016628166',
    verifyTitle: 'Comprehensive Review on the Predictive Performance of the Sheiner-Tozer',
    accessed: ACCESSED_2,
  }),
  article({
    id: 'kane2013',
    short: 'Kane 2013',
    citation:
      'Kane SP, Bress AP, Tesoro EP. Characterization of unbound phenytoin concentrations in neurointensive care unit patients using a revised Winter-Tozer equation. Ann Pharmacother. 2013;47(5):628-636. doi:10.1345/aph.1R651',
    year: 2013,
    pmid: '23606554',
    doi: '10.1345/aph.1R651',
    verifyTitle: 'Characterization of unbound phenytoin concentrations in neurointensive care unit patients',
    accessed: ACCESSED_2,
  }),
  article({
    id: 'buckley2016',
    short: 'Buckley 2016',
    citation:
      'Buckley MS, Reeves BA, Barletta JF, Bikin DS. Correlation of free and total phenytoin serum concentrations in critically ill patients. Ann Pharmacother. 2016;50(4):276-281. doi:10.1177/1060028015627468',
    year: 2016,
    pmid: '26783351',
    doi: '10.1177/1060028015627468',
    verifyTitle: 'Correlation of Free and Total Phenytoin Serum Concentrations in Critically Ill Patients',
    accessed: ACCESSED_2,
  }),
  article({
    id: 'aquilonius1980',
    short: 'Aquilonius 1980',
    citation:
      'Aquilonius SM, Eckernäs SA, Hartvig P, Lindström B, Osterman PO. Pharmacokinetics and oral bioavailability of pyridostigmine in man. Eur J Clin Pharmacol. 1980;18(5):423-428. doi:10.1007/BF00636797',
    year: 1980,
    pmid: '7439266',
    doi: '10.1007/BF00636797',
    verifyTitle: 'Pharmacokinetics and oral bioavailability of pyridostigmine in man',
    accessed: ACCESSED_2,
  }),
  article({
    id: 'jonasson2020',
    short: 'Jonasson 2020',
    citation:
      'Jonasson E, Sejbaek T. Diroximel fumarate in the treatment of multiple sclerosis. Neurodegener Dis Manag. 2020;10(5):267-276. doi:10.2217/nmt-2020-0025',
    year: 2020,
    pmid: '32686599',
    doi: '10.2217/nmt-2020-0025',
    verifyTitle: 'Diroximel fumarate in the treatment of multiple sclerosis',
    accessed: ACCESSED_2,
  }),
  {
    id: 'pubchem',
    short: 'PubChem',
    kind: 'web',
    citation:
      'National Center for Biotechnology Information. PubChem Compound database (molecular weights): valproic acid CID 3121, phenytoin 1775, carbamazepine 2554, carbamazepine-10,11-epoxide 2555, phenobarbital 4763, primidone 4909, lamotrigine 3878, levetiracetam 5284583, licarbazepine 114709, topiramate 5284627, zonisamide 5734, lacosamide 219078, brivaracetam 9837243, gabapentin 3446, pregabalin 5486971, clobazam 2789, norclobazam 89657, clonazepam 2802, ethosuximide 10630591, rufinamide 129228, perampanel 9924495. https://pubchem.ncbi.nlm.nih.gov/. Accessed 2026-11-19.',
    year: 2026,
    url: 'https://pubchem.ncbi.nlm.nih.gov/',
    accessed: ACCESSED_2,
  },

  /* --------------- FDA prescribing information (DailyMed) --------------- */
  label('lbl-keppra-iv', 'KEPPRA (levetiracetam) injection, for intravenous use. Prescribing information. UCB, Inc.; label version dated 16 Nov 2026.', 'c6d5784d-abf9-45fe-ac5a-d5c53bd50f7e', 2026, 'KEPPRA', ACCESSED_2),
  label('lbl-keppra-xr', 'KEPPRA XR (levetiracetam) extended-release tablets. Prescribing information. UCB, Inc.; label version dated 26 Jun 2025.', '2919e43b-69a8-434c-a2d2-1f3ecd7554c0', 2025, 'KEPPRA XR'),
  label('lbl-vimpat', 'VIMPAT (lacosamide) tablets, injection, oral solution. Prescribing information. UCB, Inc.; label version dated 13 May 2026.', '9e79b42c-38a3-4b2c-a196-a5a1948250e2', 2026, 'VIMPAT'),
  label('lbl-briviact', 'BRIVIACT (brivaracetam) tablets, oral solution, injection. Prescribing information. UCB, Inc.; label version dated 9 Nov 2026.', '3cf2f439-0e97-443e-8e33-25ecef616f6c', 2026, 'BRIVIACT'),
  label('lbl-valproate-iv', 'Valproate sodium injection, for intravenous use. Prescribing information. Sagent Pharmaceuticals; label version dated 22 Jun 2026.', '8d5fc1c1-d3c0-497e-971b-6c4dba9a3fad', 2026, 'VALPROATE SODIUM'),
  label('lbl-depakote', 'DEPAKOTE (divalproex sodium) delayed-release tablets. Prescribing information. AbbVie Inc.; label version dated 14 Apr 2026.', '08a65cf4-7749-4ceb-6895-8f4805e2b01f', 2026, 'DEPAKOTE'),
  label('lbl-depakote-er', 'DEPAKOTE ER (divalproex sodium) extended-release tablets. Prescribing information. AbbVie Inc.; label version dated 13 Apr 2026.', '0dc024ce-efc8-4690-7cb5-639c728fccac', 2026, 'DEPAKOTE ER'),
  label('lbl-tegretol', 'TEGRETOL (carbamazepine) tablets, suspension; TEGRETOL XR extended-release tablets. Prescribing information. Novartis Pharmaceuticals Corporation; label version dated 21 Aug 2026.', '8d409411-aa9f-4f3a-a52c-fbcb0c3ec053', 2026, 'TEGRETOL'),
  label('lbl-lamictal-xr', 'LAMICTAL XR (lamotrigine) extended-release tablets. Prescribing information. GlaxoSmithKline LLC; label version dated 20 Aug 2026.', '3e2c9a35-6a39-41d7-ad84-3c0bb8894b09', 2026, 'LAMICTAL XR'),
  label('lbl-oxtellar-xr', 'OXTELLAR XR (oxcarbazepine) extended-release tablets. Prescribing information. Supernus Pharmaceuticals, Inc.; label version dated 6 Oct 2026.', 'aa610e56-1d1d-11e1-8bc2-0800200c9a66', 2026, 'OXTELLAR XR'),
  label('lbl-dilantin', 'DILANTIN Infatabs (phenytoin) chewable tablets (label covers phenytoin free-acid and sodium-salt products). Prescribing information. Parke-Davis, Division of Pfizer Inc; label version dated 21 May 2026.', 'ca119a89-2394-4d34-8078-cd1fa4e8e2f1', 2026, 'DILANTIN'),
  label('lbl-cerebyx', 'CEREBYX (fosphenytoin sodium) injection. Prescribing information. Pfizer Laboratories, Division of Pfizer Inc; label version dated 29 Aug 2025.', 'd4c36fad-0ba2-4cd4-9c5e-dcf843f38a5a', 2025, 'CEREBYX'),
  label('lbl-ropinirole-er', 'Ropinirole extended-release tablets. Prescribing information. Bryant Ranch Prepack (repackaged generic); label version dated 28 May 2026.', '518e7407-8ef2-4596-8218-c318b4fd7634', 2026, 'ROPINIROLE'),
  label('lbl-pramipexole-er', 'Pramipexole dihydrochloride extended-release tablets. Prescribing information. Vitruvias Therapeutics, Inc.; label version dated 25 Jul 2024.', 'd07aad1b-e078-4fca-8386-ca2e8e899688', 2024, 'PRAMIPEXOLE'),
  label('lbl-cdld-er', 'Carbidopa and levodopa extended-release tablets. Prescribing information. Accord Healthcare, Inc.; label version dated 9 Nov 2026.', '5217a6ec-cc26-4acc-b2da-17f6545c3b60', 2026, 'CARBIDOPA AND LEVODOPA'),
  label('lbl-rytary', 'RYTARY (carbidopa and levodopa) extended-release capsules. Prescribing information. Amneal Pharmaceuticals LLC; label version dated 27 Mar 2026.', '6c1f7cd4-de56-45c1-a734-5e77b4aeb6f7', 2026, 'RYTARY'),
  label('lbl-namenda-xr', 'NAMENDA XR (memantine hydrochloride) extended-release capsules. Prescribing information (repackaged label, Carilion Materials Management); label version dated 28 Feb 2018.', '1fa2b7bc-94e5-4566-a7c5-419f8fd393a7', 2018, 'NAMENDA XR'),
  label('lbl-exelon', 'EXELON (rivastigmine) transdermal system. Prescribing information. Novartis Pharmaceuticals Corporation; label version dated 6 Oct 2025.', '07c12e14-bbd5-4ec8-84e4-fbe7b5ba10e0', 2025, 'EXELON'),
  label('lbl-botox', 'BOTOX (onabotulinumtoxinA) for injection. Prescribing information. Allergan, Inc.; label version dated 3 Aug 2026.', '33d066a9-34ff-4a1a-b38b-d10983df3300', 2026, 'BOTOX'),
  label('lbl-dysport', 'DYSPORT (abobotulinumtoxinA) for injection. Prescribing information. Galderma Laboratories, L.P.; label version dated 28 Oct 2024.', '71313a04-1349-4c26-b840-a39e4a3ddaed', 2024, 'DYSPORT'),
  label('lbl-xeomin', 'XEOMIN (incobotulinumtoxinA) for injection. Prescribing information. Merz North America, Inc.; label version dated 13 Jul 2026.', '3f35d6e0-3450-4abc-a0da-cc7b277e7c6e', 2026, 'XEOMIN'),
  label('lbl-myobloc', 'MYOBLOC (rimabotulinumtoxinB) injection. Prescribing information. Solstice Neurosciences, LLC; label version dated 8 Oct 2026.', '675cb354-9d13-482e-8ac2-22f709c58b4f', 2026, 'MYOBLOC'),
  label('lbl-daxxify', 'DAXXIFY (daxibotulinumtoxinA) for injection. Prescribing information. Revance Therapeutics, Inc.; label version dated 9 Nov 2026.', '3aaa6e14-a3f7-4fb2-b9f9-d3a9c3ae1f74', 2026, 'DAXXIFY'),

  /* labels added in the second research pass */
  label('lbl-vyalev', 'VYALEV (foscarbidopa and foslevodopa) injection, for subcutaneous infusion. Prescribing information. AbbVie Inc.; label version dated 9 Apr 2026.', '28e806e4-951c-40a9-9f0c-d0929caf054c', 2026, 'VYALEV', ACCESSED_2),
  label('lbl-duopa', 'DUOPA (carbidopa and levodopa) enteral suspension. Prescribing information. AbbVie Inc.; label version dated 1 Apr 2026.', '7066d371-dc6a-0d6f-7bed-e5dd4ee912da', 2026, 'DUOPA', ACCESSED_2),
  label('lbl-namzaric', 'NAMZARIC (memantine hydrochloride extended-release and donepezil hydrochloride) capsules. Prescribing information. Allergan, Inc.; label version dated 6 May 2026.', '90fedc32-19e5-480c-afc6-f35a5cf4b9aa', 2026, 'NAMZARIC', ACCESSED_2),
  label('lbl-lyrica-cr', 'LYRICA CR (pregabalin) extended-release tablets. Prescribing information. Viatris Specialty LLC; label version dated 15 Apr 2026.', 'f280bbd8-2af2-444a-bd96-e409337ca6dd', 2026, 'LYRICA CR', ACCESSED_2),
  label('lbl-gralise', 'GRALISE (gabapentin) tablets. Prescribing information. Almatica Pharma LLC; label version dated 20 Aug 2026.', '466273b1-c9fc-3930-c94b-aa11394d5140', 2026, 'GRALISE', ACCESSED_2),
  label('lbl-horizant', 'HORIZANT (gabapentin enacarbil) extended-release tablets. Prescribing information. Azurity Pharmaceuticals, Inc.; label version dated 7 May 2025.', '4c486fc7-c8c4-4c6c-b30c-366dabaeaadd', 2025, 'HORIZANT', ACCESSED_2),
  label('lbl-hyqvia', 'HYQVIA (immune globulin infusion 10% with recombinant human hyaluronidase). Prescribing information. Takeda Pharmaceuticals America, Inc.; label version dated 22 Jun 2026.', '7ca2c26f-4be2-48cd-be5b-486e350654ba', 2026, 'HYQVIA', ACCESSED_2),
  label('lbl-hizentra', 'HIZENTRA (immune globulin subcutaneous [human], 20% liquid). Prescribing information. CSL Behring AG; label version dated 1 May 2023.', '7b58f5ff-0316-49a3-b585-1f6003ddb953', 2023, 'HIZENTRA', ACCESSED_2),
  label('lbl-fycompa', 'FYCOMPA (perampanel) tablets and oral suspension. Prescribing information. Eisai Inc.; label version dated 28 Jan 2026.', '71cf3309-e182-473c-8b0b-280cabd0e122', 2026, 'FYCOMPA', ACCESSED_2),
  label('lbl-onfi', 'ONFI (clobazam) tablets and oral suspension. Prescribing information. Lundbeck Pharmaceuticals LLC; label version dated 13 Nov 2026.', 'de03bd69-2dca-459c-93b4-541fd3e9571c', 2026, 'ONFI', ACCESSED_2),
  label('lbl-mysoline', 'MYSOLINE (primidone) tablets. Prescribing information. Bausch Health US, LLC; label version dated 11 Sep 2026.', 'af593171-dabb-4ea3-b44c-89ed457b2c46', 2026, 'MYSOLINE', ACCESSED_2),
  label('lbl-vumerity', 'VUMERITY (diroximel fumarate) delayed-release capsules. Prescribing information. Biogen Inc.; label version dated 2 Jun 2025.', '2d74414f-6b83-4ea2-9a95-3cecabbce774', 2025, 'VUMERITY', ACCESSED_2),
  label('lbl-ocrevus-zunovo', 'OCREVUS ZUNOVO (ocrelizumab and hyaluronidase) injection, for subcutaneous use. Prescribing information. Genentech, Inc.; label version dated 28 Sep 2026.', 'b216af61-99d0-42a3-afc2-b5bf86df1ec0', 2026, 'OCREVUS ZUNOVO', ACCESSED_2),
];

export const REFERENCE_MAP: ReadonlyMap<string, Reference> = new Map(REFERENCES.map((r) => [r.id, r]));

export function getReference(id: string): Reference {
  const r = REFERENCE_MAP.get(id);
  if (!r) throw new Error(`Unknown reference id: ${id}`);
  return r;
}
