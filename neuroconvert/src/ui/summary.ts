import { DATA_VERSION } from '../data';
import type { Callout, EvidenceTier } from '../types';
import { referencesAsText, TIERS } from './evidence';

export interface SummaryInput {
  converterTitle: string;
  ruleLabel: string;
  lines: string[];
  tier: EvidenceTier;
  derived?: boolean;
  locator?: string;
  callouts: Callout[];
  refs: string[];
}

/** Plain-text summary suitable for pasting into a note, with sources. */
export function buildSummary(s: SummaryInput): string {
  const tier = TIERS[s.tier];
  const parts: string[] = [
    `NeuroConvert — ${s.converterTitle}`,
    s.ruleLabel,
    '',
    ...s.lines,
    '',
    `Evidence ${s.tier} (${tier.name})${s.derived ? ', derived by calculation' : ''}: ${tier.blurb}`,
  ];
  if (s.locator) parts.push(`Source location: ${s.locator}`);
  const warnings = s.callouts.filter((c) => c.kind === 'warning');
  if (warnings.length) {
    parts.push('', 'Cautions:', ...warnings.map((c) => `- ${c.text}`));
  }
  parts.push('', 'References:', referencesAsText(s.refs));
  parts.push(
    '',
    `Clinical decision support only; verify against current prescribing information before use. Data version ${DATA_VERSION}.`,
  );
  return parts.join('\n');
}
