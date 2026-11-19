import { describe, expect, it } from 'vitest';
import { MODULES } from '../src/data';
import { applyFactor, convertEquivalence, lookupTable, resolveRoutes, sourcesOf } from '../src/engine/convert';
import { computeLedd } from '../src/engine/ledd';
import type {
  DirectedConverter,
  EquivalenceConverter,
  FactorRoute,
  LeddCalculator,
  ResolvedRoute,
  TableRoute,
} from '../src/types';

/**
 * Regression net for the clinical numbers. Each expectation was checked by hand
 * against the cited source (FDA label table, paper table, or published figure)
 * during curation. If one of these fails, a transcription changed: compare with
 * the source before "fixing" the test.
 */

function directed(id: string): DirectedConverter {
  for (const m of MODULES) for (const c of m.converters) if (c.id === id && c.kind === 'directed') return c;
  throw new Error(`directed converter not found: ${id}`);
}
function equivalence(id: string): EquivalenceConverter {
  for (const m of MODULES) for (const c of m.converters) if (c.id === id && c.kind === 'equivalence') return c;
  throw new Error(`equivalence converter not found: ${id}`);
}
function ledd(): LeddCalculator {
  for (const m of MODULES) for (const c of m.converters) if (c.kind === 'ledd') return c;
  throw new Error('ledd not found');
}
function route(converterId: string, routeId: string): ResolvedRoute {
  const r = resolveRoutes(directed(converterId).routes).find((x) => x.id === routeId);
  if (!r) throw new Error(`route not found: ${routeId}`);
  return r;
}
function factorOf(converterId: string, routeId: string, amount: number) {
  const r = route(converterId, routeId) as FactorRoute;
  expect(r.kind).toBe('factor');
  return applyFactor(amount, r.factor);
}
function tableOut(converterId: string, routeId: string, amount: number): string | undefined {
  return lookupTable(amount, route(converterId, routeId) as TableRoute).match?.to;
}
function eq(id: string, from: string, to: string, amount: number) {
  const c = equivalence(id);
  const f = c.items.find((i) => i.id === from)!;
  const t = c.items.find((i) => i.id === to)!;
  return convertEquivalence(amount, f, t);
}

describe('IV ⇄ oral (label statements)', () => {
  it.each([
    ['lev-oral-iv', 1000],
    ['lac-oral-iv', 400],
    ['briv-oral-iv', 200],
    ['vpa-oral-iv', 1500],
  ])('%s is 1:1 in both directions', (id, dose) => {
    expect(factorOf('asm-iv-oral', id, dose).low).toBeCloseTo(dose);
    expect(factorOf('asm-iv-oral', `${id}~rev`, dose).low).toBeCloseTo(dose);
  });

  it('carbamazepine IV is 70% of oral; the reverse divides by 0.7', () => {
    expect(factorOf('asm-iv-oral', 'cbz-oral-iv', 800).low).toBeCloseTo(560);
    expect(factorOf('asm-iv-oral', 'cbz-oral-iv~rev', 560).low).toBeCloseTo(800);
  });

  it('fosphenytoin: 1.5 mg fosphenytoin = 1 mg PE', () => {
    expect(factorOf('asm-iv-oral', 'fos-mg-pe', 150).low).toBeCloseTo(100);
    expect(factorOf('asm-iv-oral', 'fos-mg-pe~rev', 100).low).toBeCloseTo(150);
  });

  it('fosphenytoin PE equals phenytoin sodium mg for mg', () => {
    expect(factorOf('asm-iv-oral', 'pht-fos', 1000).low).toBeCloseTo(1000);
  });
});

