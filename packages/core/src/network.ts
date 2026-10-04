// SPDX-License-Identifier: Apache-2.0
import { deployContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractProviders } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { ledger } from '../../../contracts/managed/sealed-pick/contract/index.js';
import { Contract, witnesses, readSnapshot } from './contract.js';
import { fromHex } from './encoding.js';
import { RoomEvents } from './events.js';
import type { Circuit, ContractTransport, PrivateState, RoomEvent, RoomId, RoomSnapshot } from './types.js';

export type SealedPickProviders = ContractProviders<Contract<PrivateState>>;

export interface TransactionReceipt {
  circuit: Circuit | 'deploy';
  txId: string;
  txHash: string;
  blockHeight: number;
  status: string;
}

export function compiledContract(assetsPath: string) {
  return CompiledContract.make<Contract<PrivateState>>('SealedPick', Contract).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets(assetsPath),
  );
}

/** One transport per player, with a separately scoped private-state provider/id. */
export class MidnightTransport implements ContractTransport {
  readonly mode = 'network' as const;
  #events = new RoomEvents();
  #receipts: TransactionReceipt[] = [];
  #compiled;
  #tail: Promise<unknown> = Promise.resolve();

  constructor(
    readonly providers: SealedPickProviders,
    readonly contractAddress: string,
    readonly privateStateId: string,
    assetsPath: string,
  ) {
    fromHex(contractAddress);
    this.#compiled = compiledContract(assetsPath);
    providers.privateStateProvider.setContractAddress(contractAddress);
  }

  static async deploy(providers: SealedPickProviders, assetsPath: string, privateStateId = 'deployer'): Promise<MidnightTransport> {
    const deployed = await deployContract<Contract<PrivateState>>(providers, {
      compiledContract: compiledContract(assetsPath), privateStateId,
      initialPrivateState: { secret: new Uint8Array(32), openings: {}, batches: {} },
    });
    const data = deployed.deployTxData.public;
    const transport = new MidnightTransport(providers, data.contractAddress, privateStateId, assetsPath);
    transport.#receipts.push({ circuit: 'deploy', txId: data.txId, txHash: data.txHash, blockHeight: data.blockHeight, status: data.status });
    return transport;
  }

  get receipts(): TransactionReceipt[] { return structuredClone(this.#receipts); }

  async readRoom(roomId: RoomId): Promise<RoomSnapshot> {
    const id = fromHex(roomId);
    const state = await this.providers.publicDataProvider.queryContractState(this.contractAddress);
    if (!state) throw new Error('Contract is not visible in the indexer');
    return readSnapshot(ledger(state.data), roomId, id);
  }

  execute(circuit: Circuit, roomId: RoomId, privateState: PrivateState, argument?: bigint): Promise<void> {
    const state = structuredClone(privateState);
    const operation = this.#tail.then(async () => {
      const bytes = fromHex(roomId);
      const store = this.providers.privateStateProvider;
      store.setContractAddress(this.contractAddress);
      await store.set(this.privateStateId, state);
      const base = { compiledContract: this.#compiled, contractAddress: this.contractAddress, privateStateId: this.privateStateId };
      try {
        const tx = circuit === 'createRoom' || circuit === 'commit'
          ? await submitCallTx<Contract<PrivateState>, typeof circuit>(this.providers, {
            ...base, circuitId: circuit, args: [bytes, argument ?? (() => { throw new Error('Circuit argument is required'); })()],
          })
          : await submitCallTx<Contract<PrivateState>, typeof circuit>(this.providers, {
            ...base, circuitId: circuit, args: [bytes],
          });
        const data = tx.public;
        this.#receipts.push({ circuit, txId: data.txId, txHash: data.txHash, blockHeight: data.blockHeight, status: data.status });
      } finally {
        // Do not retain other players' openings in this player's private store.
        delete state.batches[roomId];
        await store.set(this.privateStateId, state);
      }
      this.#events.emit(circuit, this.mode, await this.readRoom(roomId));
    });
    this.#tail = operation.catch(() => undefined);
    return operation;
  }

  /** Network events report this transport's writes. Call refresh to observe other players. */
  async refresh(roomId: RoomId): Promise<RoomSnapshot> {
    const room = await this.readRoom(roomId);
    this.#events.emit('refresh', this.mode, room);
    return room;
  }

  subscribe(listener: (event: RoomEvent) => void): () => void { return this.#events.subscribe(listener); }
}
