import { MAX_AMOUNT, parseDecimalInput, readingNote } from '../engine/convert';
import { computeFormula, type FormulaValues } from '../engine/formulas';
import type { FormulaCalculator } from '../types';
import { append, clear, h, nextId } from './dom';
import { answerCard, cautionsFor, commitOnDone, detailsPanel, emptyAnswer, mathBlock, type PanelCtx } from './panels';
import { buildSummary } from './summary';

/** Multi-input calculator (pump settings, albumin correction): inputs → several output rows. */
export function formulaPanel(conv: FormulaCalculator, ctx: PanelCtx): HTMLElement {
  const id = nextId('fx');

  const fields = conv.inputs.map((inp) => {
    const inputId = `${id}-${inp.id}`;
    const reading = h('p', { class: 'field-hint reading', 'aria-live': 'polite' });
    const input = h('input', {
      id: inputId,
      class: 'dose-input',
      type: 'text',
      inputmode: 'decimal',
      enterkeyhint: 'done',
      autocomplete: 'off',
      spellcheck: 'false',
      placeholder: inp.optional ? 'optional' : 'Type the number',
      'aria-describedby': inp.hint ? `${inputId}-hint` : undefined,
      value: ctx.params.get(inp.id) ?? inp.default ?? '',
      onInput: () => render(true),
    });
    const wrap = h(
      'div',
      { class: 'field' },
      h('label', { for: inputId, class: 'step-label' }, inp.label, inp.optional ? h('span', { class: 'optional' }, ' (optional)') : null),
      h('div', { class: 'input-wrap' }, input, h('span', { class: 'unit' }, inp.unit)),
      reading,
      inp.hint ? h('p', { class: 'field-hint', id: `${inputId}-hint` }, inp.hint) : null,
    );
    return { inp, input, reading, wrap };
  });

  const result = h('div', { class: 'answer', 'aria-live': 'polite' });

  function render(fromUser: boolean): void {
    if (fromUser) {
      const p: Record<string, string | undefined> = { c: conv.id };
      for (const f of fields) p[f.inp.id] = f.input.value.trim() || undefined;
      ctx.setParams(p);
    }
    clear(result);

    const values: FormulaValues = {};
    const invalid: string[] = [];
    const missing: string[] = [];
    for (const f of fields) {
      const raw = f.input.value;
      f.reading.textContent = '';
      if (raw.trim() === '') {
        if (!f.inp.optional) missing.push(f.inp.label);
        continue;
      }
      const n = parseDecimalInput(raw);
      if (n === null || n <= 0 || n > MAX_AMOUNT) {
        invalid.push(`${f.inp.label}: enter a positive number, for example 1000 or 0.5.`);
        continue;
      }
      values[f.inp.id] = n;
      f.reading.textContent = readingNote(raw, n) ?? '';
    }

    const cautions = cautionsFor(ctx);
    const details = (blocks: (HTMLElement | null)[] = []) => detailsPanel({ provenance: conv.provenance, refs: conv.refs, rest: cautions.rest, blocks });

    if (invalid.length > 0) {
      result.appendChild(h('div', { class: 'callout warning', role: 'alert' }, h('span', { class: 'callout-label' }, 'Fix to continue'), h('ul', null, invalid.map((m) => h('li', null, m)))));
      return;
    }
    if (missing.length > 0) {
      append(result, [emptyAnswer('Fill in the numbers to see the answer.'), cautions.lead, details()]);
      return;
    }

    const out = computeFormula(conv.formulaId, values);
    if ('error' in out) {
      result.appendChild(h('p', { class: 'error', role: 'alert' }, out.error));
      return;
    }

    const [head, ...others] = out.rows;
    const summaryText = () =>
      buildSummary({
        converterTitle: conv.title,
        ruleLabel: conv.summary,
        lines: [
          ...fields.filter((f) => f.input.value.trim() !== '').map((f) => `Input: ${f.inp.label} = ${f.input.value.trim()} ${f.inp.unit}`),
          ...out.rows.map((r) => `${r.label}: ${r.value}${r.note ? ` (${r.note})` : ''}`),
          ...out.steps.map((s) => `Calculation: ${s}`),
          ...out.warnings.map((w) => `Check: ${w}`),
        ],
        tier: conv.provenance.tier,
        locator: conv.provenance.locator,
        callouts: conv.callouts,
        refs: [...conv.provenance.refs, ...conv.refs],
      });

    append(result, [
      answerCard({
        kicker: head.label,
        value: head.value,
        subs: [head.note],
        extra:
          others.length > 0
            ? h(
                'div',
                { class: 'table-scroll' },
                h(
                  'table',
                  { class: 'data-table out-rows' },
                  h(
                    'tbody',
                    null,
                    others.map((r) =>
                      h('tr', null, h('td', null, r.label, r.note ? h('span', { class: 'row-note' }, r.note) : null), h('td', { class: 'num strong' }, r.value)),
                    ),
                  ),
                ),
              )
            : null,
        tier: conv.provenance.tier,
        derived: conv.provenance.derived,
        summary: summaryText,
      }),
      out.warnings.length > 0
        ? h('div', { class: 'callout warning', role: 'alert' }, h('span', { class: 'callout-label' }, 'Check'), h('ul', null, out.warnings.map((w) => h('li', null, w))))
        : null,
      cautions.lead,
      details([mathBlock(out.steps)]),
    ]);
  }

  const panel = h('div', { class: 'workspace' }, h('div', { class: 'inputs card' }, ...fields.map((f) => f.wrap)), result);
  for (const fld of fields) commitOnDone(fld.input, result);
  render(false);
  return panel;
}