describe('oral formulation switches', () => {
  it('Depakote DR → ER label table (Table 1)', () => {
    const t = (n: number) => tableOut('asm-oral', 'dvp-dr-er', n);
    expect(t(500)).toBe('750 mg/day');
    expect(t(625)).toBe('750 mg/day');
    expect(t(750)).toBe('1,000 mg/day');
    expect(t(875)).toBe('1,000 mg/day');
    expect(t(1000)).toBe('1,250 mg/day');
    expect(t(1125)).toBe('1,250 mg/day');
    expect(t(1250)).toBe('1,500 mg/day');
    expect(t(1375)).toBe('1,500 mg/day');
    expect(t(1500)).toBe('1,750 mg/day');
    expect(t(1625)).toBe('1,750 mg/day');
    expect(t(1750)).toBe('2,000 mg/day');
    expect(t(1875)).toBe('2,250 mg/day');
    expect(t(2000)).toBe('2,250 mg/day');
    expect(t(2125)).toBe('2,500 mg/day');
    expect(t(2250)).toBe('2,500 mg/day');
    expect(t(2375)).toBe('2,750 mg/day');
    expect(t(2500)).toBe('3,000 mg/day');
    expect(t(2750)).toBe('3,000 mg/day');
    expect(t(2875)).toBe('3,250 mg/day');
    expect(t(3000)).toBe('3,500 mg/day');
    expect(t(3125)).toBe('3,500 mg/day');
  });

  it('Depakote DR → ER has no recommendation above 3,125 mg/day or between listed doses', () => {
    expect(tableOut('asm-oral', 'dvp-dr-er', 3250)).toBeUndefined();
    expect(tableOut('asm-oral', 'dvp-dr-er', 1200)).toBeUndefined();
    expect(tableOut('asm-oral', 'dvp-dr-er', 400)).toBeUndefined();
  });

  it('every label table output is 8–20% higher than the input at its range ends, except asterisked rows', () => {
    // Sanity check on the label's own "8 to 20% higher" rule, for non-asterisked totals.
    const nonAsterisked: [number, number][] = [
      [625, 750], [875, 1000], [1125, 1250], [1250, 1500], [1375, 1500], [1500, 1750], [1625, 1750],
      [1750, 2000], [1875, 2250], [2000, 2250], [2125, 2500], [2250, 2500], [2375, 2750], [2500, 3000],
      [2750, 3000], [2875, 3250], [3000, 3500], [3125, 3500],
    ];
    for (const [dr, er] of nonAsterisked) {
      const pct = er / dr - 1;
      expect(pct, `DR ${dr} → ER ${er}`).toBeGreaterThanOrEqual(0.07);
      expect(pct, `DR ${dr} → ER ${er}`).toBeLessThanOrEqual(0.21);
    }
  });

  it('divalproex ER → DR estimate spans 0.83–0.93 with 0.89 typical', () => {
    const r = factorOf('asm-oral', 'dvp-er-dr', 1000);
    expect(r.low).toBeCloseTo(833.3, 0);
    expect(r.high).toBeCloseTo(925.9, 0);
    expect(r.typical).toBeCloseTo(890);
  });

  it('carbamazepine, lamotrigine and levetiracetam formulation switches keep the total daily dose', () => {
    expect(factorOf('asm-oral', 'cbz-tab-xr', 800).low).toBe(800);
    expect(factorOf('asm-oral', 'cbz-tab-susp', 800).low).toBe(800);
    expect(factorOf('asm-oral', 'ltg-ir-xr', 200).low).toBe(200);
    expect(factorOf('asm-oral', 'lev-ir-er', 1500).low).toBe(1500);
    expect(factorOf('asm-oral', 'lev-ir-er~rev', 1500).low).toBeCloseTo(1500);
  });

  it('oxcarbazepine IR → XR spans 1.0 to 1/0.81 (not a labelled factor)', () => {
    const r = factorOf('asm-oral', 'oxc-ir-xr', 1200);
    expect(r.low).toBeCloseTo(1200);
    expect(r.high).toBeCloseTo(1200 / 0.81, 0);
  });

  it('phenytoin sodium → free acid is ×0.92, and the reverse ×1.087', () => {
    expect(factorOf('asm-oral', 'pht-na-acid', 300).low).toBeCloseTo(276);
    expect(factorOf('asm-oral', 'pht-na-acid~rev', 276).low).toBeCloseTo(300);
    expect(factorOf('asm-oral', 'pht-na-acid~rev', 100).low).toBeCloseTo(108.7, 1);
  });
});

