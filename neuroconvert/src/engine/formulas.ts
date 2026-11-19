import type { FormulaId } from '../types';
import { formatAmount } from './format';

/**
 * Multi-input calculators. Every constant is quoted from its source:
 *
 *  vyalev         VYALEV (foscarbidopa/foslevodopa) prescribing information, §2 "Base Continuous
 *                 Dosage and Hourly Infusion Rate": foslevodopa mg = TLD × 1.3; 240 mg foslevodopa
 *                 per mL; rate = volume ÷ waking hours; loading dose = first morning dose × 1.3 ÷ 240;
 *                 maximum 3,525 mg foslevodopa/day; pump loading dose 0.1–3 mL.
 *  duopa          DUOPA prescribing information, "Determine the DUOPA Starting Dose for Day 1":
 *                 morning dose mL = first oral levodopa dose × 0.8 ÷ 20 mg/mL, plus 3 mL to prime the
 *                 tube; continuous dose mL = (levodopa over 16 waking h − first dose) ÷ 20; rate = ÷ 16 h;
 *                 maximum 2,000 mg levodopa/day.
 *  sheiner-tozer  Corrected total phenytoin = observed ÷ [(0.2 × albumin) + 0.1]
 *                 (µg/mL, albumin g/dL), as stated in Kiang & Ensom, Ann Pharmacother 2016.
 */

export interface FormulaRow {
  label: string;
  value: string;
  note?: string;
}

export interface FormulaOutput {
  /** First row is the headline answer. */
  rows: FormulaRow[];
  /** The arithmetic, one line per step. */
  steps: string[];
  /** Input-specific cautions. */
  warnings: string[];
}

export type FormulaResult = FormulaOutput | { error: string };

export type FormulaValues = Record<string, number | undefined>;

export const VYALEV = {
  FOSLEVODOPA_PER_LEVODOPA: 1.3,
  MG_PER_ML: 240,
  MAX_FOSLEVODOPA_MG_PER_DAY: 3525,
  MAX_LOADING_ML: 3,
  MIN_LOADING_ML: 0.1,
} as const;

export const DUOPA = {
  LEVODOPA_MG_PER_ML: 20,
  MORNING_DOSE_FACTOR: 0.8,
  PRIME_ML: 3,
  INFUSION_HOURS: 16,
  MAX_LEVODOPA_MG_PER_DAY: 2000,
} as const;

function vyalev(v: FormulaValues): FormulaResult {
  const tld = v.tld;
  const hours = v.hours;
  const first = v.first;
  if (tld === undefined || tld <= 0) return { error: 'Enter the total daily levodopa dosage (mg/day).' };
  if (hours === undefined || hours < 1 || hours > 24) return { error: 'Hours of infusion per day must be between 1 and 24.' };

  const fos = tld * VYALEV.FOSLEVODOPA_PER_LEVODOPA;
  const mlDay = fos / VYALEV.MG_PER_ML;
  const rate = mlDay / hours;

  const rows: FormulaRow[] = [
    { label: 'Hourly base continuous infusion rate', value: `${formatAmount(rate)} mL/h`, note: `over ${formatAmount(hours)} h per day` },
    { label: 'Foslevodopa total daily dosage', value: `${formatAmount(fos)} mg/day` },
    { label: 'Total daily volume', value: `${formatAmount(mlDay)} mL/day` },
  ];
  const steps = [
    `Step 2: foslevodopa = TLD × 1.3 = ${formatAmount(tld)} × 1.3 = ${formatAmount(fos)} mg`,
    `Step 3: volume = ${formatAmount(fos)} ÷ 240 mg/mL = ${formatAmount(mlDay)} mL`,
    `Step 4: hourly rate = ${formatAmount(mlDay)} ÷ ${formatAmount(hours)} h = ${formatAmount(rate)} mL/h`,
  ];
  const warnings: string[] = [];

  if (fos > VYALEV.MAX_FOSLEVODOPA_MG_PER_DAY) {
    warnings.push(
      `${formatAmount(fos)} mg/day of foslevodopa exceeds the label maximum of ${VYALEV.MAX_FOSLEVODOPA_MG_PER_DAY.toLocaleString('en-US')} mg/day (about 2,500 mg levodopa).`,
    );
  }
  if (first !== undefined && first > 0) {
    const loading = (first * VYALEV.FOSLEVODOPA_PER_LEVODOPA) / VYALEV.MG_PER_ML;
    rows.push({ label: 'Optional loading dose', value: `${formatAmount(loading)} mL`, note: 'if started in an "Off" state' });
    steps.push(`Loading dose = first morning dose × 1.3 ÷ 240 = ${formatAmount(first)} × 1.3 ÷ 240 = ${formatAmount(loading)} mL`);
    if (loading > VYALEV.MAX_LOADING_ML) {
      warnings.push(`A loading dose of ${formatAmount(loading)} mL is above the pump maximum of ${VYALEV.MAX_LOADING_ML} mL.`);
    } else if (loading < VYALEV.MIN_LOADING_ML) {
      warnings.push(`A loading dose of ${formatAmount(loading)} mL is below the pump minimum of ${VYALEV.MIN_LOADING_ML} mL.`);
    }
  }
  return { rows, steps, warnings };
}

