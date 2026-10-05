// SPDX-License-Identifier: Apache-2.0
// One full Sealed Pick round on a Midnight network with real zero-knowledge proofs: deploy, create a room, two joins,
// three sealed commits and one reveal, each transaction waited on until it is final. Shared by the local devnet run
// (demo-devnet.ts) and the Preprod run (demo-preprod.ts). Only public receipts are printed or saved.
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { pino } from 'pino';
import { firstValueFrom, filter, tap, timeout } from 'rxjs';
import { MidnightWalletProvider, inMemoryPrivateStateProvider, waitForFunds, logger } from '@midnight-ntwrk/testkit-js';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { SealedPickClient } from '../packages/core/src/index.js';
import type { Circuit, PrivateState, RoomEvent } from '../packages/core/src/index.js';
import { MidnightTransport } from '../packages/core/src/network.js';
import type { SealedPickProviders, TransactionReceipt } from '../packages/core/src/network.js';

export interface Network {
  id: 'undeployed' | 'preprod';
  banner: string;
  node: string; nodeWS: string; indexer: string; indexerWS: string; proofServer: string;
  evidence: string; // public receipts are written here
  explorer?: string; // block explorer for this network, if one exists
  dustTimeoutMs: number;
}

export const LOCAL: Network = {
  id: 'undeployed', banner: 'LOCAL DEVNET (undeployed)',
  node: 'http://127.0.0.1:9944', nodeWS: 'ws://127.0.0.1:9944',
  indexer: 'http://127.0.0.1:8088/api/v4/graphql', indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
  proofServer: 'http://127.0.0.1:6300', evidence: 'notes/evidence/devnet.json', dustTimeoutMs: 300_000,
};

export const PREPROD: Network = {
  id: 'preprod', banner: 'MIDNIGHT PREPROD (public test network)',
  node: 'https://rpc.preprod.midnight.network', nodeWS: 'wss://rpc.preprod.midnight.network',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql', indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  // The proof server always runs locally: it sees each player's private inputs.
  proofServer: 'http://127.0.0.1:6300', evidence: 'notes/evidence/preprod.json',
  explorer: 'https://preprod.midnightexplorer.com', dustTimeoutMs: 45 * 60_000,
};

const MIN_DUST = 1_000_000_000_000n;
const t0 = Date.now();
const stamp = () => `[${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s]`;
const say = (what: string, detail = '') => console.log(`${stamp()} ${what.padEnd(11)} ${detail}`.trimEnd());
const short = (hex: string, a = 6, b = 4) => `${hex.slice(0, a)}…${hex.slice(-b)}`;
const receiptLine = (r: TransactionReceipt, detail: string) =>
  say(r.circuit, `block ${String(r.blockHeight).padEnd(8)} tx ${short(r.txHash)}  ${r.status}  ${detail}`);

function walletConfig(net: Network) {
  return {
    networkId: net.id, walletNetworkId: net.id, node: net.node, nodeWS: net.nodeWS,
    indexer: net.indexer, indexerWS: net.indexerWS, proofServer: net.proofServer, faucet: '',
  };
}

/** Builds the fee wallet without starting it, so its public address can be shown before anything touches the network. */
export async function feeWalletAddress(net: Network, seed: string): Promise<string> {
  setNetworkId(net.id);
  logger.level = 'silent';
  const wallet = await MidnightWalletProvider.build(pino({ level: 'silent' }), walletConfig(net), seed);
  return wallet.unshieldedKeystore.getBech32Address().asString();
}

/**
 * Plays one round and writes the public receipts to `net.evidence`. Returns a process exit code: 0 on success,
 * 2 when the fee wallet holds no tNIGHT yet (nothing is sent in that case).
 */