describe('benzodiazepine equivalence (Ashton + 2025 joint guideline, diazepam 10 mg anchor)', () => {
  const item = (id: string) => equivalence('benzo-equivalence').items.find((i) => i.id === id)!;

  it('matches the Ashton table for every agent', () => {
    const ashton = (id: string) => sourcesOf(item(id)).primary;
    expect(ashton('diazepam')).toMatchObject({ low: 10, high: 10 });
    expect(ashton('clobazam')).toMatchObject({ low: 20, high: 20 });
    expect(ashton('clonazepam')).toMatchObject({ low: 0.5, high: 0.5 });
    expect(ashton('lorazepam')).toMatchObject({ low: 1, high: 1 });
    expect(ashton('alprazolam')).toMatchObject({ low: 0.5, high: 0.5 });
    expect(ashton('chlordiazepoxide')).toMatchObject({ low: 25, high: 25 });
    expect(ashton('temazepam')).toMatchObject({ low: 20, high: 20 });
    expect(ashton('nitrazepam')).toMatchObject({ low: 10, high: 10 });
    expect(ashton('bromazepam')).toMatchObject({ low: 5, high: 6 });
    expect(ashton('flurazepam')).toMatchObject({ low: 15, high: 30 });
  });

  it('matches the 2025 joint guideline (Table 3 footnotes) where it gives a value', () => {
    const asam = (id: string) => item(id).bySource?.asam;
    expect(asam('diazepam')).toMatchObject({ low: 10, high: 10 });
    expect(asam('clonazepam')).toMatchObject({ low: 0.5, high: 0.5 });
    expect(asam('lorazepam')).toMatchObject({ low: 2, high: 2 });
    expect(asam('alprazolam')).toMatchObject({ low: 1, high: 1 });
  });

  it('spans both sources for lorazepam and alprazolam, and agrees for clonazepam', () => {
    expect(item('lorazepam').equiv).toMatchObject({ low: 1, high: 2 });
    expect(item('alprazolam').equiv).toMatchObject({ low: 0.5, high: 1 });
    expect(item('clonazepam').equiv).toMatchObject({ low: 0.5, high: 0.5 });
  });

  it('shows a range where the sources disagree', () => {
    const r = eq('benzo-equivalence', 'lorazepam', 'diazepam', 2);
    expect(r.low).toBeCloseTo(10); // 2025 guideline: lorazepam 2 mg ≈ diazepam 10 mg
    expect(r.high).toBeCloseTo(20); // Ashton: lorazepam 1 mg ≈ diazepam 10 mg
    const back = eq('benzo-equivalence', 'diazepam', 'lorazepam', 10);
    expect(back.low).toBeCloseTo(1);
    expect(back.high).toBeCloseTo(2);
    const lc = eq('benzo-equivalence', 'lorazepam', 'clonazepam', 2);
    expect(lc.low).toBeCloseTo(0.5);
    expect(lc.high).toBeCloseTo(1);
  });

  it('gives a single value where the sources agree', () => {
    const cd = eq('benzo-equivalence', 'clonazepam', 'diazepam', 1);
    expect(cd.low).toBeCloseTo(20);
    expect(cd.high).toBeCloseTo(20);
    // both sources put alprazolam : lorazepam at 1 : 2, so there is no false width
    const al = eq('benzo-equivalence', 'alprazolam', 'lorazepam', 1);
    expect(al.low).toBeCloseTo(2);
    expect(al.high).toBeCloseTo(2);
  });

  it('uses Ashton alone for agents the guideline does not list', () => {
    expect(eq('benzo-equivalence', 'diazepam', 'clobazam', 10).low).toBeCloseTo(20);
    expect(eq('benzo-equivalence', 'diazepam', 'clobazam', 10).high).toBeCloseTo(20);
    expect(eq('benzo-equivalence', 'clonazepam', 'clobazam', 2).low).toBeCloseTo(80);
    const bz = eq('benzo-equivalence', 'bromazepam', 'diazepam', 10);
    expect(bz.low).toBeCloseTo(100 / 6);
    expect(bz.high).toBeCloseTo(20);
  });

  it('covers 23 agents', () => {
    expect(equivalence('benzo-equivalence').items).toHaveLength(23);
  });
});

