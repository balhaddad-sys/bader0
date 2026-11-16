import type { Interval } from '../types';

/** A single-point factor. */
export const pt = (v: number): Interval => ({ low: v, high: v });

/** A range, optionally with a source-named typical value. */
export const rng = (low: number, high: number, typical?: number): Interval => ({ low, high, typical });
