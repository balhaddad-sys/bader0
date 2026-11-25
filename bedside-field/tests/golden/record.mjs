// Records snapshot.json from the app in web/js (run once on the version whose behaviour must be kept).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCases } from './cases.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const js = process.env.BF_JS ? path.resolve(process.env.BF_JS) : path.join(root, 'web/js');
const snap = await runCases(js, { sessionsDir: path.join(root, 'tests/fixtures/sessions') });
fs.writeFileSync(path.join(root, 'tests/golden/snapshot.json'), JSON.stringify(snap, null, 1));
console.log('snapshot recorded from', js, `(${Object.keys(snap).length} groups)`);