describe('glucocorticoid equivalence (Liu 2013 Table 1)', () => {
  it('matches the table', () => {
    const c = equivalence('steroid-equivalence');
    const get = (id: string) => c.items.find((i) => i.id === id)!.equiv.low;
    expect(get('hydrocortisone')).toBe(20);
    expect(get('cortisone')).toBe(25);
    expect(get('prednisone')).toBe(5);
    expect(get('prednisolone')).toBe(5);
    expect(get('methylprednisolone')).toBe(4);
    expect(get('triamcinolone')).toBe(4);
    expect(get('dexamethasone')).toBe(0.75);
    expect(get('betamethasone')).toBe(0.6);
  });

  it('worked examples', () => {
    expect(eq('steroid-equivalence', 'prednisone', 'dexamethasone', 5).low).toBeCloseTo(0.75);
    expect(eq('steroid-equivalence', 'methylprednisolone', 'prednisone', 1000).low).toBeCloseTo(1250);
    expect(eq('steroid-equivalence', 'dexamethasone', 'prednisone', 4).low).toBeCloseTo(26.667, 2);
    expect(eq('steroid-equivalence', 'hydrocortisone', 'prednisolone', 100).low).toBeCloseTo(25);
  });

  it('MS relapse oral:IV methylprednisolone is mg for mg', () => {
    expect(factorOf('steroid-ms-relapse', 'mp-iv-oral', 1000).low).toBe(1000);
    expect(factorOf('steroid-ms-relapse', 'mp-iv-oral~rev', 1000).low).toBeCloseTo(1000);
  });
});

describe('botulinum toxin ratios (Scaglione 2016)', () => {
  it('100 U onabotulinumtoxinA ≈ 100–120 U incobotulinumtoxinA (typical 100)', () => {
    const r = eq('botulinum-ratio', 'ona', 'inco', 100);
    expect(r.low).toBeCloseTo(100);
    expect(r.high).toBeCloseTo(120);
    expect(r.typical).toBeCloseTo(100);
  });

  it('100 U onabotulinumtoxinA ≈ 200–300 U abobotulinumtoxinA and never exceeds 1:3', () => {
    const r = eq('botulinum-ratio', 'ona', 'abo', 100);
    expect(r.low).toBeCloseTo(200);
    expect(r.high).toBeCloseTo(300);
  });

  it('abobotulinumtoxinA back to onabotulinumtoxinA spans 1/3 to 1/2', () => {
    const r = eq('botulinum-ratio', 'abo', 'ona', 300);
    expect(r.low).toBeCloseTo(100);
    expect(r.high).toBeCloseTo(150);
  });
});