export async function playRound(net: Network, seed: string): Promise<number> {
  const assets = resolve('contracts/managed/sealed-pick');
  const build = JSON.parse(await readFile(resolve('.cache/proving-build.json'), 'utf8')) as { sourceSha256: string };
  const sourceSha256 = createHash('sha256').update(await readFile(resolve('contracts/sealed-pick.compact'))).digest('hex');
  assert.equal(build.sourceSha256, sourceSha256, 'Run npm run compile to regenerate proving keys for the current contract');

  setNetworkId(net.id);
  logger.level = 'silent';
  const config = walletConfig(net);
  console.log(`Sealed Pick | ${net.banner} | real ZK proofs, every transaction waited on until final`);
  const wallet = await MidnightWalletProvider.build(pino({ level: 'silent' }), config, seed);
  const address = wallet.unshieldedKeystore.getBech32Address().asString();
  let stopping = false;
  const stop = async () => { if (!stopping) { stopping = true; await wallet.stop(); } };
  const interrupted = () => { void stop().finally(() => process.exit(130)); };
  process.once('SIGINT', interrupted);
  process.once('SIGTERM', interrupted);

  const providers = (): SealedPickProviders => {
    const zkConfigProvider = new NodeZkConfigProvider<Circuit>(assets);
    return {
      privateStateProvider: inMemoryPrivateStateProvider<string, PrivateState>(),
      publicDataProvider: indexerPublicDataProvider(net.indexer, net.indexerWS),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(net.proofServer, zkConfigProvider),
      walletProvider: wallet, midnightProvider: wallet,
    };
  };

  try {
    say('wallet', `fee wallet ${short(address, 18, 6)}, syncing with ${net.indexer.replace(/\/api.*$/, '')}`);
    await wallet.start(false);
    // Registers the wallet's NIGHT for DUST generation when it has none yet. It never calls a faucet.
    const night = await waitForFunds(wallet.wallet, config, false, wallet.unshieldedKeystore);
    if (night === 0n) {
      say('wallet', `no tNIGHT at ${address}`);
      console.log('Fund this address from the network faucet, then run the same command again. Nothing was sent.');
      return 2;
    }
    say('wallet', `${night} NIGHT units; waiting for DUST to pay fees`);
    let lastReport = 0;
    await firstValueFrom(wallet.wallet.state().pipe(
      tap((state) => {
        if (Date.now() - lastReport > 30_000) { lastReport = Date.now(); say('wallet', `DUST balance ${state.dust.balance(new Date())}`); }
      }),
      filter((state) => state.dust.balance(new Date()) > MIN_DUST),
      timeout({ first: net.dustTimeoutMs }),
    ));
    say('wallet', 'DUST available. One fee wallet sponsors all three seats; each player keeps separate private state');

    say('deploy', `proving with the local proof server at ${net.proofServer}`);
    const host = await MidnightTransport.deploy(providers(), assets, 'player-0');
    receiptLine(host.receipts[0]!, `contract ${short(host.contractAddress, 8, 6)}`);
    const transports = [host,
      new MidnightTransport(providers(), host.contractAddress, 'player-1', assets),
      new MidnightTransport(providers(), host.contractAddress, 'player-2', assets),
    ] as const;
    const players = transports.map((t) => new SealedPickClient(t));
    const describe = (seat: number, e: RoomEvent): string => {
      const r = e.room;
      if (e.type === 'roomCreated') return `room ${short(r.id)}, ${r.optionCount} options, seat 0 taken`;
      if (e.type === 'playerJoined') return `seat ${r.joined - 1} taken${r.joined === 3 ? ', lobby closed' : ''}`;
      if (e.type === 'choiceCommitted') return `seat ${seat} sealed ${short(r.commitments[seat] ?? '', 8, 4)}, ledger holds ${r.committedCount}/3 seals and no choices`;
      if (e.type === 'roomRevealed' && r.results) return `choices [${r.results.choices.join(',')}], score ${r.results.score}`;
      return r.phase;
    };
    transports.forEach((t, seat) => t.subscribe((e) => {
      const last = t.receipts.at(-1);
      if (last && e.type !== 'roomRefreshed') receiptLine(last, describe(seat, e));
    }));

    const room = await players[0]!.createRoom(4);
    await players[1]!.join(room.id);
    await players[2]!.join(room.id);
    for (const player of players) {
      await player.commit(room.id, 2);
      assert.equal(await player.readResults(room.id), null);
    }
    // The openings travel off-chain to the player who breaks the seals, only now that all three seals are final.
    const shares = await Promise.all(players.map((p) => p.exportOpening(room.id)));
    await players[0]!.reveal(room.id, shares);
    const results = await players[2]!.readResults(room.id);
    assert.deepEqual(results, { choices: [2, 2, 2], matched: true, score: 1 });
    const receipts = transports.flatMap((t) => t.receipts).sort((a, b) => a.blockHeight - b.blockHeight);
    assert.equal(receipts.length, 8);
    for (const receipt of receipts) assert.equal(receipt.status, 'SucceedEntirely');
    const evidence = {
      network: net.id, generatedAt: new Date().toISOString(), sourceSha256,
      contractAddress: host.contractAddress, roomId: room.id, receipts, results,
      ...(net.explorer ? { explorer: net.explorer } : {}),
    };
    await mkdir(dirname(resolve(net.evidence)), { recursive: true });
    await writeFile(resolve(net.evidence), JSON.stringify(evidence, null, 2) + '\n');
    console.log('REVEAL', JSON.stringify(results));
    console.log(`8 finalized transactions verified in ${((Date.now() - t0) / 1000).toFixed(0)} s; public receipts saved to ${net.evidence}`);
    return 0;
  } finally {
    await stop();
    process.removeListener('SIGINT', interrupted);
    process.removeListener('SIGTERM', interrupted);
  }
}
