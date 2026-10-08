// Offline checks of the clinical data and ranking model. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(`${src('data.js')}\n${src('model.js')}\n${src('anatomy.js')}
globalThis.api = {SITES, FINDINGS, PRESETS, ZONES, TOPICS, GROUPS, NERVES, STRUCTURES, SECTIONS,
  FINDING_BY_ID, TOPIC_BY_SITE, scoreSite, rankSites, examineNext, findingLabel, parseLink,
  makePracticeCase, practiceOptions, sectionForSite, structureStates, sectionSvg, anatomyArt, PRACTICE_SITES,
  levelGlyph, NERVE_GLYPHS};`, context);
const top = findings => m.rankSites(findings)[0];
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
    assert.ok(['unilateral', 'midline', 'bilateral', 'none'].includes(s.side), `${s.id}: side`);
    if (s.lesionSides) assert.ok(s.side === 'unilateral' && s.lesionSides.every(x => ['R', 'L'].includes(x)), `${s.id}: lesionSides`);
    for (const key of ['name', 'causes', 'investigation', 'pearl']) assert.ok(s[key]?.length > 10, `${s.id}: ${key}`);
    assert.ok(Object.values(s.w).some(w => w >= 2), `${s.id}: needs a weight of 2 or 3 to ever be eligible`);
    for (const [key, w] of [...Object.entries(s.w), ...s.ex.map(k => [k, 1])]) {
      const [id, rel] = key.split(':');
      const f = m.FINDING_BY_ID.get(id);
      assert.ok(f, `${s.id}: unknown finding ${id}`);
      assert.ok([1, 2, 3].includes(w), `${s.id}: weight ${key}=${w}`);
      if (rel) assert.ok(f.sided && ['i', 'c', 'a', 'b'].includes(rel), `${s.id}: relation ${key} needs a sided finding`);
    }
    for (const key of s.ex) assert.ok(!(key in s.w), `${s.id}: ${key} is both weighted and excluding`);
  }
});

test('findings are complete', () => {
  const groups = new Set(m.GROUPS.map(g => g.id));
  for (const f of m.FINDINGS) {
    assert.ok(groups.has(f.group), `${f.id}: group`);
    assert.ok(f.test?.length > 20, `${f.id}: bedside test text`);
    assert.ok(f.name, `${f.id}: name`);
    if (f.sided) assert.ok(/\{[sS]ide\}/.test(f.sided), `${f.id}: sided template`);
    assert.ok(!/\{[sSo]\}/.test(`${f.label || ''}${f.hint}`), `${f.id}: relative-side placeholder left over`);
    assert.ok(m.SITES.some(s => s.byFinding.has(f.id) || s.excluders.some(x => x.id === f.id)), `${f.id}: used by no site`);
  }
});

test('every site belongs to exactly one practice topic', () => {
  const ids = m.TOPICS.flatMap(t => t.sites);
  unique(ids, 'topic site');
  assert.deepEqual(new Set(ids), new Set(m.SITES.map(s => s.id)));
});

test('every classic case ranks its intended site first', () => {
  for (const p of m.PRESETS) {
    for (const [id, v] of Object.entries(p.findings)) {
      const f = m.FINDING_BY_ID.get(id);
      assert.ok(f, `${p.id}: ${id}`);
      assert.ok(v === 'N' || (f.sided ? ['R', 'L', 'B'].includes(v) : v === 'P'), `${p.id}: ${id}=${v}`);
      if (v === 'B') assert.ok(f.both !== false, `${p.id}: ${id} cannot be bilateral`);
    }
    const ranking = m.rankSites(p.findings);
    assert.equal(ranking[0]?.site.id, p.site,
      `${p.id}: expected ${p.site}, got ${ranking.slice(0, 3).map(r => `${r.site.id} ${r.fit.toFixed(2)}`).join(', ')}`);
  }
});

test('the reference scoring example is unchanged', () => {
  const p = m.PRESETS.find(x => x.id === 'wallenberg');
  const r = m.scoreSite(m.SITES.find(s => s.id === 'wallenberg'), p.findings);
  assert.equal(r.fit, 1);
  assert.equal(r.side, 'R');
});

test('sides decide between look-alike localisations', () => {
  // Weakness and DCML loss on one side with pain loss on the other: cord hemisection, same side.
  let r = top({ weak: 'R', dcml: 'R', spinothalamic: 'L' });
  assert.equal(r.site.id, 'brown-sequard'); assert.equal(r.side, 'R');
  // The same body signs with a tongue palsy on the other side: medial medulla, on the tongue side.
  r = top({ weak: 'R', dcml: 'R', xii: 'L' });
  assert.equal(r.site.id, 'dejerine'); assert.equal(r.side, 'L');
  // Gaze palsy towards the weak side: frontal eye field, opposite hemisphere.
  r = top({ gaze: 'L', weak: 'L' });
  assert.equal(r.site.id, 'frontal-eye-field'); assert.equal(r.side, 'R');
  // Gaze palsy away from the weak side with a facial palsy: pons, on the gaze side.
  r = top({ gaze: 'R', lmn7: 'R', weak: 'L' });
  assert.equal(r.site.id, 'foville'); assert.equal(r.side, 'R');
  // Face and body pain loss on the same side is not a lateral medullary pattern.
  const crossed = { horner: 'R', dissociatedFace: 'R', spinothalamic: 'L', palate: 'R', dysphagia: 'P' };
  const uncrossed = { ...crossed, spinothalamic: 'R' };
  const fit = f => m.scoreSite(m.SITES.find(s => s.id === 'wallenberg'), f).fit;
  assert.ok(fit(crossed) > fit(uncrossed) + .1);
  // Right face and arm weakness with expressive aphasia: Broca's area, left hemisphere.
  r = top({ weakFaceArm: 'R', weak: 'R', expressiveAphasia: 'P' });
  assert.equal(r.site.id, 'broca'); assert.equal(r.side, 'L');
  // Add receptive aphasia and a gaze deviation and it becomes the whole left MCA territory.
  r = top({ weakFaceArm: 'R', weak: 'R', expressiveAphasia: 'P', receptiveAphasia: 'P', gaze: 'R', homonymous: 'R' });
  assert.equal(r.site.id, 'mca-dominant'); assert.equal(r.side, 'L');
});

test('bilateral findings', () => {
  const ids = m.rankSites({ vi: 'B', papilloedema: 'P' }).map(r => r.site.id);
  assert.equal(ids[0], 'raised-icp-vi');
  assert.equal(top({ homonymous: 'B', rapd: 'N', pupil: 'N' }).site.id, 'cortical-blindness');
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
      if (c.side) assert.equal(c.ranking[0].side, c.side, `${site.id}: lesion side`);
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
  const findings = { iii: 'R', ptosis: 'R' };
  const next = m.examineNext(m.rankSites(findings).slice(0, 4), findings);
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
    for (const key of section.structures.flatMap(id => m.STRUCTURES[id].findings)) {
      assert.ok(m.FINDING_BY_ID.has(m.parseLink(key, 'i').id), `${section.id}: unknown finding ${key}`);
    }
  }
  for (const s of m.SITES) {
    const section = m.sectionForSite(s);
    if (/^(midbrain|pons|medulla|cord)-/.test(s.zone)) assert.ok(section, `${s.id}: brainstem or cord site without a section`);
    else assert.equal(section, null, `${s.id}: site outside the sections has one`);
  }
});

test('structure states follow marked findings and their sides', () => {
  // Pain loss on the left body involves the right spinothalamic tract in the medulla.
  let states = m.structureStates('medulla', { spinothalamic: 'L', xii: 'N' });
  assert.equal(states.get('stt:R'), 'involved');
  assert.equal(states.get('stt:L'), undefined);
  assert.equal(states.get('xii:R'), 'spared');
  assert.equal(states.get('cst:R'), undefined);
  // In the cord the corticospinal tract has already crossed: weakness is on the lesion side.
  states = m.structureStates('cord', { weak: 'R', spinothalamic: 'L' });
  assert.equal(states.get('lcst:R'), 'involved');
  assert.equal(states.get('alst:R'), 'involved');
  // Unsided findings follow the sides given.
  states = m.structureStates('medulla', { dysphagia: 'P' }, ['L']);
  assert.equal(states.get('na:L'), 'involved');
  assert.equal(states.get('na:R'), undefined);
});

test('section drawings: labels, legend states and the compact copy', () => {
  for (const section of m.SECTIONS) {
    for (const id of section.structures) {
      assert.ok(['tract', 'nucleus'].includes(m.STRUCTURES[id].kind), `${id}: kind`);
      assert.ok(m.STRUCTURES[id].tag, `${id}: label`);
    }
    const full = m.sectionSvg(section.id, { prefix: 'f' });
    assert.equal((full.match(/class="leader/g) || []).length, section.structures.length, `${section.id}: one label per structure`);
    const mini = m.sectionSvg(section.id, { prefix: 'm', mini: true });
    assert.ok(!mini.includes('class="leader'), `${section.id}: compact copy has no labels`);
  }
  // Involved structures get a glow; only once per side.
  const svg = m.sectionSvg('medulla', { states: m.structureStates('medulla', { spinothalamic: 'L' }), prefix: 'g' });
  assert.equal((svg.match(/class="halo"/g) || []).length, 1);
});

test('every nerve has a level diagram', () => {
  for (const n of m.NERVES) {
    const glyph = m.NERVE_GLYPHS[n.roman];
    assert.ok(glyph, `${n.roman}: glyph`);
    assert.ok(m.levelGlyph(...glyph).includes('glyph-part on'), `${n.roman}: highlighted level`);
  }
});

test('finding labels', () => {
  const f = id => m.FINDING_BY_ID.get(id);
  assert.equal(m.findingLabel(f('ptosis'), 'R'), 'Ptosis on the right');
  assert.equal(m.findingLabel(f('ptosis'), 'B'), 'Bilateral ptosis');
  assert.equal(m.findingLabel(f('homonymous'), 'L'), 'Left homonymous field loss');
  assert.equal(m.findingLabel(f('ptosis'), 'N'), 'Ptosis');
  assert.equal(m.findingLabel(f('dysphagia'), 'P'), 'Dysphagia');
});
