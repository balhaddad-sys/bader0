/**
 * Core data model.
 *
 * Design rule: a conversion rule cannot exist without (a) an evidence tier and
 * (b) at least one reference. `tests/data-integrity.test.ts` enforces this, so
 * an untraceable number cannot ship.
 */

/**
 * Strength of support for a conversion (see "Methods" in the app):
 *  A  Regulatory label  – the conversion is stated in current FDA prescribing information.
 *  B  Pharmacokinetic   – derived from labelled/published bioavailability or exposure data.
 *  C  Clinical evidence – derived from clinical trials or systematic reviews of clinical use.
 *  D  Expert consensus  – approximate equivalence from consensus/clinical-experience tables.
 */
export type EvidenceTier = 'A' | 'B' | 'C' | 'D';

/** A numeric range. `typical` is shown only when a source names a preferred point value. */
export interface Interval {
  low: number;
  high: number;
  typical?: number;
}

export interface Reference {
  id: string;
  /** Short label such as "Kiang 2016", for compact display. */
  short?: string;
  kind: 'article' | 'label' | 'web';
  /** Complete formatted citation (AMA-style). */
  citation: string;
  year: number;
  pmid?: string;
  doi?: string;
  /** Canonical link (DailyMed label, web page). */
  url?: string;
  /** DailyMed set ID for labels. */
  setId?: string;
  /** Title expected on PubMed / DailyMed, used by scripts/verify-references.mjs. */
  verifyTitle?: string;
  /** Date this source was read for curation (ISO). */
  accessed: string;
}

export interface Provenance {
  tier: EvidenceTier;
  refs: string[];
  /** Where in the source the figure appears (table, section). */
  locator?: string;
  /** True when the figure is arithmetic derived from source data, not stated verbatim. */
  derived?: boolean;
}

export interface Callout {
  kind: 'warning' | 'note';
  text: string;
}

/* ------------------------------------------------------------------ */
/* Directed conversions: "A → B" with a fixed factor or a lookup table */
/* ------------------------------------------------------------------ */

interface RouteBase {
  id: string;
  /** Drug family used to group the selector. */
  group: string;
  label: string;
  fromUnit: string;
  toUnit: string;
  provenance: Provenance;
  callouts: Callout[];
}

export interface FactorRoute extends RouteBase {
  kind: 'factor';
  /** output = input × factor */
  factor: Interval;
  /**
   * When true a reverse route (output ÷ factor) is generated automatically and
   * flagged as derived. Only set where the reverse is clinically meaningful.
   */
  reversible?: boolean;
  /** Label for the generated reverse route, e.g. "Levetiracetam: IV → oral". */
  reverseLabel?: string;
  /**
   * True when the source itself states the reverse direction (so the generated
   * reverse is not flagged as derived).
   */
  reverseStated?: boolean;
  /** Extra caution shown only on the generated reverse route. */
  reverseCallouts?: Callout[];
}

export interface TableRow {
  /** Inclusive input range this row covers. */
  from: [number, number];
  /** Display text for the range when it is open-ended (e.g. "< 6 mg/day"). */
  fromLabel?: string;
  /** Human-readable output exactly as the source states it. */
  to: string;
  note?: string;
}

export interface TableRoute extends RouteBase {
  kind: 'table';
  rows: TableRow[];
  /** Text shown beneath the table (e.g. label footnote). */
  tableNote?: string;
}

export type Route = FactorRoute | TableRoute;

/** Route as presented to the user (possibly a generated reverse). */
export type ResolvedRoute = Route & { isReverse?: boolean };

/* ------------------------------------------------------------------ */
/* Equivalence sets: agents defined relative to a common reference     */
/* ------------------------------------------------------------------ */

export interface EquivItem {
  id: string;
  name: string;
  group: string;
  /** Amount of this agent that is equivalent to the set's reference amount (the span of all sources). */
  equiv: Interval;
  /**
   * Equivalent amount according to each source, where sources disagree. A conversion
   * between two agents is computed within each source they share and the results
   * are combined into a range, so two sources that agree on a ratio give no false width.
   * Items without it have a single source, "primary".
   */
  bySource?: Record<string, Interval>;
  unit: string;
  note?: string;
}

/* ------------------------------------------------------------------ */
/* LEDD calculator                                                     */
/* ------------------------------------------------------------------ */

export type LeddKind =
  | 'factor' //   daily dose × factor
  | 'multi' //    several dose components, each with its own factor
  | 'fixed' //    fixed LED irrespective of dose (e.g. safinamide)
  | 'perDose' //  LED per efficacious single dose × doses/day
  | 'comt' //     ratio applied to the levodopa-containing LED subtotal
  | 'istradefylline'; // ratio applied to (levodopa + COMT) subtotal

export interface LeddItem {
  id: string;
  name: string;
  group: string;
  kind: LeddKind;
  /** Unit of the dose the user types (e.g. "mg/day"). */
  unit: string;
  factor?: number;
  components?: { label: string; factor: number }[];
  fixedLed?: number;
  validDoses?: number[];
  ledPerDose?: number;
  ratio?: number;
  /** Number of published LED proposals found by the systematic review (Jost 2023, Table 1); omitted for levodopa itself. */
  publications?: number;
  note?: string;
  /** True for levodopa-containing products, which form the COMT/istradefylline base. */
  levodopaContaining?: boolean;
}

/* ------------------------------------------------------------------ */
/* Converters and modules                                              */
/* ------------------------------------------------------------------ */

interface ConverterBase {
  id: string;
  title: string;
  summary: string;
  /** Plain-language description of what number the user should enter. */
  doseBasis: string;
  /** Label for the number box; defaults to "Your dose" (e.g. "Your level" for drug concentrations). */
  inputLabel?: string;
  callouts: Callout[];
  /** Key references for the whole converter (individual rules cite their own too). */
  refs: string[];
}

export interface DirectedConverter extends ConverterBase {
  kind: 'directed';
  routes: Route[];
}

export interface EquivalenceConverter extends ConverterBase {
  kind: 'equivalence';
  /** e.g. "Prednisone-equivalent" – the common anchor, for display. */
  referenceLabel: string;
  items: EquivItem[];
  /** Display names for the keys used in `EquivItem.bySource` (e.g. primary → "Ashton"). */
  sourceLabels?: Record<string, string>;
  provenance: Provenance;
}

export interface LeddCalculator extends ConverterBase {
  kind: 'ledd';
  items: LeddItem[];
  provenance: Provenance;
}

export type FormulaId = 'vyalev' | 'duopa' | 'sheiner-tozer';

export interface FormulaInput {
  id: string;
  label: string;
  unit: string;
  hint?: string;
  /** Pre-filled value (e.g. 16 waking hours). */
  default?: string;
  optional?: boolean;
}

/** Multi-input calculator whose arithmetic lives in src/engine/formulas.ts (pinned by tests). */
export interface FormulaCalculator extends ConverterBase {
  kind: 'formula';
  formulaId: FormulaId;
  inputs: FormulaInput[];
  provenance: Provenance;
}

export type Converter = DirectedConverter | EquivalenceConverter | LeddCalculator | FormulaCalculator;

/** A research finding or deliberate omission shown on the Methods page. */
export interface Finding {
  title: string;
  text: string;
  refs: string[];
}

export interface Module {
  id: string;
  title: string;
  /** Short tag line, e.g. "Epilepsy". */
  area: string;
  summary: string;
  converters: Converter[];
}
