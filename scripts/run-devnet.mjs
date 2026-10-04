// SPDX-License-Identifier: Apache-2.0
import { spawn } from 'node:child_process';
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
      else reject(new Error(`${command} exited with ${signal ?? code}`));
    });
  });
}
function interrupt() { interrupted = true; child?.kill('SIGTERM'); }
process.on('SIGINT', interrupt);
process.on('SIGTERM', interrupt);
try {
  await run('docker', ['compose', 'up', '-d', '--wait', '--wait-timeout', '300']);
  if (!interrupted) await run(process.execPath, ['.cache/run/scripts/demo-devnet.js']);
} catch (error) {
  console.error(error.message);
  process.exitCode = interrupted ? 130 : 1;
} finally {
  console.log('Stopping Sealed Pick devnet services...');
  try { await run('docker', ['compose', 'down', '--remove-orphans']); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
}
