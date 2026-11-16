import type { ConversionResult } from './convert';

/**
 * Format a dose for display. Precision scales with magnitude so that
 * 0.0625 mg and 1,466 mg are both shown faithfully, without false precision.
 */
export function formatAmount(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  let max: number;
  if (a >= 100) max = 0;
  else if (a >= 10) max = 1;
  else if (a >= 1) max = 2;
  else if (a >= 0.1) max = 3;
  else if (a >= 0.01) max = 4;
  else return v.toPrecision(2);
  return v.toLocaleString('en-US', { maximumFractionDigits: max });
}

/** Format a number in a formula string (more digits than display). */
export function formatFactor(v: number): string {
  return Number(v.toPrecision(4)).toString();
}

/** "1,080 – 1,200 mg" or "1,000 mg" when low and high round to the same text. */
export function formatRange(r: ConversionResult, unit: string): string {
  const lo = formatAmount(r.low);
  const hi = formatAmount(r.high);
  const u = unit ? ` ${unit}` : '';
  return lo === hi ? `${lo}${u}` : `${lo} – ${hi}${u}`;
}
