// Offline checks of the clinical data and ranking model. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(`${src('data.js')}\n${src('model.js')}\n${src('anatomy.js')}
globalThis.api = {SITES, FINDINGS, PRESETS, ZONES, TOPICS, GROUPS, NERVES, STRUCTURES, SECTIONS,
  FINDING_BY_ID, TOPIC_BY_SITE, scoreSite, rankSites, examineNext, sidedText,
  makePracticeCase, practiceOptions, sectionForSite, structureStates, sectionSvg, anatomyArt, PRACTICE_SITES};`, context);
const m = context.api;

// Deterministic PRNG so failures are reproducible.
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const unique = (items, what) => {
  const seen = new Set();
  for (const id of items) { assert.ok(!seen.has(id), `duplicate ${what}: ${id}`); seen.add(id); }
};

test('ids are unique', () => {
  unique(m.SITES.map(s => s.id), 'site');
  unique(m.FINDINGS.map(f => f.id), 'finding');
  unique(m.PRESETS.map(p => p.id), 'preset');
  unique(m.ZONES.map(z => z.id), 'zone');
  unique(m.TOPICS.map(t => t.id), 'topic');
});

test('sites reference real findings and zones', () => {
  const zones = new Set(m.ZONES.map(z => z.id));
  for (const s of m.SITES) {
    assert.ok(zones.has(s.zone), `${s.id}: unknown zone ${s.zone}`);
    assert.ok(['ipsilateral', 'contralateral', 'midline', 'bilateral', 'none'].includes(s.side), `${s.id}: side`);
    for (const key of ['name', 'causes', 'investigation', 'pearl']) assert.ok(s[key]?.length > 10, `${s.id}: ${key}`);
    assert.ok(Object.values(s.w).some(w => w >= 2), `${s.id}: needs a weight of 2 or 3 to ever be eligible`);
    for (const [id, w] of Object.entries(s.w)) {
      assert.ok(m.FINDING_BY_ID.has(id), `${s.id}: unknown weighted finding ${id}`);
      assert.ok([1, 2, 3].includes(w), `${s.id}: weight ${id}=${w}`);
    }
    for (const id of s.ex) {
      assert.ok(m.FINDING_BY_ID.has(id), `${s.id}: unknown excluder ${id}`);
      assert.ok(!(id in s.w), `${s.id}: ${id} is both weighted and excluding`);
    }
  }
});

test('findings are complete', () => {
  const groups = new Set(m.GROUPS.map(g => g.id));
  for (const f of m.FINDINGS) {
    assert.ok(groups.has(f.group), `${f.id}: group`);
    assert.ok(f.test?.length > 20, `${f.id}: bedside test text`);
    assert.ok(!/\{(?![sSo]\})/.test(f.label + f.hint), `${f.id}: unknown placeholder`);
    assert.ok(m.SITES.some(s => f.id in s.w || s.ex.includes(f.id)), `${f.id}: used by no site`);
  }
});

test('every site belongs to exactly one practice topic', () => {
  const ids = m.TOPICS.flatMap(t => t.sites);
  unique(ids, 'topic site');
  assert.deepEqual(new Set(ids), new Set(m.SITES.map(s => s.id)));
});

test('every classic case ranks its intended site first', () => {
  for (const p of m.PRESETS) {
    const findings = {};
    for (const id of p.present) { assert.ok(m.FINDING_BY_ID.has(id), `${p.id}: ${id}`); findings[id] = 1; }
    for (const id of p.absent) {
      assert.ok(m.FINDING_BY_ID.has(id), `${p.id}: ${id}`);
      assert.ok(!(id in findings), `${p.id}: ${id} both present and absent`);
      findings[id] = -1;
    }
    const ranking = m.rankSites(findings);
    const top = ranking[0];
    assert.equal(top?.site.id, p.site,
      `${p.id}: expected ${p.site}, got ${ranking.slice(0, 3).map(r => `${r.site.id} ${r.fit.toFixed(2)}`).join(', ')}`);
  }
});

test('the reference scoring example is unchanged', () => {
  // Wallenberg case scores exactly as in release 1.2.0, apart from the new skew weight.
  const p = m.PRESETS.find(x => x.id === 'wallenberg');
  const findings = Object.fromEntries([...p.present.map(id => [id, 1]), ...p.absent.map(id => [id, -1])]);
  const r = m.scoreSite(m.SITES.find(s => s.id === 'wallenberg'), findings);
  assert.equal(r.fit, 1);
});

test('practice cases are solvable and their options are fair', () => {
  const rng = mulberry32(7);
  const unplayable = [];
  for (const site of m.SITES) {
    let made = 0;
    for (let i = 0; i < 25; i++) {
      const c = m.makePracticeCase(site, rng);
      if (!c) continue;
      made++;
      assert.equal(c.ranking[0].site.id, site.id);
      const options = m.practiceOptions(c, rng);
      assert.equal(options.length, 4, `${site.id}: four options`);
      assert.equal(new Set(options).size, 4, `${site.id}: distinct options`);
      assert.ok(options.includes(site), `${site.id}: answer offered`);
    }
    if (!made) unplayable.push(site.id);
  }
  assert.deepEqual([...m.PRACTICE_SITES].map(s => s.id).sort(),
    [...m.SITES].filter(s => !unplayable.includes(s.id)).map(s => s.id).sort(),
    'PRACTICE_SITES should list exactly the playable sites');
  assert.ok(unplayable.length <= 6, `too many unplayable sites: ${unplayable.join(', ')}`);
});

test('examine next suggests discriminating signs', () => {
  const ranking = m.rankSites({ iii: 1, ptosis: 1 });
  const next = m.examineNext(ranking.slice(0, 4), { iii: 1, ptosis: 1 });
  assert.ok(next.length > 0);
  assert.ok(next.some(n => n.finding.id === 'pupil'), 'pupil should help separate III causes');
});

test('cross-sections draw every structure they list', () => {
  for (const section of m.SECTIONS) {
    const svg = m.sectionSvg(section.id, { side: 'right', prefix: 't' });
    for (const id of section.structures) {
      assert.ok(m.STRUCTURES[id], `${section.id}: unknown structure ${id}`);
      assert.ok(svg.includes(`data-structure="${id}"`), `${section.id}: ${id} not drawn`);
    }
    for (const fid of section.structures.flatMap(id => m.STRUCTURES[id].findings)) {
      assert.ok(m.FINDING_BY_ID.has(fid), `${section.id}: unknown finding ${fid}`);
    }
  }
  for (const s of m.SITES) {
    const section = m.sectionForSite(s);
    if (/^(midbrain|pons|medulla)-/.test(s.zone)) assert.ok(section, `${s.id}: brainstem site without a section`);
    else assert.equal(section, null, `${s.id}: non-brainstem site with a section`);
  }
});

test('structure states follow marked findings', () => {
  const states = m.structureStates('medulla', { spinothalamic: 1, xii: -1 });
  assert.equal(states.get('stt'), 'involved');
  assert.equal(states.get('xii'), 'spared');
  assert.equal(states.get('cst'), undefined);
});

test('sided labels', () => {
  assert.equal(m.sidedText('Hemiparesis on the {o}', 'right'), 'Hemiparesis on the left');
  assert.equal(m.sidedText('{S} homonymous field loss', 'left'), 'Left homonymous field loss');
});
