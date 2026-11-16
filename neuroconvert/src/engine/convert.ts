import type {
  EquivItem,
  FactorRoute,
  Interval,
  ResolvedRoute,
  Route,
  TableRoute,
  TableRow,
} from '../types';

/** Result of a conversion: always a range; `typical` only when a source names one. */
export interface ConversionResult {
  low: number;
  high: number;
  typical?: number;
}

const EPS = 1e-9;

/** True when the interval is a single point. */
export function isPoint(i: Interval): boolean {
  return Math.abs(i.high - i.low) < EPS;
}

/** The value to show as "typical": an explicit one, or the point itself. */
export function typicalOf(i: Interval): number | undefined {
  if (i.typical !== undefined) return i.typical;
  return isPoint(i) ? i.low : undefined;
}

/**
 * Parse a user-entered dose. Returns null unless it is a finite, strictly
 * positive number (so "", "abc", "-5", "0", "Infinity" are all rejected).
 */
export function parseAmount(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const s = typeof raw === 'number' ? String(raw) : raw.trim().replace(/,/g, '');
  if (s === '') return null;
  // Strict decimal syntax: no hex, no exponent, no stray characters.
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Upper bound for any user-entered amount; rejects absurd typos. */
export const MAX_AMOUNT = 1_000_000;

/** output = amount × factor, carried through the interval. */
export function applyFactor(amount: number, factor: Interval): ConversionResult {
  return {
    low: amount * factor.low,
    high: amount * factor.high,
    typical: factor.typical !== undefined ? amount * factor.typical : undefined,
  };
}

/** Reciprocal of an interval: [1/high, 1/low]. */
export function invertInterval(f: Interval): Interval {
  if (f.low <= 0 || f.high <= 0) throw new Error('Cannot invert a non-positive factor');
  return {
    low: 1 / f.high,
    high: 1 / f.low,
    typical: f.typical !== undefined ? 1 / f.typical : undefined,
  };
}

/**
 * Convert between two agents that are each defined by "amount equivalent to a
 * common reference amount". Interval arithmetic gives the widest defensible
 * range when either agent's equivalence is itself a range.
 */
export function convertEquivalence(amount: number, from: EquivItem, to: EquivItem): ConversionResult {
  const low = (amount * to.equiv.low) / from.equiv.high;
  const high = (amount * to.equiv.high) / from.equiv.low;
  const tf = typicalOf(from.equiv);
  const tt = typicalOf(to.equiv);
  return { low, high, typical: tf !== undefined && tt !== undefined ? (amount * tt) / tf : undefined };
}

/** Amount of every item equal to `amount` of `from`, in input order. */
export function equivalentsOf(amount: number, from: EquivItem, items: EquivItem[]) {
  return items.map((to) => ({ item: to, result: convertEquivalence(amount, from, to) }));
}

/** Add the auto-generated reverse of every reversible factor route. */
export function resolveRoutes(routes: Route[]): ResolvedRoute[] {
  const out: ResolvedRoute[] = [];
  for (const r of routes) {
    out.push(r);
    if (r.kind === 'factor' && r.reversible) {
      out.push(reverseRoute(r));
    }
  }
  return out;
}

export function reverseRoute(r: FactorRoute): ResolvedRoute {
  const stated = r.reverseStated === true;
  const callouts = [...r.callouts];
  if (!stated) {
    callouts.unshift({
      kind: 'note',
      text:
        'Reverse direction: arithmetic inverse of the sourced conversion. The source states the conversion in the other direction only.',
    });
  }
  if (r.reverseCallouts) callouts.push(...r.reverseCallouts);
  return {
    ...r,
    id: `${r.id}~rev`,
    label: r.reverseLabel ?? `${r.label} (reverse)`,
    fromUnit: r.toUnit,
    toUnit: r.fromUnit,
    factor: invertInterval(r.factor),
    reversible: false,
    callouts,
    provenance: { ...r.provenance, derived: r.provenance.derived || !stated },
    isReverse: true,
  };
}

export interface TableLookup {
  match?: TableRow;
  /** Nearest covered row below the input, when there is no match. */
  below?: TableRow;
  /** Nearest covered row above the input, when there is no match. */
  above?: TableRow;
}

/** Find the table row covering `amount` (inclusive bounds). */
export function lookupTable(amount: number, route: TableRoute): TableLookup {
  let below: TableRow | undefined;
  let above: TableRow | undefined;
  for (const row of route.rows) {
    if (amount >= row.from[0] - EPS && amount <= row.from[1] + EPS) return { match: row };
    if (row.from[1] < amount && (!below || row.from[1] > below.from[1])) below = row;
    if (row.from[0] > amount && (!above || row.from[0] < above.from[0])) above = row;
  }
  return { below, above };
}
