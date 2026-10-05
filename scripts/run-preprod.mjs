// SPDX-License-Identifier: Apache-2.0
// Preprod run: starts this project's local proof server (the node and indexer are Midnight's public Preprod services),
// plays one round, and stops the proof server again if this script started it.
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
let child;
let interrupted = false;
function run(command, args) {
  return new Promise((resolve, reject) => {
    child = spawn(command, args, { cwd: root, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      child = undefined;
      if (code === 0) resolve();
      else reject(Object.assign(new Error(`${command} exited with ${signal ?? code}`), { code }));
    });
  });
}
function interrupt() { interrupted = true; child?.kill('SIGTERM'); }
process.on('SIGINT', interrupt);
process.on('SIGTERM', interrupt);

const running = execFileSync('docker', ['compose', 'ps', '--services', '--status', 'running'], { cwd: root, encoding: 'utf8' });
const startedHere = !running.split(/\r?\n/).includes('proof-server');
try {
  if (startedHere) await run('docker', ['compose', 'up', '-d', '--wait', '--wait-timeout', '300', 'proof-server']);
  if (!interrupted) await run(process.execPath, ['.cache/run/scripts/demo-preprod.js']);
} catch (error) {
  console.error(error.message);
  process.exitCode = interrupted ? 130 : (error.code === 2 ? 2 : 1);
} finally {
  if (startedHere) {
    console.log('Stopping the local proof server...');
    try {
      await run('docker', ['compose', 'rm', '--stop', '--force', 'proof-server']);
      // Nothing else of this project running: also remove its network, as devnet:e2e does.
      const left = execFileSync('docker', ['compose', 'ps', '--services', '--status', 'running'], { cwd: root, encoding: 'utf8' }).trim();
      if (!left) await run('docker', ['compose', 'down', '--remove-orphans']);
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
}
