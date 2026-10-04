// SPDX-License-Identifier: Apache-2.0
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const permissive = new Set(['Apache-2.0', 'MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'BlueOak-1.0.0', 'Unlicense']);
const upstream = new Set(['@midnight-ntwrk/ledger-v8', '@midnight-ntwrk/onchain-runtime-v3', '@midnight-ntwrk/zkir-v2']);
const records = [];
const excludedOptional = [];
const failures = [];
for (const [path, metadata] of Object.entries(lock.packages)) {
  if (!path.startsWith('node_modules/')) continue;
  const file = resolve(path, 'package.json');
  try { await access(file); } catch {
    if (metadata.optional) excludedOptional.push(path);
    else failures.push(`Missing installed package: ${path}`);
    continue;
  }
  const p = JSON.parse(await readFile(file, 'utf8'));
  let license = typeof p.license === 'object' ? p.license.type : p.license;
  license ??= p.licenses?.map(value => value.type).join(' OR ');
  let source = 'installed package metadata';
  if (!license && upstream.has(p.name)) {
    license = 'Apache-2.0';
    source = 'https://github.com/midnightntwrk/midnight-ledger/blob/main/LICENSE';
  }
  records.push({ name: p.name, version: p.version, license: license ?? 'UNDECLARED', source });
  if (!permissive.has(license)) failures.push(`${p.name}@${p.version}: ${license ?? 'UNDECLARED'}`);
}
const report = { generatedAt: new Date().toISOString(), policy: 'Permissive installed dependencies; npm optional dependencies omitted',
  installed: records.sort((a,b) => a.name.localeCompare(b.name)), excludedOptional, failures };
await mkdir('notes/evidence', { recursive: true });
await writeFile('notes/evidence/dependency-licenses.json', JSON.stringify(report, null, 2) + '\n');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log(`License check passed: ${records.length} installed dependencies; ${excludedOptional.length} optional package entries excluded.`);
