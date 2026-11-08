/*
 * One-line plain-language descriptions of each syndrome, for the guided result screen.
 * Deliberately conservative: they describe the typical picture in the ILAE 2022 definitions
 * and avoid prognosis claims beyond what the ILAE tables state (e.g. "self-limited").
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EpiPlain = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const PLAIN = {
    SELNE: 'Seizures in the first weeks of life in an otherwise well newborn; self-limited, and often runs in families.',
    SELFNIE: 'Seizures from the newborn period into early infancy in an otherwise well baby, usually running in the family; self-limited.',
    SELIE: 'Brief focal seizures starting in infancy in a developmentally normal baby; they usually stop within about a year.',
    MEI: 'Brief shock-like jerks starting in a developmentally normal infant, with a normal background EEG.',
    EIDEE: 'Severe epilepsy starting in the first 3 months with stiffening or jerking seizures and a very abnormal EEG; development is affected.',
    EIMFS: 'Infant seizures that move from one side or area of the brain to another and become very frequent; development is affected.',
    IESS: 'Clusters of brief spasms in an infant, often on waking, usually with a chaotic EEG. Time-critical: early treatment matters.',
    DRAVET: 'Prolonged, often fever-triggered seizures (frequently one-sided) in the first year, then other seizure types; development slows. Often caused by SCN1A.',
    KCNQ2DEE: 'Early-onset epilepsy with developmental impairment caused by a KCNQ2 gene variant.',
    PDDEE: 'Early, frequent seizures that stop rapidly with vitamin B6 (pyridoxine or pyridoxal phosphate).',
    CDKL5: 'Early epilepsy with severe developmental disability caused by a CDKL5 gene variant; seizures are often hyperkinetic, then stiff, then spasms.',
    PCDH19: 'Clusters of seizures, often with fever and fearful screaming, mostly in girls, caused by a PCDH19 gene variant.',
    GLUT1DS: 'Seizures (including absences) with developmental delay and movement problems from low glucose in the brain; confirmed by CSF glucose or SLC2A1 testing.',
    SWS: 'Focal seizures with a facial port-wine birthmark and abnormal brain blood vessels on MRI.',
    HHGS: 'Laughing (gelastic) seizures caused by a hypothalamic hamartoma on MRI; usually drug-resistant.',
    CAE: 'Many brief staring spells a day in a school-age child with normal development; the EEG typically shows 3 per second spike-wave.',
    JAE: 'Staring spells starting around the teenage years, typically fewer per day than in childhood absence epilepsy.',
    JME: 'Morning jerks of the arms, often with occasional convulsions, starting in the teens and triggered by sleep loss.',
    GTCA: 'Generalized convulsions as the only seizure type, with a typical generalized EEG, starting in childhood or adolescence.',
    SELECTS: 'Face and mouth twitching with drooling and trouble speaking, often at night, in a school-age child; self-limited.',
    SELEAS: 'Prolonged seizures with pallor and vomiting, often from sleep, in a preschool or school-age child; self-limited.',
    COVE: 'Seizures with coloured spots in the vision in a school-age child, with occipital spikes on EEG.',
    POLE: 'Visual seizures triggered by flickering light, with occipital spikes on EEG.',
    EEM: 'Rapid eyelid fluttering with the eyes rolling up, triggered by eye closure or bright light.',
    EMA: 'Absences with rhythmic arm jerks that creep upward (“ratcheting”).',
    EMATS: 'Sudden jerks followed by a drop, starting in early childhood, with generalized spike-wave on EEG.',
    LGS: 'Several seizure types including stiffening (tonic) seizures and drops, with slow spike-wave on EEG; usually hard to control and with learning difficulties.',
    SWAS: 'Learning, behaviour or motor skills regress while the sleep EEG shows near-continuous spike-wave.',
    FIRES: 'A febrile illness followed by sudden, very frequent seizures that do not stop — a medical emergency.',
    HHE: 'A prolonged one-sided febrile seizure followed by lasting weakness of that side, and epilepsy later.',
    SHE: 'Brief, violent movements (pedalling, thrashing) mostly from sleep, often several a night.',
    FMTLE: 'Mild temporal-lobe seizures (déjà vu, a rising feeling) that run in the family.',
    FFEVF: 'Focal seizures that run in a family, arising from different brain regions in different relatives.',
    EAF: 'Focal seizures that begin with hearing sounds or difficulty understanding speech.',
    MTLEHS: 'Temporal-lobe seizures (rising stomach feeling, déjà vu, staring and chewing) with a scarred hippocampus on MRI.',
    RS: 'Progressive disease of one brain hemisphere with frequent seizures, increasing weakness and shrinking of that side of the brain.',
    EWRIS: 'Jaw or mouth jerks triggered by reading or talking, usually starting in adolescence.',
    PME: 'Jerks and seizures that get steadily worse, with loss of skills and unsteadiness.',
  };
  return { PLAIN };
});
