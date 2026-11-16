import { computeLedd, type LeddEntry } from '../engine/ledd';
import { formatAmount } from '../engine/format';
import { MAX_AMOUNT } from '../engine/convert';
import type { LeddCalculator, LeddItem } from '../types';
import { append, clear, copyText, h, nextId } from './dom';
import { sourcesBlock, tierBadge } from './evidence';
import { buildSummary } from './summary';
import type { PanelCtx } from './panels';

interface Row {
  key: number;
  itemId: string;
  /** Raw text of each dose input (one per component). */
  values: string[];
}

function componentCount(item: LeddItem): number {
  return item.kind === 'multi' ? (item.components?.length ?? 1) : 1;
}

/** URL encoding: `itemId:v1|v2,itemId:v`. */
function encodeRows(rows: Row[]): string | undefined {
  const s = rows
    .filter((r) => r.values.some((v) => v.trim() !== ''))
    .map((r) => `${r.itemId}:${r.values.map((v) => v.trim()).join('|')}`)
    .join(',');
  return s || undefined;
}

function decodeRows(raw: string | null, items: Map<string, LeddItem>): Row[] {
  if (!raw) return [];
  const rows: Row[] = [];
  let key = 0;
  for (const part of raw.split(',')) {
    const [itemId, vals] = part.split(':');
    const item = items.get(itemId);
    if (!item) continue;
    const values = (vals ?? '').split('|');
    const n = componentCount(item);
    while (values.length < n) values.push('');
    rows.push({ key: key++, itemId, values: values.slice(0, n) });
  }
  return rows;
}

/** Example regimen for the "Load example" button (Jost 2023 factors). */
const EXAMPLE: Row[] = [
  { key: 0, itemId: 'ld-ir', values: ['600'] },
  { key: 1, itemId: 'comt-ent', values: ['800'] },
  { key: 2, itemId: 'pramipexole-salt', values: ['1.5'] },
  { key: 3, itemId: 'rasagiline', values: ['1'] },
];