function duopa(v: FormulaValues): FormulaResult {
  const first = v.first;
  const total = v.total;
  if (first === undefined || first <= 0) return { error: 'Enter the first morning dose of oral immediate-release levodopa (mg).' };
  if (total === undefined || total <= 0) return { error: 'Enter the total oral levodopa taken over the 16 waking hours (mg).' };
  if (total < first) return { error: 'The 16-hour total cannot be smaller than the first morning dose, which is part of it.' };

  const morningMl = (first * DUOPA.MORNING_DOSE_FACTOR) / DUOPA.LEVODOPA_MG_PER_ML;
  const totalMorningMl = morningMl + DUOPA.PRIME_ML;
  const continuousMl = (total - first) / DUOPA.LEVODOPA_MG_PER_ML;
  const rate = continuousMl / DUOPA.INFUSION_HOURS;
  const delivered = (morningMl + continuousMl) * DUOPA.LEVODOPA_MG_PER_ML;

  const rows: FormulaRow[] = [
    { label: 'Total morning dose (includes 3 mL to prime the tube)', value: `${formatAmount(totalMorningMl)} mL`, note: `${formatAmount(morningMl)} mL dose + 3 mL prime` },
    { label: 'Continuous dose over 16 h', value: `${formatAmount(continuousMl)} mL` },
    { label: 'Continuous rate', value: `${formatAmount(rate)} mL/h` },
    { label: 'Levodopa delivered (morning + continuous, excluding prime and extra doses)', value: `${formatAmount(delivered)} mg` },
  ];
  const steps = [
    `Morning dose = ${formatAmount(first)} mg × 0.8 ÷ 20 mg/mL = ${formatAmount(morningMl)} mL`,
    `Total morning dose = ${formatAmount(morningMl)} + 3 mL (prime) = ${formatAmount(totalMorningMl)} mL`,
    `Continuous dose = (${formatAmount(total)} − ${formatAmount(first)}) mg ÷ 20 mg/mL = ${formatAmount(continuousMl)} mL`,
    `Rate = ${formatAmount(continuousMl)} mL ÷ 16 h = ${formatAmount(rate)} mL/h`,
  ];
  const warnings: string[] = [];
  if (delivered > DUOPA.MAX_LEVODOPA_MG_PER_DAY) {
    warnings.push(
      `${formatAmount(delivered)} mg of levodopa exceeds the label maximum of ${DUOPA.MAX_LEVODOPA_MG_PER_DAY.toLocaleString('en-US')} mg/day (one cassette).`,
    );
  }
  if (continuousMl === 0) warnings.push('The 16-hour total equals the first dose, so there is no continuous dose.');
  return { rows, steps, warnings };
}

function sheinerTozer(v: FormulaValues): FormulaResult {
  const obs = v.observed;
  const alb = v.albumin;
  if (obs === undefined || obs <= 0) return { error: 'Enter the measured total phenytoin concentration (µg/mL).' };
  if (alb === undefined || alb <= 0) return { error: 'Enter the serum albumin (g/dL).' };
  if (alb > 7) return { error: 'Albumin is entered in g/dL (for example 2.5). If your result is in g/L, divide it by 10.' };

  const denominator = 0.2 * alb + 0.1;
  const corrected = obs / denominator;
  const warnings: string[] = [];
  if (alb > 4.5) {
    warnings.push('At albumin above 4.5 g/dL this equation lowers the level. It is intended for low albumin.');
  }
  return {
    rows: [
      { label: 'Albumin-corrected total phenytoin', value: `${formatAmount(corrected)} µg/mL (mg/L)`, note: 'an estimate, not a measured free level' },
      { label: 'Correction factor', value: `× ${formatAmount(1 / denominator)}` },
    ],
    steps: [
      `Denominator = (0.2 × albumin) + 0.1 = (0.2 × ${formatAmount(alb)}) + 0.1 = ${formatAmount(denominator)}`,
      `Corrected = observed ÷ denominator = ${formatAmount(obs)} ÷ ${formatAmount(denominator)} = ${formatAmount(corrected)} µg/mL`,
      'At an albumin of 4.5 g/dL the denominator is 1.0, so the corrected value equals the observed value.',
    ],
    warnings,
  };
}

export function computeFormula(id: FormulaId, values: FormulaValues): FormulaResult {
  switch (id) {
    case 'vyalev':
      return vyalev(values);
    case 'duopa':
      return duopa(values);
    case 'sheiner-tozer':
      return sheinerTozer(values);
  }
}
