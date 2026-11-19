import { describe, expect, it } from 'vitest';
import {
  applyFactor,
  convertEquivalence,
  convertEquivalenceBySource,
  invertInterval,
  lookupTable,
  parseAmount,
  parseDecimalInput,
  readingNote,
  resolveRoutes,
} from '../src/engine/convert';
import { formatAmount, formatRange } from '../src/engine/format';
import { computeFormula } from '../src/engine/formulas';
import { computeLedd } from '../src/engine/ledd';
import type { EquivItem, FactorRoute, LeddItem, TableRoute } from '../src/types';

describe('parseAmount', () => {
  it.each([
    ['1000', 1000],
    ['0.5', 0.5],
    ['.5', 0.5],
    ['5.', 5],
    ['1,250', 1250],
    [' 300 ', 300],
    [250, 250],
  ])('accepts %s', (input, expected) => {
    expect(parseAmount(input as string | number)).toBe(expected);
  });

  it.each(['', '  ', 'abc', '-5', '0', '0.0', '1e3', '0x10', '1.2.3', 'Infinity', 'NaN', '5mg', '--1'])(
    'rejects %j',
    (input) => {
      expect(parseAmount(input)).toBeNull();
    },
  );

  it('rejects null, undefined, NaN and infinities', () => {
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
    expect(parseAmount(NaN)).toBeNull();
    expect(parseAmount(Infinity)).toBeNull();
    expect(parseAmount(-1)).toBeNull();
  });
});

describe('number entry in other regional formats', () => {
  it.each([
    // Arabic-Indic, Persian and fullwidth digits (phone keyboards in Arabic / Persian settings)
    ['٨٠٠', 800],
    ['۸۰۰', 800],
    ['１２３', 123],
    ['٠٫٥', 0.5],
    ['٢٫٢٥', 2.25],
    ['١٬٢٥٠', 1250],
    // decimal comma
    ['0,5', 0.5],
    ['0,375', 0.375],
    ['0,0625', 0.0625],
    ['2,25', 2.25],
    ['12,5', 12.5],
    ['1,5', 1.5],
    // thousands separators
    ['1,000', 1000],
    ['12,500', 12500],
    ['1.000.000', 1000000],
    ['1 000', 1000],
    ['1 000', 1000],
    ['1 250', 1250],
    // both separators: the last one is the decimal mark
    ['1.000,5', 1000.5],
    ['1,000.5', 1000.5],
  ])('reads %j as %d', (input, expected) => {
    expect(parseAmount(input)).toBeCloseTo(expected, 10);
  });

  it.each([
    '1,2,3',
    '1.2.3',
    '1,000,5',
    '12,34,567',
    '0.5,0',
    '1 0',
    '1 00',
    '12 3456',
    '٣a',
    '−5', // unicode minus
    '1٬2٬3',
    '1e3',
    '١٢٣abc',
  ])('rejects the ambiguous or malformed entry %j instead of guessing', (input) => {
    expect(parseAmount(input)).toBeNull();
  });

  it('SAFETY: a decimal comma always reads the same as the decimal point (no 10x or 1000x misreads)', () => {
    for (const dose of ['0.25', '0.375', '0.0625', '0.125', '0.5', '1.5', '2.25', '4.5', '7.5', '12.5', '0.088', '0.7']) {
      const comma = dose.replace('.', ',');
      expect(parseAmount(comma), `${comma} vs ${dose}`).toBe(parseAmount(dose));
    }
  });

  it('SAFETY: Arabic-Indic digits always read the same as the Western digits', () => {
    const toArabic = (t: string) => t.replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d))).replace('.', '٫');
    for (const dose of ['1000', '800', '0.5', '0.375', '2.25', '1500', '12.5']) {
      expect(parseAmount(toArabic(dose)), toArabic(dose)).toBe(parseAmount(dose));
    }
  });

  it('allows zero for fields where zero means "not taking" (parseDecimalInput) but not as a dose (parseAmount)', () => {
    expect(parseDecimalInput('0')).toBe(0);
    expect(parseDecimalInput('٠')).toBe(0);
    expect(parseAmount('0')).toBeNull();
    expect(parseDecimalInput('-1')).toBeNull();
  });

  it('echoes how a non-plain entry was read, and stays silent for plain numbers', () => {
    expect(readingNote('0,5', 0.5)).toBe('Read as 0.5');
    expect(readingNote('٨٠٠', 800)).toBe('Read as 800');
    expect(readingNote('1,375', 1375)).toBe('Read as 1,375');
    expect(readingNote('1 000', 1000)).toBe('Read as 1,000');
    expect(readingNote('1.000,5', 1000.5)).toBe('Read as 1,000.5');
    expect(readingNote('0,0625', 0.0625)).toBe('Read as 0.0625');
    expect(readingNote('800', 800)).toBeUndefined();
    expect(readingNote('0.5', 0.5)).toBeUndefined();
    expect(readingNote('', 1)).toBeUndefined();
  });
});