export function leddPanel(conv: LeddCalculator, ctx: PanelCtx): HTMLElement {
  const id = nextId('ledd');
  const items = new Map(conv.items.map((i) => [i.id, i]));
  let rows: Row[] = decodeRows(ctx.params.get('e'), items);
  let nextKey = rows.length + 100;
  if (rows.length === 0) rows = [{ key: nextKey++, itemId: conv.items[0].id, values: [''] }];

  const rowsHost = h('div', { class: 'ledd-rows' });
  const resultHost = h('div', { class: 'result', 'aria-live': 'polite' });

  function optionGroups(): HTMLElement[] {
    const groups = new Map<string, LeddItem[]>();
    for (const i of conv.items) groups.set(i.group, [...(groups.get(i.group) ?? []), i]);
    return [...groups].map(([g, list]) =>
      h('optgroup', { label: g }, list.map((i) => h('option', { value: i.id }, i.name))),
    );
  }

  function buildRow(row: Row): HTMLElement {
    const item = items.get(row.itemId) as LeddItem;
    const sel = h('select', { 'aria-label': 'Agent', class: 'agent-select' }, optionGroups());
    sel.value = row.itemId;
    sel.addEventListener('change', () => {
      row.itemId = sel.value;
      row.values = Array.from({ length: componentCount(items.get(row.itemId) as LeddItem) }, () => '');
      renderRows();
      update();
    });

    const doseInputs = row.values.map((v, idx) => {
      const comp = item.kind === 'multi' ? item.components?.[idx] : undefined;
      const inputId = `${id}-r${row.key}-${idx}`;
      const input = h('input', {
        id: inputId,
        class: 'dose-input',
        type: 'text',
        inputmode: 'decimal',
        autocomplete: 'off',
        spellcheck: 'false',
        placeholder: item.kind === 'comt' || item.kind === 'istradefylline' ? 'dose > 0' : '0',
        value: v,
        'aria-label': comp ? `${comp.label} (${item.unit})` : `Dose in ${item.unit}`,
        onInput: (e: Event) => {
          row.values[idx] = (e.target as HTMLInputElement).value;
          update();
        },
      });
      return h(
        'div',
        { class: 'dose-cell' },
        comp ? h('span', { class: 'comp-label' }, comp.label) : null,
        h('div', { class: 'input-wrap' }, input, h('span', { class: 'unit' }, item.unit)),
      );
    });

    return h(
      'div',
      { class: 'ledd-row', dataset: { row: String(row.key) } },
      h('div', { class: 'ledd-agent' }, sel, item.note ? h('p', { class: 'row-help' }, item.note) : null),
      h('div', { class: 'ledd-doses' }, doseInputs),
      h(
        'button',
        {
          type: 'button',
          class: 'btn ghost icon-btn no-print',
          'aria-label': `Remove ${item.name}`,
          title: 'Remove this agent',
          onClick: () => {
            rows = rows.filter((r) => r.key !== row.key);
            if (rows.length === 0) rows = [{ key: nextKey++, itemId: conv.items[0].id, values: [''] }];
            renderRows();
            update();
          },
        },
        '✕',
      ),
    );
  }

  function renderRows(): void {
    clear(rowsHost);
    append(rowsHost, rows.map(buildRow));
  }

  function toEntries(): { entries: LeddEntry[]; invalid: string[] } {
    const entries: LeddEntry[] = [];
    const invalid: string[] = [];
    for (const r of rows) {
      const item = items.get(r.itemId) as LeddItem;
      const nums: number[] = [];
      let touched = false;
      let bad = false;
      for (const raw of r.values) {
        const t = raw.trim().replace(/,/g, '');
        if (t === '') {
          nums.push(0);
          continue;
        }
        touched = true;
        if (!/^\d*\.?\d+$|^\d+\.$/.test(t) || Number(t) > MAX_AMOUNT) {
          bad = true;
          break;
        }
        nums.push(Number(t));
      }
      if (bad) invalid.push(`${item.name}: enter a number of 0 or more (for example 600 or 1.5).`);
      else if (touched) entries.push({ itemId: r.itemId, values: nums });
    }
    return { entries, invalid };
  }

  function update(): void {
    ctx.setParams({ c: conv.id, e: encodeRows(rows) });
    clear(resultHost);
    const { entries, invalid } = toEntries();
    const calc = computeLedd(conv.items, entries);
    const errors = [...invalid, ...calc.errors];

    if (entries.length === 0 && invalid.length === 0) {
      resultHost.appendChild(h('p', { class: 'hint' }, 'Enter daily doses above to calculate the total LEDD.'));
    } else if (errors.length > 0) {
      resultHost.appendChild(
        h('div', { class: 'callout warning', role: 'alert' }, h('span', { class: 'callout-label' }, 'Fix to continue'), h('ul', null, errors.map((e) => h('li', null, e)))),
      );
    }

    if (calc.total !== null && entries.length > 0) {
      const totalText = `${formatAmount(calc.total)} mg`;
      const lines = calc.lines.map((l) => `${l.name}: ${l.formula} = ${formatAmount(l.led)} mg`);
      const summaryText = () =>
        buildSummary({
          converterTitle: conv.title,
          ruleLabel: 'Total levodopa equivalent daily dose',
          lines: [`Total LEDD: ${totalText}`, ...lines],
          tier: conv.provenance.tier,
          locator: conv.provenance.locator,
          callouts: conv.callouts,
          refs: [...conv.provenance.refs, ...conv.refs],
        });

      append(resultHost, [
        h(
          'div',
          { class: 'result-card' },
          h('p', { class: 'result-label' }, 'Total levodopa equivalent daily dose'),
          h('p', { class: 'result-value', 'data-testid': 'result-value' }, totalText),
          h('p', { class: 'result-sub' }, 'A research-scale comparison figure, not a prescription.'),
        ),
        h(
          'div',
          { class: 'table-scroll' },
          h(
            'table',
            { class: 'data-table' },
            h('thead', null, h('tr', null, h('th', null, 'Agent'), h('th', null, 'Calculation'), h('th', { class: 'num' }, 'LED (mg)'))),
            h(
              'tbody',
              null,
              calc.lines.map((l) => h('tr', null, h('td', null, l.name), h('td', null, l.formula), h('td', { class: 'num' }, formatAmount(l.led)))),
              h('tr', { class: 'total' }, h('td', { colspan: '2' }, 'Total'), h('td', { class: 'num' }, formatAmount(calc.total))),
            ),
          ),
        ),
        h(
          'div',
          { class: 'actions no-print' },
          h('button', { type: 'button', class: 'btn', onClick: () => void copyText(summaryText(), 'Summary copied') }, 'Copy summary with sources'),
          h('button', { type: 'button', class: 'btn ghost', onClick: () => void copyText(window.location.href, 'Link copied') }, 'Copy link'),
          h('button', { type: 'button', class: 'btn ghost', onClick: () => window.print() }, 'Print'),
        ),
      ]);
    }

    if (calc.warnings.length > 0) {
      append(resultHost, [
        h('div', { class: 'callout warning' }, h('span', { class: 'callout-label' }, 'Check'), h('ul', null, calc.warnings.map((w) => h('li', null, w)))),
      ]);
    }
  }

  const addBtn = h(
    'button',
    {
      type: 'button',
      class: 'btn',
      onClick: () => {
        const used = new Set(rows.map((r) => r.itemId));
        const next = conv.items.find((i) => !used.has(i.id)) ?? conv.items[0];
        rows.push({ key: nextKey++, itemId: next.id, values: Array.from({ length: componentCount(next) }, () => '') });
        renderRows();
        update();
      },
    },
    '+ Add agent',
  );
  const exampleBtn = h(
    'button',
    {
      type: 'button',
      class: 'btn ghost',
      onClick: () => {
        rows = EXAMPLE.map((r) => ({ ...r, values: [...r.values], key: nextKey++ }));
        renderRows();
        update();
      },
    },
    'Load example',
  );
  const clearBtn = h(
    'button',
    {
      type: 'button',
      class: 'btn ghost',
      onClick: () => {
        rows = [{ key: nextKey++, itemId: conv.items[0].id, values: [''] }];
        renderRows();
        update();
      },
    },
    'Clear all',
  );

  const panel = h(
    'div',
    { class: 'panel' },
    h('p', { class: 'basis' }, h('strong', null, 'Enter: '), conv.doseBasis, ' Leave a dose blank (or 0) for agents the patient does not take.'),
    rowsHost,
    h('div', { class: 'actions no-print' }, addBtn, exampleBtn, clearBtn),
    resultHost,
    h('div', { class: 'details-block' }, h('div', { class: 'evidence-row' }, tierBadge(conv.provenance.tier)), sourcesBlock(conv.provenance, conv.refs)),
  );
  renderRows();
  update();
  return panel;
}
