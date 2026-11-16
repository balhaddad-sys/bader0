import { describe, expect, it } from 'vitest';
import { MODULES } from '../src/data';
import { applyFactor, convertEquivalence, lookupTable, resolveRoutes } from '../src/engine/convert';
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

describe('benzodiazepine equivalence (Ashton, diazepam 10 mg anchor)', () => {
  it('matches the published table for the epilepsy-relevant agents', () => {
    const c = equivalence('benzo-equivalence');
    const get = (id: string) => c.items.find((i) => i.id === id)!.equiv;
    expect(get('diazepam')).toMatchObject({ low: 10, high: 10 });
    expect(get('clobazam')).toMatchObject({ low: 20, high: 20 });
    expect(get('clonazepam')).toMatchObject({ low: 0.5, high: 0.5 });
    expect(get('lorazepam')).toMatchObject({ low: 1, high: 1 });
    expect(get('alprazolam')).toMatchObject({ low: 0.5, high: 0.5 });
    expect(get('chlordiazepoxide')).toMatchObject({ low: 25, high: 25 });
    expect(get('temazepam')).toMatchObject({ low: 20, high: 20 });
    expect(get('nitrazepam')).toMatchObject({ low: 10, high: 10 });
    expect(get('bromazepam')).toMatchObject({ low: 5, high: 6 });
    expect(get('flurazepam')).toMatchObject({ low: 15, high: 30 });
  });

  it('worked examples', () => {
    expect(eq('benzo-equivalence', 'lorazepam', 'diazepam', 2).low).toBeCloseTo(20);
    expect(eq('benzo-equivalence', 'clonazepam', 'diazepam', 1).low).toBeCloseTo(20);
    expect(eq('benzo-equivalence', 'diazepam', 'clobazam', 10).low).toBeCloseTo(20);
    expect(eq('benzo-equivalence', 'clonazepam', 'clobazam', 2).low).toBeCloseTo(80);
    expect(eq('benzo-equivalence', 'alprazolam', 'lorazepam', 1).low).toBeCloseTo(2);
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
