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
  DirectedConverter,
  EquivalenceConverter,
  EquivItem,
  FactorRoute,
  ResolvedRoute,
  TableRoute,
} from '../types';
import { append, clear, copyText, h, nextId } from './dom';
import { calloutList, sourcesBlock, tierBadge } from './evidence';
import { buildSummary } from './summary';

export interface PanelCtx {
  /** Initial parameters (from the URL) for this converter. */
  params: URLSearchParams;
  /** Persist current state into the URL. */
  setParams: (p: Record<string, string | undefined>) => void;
}

/** Validate a free-text dose and return an amount or an error message. */
function readAmount(raw: string): { amount?: number; error?: string; empty?: boolean } {
  if (raw.trim() === '') return { empty: true };
  const amount = parseAmount(raw);
  if (amount === null) return { error: 'Enter a positive number, for example 1000 or 0.5.' };
  if (amount > MAX_AMOUNT) return { error: 'That value is unrealistically large. Check the units and try again.' };
  return { amount };
}

function doseField(id: string, label: string, initial: string, onInput: () => void) {
  const unit = h('span', { class: 'unit', id: `${id}-unit` });
  const input = h('input', {
    id,
    class: 'dose-input',
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    spellcheck: 'false',
    placeholder: 'e.g. 1000',
    'aria-describedby': `${id}-unit`,
    value: initial,
    onInput,
  });
  const wrap = h(
    'div',
    { class: 'field' },
    h('label', { for: id }, label),
    h('div', { class: 'input-wrap' }, input, unit),
  );
  return { wrap, input, unit };
}

function actionRow(summary: () => string, hasResult: boolean): HTMLElement {
  return h(
    'div',
    { class: 'actions no-print' },
    h(
      'button',
      { type: 'button', class: 'btn', disabled: !hasResult, onClick: () => void copyText(summary(), 'Summary copied') },
      'Copy summary with sources',
    ),
    h(
      'button',
      { type: 'button', class: 'btn ghost', onClick: () => void copyText(window.location.href, 'Link copied') },
      'Copy link',
    ),
    h('button', { type: 'button', class: 'btn ghost', onClick: () => window.print() }, 'Print'),
  );
}

/* ================================================================== */
/* Directed converter (factor routes and label tables)                */
/* ================================================================== */

export function directedPanel(conv: DirectedConverter, ctx: PanelCtx): HTMLElement {
  const routes = resolveRoutes(conv.routes);
  const byId = new Map(routes.map((r) => [r.id, r]));
  const id = nextId('dir');

  const requested = ctx.params.get('r');
  let route: ResolvedRoute = (requested && byId.get(requested)) || routes[0];

  const select = h('select', { id: `${id}-route`, onChange: () => onRouteChange() });
  const groups = new Map<string, ResolvedRoute[]>();
  for (const r of routes) groups.set(r.group, [...(groups.get(r.group) ?? []), r]);
  for (const [g, list] of groups) {
    select.appendChild(
      h('optgroup', { label: g }, list.map((r) => h('option', { value: r.id }, r.label))),
    );
  }
  select.value = route.id;

  const dose = doseField(`${id}-dose`, 'Dose to convert', ctx.params.get('d') ?? '', () => render());
  const result = h('div', { class: 'result', 'aria-live': 'polite' });

  function onRouteChange(): void {
    route = byId.get(select.value) ?? routes[0];
    render();
  }

  function persist(amountRaw: string): void {
    ctx.setParams({ c: conv.id, r: route.id, d: amountRaw.trim() || undefined });
  }

  function render(): void {
    dose.unit.textContent = route.fromUnit;
    persist(dose.input.value);
    const read = readAmount(dose.input.value);
    clear(result);

    if (read.empty) {
      result.appendChild(h('p', { class: 'hint' }, 'Enter a dose above to see the conversion.'));
      append(result, [routeDetails(route, undefined)]);
      return;
    }
    if (read.error || read.amount === undefined) {
      result.appendChild(h('p', { class: 'error', role: 'alert' }, read.error));
      return;
    }
    append(result, [route.kind === 'factor' ? factorResult(conv, route, read.amount) : tableResult(conv, route, read.amount)]);
  }

  const panel = h(
    'div',
    { class: 'panel' },
    h('div', { class: 'field' }, h('label', { for: `${id}-route` }, 'Conversion'), select),
    h('p', { class: 'basis' }, h('strong', null, 'Enter: '), conv.doseBasis),
    dose.wrap,
    result,
  );
  render();
  return panel;
}

function routeDetails(route: ResolvedRoute, matchedRow?: number): HTMLElement {
  const wrap = h('div', { class: 'details-block' });
  append(wrap, [
    h('div', { class: 'evidence-row' }, tierBadge(route.provenance.tier, route.provenance.derived)),
    calloutList(route.callouts),
  ]);
  if (route.kind === 'table') append(wrap, [tableBlock(route, matchedRow)]);
  append(wrap, [sourcesBlock(route.provenance)]);
  return wrap;
}

function tableBlock(route: TableRoute, matched?: number): HTMLElement {
  return h(
    'details',
    { class: 'table-details', open: matched === undefined },
    h('summary', null, 'Full label table'),
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

function factorResult(conv: DirectedConverter, route: FactorRoute & { isReverse?: boolean }, amount: number): HTMLElement {
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
      lines: [`Input: ${formatAmount(amount)} ${route.fromUnit}`, `Result: ${toText}`, ...(res.typical !== undefined && isRange ? [`Typical: ${formatAmount(res.typical)} ${route.toUnit}`] : []), `Calculation: ${mathLines.join('; ')}`],
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
      h('p', { class: 'result-label' }, route.label),
      h('p', { class: 'result-value', 'data-testid': 'result-value' }, toText),
      isRange && res.typical !== undefined
        ? h('p', { class: 'result-sub' }, `Source-named typical value: ${formatAmount(res.typical)} ${route.toUnit}`)
        : null,
      isRange ? h('p', { class: 'result-sub' }, 'This is a range: the sources do not support a single exact figure.') : null,
      h('p', { class: 'result-sub' }, `from ${formatAmount(amount)} ${route.fromUnit}`),
      h('details', { class: 'math' }, h('summary', null, 'Show the math'), h('pre', null, mathLines.join('\n'))),
    ),
    routeDetails(route),
    actionRow(summaryText, true),
  );
}

