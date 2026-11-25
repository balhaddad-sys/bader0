// Behaviour lock: every pure module must reproduce the outputs recorded from Bedside Field 1.4.0.6
// (tests/golden/snapshot.json) on the same deterministic inputs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCases } from '../golden/cases.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'tests/golden/snapshot.json'), 'utf8'));
const actual = await runCases(path.join(root, 'web/js'), { sessionsDir: path.join(root, 'tests/fixtures/sessions') });

for (const group of Object.keys(snapshot)) {
  test(`golden: ${group} unchanged`, () => assert.deepStrictEqual(actual[group], snapshot[group]));
}
test('golden: no new or missing groups', () => assert.deepStrictEqual(Object.keys(actual).sort(), Object.keys(snapshot).sort()));
