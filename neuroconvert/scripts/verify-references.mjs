#!/usr/bin/env node
/**
 * Re-verify every reference against live records.
 *
 *  - Articles: PubMed (NCBI E-utilities esummary) – checks that the PMID exists,
 *    the DOI matches, the publication year matches and the title matches.
 *  - Labels:   DailyMed (history endpoint) – checks that the set ID exists, the
 *    title matches, and that the label version dated in the citation exists.
 *    A newer published version is reported as a warning ("re-check this label"),
 *    because labels change after curation.
 *
 * Requires network access and Node >= 22.18 (it imports the TypeScript data file
 * directly via Node's built-in type stripping).
 *
 * Usage:  npm run verify:references            (exit 1 on any mismatch)
 *         npm run verify:references -- --strict (newer label versions also fail)
 */
import { REFERENCES } from '../src/data/references.ts';

const strict = process.argv.includes('--strict');
let failures = 0;
let warnings = 0;

const fail = (id, msg) => {
  failures += 1;
  console.log(`  FAIL  ${id}: ${msg}`);
};
const warn = (id, msg) => {
  warnings += 1;
  console.log(`  WARN  ${id}: ${msg}`);
  if (strict) failures += 1;
};
const ok = (id, msg) => console.log(`  ok    ${id}: ${msg}`);

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

async function getJson(url) {
  let res;
  try {
    res = await fetch(url, { headers: { 'user-agent': 'neuroconvert-reference-check/1.0' } });
  } catch (e) {
    const why = e.cause?.code ?? e.cause?.message ?? e.message;
    throw new Error(`network error (${why}) for ${new URL(url).host}. Behind a proxy? Try NODE_USE_ENV_PROXY=1`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

/** "label version dated 2 Jul 2025" → Date */
function citedDate(citation) {
  const m = citation.match(/label version dated (\d{1,2}) ([A-Z][a-z]{2}) (\d{4})/);
  return m ? new Date(Date.UTC(Number(m[3]), MONTHS[m[2]], Number(m[1]))) : null;
}
/** "Jul 02, 2025" → Date */
function dailymedDate(s) {
  const m = s.match(/([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/);
  return m ? new Date(Date.UTC(Number(m[3]), MONTHS[m[1]], Number(m[2]))) : null;
}

async function verifyArticles() {
  const articles = REFERENCES.filter((r) => r.kind === 'article' && r.pmid);
  console.log(`\nPubMed: ${articles.length} articles`);
  const ids = articles.map((r) => r.pmid).join(',');
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids}`;
  const data = (await getJson(url)).result;
  for (const r of articles) {
    const rec = data[r.pmid];
    if (!rec || rec.error) {
      fail(r.id, `PMID ${r.pmid} not found in PubMed`);
      continue;
    }
    const doi = (rec.articleids.find((a) => a.idtype === 'doi') ?? {}).value ?? '';
    const year = Number(String(rec.pubdate).slice(0, 4));
    const problems = [];
    if (doi.toLowerCase() !== r.doi.toLowerCase()) problems.push(`DOI is ${doi || 'absent'} in PubMed, ${r.doi} here`);
    if (year !== r.year) problems.push(`year is ${year} in PubMed, ${r.year} here`);
    if (!norm(rec.title).includes(norm(r.verifyTitle))) problems.push(`title differs: "${rec.title}"`);
    if (problems.length) fail(r.id, problems.join('; '));
    else ok(r.id, `PMID ${r.pmid} · ${rec.source} ${year} · ${rec.title.slice(0, 70)}`);
  }
}

async function verifyLabels() {
  const labels = REFERENCES.filter((r) => r.kind === 'label');
  console.log(`\nDailyMed: ${labels.length} labels`);
  for (const r of labels) {
    try {
      const { data } = await getJson(`https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${r.setId}/history.json`);
      const title = data.spl.title;
      if (!norm(title).includes(norm(r.verifyTitle))) {
        fail(r.id, `title "${title}" does not contain "${r.verifyTitle}"`);
        continue;
      }
      const cited = citedDate(r.citation);
      const dates = data.history.map((h) => dailymedDate(h.published_date)).filter(Boolean);
      const newest = new Date(Math.max(...dates.map((d) => d.getTime())));
      const known = cited && dates.some((d) => d.getTime() === cited.getTime());
      if (!known) fail(r.id, `cited version ${cited?.toISOString().slice(0, 10)} is not in this label's history`);
      else if (newest.getTime() > cited.getTime()) {
        warn(r.id, `a newer label version exists (${newest.toISOString().slice(0, 10)}); cited ${cited.toISOString().slice(0, 10)}. Re-check the conversion text.`);
      } else ok(r.id, `${title.slice(0, 60)} · version ${cited.toISOString().slice(0, 10)} is current`);
    } catch (e) {
      fail(r.id, e.message);
    }
    await new Promise((res) => setTimeout(res, 150)); // be polite to the API
  }
}

try {
  await verifyArticles();
  await verifyLabels();
} catch (e) {
  console.error('\nVerification could not complete:', e.message);
  process.exit(2);
}

console.log(`\n${failures === 0 ? 'All references verified' : `${failures} problem(s) found`}${warnings ? `, ${warnings} warning(s)` : ''}.`);
process.exit(failures === 0 ? 0 : 1);