describe('factor arithmetic', () => {
  it('applies a point factor', () => {
    expect(applyFactor(1000, { low: 0.7, high: 0.7 })).toEqual({ low: 700, high: 700, typical: undefined });
  });

  it('applies a range with a typical value', () => {
    const r = applyFactor(1000, { low: 1.08, high: 1.2, typical: 1.12 });
    expect(r.low).toBeCloseTo(1080);
    expect(r.high).toBeCloseTo(1200);
    expect(r.typical).toBeCloseTo(1120);
  });

  it('inverts an interval by swapping and reciprocating bounds', () => {
    const inv = invertInterval({ low: 1.08, high: 1.2, typical: 1.12 });
    expect(inv.low).toBeCloseTo(1 / 1.2);
    expect(inv.high).toBeCloseTo(1 / 1.08);
    expect(inv.typical).toBeCloseTo(1 / 1.12);
    expect(inv.low).toBeLessThan(inv.high);
  });

  it('refuses to invert a non-positive factor', () => {
    expect(() => invertInterval({ low: 0, high: 1 })).toThrow();
  });

  it('round-trips a point factor', () => {
    const f = { low: 0.7, high: 0.7 };
    const there = applyFactor(800, f);
    const back = applyFactor(there.low, invertInterval(f));
    expect(back.low).toBeCloseTo(800);
  });
});

describe('resolveRoutes', () => {
  const base: FactorRoute = {
    id: 'x',
    kind: 'factor',
    group: 'G',
    label: 'A → B',
    reverseLabel: 'B → A',
    fromUnit: 'mg',
    toUnit: 'mg',
    factor: { low: 0.7, high: 0.7 },
    reversible: true,
    provenance: { tier: 'B', refs: ['r'] },
    callouts: [{ kind: 'note', text: 'orig' }],
  };

  it('generates a reverse route flagged derived when the source states one direction', () => {
    const out = resolveRoutes([{ ...base, reverseStated: false }]);
    expect(out).toHaveLength(2);
    const rev = out[1] as FactorRoute & { isReverse?: boolean };
    expect(rev.isReverse).toBe(true);
    expect(rev.label).toBe('B → A');
    expect(rev.provenance.derived).toBe(true);
    expect(rev.factor.low).toBeCloseTo(1 / 0.7);
    expect(rev.callouts[0].text).toMatch(/inverse/i);
    expect(rev.reversible).toBe(false);
  });

  it('does not flag the reverse as derived when the source states both directions', () => {
    const out = resolveRoutes([{ ...base, reverseStated: true }]);
    expect(out[1].provenance.derived).toBeFalsy();
    expect(out[1].callouts.some((c) => /inverse/i.test(c.text))).toBe(false);
  });

  it('leaves non-reversible routes alone', () => {
    expect(resolveRoutes([{ ...base, reversible: false }])).toHaveLength(1);
  });
});

