import { describe, expect, it } from 'vitest';
import {
  applyFactor,
  convertEquivalence,
  invertInterval,
  lookupTable,
  parseAmount,
  parseDecimalInput,
  readingNote,
  resolveRoutes,
} from '../src/engine/convert';
import { formatAmount, formatRange } from '../src/engine/format';
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