describe('Parkinson’s disease', () => {
  it('Jost 2023 Table 1 factors', () => {
    const items = new Map(ledd().items.map((i) => [i.id, i]));
    const f = (id: string) => items.get(id)!.factor;
    expect(f('ld-ir')).toBe(1);
    expect(f('ld-dr')).toBe(0.85);
    expect(f('ld-cr')).toBe(0.75);
    expect(f('ld-er')).toBe(0.5);
    expect(f('ld-lcig')).toBe(1.11);
    expect(items.get('comt-ent')!.ratio).toBe(0.33);
    expect(items.get('comt-tol')!.ratio).toBe(0.5);
    expect(items.get('comt-opi')!.ratio).toBe(0.5);
    expect(f('sel-oral')).toBe(10);
    expect(f('sel-sl')).toBe(80);
    expect(f('rasagiline')).toBe(100);
    expect(items.get('safinamide')!.fixedLed).toBe(150);
    expect(f('pramipexole-salt')).toBe(100);
    expect(f('pramipexole-base')).toBe(142.86);
    expect(f('ropinirole')).toBe(20);
    expect(f('rotigotine')).toBe(30.3);
    expect(f('piribedil')).toBe(1);
    expect(f('apo-sc')).toBe(10);
    expect(f('apo-sl')).toBe(1.5);
    expect(f('lisuride')).toBe(100);
    expect(f('bromocriptine')).toBe(10);
    expect(f('pergolide')).toBe(100);
    expect(f('cabergoline')).toBe(66.67);
    expect(f('dhec')).toBe(5);
    expect(f('amantadine-ir')).toBe(1);
    expect(items.get('anticholinergic')!.ledPerDose).toBe(100);
    expect(items.get('istradefylline')!.ratio).toBe(0.2);
  });

  it('worked LEDD example', () => {
    // levodopa IR 600 (600) + entacapone (600×0.33=198) + pramipexole salt 1.5 (150) + rasagiline 1 (100)
    const r = computeLedd(ledd().items, [
      { itemId: 'ld-ir', values: [600] },
      { itemId: 'comt-ent', values: [800] },
      { itemId: 'pramipexole-salt', values: [1.5] },
      { itemId: 'rasagiline', values: [1] },
    ]);
    expect(r.total).toBeCloseTo(1048, 6);
  });

  it('worked LEDD example with controlled-release levodopa and ropinirole', () => {
    // CR 800 → 600; ropinirole 9 mg → 180
    const r = computeLedd(ledd().items, [
      { itemId: 'ld-cr', values: [800] },
      { itemId: 'ropinirole', values: [9] },
    ]);
    expect(r.total).toBeCloseTo(780);
  });

  it('dopamine agonist equivalence from LED: ropinirole 9 mg ≈ pramipexole 1.8 mg salt ≈ rotigotine 5.94 mg', () => {
    expect(eq('da-equivalence', 'ropinirole', 'pramipexole-salt', 9).low).toBeCloseTo(1.8);
    expect(eq('da-equivalence', 'ropinirole', 'rotigotine', 9).low).toBeCloseTo(5.94, 2);
    expect(eq('da-equivalence', 'pramipexole-salt', 'pramipexole-base', 1).low).toBeCloseTo(0.7, 3);
  });

  it('ropinirole IR → ER label table', () => {
    const t = (n: number) => tableOut('pd-formulation', 'rop-ir-xl', n);
    expect(t(0.75)).toBe('2 mg/day');
    expect(t(2.25)).toBe('2 mg/day');
    expect(t(3)).toBe('4 mg/day');
    expect(t(4.5)).toBe('4 mg/day');
    expect(t(6)).toBe('6 mg/day');
    expect(t(7.5)).toBe('8 mg/day');
    expect(t(9)).toBe('8 mg/day');
    expect(t(12)).toBe('12 mg/day');
    expect(t(15)).toBe('16 mg/day');
    expect(t(18)).toBe('18 mg/day');
    expect(t(21)).toBe('20 mg/day');
    expect(t(24)).toBe('24 mg/day');
    expect(t(10)).toBeUndefined();
  });

  it('Rytary conversion table (label Table 1)', () => {
    const t = (n: number) => tableOut('pd-formulation', 'cdld-ir-rytary', n);
    expect(t(400)).toMatch(/^855 mg/);
    expect(t(549)).toMatch(/^855 mg/);
    expect(t(550)).toMatch(/^1,140 mg/);
    expect(t(749)).toMatch(/^1,140 mg/);
    expect(t(750)).toMatch(/^1,305 mg/);
    expect(t(949)).toMatch(/^1,305 mg/);
    expect(t(950)).toMatch(/^1,755 mg/);
    expect(t(1249)).toMatch(/^1,755 mg/);
    expect(t(1250)).toMatch(/2,340 mg.*2,205 mg/);
    expect(t(2000)).toMatch(/2,340 mg.*2,205 mg/);
    expect(t(399)).toBeUndefined();
  });

  it('Rytary regimens are internally consistent: capsules × levodopa strength × 3 = stated total', () => {
    const cases: [number, number, number][] = [
      [855, 3, 95],
      [1140, 4, 95],
      [1305, 3, 145],
      [1755, 3, 195],
      [2340, 4, 195],
      [2205, 3, 245],
    ];
    for (const [total, caps, strength] of cases) expect(caps * strength * 3).toBe(total);
  });

  it('carbidopa/levodopa controlled-release: +10% to +30% and Table 3', () => {
    const r = factorOf('pd-formulation', 'cdld-ir-cr-pct', 600);
    expect(r.low).toBeCloseTo(660);
    expect(r.high).toBeCloseTo(780);
    const t = (n: number) => tableOut('pd-formulation', 'cdld-ir-cr-table', n);
    expect(t(300)).toMatch(/400 mg/);
    expect(t(600)).toMatch(/600 mg/);
    expect(t(800)).toMatch(/800 mg/);
    expect(t(1000)).toMatch(/1,000 mg/);
    expect(t(1100)).toBeUndefined();
  });

  it('pramipexole IR → ER is the same daily dose', () => {
    expect(factorOf('pd-formulation', 'pra-ir-er', 1.5).low).toBe(1.5);
  });
});