function tableResult(conv: DirectedConverter, route: TableRoute, amount: number): HTMLElement {
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
      h('p', { class: 'result-label' }, route.label),
      h('p', { class: 'result-value small', 'data-testid': 'result-value' }, look.match.to),
      look.match.note ? h('p', { class: 'result-sub' }, look.match.note) : null,
      h('p', { class: 'result-sub' }, `for ${formatAmount(amount)} ${route.fromUnit}`),
    );
  } else {
    const near = (row?: TableRoute['rows'][number]) => (row ? `${rowRangeLabel(row)} → ${row.to}` : null);
    main = h(
      'div',
      { class: 'result-card none' },
      h('p', { class: 'result-label' }, route.label),
      h('p', { class: 'result-value small', 'data-testid': 'result-value' }, 'No label-defined conversion for this dose'),
      h(
        'p',
        { class: 'result-sub' },
        `${formatAmount(amount)} ${route.fromUnit} is not covered by the table. Do not interpolate: follow the label or clinical judgement.`,
      ),
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

  return h('div', null, main, routeDetails(route, matchIdx), actionRow(summaryText, true));
}

/* ================================================================== */
/* Equivalence converter (steroids, benzodiazepines, botulinum, DA)   */
/* ================================================================== */

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

  const fromId = ctx.params.get('f') && byId.has(ctx.params.get('f') as string) ? (ctx.params.get('f') as string) : items[0].id;
  let toId = ctx.params.get('t') && byId.has(ctx.params.get('t') as string) ? (ctx.params.get('t') as string) : (items.find((i) => i.id !== fromId) ?? items[0]).id;

  const fromSel = mkSelect(`${id}-from`, fromId, () => render());
  const toSel = mkSelect(`${id}-to`, toId, () => {
    toId = toSel.value;
    render();
  });
  const dose = doseField(`${id}-dose`, 'Dose to convert', ctx.params.get('d') ?? '', () => render());
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
        toId = toSel.value;
        render();
      },
    },
    '⇄',
  );

  function render(): void {
    const from = byId.get(fromSel.value) as EquivItem;
    const to = byId.get(toSel.value) as EquivItem;
    dose.unit.textContent = from.unit;
    ctx.setParams({ c: conv.id, f: from.id, t: to.id, d: dose.input.value.trim() || undefined });
    clear(result);

    const read = readAmount(dose.input.value);
    if (read.empty) {
      result.appendChild(h('p', { class: 'hint' }, 'Enter a dose above to see the equivalent doses.'));
      append(result, [equivDetails(conv, from, to, undefined)]);
      return;
    }
    if (read.error || read.amount === undefined) {
      result.appendChild(h('p', { class: 'error', role: 'alert' }, read.error));
      return;
    }
    append(result, [equivResult(conv, from, to, read.amount)]);
  }

  const panel = h(
    'div',
    { class: 'panel' },
    h('p', { class: 'basis' }, h('strong', null, 'Enter: '), conv.doseBasis, ` All agents are defined relative to ${conv.referenceLabel}.`),
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
  render();
  return panel;
}

function equivDetails(conv: EquivalenceConverter, from: EquivItem, to: EquivItem, amount?: number): HTMLElement {
  const wrap = h('div', { class: 'details-block' });
  const notes = [from, to]
    .filter((i, idx, arr) => i.note && arr.indexOf(i) === idx)
    .map((i) => h('li', null, h('strong', null, `${i.name}: `), i.note));
  append(wrap, [
    h('div', { class: 'evidence-row' }, tierBadge(conv.provenance.tier, conv.provenance.derived)),
    notes.length ? h('ul', { class: 'item-notes' }, notes) : null,
  ]);
  append(wrap, [allEquivalents(conv, from, to, amount)]);
  append(wrap, [sourcesBlock(conv.provenance, conv.refs)]);
  return wrap;
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
    'details',
    { class: 'table-details' },
    h('summary', null, shown ? `All equivalents of ${formatAmount(amount)} ${from.unit} ${from.name}` : `Equivalence table (per ${conv.referenceLabel})`),
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

function equivResult(conv: EquivalenceConverter, from: EquivItem, to: EquivItem, amount: number): HTMLElement {
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
      h('p', { class: 'result-label' }, label),
      h('p', { class: 'result-value', 'data-testid': 'result-value' }, text),
      from.id === to.id ? h('p', { class: 'result-sub' }, 'Same agent selected: the dose is unchanged.') : null,
      isRange && res.typical !== undefined
        ? h('p', { class: 'result-sub' }, `Source-named typical value: ${formatAmount(res.typical)} ${to.unit}`)
        : null,
      isRange ? h('p', { class: 'result-sub' }, 'This is a range: the sources do not support a single exact figure.') : null,
      h('p', { class: 'result-sub' }, `approximate equivalent of ${formatAmount(amount)} ${from.unit} ${from.name}`),
      h('details', { class: 'math' }, h('summary', null, 'Show the math'), h('pre', null, math.join('\n'))),
    ),
    equivDetails(conv, from, to, amount),
    actionRow(summaryText, true),
  );
}
