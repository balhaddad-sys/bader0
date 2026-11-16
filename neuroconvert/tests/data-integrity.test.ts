import { describe, expect, it } from 'vitest';
import { MODULES, REFERENCES, REFERENCE_MAP } from '../src/data';
import { resolveRoutes } from '../src/engine/convert';
import type { Converter, Provenance } from '../src/types';

/**
 * These tests make an untraceable or malformed conversion impossible to ship:
 * every rule needs an evidence tier and resolvable references.
 */

interface Rule {
  where: string;
  provenance: Provenance;
}

function rulesOf(c: Converter): Rule[] {
  const where = (s: string) => `${c.id} › ${s}`;
  switch (c.kind) {
    case 'directed':
      return c.routes.map((r) => ({ where: where(r.id), provenance: r.provenance }));
    case 'equivalence':
    case 'ledd':
      return [{ where: where('(set)'), provenance: c.provenance }];
  }
}

const allConverters: Converter[] = MODULES.flatMap((m) => m.converters);
const allRules: Rule[] = allConverters.flatMap(rulesOf);

describe('module structure', () => {
  it('has unique module and converter ids', () => {
    const mods = MODULES.map((m) => m.id);
    expect(new Set(mods).size).toBe(mods.length);
    const convs = allConverters.map((c) => c.id);
    expect(new Set(convs).size).toBe(convs.length);
  });

  it('has unique route / item ids within each converter', () => {
    for (const c of allConverters) {
      const ids =
        c.kind === 'directed' ? c.routes.map((r) => r.id) : c.items.map((i) => i.id);
      expect(new Set(ids).size, `${c.id} has duplicate ids`).toBe(ids.length);
    }
  });

  it('gives every module, converter and rule human-readable text', () => {
    for (const m of MODULES) {
      expect(m.title.length).toBeGreaterThan(2);
      expect(m.summary.length).toBeGreaterThan(10);
      for (const c of m.converters) {
        expect(c.title.length).toBeGreaterThan(2);
        expect(c.doseBasis.length).toBeGreaterThan(5);
      }
    }
  });
});

describe('provenance', () => {
  it('assigns an evidence tier and at least one reference to every rule', () => {
    expect(allRules.length).toBeGreaterThanOrEqual(30);
    for (const r of allRules) {
      expect(['A', 'B', 'C', 'D'], r.where).toContain(r.provenance.tier);
      expect(r.provenance.refs.length, `${r.where} has no references`).toBeGreaterThan(0);
    }
  });

  it('only cites references that exist in the registry', () => {
    const cited = new Set<string>();
    for (const c of allConverters) {
      c.refs.forEach((id) => cited.add(id));
      rulesOf(c).forEach((r) => r.provenance.refs.forEach((id) => cited.add(id)));
    }
    for (const id of cited) expect(REFERENCE_MAP.has(id), `unknown reference "${id}"`).toBe(true);
  });

  it('cites every reference in the registry at least once (no orphan citations)', () => {
    const cited = new Set<string>();
    for (const c of allConverters) {
      c.refs.forEach((id) => cited.add(id));
      rulesOf(c).forEach((r) => r.provenance.refs.forEach((id) => cited.add(id)));
    }
    const orphans = REFERENCES.filter((r) => !cited.has(r.id)).map((r) => r.id);
    expect(orphans).toEqual([]);
  });

  it('tier A rules cite at least one prescribing-information (label) reference', () => {
    for (const r of allRules.filter((x) => x.provenance.tier === 'A')) {
      const hasLabel = r.provenance.refs.some((id) => REFERENCE_MAP.get(id)?.kind === 'label');
      expect(hasLabel, `${r.where}: tier A needs a label reference`).toBe(true);
    }
  });

  it('flags a rule as derived when it is not stated verbatim by its source', () => {
    // Reverse routes are derived unless the source states the reverse direction.
    for (const c of allConverters) {
      if (c.kind !== 'directed') continue;
      for (const r of resolveRoutes(c.routes)) {
        if ((r as { isReverse?: boolean }).isReverse) {
          const original = c.routes.find((x) => `${x.id}~rev` === r.id);
          if (original?.kind === 'factor' && !original.reverseStated) {
            expect(r.provenance.derived, r.id).toBe(true);
          }
        }
      }
    }
  });
});