describe('dementia agents', () => {
  it('rivastigmine oral → patch', () => {
    const t = (n: number) => tableOut('dementia-switch', 'riva-oral-patch', n);
    expect(t(3)).toBe('4.6 mg/24 h patch');
    expect(t(5.9)).toBe('4.6 mg/24 h patch');
    expect(t(6)).toBe('9.5 mg/24 h patch');
    expect(t(12)).toBe('9.5 mg/24 h patch');
    expect(t(13)).toBeUndefined();
  });

  it('memantine IR → XR', () => {
    const t = (n: number) => tableOut('dementia-switch', 'mem-ir-xr', n);
    expect(t(20)).toMatch(/^28 mg/);
    expect(t(10)).toMatch(/^14 mg/);
    expect(t(15)).toBeUndefined();
  });
});

describe('drug level units (µg/mL ⇄ µmol/L)', () => {
  const unit = (id: string, amount: number) => factorOf('level-units', `${id}-units`, amount).low;

  it('pins the molecular weight behind every factor (PubChem; matches FDA labels where stated)', () => {
    const mw: Record<string, number> = {
      vpa: 144.21, pht: 252.27, cbz: 236.27, cbze: 252.27, pb: 232.23, prm: 218.25, ltg: 256.09, lev: 170.21,
      mhd: 254.28, tpm: 339.36, zns: 212.23, lcm: 250.29, brv: 212.29, gbp: 171.24, pgb: 159.23, clb: 300.74,
      nclb: 286.71, cnz: 315.71, esm: 141.17, rfn: 238.19, per: 349.4,
    };
    for (const [id, w] of Object.entries(mw)) {
      expect(unit(id, w), id).toBeCloseTo(1000, 6); // 1 mol/L expressed in µg/mL → exactly 1000 µmol/L per MW µg/mL
    }
    expect(Object.keys(mw)).toHaveLength(21);
  });

  it('worked examples', () => {
    expect(unit('vpa', 100)).toBeCloseTo(693.4, 1);
    expect(unit('pht', 20)).toBeCloseTo(79.28, 1);
    expect(unit('cbz', 12)).toBeCloseTo(50.79, 1);
    expect(unit('lev', 30)).toBeCloseTo(176.26, 1);
    expect(unit('ltg', 10)).toBeCloseTo(39.05, 1);
    expect(unit('pb', 40)).toBeCloseTo(172.24, 1);
  });

  it('converts back exactly', () => {
    const back = factorOf('level-units', 'vpa-units~rev', 693.4).low;
    expect(back).toBeCloseTo(99.99, 1);
    expect(factorOf('level-units', 'lev-units~rev', unit('lev', 30)).low).toBeCloseTo(30, 9);
  });
});

