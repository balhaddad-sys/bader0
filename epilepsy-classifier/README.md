# Epilepsy Study

A visual study app for epilepsy, built for a neurologist who wants to know it in depth. Pictures first, annotations on everything, and games that make you retrieve the answer.

> **A study aid, not for patient care.** Confirm doses and indications against current guidelines and product labels. Everything runs in the browser; nothing is transmitted. Only your study progress and notes are kept in this browser's local storage.

## What is in it

* **Picture atlas** — 23 annotated EEG schematics, 25 seizure-movement drawings and 11 physical-sign drawings, each with features, pitfalls, which ILAE criteria use it, and a source line. **Cover the labels** hides every annotation so you can name the parts from memory; tap the picture to peek. A **My notes** box on every entry keeps your own hooks and cases.
* **Drug diagrams** — one annotated synapse per mechanism group (sodium channel, SV2A, GABA-A, calcium channel, AMPA/NMDA, multi-target, other) with the target highlighted and every drug in the group.
* **Memory hooks** — a vivid one-line mnemonic for each of 30 drugs and 30 genes, shown on flashcards, in quiz explanations and on the cheat sheets.
* **Games** — daily rounds, flashcards with spaced repetition, quiz blitz (and survival), the syndrome detective, name-that-picture, memory match, sorting and ordering puzzles, and an EEG lab (10–20 electrodes, phase reversal).
* **Cheat sheets** — drug diagrams, drugs, genes, trials, and a status epilepticus card.
* **Progress** — XP, levels, streaks, 15 badges, a topic mastery map and a confetti burst for perfect rounds. Back up or move your progress as text from the settings page.

## How it is built to be memorable

| Technique | Where it appears |
|---|---|
| Retrieval practice | Every game asks before it tells; cover-the-labels in the atlas |
| Spaced practice | SM-2-style flashcards; misses return tomorrow |
| Interleaving | Daily rounds and quizzes mix topics |
| Dual coding | A drawing, trace, head map or synapse diagram beside the words |
| Elaboration, concrete examples | Every answer explains why; hooks tie facts to an image |
| Game mechanics | Streaks, XP, levels, badges (evidence is for engagement, not magic) |

The first five follow Weinstein, Madan & Sumeracki, *Teaching the science of learning*, Cognitive Research: Principles and Implications 2018 (https://link.springer.com/article/10.1186/s41235-017-0087-y). Independent evidence for picture mnemonics specifically is limited, so the hooks are an aid and not the method.

## Where the content comes from

Syndrome, EEG, movement and sign questions are generated from the ILAE 2022 criteria tables (`kb.js`) and the atlases, so they cannot disagree with each other. The syndrome detective uses the rule engine: every wrong option is a syndrome the criteria reject for the full clue set. Hand-written content (`src/bank.js`: 114 facts, 30 drugs, 30 genes, 16 trials, 6 sequences) carries a source on every statement and a flag:

* **checked source** — checked against the abstract of the cited paper on PubMed when the bank was built (ILAE 2014 epilepsy definition, 2010 drug-resistance definition, 2025 seizure classification, ILAE 2015 status epilepticus, RAMPART, ESETT, Kwan & Brodie 2000, the CAE trial, SANAD II, ICISS, Wiebe 2001, ERSET, SANTE, RNS, EXIST-3, cannabidiol, fenfluramine, SUDEP and pregnancy guidelines, ILAE 2023 neonatal guideline, ILAE hippocampal-sclerosis classification);
* **standard teaching** — textbook-level knowledge, not re-verified.

Where a correct answer would be conspicuously the longest option, the game asks for recall (think, reveal, self-grade) rather than a multiple choice.

## Run, test, deploy

```bash
open index.html            # no build step; or: npm run serve → http://localhost:8080
npm test                   # 90 tests (Node ≥ 20, no dependencies)
```

**Vercel:** static site, Root Directory `epilepsy-classifier`, Framework *Other*, no build or install command. `vercel.json` sets a strict Content-Security-Policy (no network access from the page, no inline scripts or styles).

**Android:** `android/build.sh` packs the same files into a WebView app (no Gradle; needs `aapt`, `apksigner`, `zipalign`, a JDK). The manifest declares no permissions, so the OS blocks all network access. DOM storage is enabled solely so study progress and notes persist.

## Layout

```
index.html  styles.css
src/bank.js      hand-written, source-labelled study content and memory hooks
src/quiz.js      study engine: deck, questions, detective, puzzles, spaced repetition, XP, mechanism diagrams
src/study.js     study UI: hub, games, cheat sheets
src/views.js     picture atlas (EEG, movements, signs, diagrams), annotation cover, notes, router
src/kb.js        ILAE 2022 syndrome criteria (data for the games)
src/engine.js    criteria parser and evaluator (used by the detective)
src/morph.js semio.js physical.js   atlas content; src/diagrams.js figures.js   drawings
tests/           node:test suite
```

## Sources

ILAE: Beniczky 2025 (seizure classification); Scheffer 2017 (epilepsies); Wirrell, Zuberi, Specchio, Riney and Hirsch 2022 (syndromes); Fisher 2014; Kwan 2010; Trinka 2015; Blümcke 2013; Pressler 2023. Guidelines and trials as listed on the cards, with PMIDs where checked.
