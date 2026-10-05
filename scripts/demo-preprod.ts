// SPDX-License-Identifier: Apache-2.0
// The same round as the local devnet run, on Midnight Preprod. With --check it only reads the public endpoints.
// It never calls the faucet: fund the fee wallet first (npm run preprod:wallet prints its address).
import { PREPROD, playRound } from './network-game.js';
import { WALLET_FILE, readSeed } from './preprod-seed.js';

async function check(): Promise<number> {
  const rpc = await fetch(PREPROD.node, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'system_chain', params: [] }),
  }).then((r) => r.json() as Promise<{ result?: string }>);
  const tip = await fetch(PREPROD.indexer, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ block { height hash } }' }),
  }).then((r) => r.json() as Promise<{ data?: { block?: { height: number } } }>);
  console.log(`node ${PREPROD.node}: ${rpc.result ?? 'no answer'}`);
  console.log(`indexer ${PREPROD.indexer}: latest block ${tip.data?.block?.height ?? 'unknown'}`);
  return rpc.result === 'Midnight Preprod' && tip.data?.block ? 0 : 1;
}

if (process.argv.includes('--check')) {
  process.exitCode = await check();
} else {
  const seed = await readSeed();
  if (!seed) {
    console.error(`No Preprod fee wallet yet. Run npm run preprod:wallet, fund the address it prints, then run this again. (Looked for SEALED_PICK_PREPROD_SEED and ${WALLET_FILE}.)`);
    process.exitCode = 2;
  } else {
    process.exitCode = await playRound(PREPROD, seed);
  }
}