describe('convertEquivalence', () => {
  const mk = (id: string, low: number, high = low, typical?: number): EquivItem => ({
    id,
    name: id,
    group: 'g',
    unit: 'mg',
    equiv: { low, high, typical },
  });

  it('converts between two point-defined agents', () => {
    const r = convertEquivalence(2, mk('lorazepam', 1), mk('diazepam', 10));
    expect(r.low).toBeCloseTo(20);
    expect(r.high).toBeCloseTo(20);
    expect(r.typical).toBeCloseTo(20);
  });

  it('widens to the extremes when the target is a range', () => {
    const r = convertEquivalence(100, mk('ona', 1), mk('abo', 2, 3));
    expect(r.low).toBeCloseTo(200);
    expect(r.high).toBeCloseTo(300);
    expect(r.typical).toBeUndefined();
  });

  it('widens to the extremes when the source is a range', () => {
    const r = convertEquivalence(10, mk('bromazepam', 5, 6), mk('diazepam', 10));
    expect(r.low).toBeCloseTo((10 * 10) / 6);
    expect(r.high).toBeCloseTo((10 * 10) / 5);
  });

  it('carries a typical value only when both ends define one', () => {
    const r = convertEquivalence(100, mk('ona', 1), mk('inco', 1, 1.2, 1));
    expect(r.typical).toBeCloseTo(100);
    expect(r.low).toBeCloseTo(100);
    expect(r.high).toBeCloseTo(120);
  });

  it('is self-consistent: A→B→A returns the original for point agents', () => {
    const a = mk('a', 5);
    const b = mk('b', 0.75);
    const there = convertEquivalence(37, a, b);
    const back = convertEquivalence(there.low, b, a);
    expect(back.low).toBeCloseTo(37);
  });
});

describe('equivalence across sources that can disagree', () => {
  const mk = (id: string, bySource: Record<string, number>): EquivItem => {
    const vals = Object.values(bySource);
    return {
      id,
      name: id,
      group: 'g',
      unit: 'mg',
      equiv: { low: Math.min(...vals), high: Math.max(...vals) },
      bySource: Object.fromEntries(Object.entries(bySource).map(([k, v]) => [k, { low: v, high: v }])),
    };
  };
  const diazepam = mk('diazepam', { primary: 10, asam: 10 });
  const lorazepam = mk('lorazepam', { primary: 1, asam: 2 });
  const alprazolam = mk('alprazolam', { primary: 0.5, asam: 1 });

  it('computes within each source separately', () => {
    const per = convertEquivalenceBySource(2, lorazepam, diazepam);
    expect(per.map((p) => p.source).sort()).toEqual(['asam', 'primary']);
    expect(per.find((p) => p.source === 'primary')?.result.low).toBeCloseTo(20);
    expect(per.find((p) => p.source === 'asam')?.result.low).toBeCloseTo(10);
  });

  it('combines the sources into a range, lowest to highest', () => {
    const r = convertEquivalence(2, lorazepam, diazepam);
    expect(r.low).toBeCloseTo(10);
    expect(r.high).toBeCloseTo(20);
    expect(r.typical).toBeUndefined();
  });

  it('adds no false width when both sources agree on the ratio', () => {
    const r = convertEquivalence(1, alprazolam, lorazepam);
    expect(r.low).toBeCloseTo(2);
    expect(r.high).toBeCloseTo(2);
    expect(r.typical).toBeCloseTo(2);
  });

  it('uses only the sources both agents share', () => {
    const ashtonOnly: EquivItem = { id: 'x', name: 'x', group: 'g', unit: 'mg', equiv: { low: 20, high: 20 } };
    const per = convertEquivalenceBySource(10, diazepam, ashtonOnly);
    expect(per).toHaveLength(1);
    expect(per[0].source).toBe('primary');
    expect(convertEquivalence(10, diazepam, ashtonOnly).low).toBeCloseTo(20);
  });

  it('is symmetric in range terms: A→B spans the inverse of B→A', () => {
    const ab = convertEquivalence(1, lorazepam, diazepam);
    const ba = convertEquivalence(1, diazepam, lorazepam);
    expect(ab.low * ba.high).toBeCloseTo(1, 9);
    expect(ab.high * ba.low).toBeCloseTo(1, 9);
  });
});