describe('reference registry', () => {
  it('has unique ids', () => {
    const ids = REFERENCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every article a PMID and DOI, and a citation containing both', () => {
    for (const r of REFERENCES.filter((x) => x.kind === 'article')) {
      expect(r.pmid, `${r.id} pmid`).toMatch(/^\d{5,9}$/);
      expect(r.doi, `${r.id} doi`).toMatch(/^10\.\d{4,9}\//);
      expect(r.citation, `${r.id} citation`).toContain(r.doi as string);
    }
  });

  it('has no duplicate PMIDs', () => {
    const pm = REFERENCES.filter((r) => r.pmid).map((r) => r.pmid);
    expect(new Set(pm).size).toBe(pm.length);
  });

  it('gives every label a DailyMed set ID, a matching URL and a version date in the citation', () => {
    for (const r of REFERENCES.filter((x) => x.kind === 'label')) {
      expect(r.setId, r.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(r.url, r.id).toContain(r.setId as string);
      expect(r.citation, r.id).toMatch(/label version dated \d{1,2} [A-Z][a-z]{2} \d{4}/);
    }
  });

  it('records the date each source was accessed', () => {
    for (const r of REFERENCES) expect(r.accessed, r.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('numeric sanity', () => {
  it('has strictly positive, ordered factors on every factor route', () => {
    for (const c of allConverters) {
      if (c.kind !== 'directed') continue;
      for (const r of resolveRoutes(c.routes)) {
        if (r.kind !== 'factor') continue;
        expect(r.factor.low, r.id).toBeGreaterThan(0);
        expect(r.factor.high, r.id).toBeGreaterThanOrEqual(r.factor.low);
        if (r.factor.typical !== undefined) {
          expect(r.factor.typical, r.id).toBeGreaterThanOrEqual(r.factor.low - 1e-9);
          expect(r.factor.typical, r.id).toBeLessThanOrEqual(r.factor.high + 1e-9);
        }
      }
    }
  });

  it('round-trips every reversible factor route to the original dose', () => {
    for (const c of allConverters) {
      if (c.kind !== 'directed') continue;
      for (const r of c.routes) {
        if (r.kind !== 'factor' || !r.reversible) continue;
        const rev = resolveRoutes([r])[1];
        if (rev.kind !== 'factor') throw new Error('reverse must be a factor route');
        expect(r.factor.low * rev.factor.high, r.id).toBeCloseTo(1, 9);
        expect(r.factor.high * rev.factor.low, r.id).toBeCloseTo(1, 9);
      }
    }
  });

  it('keeps table rows ordered, non-overlapping and non-empty', () => {
    for (const c of allConverters) {
      if (c.kind !== 'directed') continue;
      for (const r of c.routes) {
        if (r.kind !== 'table') continue;
        expect(r.rows.length, r.id).toBeGreaterThan(0);
        let prevHigh = -Infinity;
        for (const row of r.rows) {
          expect(row.from[0], `${r.id} row start`).toBeLessThanOrEqual(row.from[1]);
          expect(row.from[0], `${r.id} overlaps previous row`).toBeGreaterThan(prevHigh);
          expect(row.to.length, r.id).toBeGreaterThan(0);
          prevHigh = row.from[1];
        }
      }
    }
  });

  it('has strictly positive, ordered equivalents on every equivalence item', () => {
    for (const c of allConverters) {
      if (c.kind !== 'equivalence') continue;
      for (const i of c.items) {
        expect(i.equiv.low, `${c.id}/${i.id}`).toBeGreaterThan(0);
        expect(i.equiv.high, `${c.id}/${i.id}`).toBeGreaterThanOrEqual(i.equiv.low);
      }
    }
  });

  it('defines every LED item with the fields its kind requires', () => {
    const led = allConverters.find((c) => c.kind === 'ledd');
    if (!led || led.kind !== 'ledd') throw new Error('LEDD calculator missing');
    for (const i of led.items) {
      switch (i.kind) {
        case 'factor':
          expect(i.factor, i.id).toBeGreaterThan(0);
          break;
        case 'multi':
          expect(i.components?.length, i.id).toBeGreaterThan(1);
          break;
        case 'fixed':
          expect(i.fixedLed, i.id).toBeGreaterThan(0);
          break;
        case 'perDose':
          expect(i.ledPerDose, i.id).toBeGreaterThan(0);
          break;
        case 'comt':
        case 'istradefylline':
          expect(i.ratio, i.id).toBeGreaterThan(0);
          break;
      }
    }
  });
});

describe('safety content', () => {
  it('shows a non-interchangeability warning on every botulinum toxin conversion', () => {
    const botulinum = MODULES.find((m) => m.id === 'botulinum');
    for (const c of botulinum?.converters ?? []) {
      expect(c.callouts.some((x) => x.kind === 'warning' && /not interchangeable/i.test(x.text))).toBe(true);
    }
  });

  it('warns that LED factors are a research tool', () => {
    const led = allConverters.find((c) => c.id === 'ledd');
    expect(led?.callouts.some((x) => x.kind === 'warning' && /research tool/i.test(x.text))).toBe(true);
  });
});
