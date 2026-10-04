// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pino } from 'pino';
import { firstValueFrom, filter, timeout } from 'rxjs';
import { MidnightWalletProvider, inMemoryPrivateStateProvider, waitForFunds, logger } from '@midnight-ntwrk/testkit-js';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { SealedPickClient } from '../packages/core/src/index.js';
import type { Circuit, PrivateState } from '../packages/core/src/index.js';
import { MidnightTransport } from '../packages/core/src/network.js';
import type { SealedPickProviders } from '../packages/core/src/network.js';

// Hard-coded loopback-only devnet. This script cannot select a public network or call a faucet.
const config = {
  networkId: 'undeployed', walletNetworkId: 'undeployed',
  node: 'http://127.0.0.1:9944', nodeWS: 'ws://127.0.0.1:9944',
  indexer: 'http://127.0.0.1:8088/api/v4/graphql', indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
  proofServer: 'http://127.0.0.1:6300', faucet: '',
};
const assets = resolve('contracts/managed/sealed-pick');
const build = JSON.parse(await readFile(resolve('.cache/proving-build.json'), 'utf8')) as { sourceSha256: string };
const sourceSha256 = createHash('sha256').update(await readFile(resolve('contracts/sealed-pick.compact'))).digest('hex');
assert.equal(build.sourceSha256, sourceSha256, 'Run npm run compile to regenerate proving keys for the current contract');

setNetworkId('undeployed');
logger.level = 'silent';
const quiet = pino({ level: 'silent' });
console.log('Sealed Pick | LOCAL DEVNET | real ZK proofs and finalized Midnight transactions');
const wallet = await MidnightWalletProvider.build(quiet, config, '0'.repeat(63) + '1');
let stopping = false;
async function stop() { if (!stopping) { stopping = true; await wallet.stop(); } }
const interrupted = () => { void stop().finally(() => process.exit(130)); };
process.once('SIGINT', interrupted);
process.once('SIGTERM', interrupted);

function providers(): SealedPickProviders {
  const zkConfigProvider = new NodeZkConfigProvider<Circuit>(assets);
  return {
    privateStateProvider: inMemoryPrivateStateProvider<string, PrivateState>(),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider: wallet, midnightProvider: wallet,
  };
}

try {
  console.log('Starting the local genesis fee wallet (no account or faucet)...');
  await wallet.start(false);
  await waitForFunds(wallet.wallet, config, false, wallet.unshieldedKeystore);
  console.log('Waiting for local DUST generation...');
  await firstValueFrom(wallet.wallet.state().pipe(
    filter(state => state.dust.balance(new Date()) > 1_000_000_000_000n),
    timeout({ first: 300_000 }),
  ));
  console.log('Deploying compiled contract...');
  const hostTransport = await MidnightTransport.deploy(providers(), assets, 'player-0');
  const transports = [hostTransport,
    new MidnightTransport(providers(), hostTransport.contractAddress, 'player-1', assets),
    new MidnightTransport(providers(), hostTransport.contractAddress, 'player-2', assets),
  ] as const;
  const players = transports.map(t => new SealedPickClient(t));
  console.log(`Contract: ${hostTransport.contractAddress}`);
  for (const transport of transports) transport.subscribe(event => {
    const r = event.room;
    console.log(`${event.type}: ${r.phase}, committed ${r.committedCount}/3, ${r.results ? JSON.stringify(r.results) : 'SEALED'}`);
  });
  const room = await players[0]!.createRoom(4);
  await players[1]!.join(room.id);
  await players[2]!.join(room.id);
  // Separate local private-state stores; one local wallet sponsors the network fees.
  for (const player of players) {
    await player.commit(room.id, 2);
    assert.equal(await player.readResults(room.id), null);
  }
  const shares = await Promise.all(players.map(p => p.exportOpening(room.id)));
  await players[0]!.reveal(room.id, shares);
  const results = await players[2]!.readResults(room.id);
  assert.deepEqual(results, { choices: [2,2,2], matched: true, score: 1 });
  const receipts = transports.flatMap(t => t.receipts).sort((a,b) => a.blockHeight - b.blockHeight);
  assert.equal(receipts.length, 8);
  for (const receipt of receipts) assert.equal(receipt.status, 'SucceedEntirely');
  const evidence = { network: 'undeployed', generatedAt: new Date().toISOString(), sourceSha256,
    contractAddress: hostTransport.contractAddress, roomId: room.id, receipts, results };
  await mkdir(resolve('notes/evidence'), { recursive: true });
  await writeFile(resolve('notes/evidence/devnet.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log('REVEAL', JSON.stringify(results));
  console.log('8 finalized transactions verified; public receipts saved to notes/evidence/devnet.json');
} finally {
  await stop();
  process.removeListener('SIGINT', interrupted);
  process.removeListener('SIGTERM', interrupted);
}