describe('label and literature formulas', () => {
  const rows = (r: ReturnType<typeof computeFormula>) => {
    if ('error' in r) throw new Error(r.error);
    return r;
  };

  describe('Vyalev (foslevodopa/foscarbidopa)', () => {
    it('calculates the base rate exactly as the label steps do', () => {
      const r = rows(computeFormula('vyalev', { tld: 960, hours: 16 }));
      // Step 2: 960 × 1.3 = 1248 mg; Step 3: 1248 ÷ 240 = 5.2 mL; Step 4: 5.2 ÷ 16 = 0.325 mL/h
      expect(r.rows[0].value).toBe('0.325 mL/h');
      expect(r.rows[1].value).toBe('1,248 mg/day');
      expect(r.rows[2].value).toBe('5.2 mL/day');
      expect(r.warnings).toEqual([]);
    });

    it('calculates the optional loading dose from the first morning dose', () => {
      const r = rows(computeFormula('vyalev', { tld: 960, hours: 16, first: 100 }));
      expect(r.rows.find((x) => x.label.includes('loading'))?.value).toBe('0.542 mL'); // 100 × 1.3 ÷ 240
    });

    it('warns above the 3,525 mg foslevodopa daily maximum, and not at it', () => {
      expect(rows(computeFormula('vyalev', { tld: 2711, hours: 16 })).warnings).toEqual([]); // 3,524.3 mg
      expect(rows(computeFormula('vyalev', { tld: 2712, hours: 16 })).warnings[0]).toMatch(/exceeds the label maximum of 3,525/);
    });

    it('warns when the loading dose is outside the pump range of 0.1 to 3 mL', () => {
      expect(rows(computeFormula('vyalev', { tld: 960, hours: 16, first: 600 })).warnings[0]).toMatch(/above the pump maximum/);
      expect(rows(computeFormula('vyalev', { tld: 960, hours: 16, first: 10 })).warnings[0]).toMatch(/below the pump minimum/);
    });

    it('rejects missing or impossible inputs', () => {
      expect(computeFormula('vyalev', { hours: 16 })).toHaveProperty('error');
      expect(computeFormula('vyalev', { tld: 960, hours: 0 })).toHaveProperty('error');
      expect(computeFormula('vyalev', { tld: 960, hours: 25 })).toHaveProperty('error');
      expect(computeFormula('vyalev', { tld: -5, hours: 16 })).toHaveProperty('error');
    });
  });

  describe('Duopa (levodopa/carbidopa intestinal gel)', () => {
    it('calculates the morning and continuous doses as the label steps do', () => {
      const r = rows(computeFormula('duopa', { first: 100, total: 800 }));
      // morning: 100 × 0.8 ÷ 20 = 4 mL (+3 mL prime = 7 mL); continuous: (800 − 100) ÷ 20 = 35 mL; rate 35 ÷ 16 = 2.1875 mL/h
      expect(r.rows[0].value).toBe('7 mL');
      expect(r.rows[1].value).toBe('35 mL');
      expect(r.rows[2].value).toBe('2.19 mL/h');
      expect(r.rows[3].value).toBe('780 mg'); // (4 + 35) mL × 20 mg/mL
      expect(r.warnings).toEqual([]);
    });

    it('warns above the 2,000 mg levodopa daily maximum', () => {
      const r = rows(computeFormula('duopa', { first: 200, total: 2600 }));
      expect(r.warnings[0]).toMatch(/exceeds the label maximum of 2,000/);
    });

    it('rejects a 16-hour total smaller than the first dose, and missing inputs', () => {
      expect(computeFormula('duopa', { first: 300, total: 200 })).toHaveProperty('error');
      expect(computeFormula('duopa', { total: 800 })).toHaveProperty('error');
      expect(computeFormula('duopa', { first: 100 })).toHaveProperty('error');
    });

    it('notes when there is no continuous dose', () => {
      expect(rows(computeFormula('duopa', { first: 100, total: 100 })).warnings[0]).toMatch(/no continuous dose/);
    });
  });

  describe('Sheiner-Tozer (phenytoin, Kiang & Ensom 2016)', () => {
    it('corrected = observed ÷ (0.2 × albumin + 0.1)', () => {
      const r = rows(computeFormula('sheiner-tozer', { observed: 8, albumin: 2.5 }));
      // 8 ÷ (0.5 + 0.1) = 13.333…
      expect(r.rows[0].value).toBe('13.3 µg/mL (mg/L)');
      expect(r.rows[1].value).toBe('× 1.67');
    });

    it('leaves the value unchanged at albumin 4.5 g/dL, where the denominator is 1', () => {
      const r = rows(computeFormula('sheiner-tozer', { observed: 12, albumin: 4.5 }));
      expect(r.rows[0].value).toBe('12 µg/mL (mg/L)');
      expect(r.warnings).toEqual([]);
    });

    it('warns that it lowers the level at high albumin, and catches g/L entered as g/dL', () => {
      expect(rows(computeFormula('sheiner-tozer', { observed: 12, albumin: 5 })).warnings[0]).toMatch(/lowers the level/);
      expect(computeFormula('sheiner-tozer', { observed: 12, albumin: 25 })).toHaveProperty('error');
    });

    it('rejects missing inputs', () => {
      expect(computeFormula('sheiner-tozer', { albumin: 2.5 })).toHaveProperty('error');
      expect(computeFormula('sheiner-tozer', { observed: 8 })).toHaveProperty('error');
    });
  });
});

