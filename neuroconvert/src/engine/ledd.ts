import type { LeddItem } from '../types';
import { formatAmount, formatFactor } from './format';

/**
 * Levodopa equivalent dose (LED) calculation following Jost et al., Mov Disord 2023
 * (Table 1 and its legend):
 *
 *  1. LED of every levodopa-containing product = daily dose × factor.
 *  2. COMT inhibitor LED = (levodopa-containing LED subtotal) × 0.33 (entacapone)
 *     or × 0.5 (tolcapone, opicapone).
 *  3. Istradefylline LED = (levodopa + COMT subtotal) × 0.2.
 *  4. All other agents: daily dose × factor (or the fixed / per-dose rule).
 *  5. Total LED = sum of all of the above.
 *
 * LED is a research tool for comparing cohorts; it is not a validated rule for
 * converting an individual patient's treatment (see the paper's conclusions).
 */

export interface LeddEntry {
  itemId: string;
  /** One value per dose component (a single value for most agents). */
  values: number[];
}

export interface LeddLine {
  itemId: string;
  name: string;
  led: number;
  /** Human-readable arithmetic, e.g. "300 × 0.75". */
  formula: string;
}

export interface LeddResult {
  lines: LeddLine[];
  levodopaSubtotal: number;
  /** Total LED, or null while there are blocking errors. */
  total: number | null;
  errors: string[];
  warnings: string[];
}

function isValidNumber(v: number): boolean {
  return Number.isFinite(v) && v >= 0;
}

export function computeLedd(items: LeddItem[], entries: LeddEntry[]): LeddResult {
  const byId = new Map(items.map((i) => [i.id, i]));
  const lines: LeddLine[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let levodopaSubtotal = 0;
  let otherSubtotal = 0;
  const comtUsed: LeddItem[] = [];
  let istradefyllineUsed: LeddItem | null = null;
  const seen = new Set<string>();

  for (const e of entries) {
    const item = byId.get(e.itemId);
    if (!item) {
      errors.push(`Unknown agent "${e.itemId}".`);
      continue;
    }
    if (seen.has(item.id)) {
      errors.push(`${item.name} is entered more than once; combine the doses into one row.`);
      continue;
    }
    seen.add(item.id);

    if (e.values.length === 0 || !e.values.every(isValidNumber)) {
      errors.push(`${item.name}: enter a dose of 0 or more.`);
      continue;
    }
    const dose = e.values[0];
    const anyDose = e.values.some((v) => v > 0);
    if (!anyDose) continue; // nothing taken → contributes nothing

    switch (item.kind) {
      case 'factor': {
        const led = dose * (item.factor as number);
        lines.push({ itemId: item.id, name: item.name, led, formula: `${formatAmount(dose)} × ${formatFactor(item.factor as number)}` });
        if (item.levodopaContaining) levodopaSubtotal += led;
        else otherSubtotal += led;
        break;
      }
      case 'multi': {
        const comps = item.components as { label: string; factor: number }[];
        let led = 0;
        const parts: string[] = [];
        comps.forEach((c, idx) => {
          const v = e.values[idx] ?? 0;
          if (v > 0) {
            led += v * c.factor;
            parts.push(`${formatAmount(v)} × ${formatFactor(c.factor)}`);
          }
        });
        lines.push({ itemId: item.id, name: item.name, led, formula: parts.join(' + ') });
        if (item.levodopaContaining) levodopaSubtotal += led;
        else otherSubtotal += led;
        break;
      }
      case 'fixed': {
        const led = item.fixedLed as number;
        if (item.validDoses && !item.validDoses.includes(dose)) {
          warnings.push(
            `${item.name}: the fixed LED applies to doses of ${item.validDoses.join(' or ')} ${item.unit}; ${formatAmount(dose)} is outside that range.`,
          );
        }
        lines.push({ itemId: item.id, name: item.name, led, formula: `fixed ${formatAmount(led)} (independent of dose)` });
        otherSubtotal += led;
        break;
      }
      case 'perDose': {
        const per = item.ledPerDose as number;
        const led = dose * per;
        lines.push({ itemId: item.id, name: item.name, led, formula: `${formatAmount(dose)} doses × ${formatAmount(per)}` });
        otherSubtotal += led;
        break;
      }
      case 'comt':
        comtUsed.push(item);
        break;
      case 'istradefylline':
        istradefyllineUsed = item;
        break;
    }
  }

  let comtLed = 0;
  if (comtUsed.length > 1) {
    errors.push(
      `Only one COMT inhibitor can be entered (${comtUsed.map((c) => c.name).join(' and ')} were both entered); the source does not define a combined ratio.`,
    );
  } else if (comtUsed.length === 1) {
    const c = comtUsed[0];
    const ratio = c.ratio as number;
    if (levodopaSubtotal === 0) {
      warnings.push(`${c.name}: its LED is a fraction of the levodopa LED, and no levodopa-containing product was entered.`);
    }
    comtLed = levodopaSubtotal * ratio;
    lines.push({
      itemId: c.id,
      name: c.name,
      led: comtLed,
      formula: `${formatAmount(levodopaSubtotal)} (levodopa LED) × ${formatFactor(ratio)}`,
    });
  }

  let istraLed = 0;
  if (istradefyllineUsed) {
    const item: LeddItem = istradefyllineUsed;
    istraLed = (levodopaSubtotal + comtLed) * (item.ratio as number);
    lines.push({
      itemId: item.id,
      name: item.name,
      led: istraLed,
      formula: `${formatAmount(levodopaSubtotal + comtLed)} (levodopa + COMT LED) × ${formatFactor(item.ratio as number)}`,
    });
  }

  // Present in calculation order: levodopa-containing, COMT, istradefylline, then the rest.
  const rank = (l: LeddLine): number => {
    const item = byId.get(l.itemId) as LeddItem;
    if (item.levodopaContaining) return 0;
    if (item.kind === 'comt') return 1;
    if (item.kind === 'istradefylline') return 2;
    return 3;
  };
  const ordered = lines
    .map((l, i) => ({ l, i }))
    .sort((a, b) => rank(a.l) - rank(b.l) || a.i - b.i)
    .map((x) => x.l);

  const total = errors.length > 0 ? null : levodopaSubtotal + comtLed + istraLed + otherSubtotal;
  return { lines: ordered, levodopaSubtotal, total, errors, warnings };
}
