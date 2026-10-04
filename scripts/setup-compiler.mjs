// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const version = '0.31.1';
const sha256 = 'e291b4bab4d4e857707008f8b1c25c2b8e0c843f6c737d0ee6c0d9ac69a6bbfb';
const archive = join(root, '.tools', `compactc-${version}.zip`);
await mkdir(join(root, '.tools'), { recursive: true });
let bytes;
try { bytes = await readFile(archive); } catch {
  const url = `https://github.com/midnightntwrk/compact/releases/download/compactc-v${version}/compactc_v${version}_x86_64-unknown-linux-musl.zip`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Compiler download failed: ${response.status}`);
  bytes = Buffer.from(await response.arrayBuffer());
}
if (createHash('sha256').update(bytes).digest('hex') !== sha256) throw new Error('Compiler archive checksum mismatch');
await writeFile(archive, bytes);
const extraction = process.platform === 'win32'
  ? spawnSync('powershell.exe', ['-NoProfile', '-Command', "Expand-Archive -LiteralPath '.tools/compactc-0.31.1.zip' -DestinationPath '.tools/compactc-0.31.1' -Force"], { cwd: root, stdio: 'inherit' })
  : spawnSync('unzip', ['-o', archive, '-d', join(root, '.tools', `compactc-${version}`)], { cwd: root, stdio: 'inherit' });
if (extraction.error) throw extraction.error;
if (extraction.status !== 0) process.exit(extraction.status ?? 1);
const check = spawnSync('docker', ['run', '--rm', '--platform', 'linux/amd64', '--network', 'none',
  '--mount', `type=bind,source=${root},target=/work`, '-w', '/work', 'buildpack-deps:bookworm-curl',
  'bash', '-c', 'chmod +x .tools/compactc-0.31.1/* && .tools/compactc-0.31.1/compactc --version'], { cwd: root, stdio: 'inherit' });
if (check.error) throw check.error;
process.exitCode = check.status ?? 1;