describe('lookupTable', () => {
  const route = {
    rows: [
      { from: [500, 625], to: 'a' },
      { from: [750, 875], to: 'b' },
      { from: [1000, 1000], to: 'c' },
    ],
  } as unknown as TableRoute;

  it('matches inclusive bounds', () => {
    expect(lookupTable(500, route).match?.to).toBe('a');
    expect(lookupTable(625, route).match?.to).toBe('a');
    expect(lookupTable(1000, route).match?.to).toBe('c');
  });

  it('reports the neighbouring rows when no row covers the input', () => {
    const l = lookupTable(700, route);
    expect(l.match).toBeUndefined();
    expect(l.below?.to).toBe('a');
    expect(l.above?.to).toBe('b');
  });

  it('reports only an upper neighbour below the table and only a lower neighbour above it', () => {
    expect(lookupTable(100, route).below).toBeUndefined();
    expect(lookupTable(100, route).above?.to).toBe('a');
    expect(lookupTable(5000, route).above).toBeUndefined();
    expect(lookupTable(5000, route).below?.to).toBe('c');
  });
});

describe('formatting', () => {
  it.each([
    [1466.4, '1,466'],
    [1080, '1,080'],
    [99.96, '100'],
    [56.25, '56.3'],
    [4.6, '4.6'],
    [0.375, '0.375'],
    [0.0625, '0.0625'],
    [0.5, '0.5'],
    [20, '20'],
  ])('formatAmount(%f) → %s', (v, expected) => {
    expect(formatAmount(v)).toBe(expected);
  });

  it('formats non-finite values as an em dash', () => {
    expect(formatAmount(NaN)).toBe('—');
    expect(formatAmount(Infinity)).toBe('—');
  });

  it('collapses a range to one number when both ends round the same', () => {
    expect(formatRange({ low: 1000, high: 1000.0000001 }, 'mg')).toBe('1,000 mg');
    expect(formatRange({ low: 1080, high: 1200 }, 'mg')).toBe('1,080 – 1,200 mg');
  });
});

