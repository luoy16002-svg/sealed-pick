// SPDX-License-Identifier: Apache-2.0
// Where the Preprod fee wallet's seed lives: SEALED_PICK_PREPROD_SEED (64 hex characters) if set, otherwise
// .local/preprod-wallet.json, which .gitignore keeps out of the repository. The seed is never printed or logged.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

export const WALLET_FILE = '.local/preprod-wallet.json';
const HEX64 = /^[0-9a-f]{64}$/;

export async function readSeed(): Promise<string | null> {
  const fromEnv = process.env.SEALED_PICK_PREPROD_SEED?.trim().toLowerCase();
  if (fromEnv) {
    if (!HEX64.test(fromEnv)) throw new Error('SEALED_PICK_PREPROD_SEED must be 64 hex characters');
    return fromEnv;
  }
  if (!existsSync(WALLET_FILE)) return null;
  const { seed } = JSON.parse(await readFile(WALLET_FILE, 'utf8')) as { seed?: string };
  if (!seed || !HEX64.test(seed)) throw new Error(`${WALLET_FILE} does not hold a 64-character hex seed`);
  return seed;
}