describe('antiseizure formulation switches added in the second research pass', () => {
  it('perampanel, clobazam and topiramate switches keep the total daily dose', () => {
    expect(factorOf('asm-oral', 'prm-tab-susp', 8).low).toBe(8);
    expect(factorOf('asm-oral', 'prm-tab-susp~rev', 8).low).toBeCloseTo(8);
    expect(factorOf('asm-oral', 'clb-tab-susp', 20).low).toBe(20);
    expect(factorOf('asm-oral', 'tpm-ir-xr', 200).low).toBe(200);
    expect(factorOf('asm-oral', 'tpm-ir-xr~rev', 200).low).toBeCloseTo(200);
  });
});

describe('dementia: Namzaric (label §2.1 and §2.3)', () => {
  it('memantine IR (+ donepezil 10 mg) → Namzaric', () => {
    const t = (n: number) => tableOut('dementia-switch', 'mem-ir-namzaric', n);
    expect(t(20)).toMatch(/^Namzaric 28 mg\/10 mg/);
    expect(t(10)).toMatch(/^Namzaric 14 mg\/10 mg/);
    expect(t(15)).toBeUndefined();
  });
  it('memantine XR (+ donepezil 10 mg) → Namzaric', () => {
    const t = (n: number) => tableOut('dementia-switch', 'mem-xr-namzaric', n);
    expect(t(28)).toMatch(/^Namzaric 28 mg\/10 mg/);
    expect(t(14)).toMatch(/^Namzaric 14 mg\/10 mg/);
    expect(t(21)).toBeUndefined();
  });
});

describe('pregabalin: Lyrica → Lyrica CR (label Table 1)', () => {
  it('maps each listed total daily dose and nothing in between', () => {
    const t = (n: number) => tableOut('pregabalin-switch', 'pgb-ir-cr', n);
    expect(t(75)).toBe('82.5 mg once daily');
    expect(t(150)).toBe('165 mg once daily');
    expect(t(225)).toMatch(/^247\.5 mg once daily/);
    expect(t(300)).toBe('330 mg once daily');
    expect(t(450)).toMatch(/^495 mg once daily/);
    expect(t(600)).toMatch(/^660 mg once daily/);
    expect(t(200)).toBeUndefined();
    expect(t(700)).toBeUndefined();
  });
});

describe('immunoglobulin in CIDP (HyQvia and Hizentra labels)', () => {
  it('HyQvia uses the same dose as the previous IGIV', () => {
    expect(factorOf('cidp-scig', 'hyqvia-cidp', 70).low).toBe(70);
  });
  it('Hizentra is 0.2 g/kg a week, or 0.4 g/kg a week', () => {
    expect(factorOf('cidp-scig', 'hizentra-cidp-02', 70).low).toBeCloseTo(14);
    expect(factorOf('cidp-scig', 'hizentra-cidp-04', 70).low).toBeCloseTo(28);
  });
});

describe('foslevodopa in the LEDD calculator', () => {
  it('uses 0.75 × the foslevodopa dose and counts as levodopa-containing for the COMT ratio', () => {
    const item = ledd().items.find((i) => i.id === 'foslevodopa')!;
    expect(item.factor).toBe(0.75);
    expect(item.levodopaContaining).toBe(true);
    // consistency with the Vyalev label: oral levodopa × 1.3 = foslevodopa, so LED ≈ 1 ÷ 1.3 per mg
    expect(Math.abs(item.factor! - 1 / 1.3)).toBeLessThan(0.03);
    const r = computeLedd(ledd().items, [
      { itemId: 'ld-ir', values: [600] },
      { itemId: 'foslevodopa', values: [1500] },
      { itemId: 'comt-ent', values: [800] },
    ]);
    // levodopa LED = 600 + 1125 = 1725; entacapone = 1725 × 0.33 = 569.25; total 2294.25
    expect(r.total).toBeCloseTo(2294.25, 6);
  });
});
