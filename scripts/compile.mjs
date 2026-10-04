// SPDX-License-Identifier: Apache-2.0
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const fast = process.argv.includes('--skip-zk');
const source = 'contracts/sealed-pick.compact';
const result = spawnSync('docker', ['run', '--rm', '--platform', 'linux/amd64',
  '--mount', `type=bind,source=${root},target=/work`, '-w', '/work',
  '-e', 'XDG_CACHE_HOME=/work/.cache/compact', 'buildpack-deps:bookworm-curl',
  '.tools/compactc-0.31.1/compactc', ...(fast ? ['--skip-zk'] : []), source, 'contracts/managed/sealed-pick'],
  { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (!fast) {
  await mkdir(new URL('../.cache/', import.meta.url), { recursive: true });
  await writeFile(new URL('../.cache/proving-build.json', import.meta.url), JSON.stringify({
    compiler: '0.31.1', sourceSha256: createHash('sha256').update(await readFile(new URL(`../${source}`, import.meta.url))).digest('hex'),
    builtAt: new Date().toISOString()
  }, null, 2) + '\n');
}
console.log(fast ? 'Compact executable circuits compiled (no proof keys generated).' : 'Compact contract, ZK circuits, and all proving/verifying keys compiled.');
