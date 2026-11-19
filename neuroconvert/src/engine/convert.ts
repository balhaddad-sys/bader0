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

/** Map non-ASCII digits and separators (Arabic-Indic, Persian, fullwidth) to ASCII. */
function normaliseNumerals(s: string): string {
  return s
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660)) // Arabic-Indic digits
    .replace(/[\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) - 0x06f0)) // Extended Arabic-Indic (Persian) digits
    .replace(/[\uff10-\uff19]/g, (c) => String(c.charCodeAt(0) - 0xff10)) // fullwidth digits
    .replace(/[\u066b\uff0e]/g, '.') //                                    Arabic decimal separator, fullwidth full stop
    .replace(/[\u066c\u060c\uff0c]/g, ','); //                            Arabic thousands separator, Arabic comma, fullwidth comma
}

const PLAIN_NUMBER = /^\d*\.?\d+$|^\d+\.$/;
const SPACES = /[\s\u00a0\u202f\u2009]/;

/**
 * Parse a typed number, tolerating the formats phone keyboards produce in
 * different regions, but never guessing where a wrong guess could change a dose
 * by a large factor:
 *
 *   800  ٨٠٠  ۸۰۰        → 800        (Arabic-Indic / Persian digits)
 *   0.5  0,5  ٠٫٥        → 0.5        (decimal point or decimal comma)
 *   1,250  1.250.000     → 1250 / 1250000   (thousands separators in exact groups of three)
 *   1 000                → 1000       (space as thousands separator)
 *   1.000,5  1,000.5     → 1000.5     (both present: the last one is the decimal mark)
 *
 * Returns null for anything else (letters, signs, exponents, "1,2,3", "1.2.3"…).
 * A single comma followed by exactly three digits and a non-zero lead ("1,375")
 * is read as a thousands separator; the UI echoes how the entry was read.
 */
export function parseDecimalInput(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : null;

  let s = normaliseNumerals(raw).trim();
  if (s === '') return null;

  if (SPACES.test(s)) {
    // A space is only accepted as a thousands separator between groups of exactly three digits.
    if (!/^\d{1,3}(?:[\s\u00a0\u202f\u2009]\d{3})+(?:[.,]\d+)?$/.test(s)) return null;
    s = s.replace(/[\s\u00a0\u202f\u2009]/g, '');
  }
  if (!/^[\d.,]+$/.test(s)) return null;

  const dots = (s.match(/\./g) ?? []).length;
  const commas = (s.match(/,/g) ?? []).length;
  let canonical: string;

  if (dots > 0 && commas > 0) {
    const decimalMark = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    const groupMark = decimalMark === '.' ? ',' : '.';
    const parts = s.split(decimalMark);
    if (parts.length !== 2 || !/^\d+$/.test(parts[1])) return null;
    const grouped = new RegExp(`^\\d{1,3}(?:\\${groupMark}\\d{3})+$`);
    if (!grouped.test(parts[0])) return null;
    canonical = `${parts[0].split(groupMark).join('')}.${parts[1]}`;
  } else if (commas > 0) {
    if (/^[1-9]\d{0,2}(?:,\d{3})+$/.test(s)) canonical = s.replace(/,/g, '');
    else if (commas === 1 && /^\d+,\d+$/.test(s)) canonical = s.replace(',', '.');
    else return null;
  } else if (dots > 1) {
    if (/^[1-9]\d{0,2}(?:\.\d{3})+$/.test(s)) canonical = s.replace(/\./g, '');
    else return null;
  } else {
    canonical = s;
  }

  if (!PLAIN_NUMBER.test(canonical)) return null;
  const n = Number(canonical);
  return Number.isFinite(n) ? n : null;
}

/** A dose: finite and strictly greater than zero. */
export function parseAmount(raw: string | number | null | undefined): number | null {
  const n = parseDecimalInput(raw);
  return n !== null && n > 0 ? n : null;
}

/**
 * When the typed text is not a plain ASCII number (different digits, a comma, a
 * space), say how it was read so a misread separator is visible, e.g. "Read as 1,375".
 */
export function readingNote(raw: string, value: number): string | undefined {
  const t = raw.trim();
  if (t === '' || PLAIN_NUMBER.test(t)) return undefined;
  return `Read as ${value.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
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

/** Key used for an item's values when it has no explicit per-source breakdown. */
export const PRIMARY_SOURCE = 'primary';

export function sourcesOf(item: EquivItem): Record<string, Interval> {
  return item.bySource ?? { [PRIMARY_SOURCE]: item.equiv };
}

function convertWithin(amount: number, from: Interval, to: Interval): ConversionResult {
  const tf = typicalOf(from);
  const tt = typicalOf(to);
  return {
    low: (amount * to.low) / from.high,
    high: (amount * to.high) / from.low,
    typical: tf !== undefined && tt !== undefined ? (amount * tt) / tf : undefined,
  };
}

export interface SourceConversion {
  source: string;
  result: ConversionResult;
}

/**
 * The conversion according to each source that defines BOTH agents. Interval
 * arithmetic is used only within a source, so a source that gives a range for
 * one agent still gives the widest defensible range for that source.
 */
export function convertEquivalenceBySource(amount: number, from: EquivItem, to: EquivItem): SourceConversion[] {
  const fs = sourcesOf(from);
  const ts = sourcesOf(to);
  return Object.keys(fs)
    .filter((k) => k in ts)
    .map((source) => ({ source, result: convertWithin(amount, fs[source], ts[source]) }));
}

/**
 * Convert between two agents that are each defined by "amount equivalent to a
 * common reference amount". If sources disagree the result spans all of them;
 * where they agree (or only one source exists) the result is a single value.
 */
export function convertEquivalence(amount: number, from: EquivItem, to: EquivItem): ConversionResult {
  const per = convertEquivalenceBySource(amount, from, to);
  if (per.length === 0) return convertWithin(amount, from.equiv, to.equiv);
  if (per.length === 1) return per[0].result;
  const low = Math.min(...per.map((p) => p.result.low));
  const high = Math.max(...per.map((p) => p.result.high));
  return { low, high, typical: Math.abs(high - low) < EPS ? low : undefined };
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
