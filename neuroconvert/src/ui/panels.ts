import {
  applyFactor,
  convertEquivalence,
  equivalentsOf,
  lookupTable,
  MAX_AMOUNT,
  parseAmount,
  resolveRoutes,
  typicalOf,
} from '../engine/convert';
import { formatAmount, formatFactor, formatRange } from '../engine/format';
import type {
  Callout,
  DirectedConverter,
  EquivalenceConverter,
  EquivItem,
  FactorRoute,
  Provenance,
  ResolvedRoute,
  TableRoute,
} from '../types';
import { append, clear, copyText, h, nextId, type Child } from './dom';
import { calloutList, sourcesBlock, tierBadge, TIERS } from './evidence';
import { buildSummary } from './summary';

export interface PanelCtx {
  /** Initial parameters (from the URL) for this converter. */
  params: URLSearchParams;
  /** Persist current state into the URL. */
  setParams: (p: Record<string, string | undefined>) => void;
  /** Converter-level caution, rendered fresh under each answer (not above the inputs). */
  caution?: (routeHasLead?: boolean) => (HTMLElement | null)[];
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

/** Validate a free-text dose and return an amount or an error message. */
function readAmount(raw: string): { amount?: number; error?: string; empty?: boolean } {
  if (raw.trim() === '') return { empty: true };
  const amount = parseAmount(raw);
  if (amount === null) return { error: 'Enter a positive number, for example 1000 or 0.5.' };
  if (amount > MAX_AMOUNT) return { error: 'That value is unrealistically large. Check the units and try again.' };
  return { amount };
}

function doseField(id: string, hint: string, initial: string, onInput: () => void) {
  const unit = h('span', { class: 'unit', id: `${id}-unit` });
  const input = h('input', {
    id,
    class: 'dose-input',
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    spellcheck: 'false',
    placeholder: 'Type the dose',
    'aria-describedby': `${id}-unit ${id}-hint`,
    value: initial,
    onInput,
  });
  const wrap = h(
    'div',
    { class: 'field' },
    h('label', { for: id }, 'Your dose'),
    h('div', { class: 'input-wrap' }, input, unit),
    h('p', { class: 'field-hint', id: `${id}-hint` }, hint),
  );
  return { wrap, input, unit };
}

/** Radio buttons styled as a segmented control (native keyboard behaviour). */
export function segmented(
  legend: string,
  options: { value: string; label: string }[],
  value: string,
  onChange: (v: string) => void,
  cls = '',
): HTMLElement {
  const name = nextId('seg');
  const row = h('div', { class: 'seg-row' });
  for (const o of options) {
    const id = nextId('seg-o');
    row.append(
      h('input', { type: 'radio', name, id, value: o.value, checked: o.value === value, onChange: () => onChange(o.value) }),
      h('label', { for: id }, o.label),
    );
  }
  return h('fieldset', { class: `segmented ${cls}` }, h('legend', null, legend), row);
}

/** First warning (shown in full next to the answer) and everything else (kept in Details). */
export function splitCallouts(callouts: Callout[]): { lead: Callout | null; rest: Callout[] } {
  const i = callouts.findIndex((c) => c.kind === 'warning');
  if (i < 0) return { lead: null, rest: callouts };
  return { lead: callouts[i], rest: callouts.filter((_, k) => k !== i) };
}

export function leadWarning(c: Callout | null): HTMLElement | null {
  if (!c) return null;
  return h(
    'div',
    { class: 'callout warning lead', role: 'note' },
    h('span', { class: 'callout-label' }, 'Caution'),
    h('p', null, c.text),
  );
}

/** Everything secondary, collapsed: evidence, remaining cautions, workings, sources. */
export function detailsPanel(o: { provenance: Provenance; refs?: string[]; rest: Callout[]; blocks?: Child[] }): HTMLElement {
  const more = o.rest.filter((c) => c.kind === 'warning').length;
  return h(
    'details',
    { class: 'more' },
    h(
      'summary',
      null,
      'Details, cautions & sources',
      more > 0 ? h('span', { class: 'more-count' }, `${more} more caution${more > 1 ? 's' : ''}`) : null,
    ),
    h(
      'div',
      { class: 'more-body' },
      h(
        'div',
        { class: 'evidence-row' },
        tierBadge(o.provenance.tier, o.provenance.derived),
        h('span', { class: 'tier-blurb' }, TIERS[o.provenance.tier].blurb),
      ),
      calloutList(o.rest),
      ...(o.blocks ?? []),
      sourcesBlock(o.provenance, o.refs ?? []),
      h(
        'div',
        { class: 'actions no-print' },
        h('button', { type: 'button', class: 'btn ghost', onClick: () => void copyText(window.location.href, 'Link copied') }, 'Copy link'),
        h('button', { type: 'button', class: 'btn ghost', onClick: () => window.print() }, 'Print'),
      ),
    ),
  );
}

export function copyButton(summary: () => string): HTMLElement {
  return h(
    'button',
    { type: 'button', class: 'btn copy no-print', onClick: () => void copyText(summary(), 'Copied with sources') },
    'Copy answer & sources',
  );
}

function mathBlock(lines: string[]): HTMLElement {
  return h('details', { class: 'math' }, h('summary', null, 'Show the math'), h('pre', null, lines.join('\n')));
}

/* ------------------------------------------------------------------ */
/* Directed converter: drug → switch → dose                            */
/* ------------------------------------------------------------------ */

function shortLabel(r: ResolvedRoute): string {
  const prefix = `${r.group}: `;
  return r.label.startsWith(prefix) ? r.label.slice(prefix.length) : r.label;
}

export function directedPanel(conv: DirectedConverter, ctx: PanelCtx): HTMLElement {
  const routes = resolveRoutes(conv.routes);
  const byId = new Map(routes.map((r) => [r.id, r]));
  const groups = new Map<string, ResolvedRoute[]>();
  for (const r of routes) groups.set(r.group, [...(groups.get(r.group) ?? []), r]);

  const requested = ctx.params.get('r');
  let route: ResolvedRoute = (requested && byId.get(requested)) || routes[0];
  const id = nextId('dir');

  const drugSel = h('select', { id: `${id}-drug`, onChange: () => onDrugChange() });
  for (const g of groups.keys()) drugSel.appendChild(h('option', { value: g }, g));
  drugSel.value = route.group;

  const switchHost = h('div', { class: 'switch-host' });
  const dose = doseField(`${id}-dose`, conv.doseBasis, ctx.params.get('d') ?? '', () => render(true));
  const result = h('div', { class: 'result', 'aria-live': 'polite' });

  function renderSwitch(): void {
    clear(switchHost);
    const options = groups.get(route.group) ?? [];
    if (options.length === 1) {
      switchHost.appendChild(h('p', { class: 'switch-static' }, h('strong', null, 'Switch: '), shortLabel(options[0])));
      return;
    }
    switchHost.appendChild(
      segmented(
        'Switch',
        options.map((r) => ({ value: r.id, label: shortLabel(r) })),
        route.id,
        (v) => {
          route = byId.get(v) ?? route;
          render(true);
        },
      ),
    );
  }

  function onDrugChange(): void {
    const first = groups.get(drugSel.value)?.[0];
    if (first) route = first;
    renderSwitch();
    render(true);
  }

  function render(fromUser: boolean): void {
    dose.unit.textContent = route.fromUnit;
    if (fromUser) ctx.setParams({ c: conv.id, r: route.id, d: dose.input.value.trim() || undefined });
    clear(result);

    const read = readAmount(dose.input.value);
    if (read.empty) {
      result.appendChild(h('p', { class: 'hint' }, 'Type your dose above to see the answer.'));
      append(result, [...(ctx.caution?.(splitCallouts(route.callouts).lead !== null) ?? []), routeDetails(route, undefined)]);
      return;
    }
    if (read.error || read.amount === undefined) {
      result.appendChild(h('p', { class: 'error', role: 'alert' }, read.error));
      return;
    }
    const cautions = ctx.caution?.(splitCallouts(route.callouts).lead !== null) ?? [];
    append(result, [route.kind === 'factor' ? factorResult(conv, route, read.amount, cautions) : tableResult(conv, route, read.amount, cautions)]);
  }

  const panel = h(
    'div',
    { class: 'panel' },
    h('div', { class: 'field' }, h('label', { for: `${id}-drug` }, 'Drug'), drugSel),
    switchHost,
    dose.wrap,
    result,
  );
  renderSwitch();
  render(false);
  return panel;
}

function routeDetails(route: ResolvedRoute, matchedRow?: number, extraBlocks: Child[] = []): HTMLElement {
  const { rest } = splitCallouts(route.callouts);
  const blocks: Child[] = [...extraBlocks];
  if (route.kind === 'table') blocks.push(tableBlock(route, matchedRow));
  return h(
    'div',
    { class: 'after-result' },
    leadWarning(splitCallouts(route.callouts).lead),
    detailsPanel({ provenance: route.provenance, rest, blocks }),
  );
}

function tableBlock(route: TableRoute, matched?: number): HTMLElement {
  return h(
    'div',
    { class: 'table-block' },
    h('h4', null, 'Full label table'),
    h(
      'div',
      { class: 'table-scroll' },
      h(
        'table',
        { class: 'data-table' },
        h('thead', null, h('tr', null, h('th', null, `Current dose (${route.fromUnit})`), h('th', null, `Converts to (${route.toUnit})`))),
        h(
          'tbody',
          null,
          route.rows.map((row, i) =>
            h(
              'tr',
              { class: i === matched ? 'match' : '', 'aria-current': i === matched ? 'true' : undefined },
              h('td', null, rowRangeLabel(row)),
              h('td', null, row.to, row.note ? h('span', { class: 'row-note' }, row.note) : null),
            ),
          ),
        ),
      ),
    ),
    route.tableNote ? h('p', { class: 'table-note' }, route.tableNote) : null,
  );
}

function rowRangeLabel(row: TableRoute['rows'][number]): string {
  if (row.fromLabel) return row.fromLabel;
  return row.from[0] === row.from[1]
    ? formatAmount(row.from[0])
    : `${formatAmount(row.from[0])} to ${formatAmount(row.from[1])}`;
}

function factorResult(conv: DirectedConverter, route: FactorRoute & { isReverse?: boolean }, amount: number, cautions: (HTMLElement | null)[]): HTMLElement {
  const res = applyFactor(amount, route.factor);
  const toText = formatRange(res, route.toUnit);
  const isRange = formatAmount(res.low) !== formatAmount(res.high);

  const mathLines: string[] = [];
  const f = route.factor;
  if (isRange) {
    mathLines.push(
      `Low: ${formatAmount(amount)} × ${formatFactor(f.low)} = ${formatAmount(res.low)}`,
      `High: ${formatAmount(amount)} × ${formatFactor(f.high)} = ${formatAmount(res.high)}`,
    );
    if (f.typical !== undefined && res.typical !== undefined) {
      mathLines.push(`Typical: ${formatAmount(amount)} × ${formatFactor(f.typical)} = ${formatAmount(res.typical)}`);
    }
  } else {
    mathLines.push(`${formatAmount(amount)} × ${formatFactor(f.low)} = ${formatAmount(res.low)}`);
  }

  const summaryText = () =>
    buildSummary({
      converterTitle: conv.title,
      ruleLabel: route.label,
      lines: [
        `Input: ${formatAmount(amount)} ${route.fromUnit}`,
        `Result: ${toText}`,
        ...(res.typical !== undefined && isRange ? [`Typical: ${formatAmount(res.typical)} ${route.toUnit}`] : []),
        `Calculation: ${mathLines.join('; ')}`,
      ],
      tier: route.provenance.tier,
      derived: route.provenance.derived,
      locator: route.provenance.locator,
      callouts: route.callouts,
      refs: route.provenance.refs,
    });

  return h(
    'div',
    null,
    h(
      'div',
      { class: 'result-card' },
      h('p', { class: 'result-label' }, `${formatAmount(amount)} ${route.fromUnit} → `),
      h('p', { class: 'result-value', 'data-testid': 'result-value' }, toText),
      isRange && res.typical !== undefined
        ? h('p', { class: 'result-sub' }, `Typical value named by the source: ${formatAmount(res.typical)} ${route.toUnit}`)
        : null,
      isRange ? h('p', { class: 'result-sub' }, 'A range: the sources do not support a single exact figure.') : null,
      h('div', { class: 'result-foot' }, tierBadge(route.provenance.tier, route.provenance.derived), copyButton(summaryText)),
    ),
    ...cautions,
    routeDetails(route, undefined, [mathBlock(mathLines)]),
  );
}

function tableResult(conv: DirectedConverter, route: TableRoute, amount: number, cautions: (HTMLElement | null)[]): HTMLElement {
  const look = lookupTable(amount, route);
  const matchIdx = look.match ? route.rows.indexOf(look.match) : undefined;

  const summaryText = () =>
    buildSummary({
      converterTitle: conv.title,
      ruleLabel: route.label,
      lines: [
        `Input: ${formatAmount(amount)} ${route.fromUnit}`,
        look.match ? `Label-defined conversion: ${look.match.to}` : 'No label-defined conversion for this input.',
        ...(route.tableNote ? [`Table note: ${route.tableNote}`] : []),
      ],
      tier: route.provenance.tier,
      derived: route.provenance.derived,
      locator: route.provenance.locator,
      callouts: route.callouts,
      refs: route.provenance.refs,
    });

  let main: HTMLElement;
  if (look.match) {
    main = h(
      'div',
      { class: 'result-card' },
      h('p', { class: 'result-label' }, `${formatAmount(amount)} ${route.fromUnit} → `),
      h('p', { class: 'result-value small', 'data-testid': 'result-value' }, look.match.to),
      look.match.note ? h('p', { class: 'result-sub' }, look.match.note) : null,
      h('div', { class: 'result-foot' }, tierBadge(route.provenance.tier, route.provenance.derived), copyButton(summaryText)),
    );
  } else {
    const near = (row?: TableRoute['rows'][number]) => (row ? `${rowRangeLabel(row)} → ${row.to}` : null);
    main = h(
      'div',
      { class: 'result-card none' },
      h('p', { class: 'result-label' }, `${formatAmount(amount)} ${route.fromUnit}`),
      h('p', { class: 'result-value small', 'data-testid': 'result-value' }, 'No label-defined conversion for this dose'),
      h('p', { class: 'result-sub' }, 'The table does not cover this dose. Do not interpolate: follow the label or clinical judgement.'),
      look.below || look.above
        ? h(
            'ul',
            { class: 'nearest' },
            look.below ? h('li', null, h('strong', null, 'Nearest lower entry: '), near(look.below)) : null,
            look.above ? h('li', null, h('strong', null, 'Nearest higher entry: '), near(look.above)) : null,
          )
        : null,
    );
  }

  return h('div', null, main, ...cautions, routeDetails(route, matchIdx));
}

/* ------------------------------------------------------------------ */
/* Equivalence converter: from → to → dose                             */
/* ------------------------------------------------------------------ */

export function equivalencePanel(conv: EquivalenceConverter, ctx: PanelCtx): HTMLElement {
  const id = nextId('eq');
  const byId = new Map(conv.items.map((i) => [i.id, i]));
  const items = conv.items;

  const groups = new Map<string, EquivItem[]>();
  for (const i of items) groups.set(i.group, [...(groups.get(i.group) ?? []), i]);

  const mkSelect = (selId: string, initial: string, onChange: () => void) => {
    const sel = h('select', { id: selId, onChange });
    for (const [g, list] of groups) {
      sel.appendChild(h('optgroup', { label: g }, list.map((i) => h('option', { value: i.id }, i.name))));
    }
    sel.value = initial;
    return sel;
  };

  const fromParam = ctx.params.get('f');
  const toParam = ctx.params.get('t');
  const fromId = fromParam && byId.has(fromParam) ? fromParam : items[0].id;
  const toId = toParam && byId.has(toParam) ? toParam : (items.find((i) => i.id !== fromId) ?? items[0]).id;

  const fromSel = mkSelect(`${id}-from`, fromId, () => render(true));
  const toSel = mkSelect(`${id}-to`, toId, () => render(true));
  const dose = doseField(`${id}-dose`, conv.doseBasis, ctx.params.get('d') ?? '', () => render(true));
  const result = h('div', { class: 'result', 'aria-live': 'polite' });

  const swap = h(
    'button',
    {
      type: 'button',
      class: 'btn ghost swap',
      'aria-label': 'Swap the two agents',
      title: 'Swap agents',
      onClick: () => {
        const f = fromSel.value;
        fromSel.value = toSel.value;
        toSel.value = f;
        render(true);
      },
    },
    '⇄',
  );

  function render(fromUser: boolean): void {
    const from = byId.get(fromSel.value) as EquivItem;
    const to = byId.get(toSel.value) as EquivItem;
    dose.unit.textContent = from.unit;
    if (fromUser) ctx.setParams({ c: conv.id, f: from.id, t: to.id, d: dose.input.value.trim() || undefined });
    clear(result);

    const read = readAmount(dose.input.value);
    if (read.empty) {
      result.appendChild(h('p', { class: 'hint' }, 'Type your dose above to see the answer.'));
      append(result, [...(ctx.caution?.() ?? []), equivDetails(conv, from, to, undefined)]);
      return;
    }
    if (read.error || read.amount === undefined) {
      result.appendChild(h('p', { class: 'error', role: 'alert' }, read.error));
      return;
    }
    append(result, [equivResult(conv, from, to, read.amount, ctx.caution?.() ?? [])]);
  }

  const panel = h(
    'div',
    { class: 'panel' },
    h(
      'div',
      { class: 'pair' },
      h('div', { class: 'field' }, h('label', { for: `${id}-from` }, 'From'), fromSel),
      swap,
      h('div', { class: 'field' }, h('label', { for: `${id}-to` }, 'To'), toSel),
    ),
    dose.wrap,
    result,
  );
  render(false);
  return panel;
}

function equivText(i: EquivItem): string {
  const lo = formatAmount(i.equiv.low);
  const hi = formatAmount(i.equiv.high);
  return lo === hi ? `${lo} ${i.unit}` : `${lo} – ${hi} ${i.unit}`;
}

function allEquivalents(conv: EquivalenceConverter, from: EquivItem, to: EquivItem, amount?: number): HTMLElement {
  const shown = amount !== undefined;
  const rows = shown ? equivalentsOf(amount, from, conv.items) : [];
  return h(
    'div',
    { class: 'table-block' },
    h('h4', null, shown ? `All equivalents of ${formatAmount(amount)} ${from.unit} ${from.name}` : `Equivalence table (each equal to ${conv.referenceLabel})`),
    h(
      'div',
      { class: 'table-scroll' },
      h(
        'table',
        { class: 'data-table' },
        h(
          'thead',
          null,
          h('tr', null, h('th', null, 'Agent'), h('th', null, `Equal to ${conv.referenceLabel}`), shown ? h('th', null, 'Equivalent dose') : null),
        ),
        h(
          'tbody',
          null,
          conv.items.map((i, idx) =>
            h(
              'tr',
              { class: i.id === to.id ? 'match' : i.id === from.id ? 'from' : '' },
              h('td', null, i.name),
              h('td', null, equivText(i)),
              shown ? h('td', null, formatRange(rows[idx].result, i.unit)) : null,
            ),
          ),
        ),
      ),
    ),
  );
}

function equivDetails(conv: EquivalenceConverter, from: EquivItem, to: EquivItem, amount?: number, extra: Child[] = []): HTMLElement {
  const notes = [from, to]
    .filter((i, idx, arr) => i.note && arr.indexOf(i) === idx)
    .map((i) => h('li', null, h('strong', null, `${i.name}: `), i.note));
  return h(
    'div',
    { class: 'after-result' },
    detailsPanel({
      provenance: conv.provenance,
      refs: conv.refs,
      rest: [],
      blocks: [...extra, notes.length ? h('ul', { class: 'item-notes' }, notes) : null, allEquivalents(conv, from, to, amount)],
    }),
  );
}

function equivResult(conv: EquivalenceConverter, from: EquivItem, to: EquivItem, amount: number, cautions: (HTMLElement | null)[]): HTMLElement {
  const res = convertEquivalence(amount, from, to);
  const text = formatRange(res, to.unit);
  const isRange = formatAmount(res.low) !== formatAmount(res.high);
  const fromEq = typicalOf(from.equiv);
  const toEq = typicalOf(to.equiv);

  const math: string[] = [];
  if (fromEq !== undefined && toEq !== undefined && !isRange) {
    math.push(
      `${formatAmount(amount)} × (${formatFactor(toEq)} ÷ ${formatFactor(fromEq)}) = ${formatAmount(res.low)}`,
      `where ${equivText(from)} of ${from.name} ≈ ${equivText(to)} of ${to.name} (each ≈ ${conv.referenceLabel})`,
    );
  } else {
    math.push(
      `Low:  ${formatAmount(amount)} × ${formatFactor(to.equiv.low)} ÷ ${formatFactor(from.equiv.high)} = ${formatAmount(res.low)}`,
      `High: ${formatAmount(amount)} × ${formatFactor(to.equiv.high)} ÷ ${formatFactor(from.equiv.low)} = ${formatAmount(res.high)}`,
      `Equivalents used: ${from.name} ${equivText(from)}; ${to.name} ${equivText(to)} (each ≈ ${conv.referenceLabel})`,
    );
  }

  const label = `${from.name} → ${to.name}`;
  const summaryText = () =>
    buildSummary({
      converterTitle: conv.title,
      ruleLabel: label,
      lines: [
        `Input: ${formatAmount(amount)} ${from.unit} ${from.name}`,
        `Approximate equivalent: ${text} ${to.name}`,
        ...(res.typical !== undefined && isRange ? [`Typical: ${formatAmount(res.typical)} ${to.unit}`] : []),
        ...math.map((m) => `Calculation: ${m}`),
      ],
      tier: conv.provenance.tier,
      derived: conv.provenance.derived,
      locator: conv.provenance.locator,
      callouts: conv.callouts,
      refs: [...conv.provenance.refs, ...conv.refs],
    });

  return h(
    'div',
    null,
    h(
      'div',
      { class: 'result-card' },
      h('p', { class: 'result-label' }, `${formatAmount(amount)} ${from.unit} ${from.name} ≈`),
      h('p', { class: 'result-value', 'data-testid': 'result-value' }, `${text}`),
      h('p', { class: 'result-sub' }, to.name),
      from.id === to.id ? h('p', { class: 'result-sub' }, 'Same agent selected: the dose is unchanged.') : null,
      isRange && res.typical !== undefined
        ? h('p', { class: 'result-sub' }, `Typical value named by the source: ${formatAmount(res.typical)} ${to.unit}`)
        : null,
      isRange ? h('p', { class: 'result-sub' }, 'A range: the sources do not support a single exact figure.') : null,
      h('div', { class: 'result-foot' }, tierBadge(conv.provenance.tier, conv.provenance.derived), copyButton(summaryText)),
    ),
    ...cautions,
    equivDetails(conv, from, to, amount, [mathBlock(math)]),
  );
}