describe('computeLedd', () => {
  const items: LeddItem[] = [
    { id: 'ld', name: 'Levodopa IR', group: 'ld', kind: 'factor', unit: 'mg', factor: 1, levodopaContaining: true },
    { id: 'cr', name: 'Levodopa CR', group: 'ld', kind: 'factor', unit: 'mg', factor: 0.75, levodopaContaining: true },
    { id: 'ent', name: 'Entacapone', group: 'c', kind: 'comt', unit: 'mg', ratio: 0.33 },
    { id: 'tol', name: 'Tolcapone', group: 'c', kind: 'comt', unit: 'mg', ratio: 0.5 },
    { id: 'ras', name: 'Rasagiline', group: 'm', kind: 'factor', unit: 'mg', factor: 100 },
    { id: 'saf', name: 'Safinamide', group: 'm', kind: 'fixed', unit: 'mg', fixedLed: 150, validDoses: [50, 100] },
    { id: 'thp', name: 'Trihexyphenidyl', group: 'o', kind: 'perDose', unit: 'doses', ledPerDose: 100 },
    { id: 'ist', name: 'Istradefylline', group: 'o', kind: 'istradefylline', unit: 'mg', ratio: 0.2 },
    {
      id: 'multi',
      name: 'Two-part product',
      group: 'ld',
      kind: 'multi',
      unit: 'mg',
      levodopaContaining: true,
      components: [
        { label: 'morning', factor: 1.11 },
        { label: 'maintenance', factor: 1.46 },
      ],
    },
  ];

  it('sums simple factor agents', () => {
    const r = computeLedd(items, [
      { itemId: 'ld', values: [600] },
      { itemId: 'ras', values: [1] },
    ]);
    expect(r.total).toBeCloseTo(700);
    expect(r.errors).toEqual([]);
  });

  it('applies the COMT ratio to the levodopa-containing subtotal only', () => {
    const r = computeLedd(items, [
      { itemId: 'ld', values: [400] },
      { itemId: 'cr', values: [400] }, // 300
      { itemId: 'ras', values: [1] }, // 100, must NOT be multiplied
      { itemId: 'ent', values: [800] },
    ]);
    expect(r.levodopaSubtotal).toBeCloseTo(700);
    const comt = r.lines.find((l) => l.itemId === 'ent');
    expect(comt?.led).toBeCloseTo(700 * 0.33);
    expect(r.total).toBeCloseTo(700 + 700 * 0.33 + 100);
  });

  it('applies istradefylline to levodopa plus COMT LED', () => {
    const r = computeLedd(items, [
      { itemId: 'ld', values: [500] },
      { itemId: 'tol', values: [300] },
      { itemId: 'ist', values: [20] },
    ]);
    // comt = 250; istra = (500+250)*0.2 = 150; total = 500+250+150
    expect(r.total).toBeCloseTo(900);
  });

  it('uses a fixed LED for safinamide regardless of dose, and warns outside 50/100 mg', () => {
    const ok = computeLedd(items, [{ itemId: 'saf', values: [100] }]);
    expect(ok.total).toBe(150);
    expect(ok.warnings).toEqual([]);
    const odd = computeLedd(items, [{ itemId: 'saf', values: [75] }]);
    expect(odd.total).toBe(150);
    expect(odd.warnings[0]).toMatch(/outside/);
  });

  it('counts anticholinergic efficacious single doses', () => {
    expect(computeLedd(items, [{ itemId: 'thp', values: [3] }]).total).toBe(300);
  });

  it('handles multi-component products', () => {
    const r = computeLedd(items, [{ itemId: 'multi', values: [200, 800] }]);
    expect(r.total).toBeCloseTo(200 * 1.11 + 800 * 1.46);
    expect(r.levodopaSubtotal).toBeCloseTo(200 * 1.11 + 800 * 1.46);
  });

  it('blocks the total when two COMT inhibitors are entered', () => {
    const r = computeLedd(items, [
      { itemId: 'ld', values: [600] },
      { itemId: 'ent', values: [800] },
      { itemId: 'tol', values: [300] },
    ]);
    expect(r.total).toBeNull();
    expect(r.errors[0]).toMatch(/Only one COMT inhibitor/);
  });

  it('warns when a COMT inhibitor is entered without levodopa', () => {
    const r = computeLedd(items, [{ itemId: 'ent', values: [800] }]);
    expect(r.warnings[0]).toMatch(/no levodopa-containing product/);
    expect(r.total).toBe(0);
  });

  it('flags duplicate rows and invalid doses without producing a total', () => {
    expect(computeLedd(items, [{ itemId: 'ld', values: [100] }, { itemId: 'ld', values: [100] }]).total).toBeNull();
    expect(computeLedd(items, [{ itemId: 'ld', values: [-5] }]).total).toBeNull();
    expect(computeLedd(items, [{ itemId: 'ld', values: [NaN] }]).total).toBeNull();
    expect(computeLedd(items, [{ itemId: 'nope', values: [1] }]).total).toBeNull();
  });

  it('ignores rows with a dose of zero', () => {
    const r = computeLedd(items, [{ itemId: 'ld', values: [0] }, { itemId: 'ras', values: [1] }]);
    expect(r.total).toBeCloseTo(100);
    expect(r.lines).toHaveLength(1);
  });

  it('lists lines in calculation order: levodopa, COMT, istradefylline, then other agents', () => {
    const r = computeLedd(items, [
      { itemId: 'ras', values: [1] },
      { itemId: 'ist', values: [20] },
      { itemId: 'ent', values: [800] },
      { itemId: 'ld', values: [500] },
    ]);
    expect(r.lines.map((l) => l.itemId)).toEqual(['ld', 'ent', 'ist', 'ras']);
  });

  it('returns zero for no entries', () => {
    expect(computeLedd(items, []).total).toBe(0);
  });
});
