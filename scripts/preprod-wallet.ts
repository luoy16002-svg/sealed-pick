// SPDX-License-Identifier: Apache-2.0
// Creates the Preprod fee wallet once and prints its public address for the faucet. The seed goes to
// .local/preprod-wallet.json (git-ignored); an existing seed is never overwritten. Nothing is sent to any network.
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { PREPROD, feeWalletAddress } from './network-game.js';
import { WALLET_FILE, readSeed } from './preprod-seed.js';

let seed = await readSeed();
if (seed) {
  console.log(`Using the existing fee wallet (${process.env.SEALED_PICK_PREPROD_SEED ? 'SEALED_PICK_PREPROD_SEED' : WALLET_FILE}).`);
} else {
  seed = randomBytes(32).toString('hex');
  await mkdir(dirname(WALLET_FILE), { recursive: true });
  await writeFile(WALLET_FILE, JSON.stringify({ network: 'preprod', createdAt: new Date().toISOString(), seed }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(`Created a new Preprod fee wallet. Its seed is in ${WALLET_FILE}; keep that file private and backed up.`);
}
console.log(`tNIGHT address: ${await feeWalletAddress(PREPROD, seed)}`);
console.log('Request tNIGHT for this address at https://midnight-tmnight-preprod.nethermind.dev/ (the faucet asks for a CAPTCHA),');
console.log('then run: npm run preprod:e2e');
