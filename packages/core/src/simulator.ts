// SPDX-License-Identifier: Apache-2.0
import { createCircuitContext, createConstructorContext, dummyContractAddress } from '@midnight-ntwrk/compact-runtime';
import type { ChargedState, CircuitResults } from '@midnight-ntwrk/compact-runtime';
import { ledger } from '../../../contracts/managed/sealed-pick/contract/index.js';
import { Contract, witnesses, readSnapshot } from './contract.js';
import { fromHex } from './encoding.js';
import { RoomEvents } from './events.js';
import type { Circuit, ContractTransport, PrivateState, RoomEvent, RoomId, RoomSnapshot } from './types.js';

/** Runs the real generated Compact circuits. No network or cryptographic proof generation. */
export class Simulator implements ContractTransport {
  readonly mode = 'simulator' as const;
  #contract = new Contract<PrivateState>(witnesses);
  #state: ChargedState;
  #events = new RoomEvents();

  constructor() {
    const initial = this.#contract.initialState(createConstructorContext(
      { secret: new Uint8Array(32), openings: {}, batches: {} }, '00'.repeat(32)
    ));
    this.#state = initial.currentContractState.data;
  }

  async readRoom(roomId: RoomId): Promise<RoomSnapshot> {
    return readSnapshot(ledger(this.#state), roomId, fromHex(roomId));
  }

  async execute(circuit: Circuit, roomId: RoomId, privateState: PrivateState, argument?: bigint): Promise<void> {
    const id = fromHex(roomId);
    // A fresh context per call makes rejection atomic and keeps player private states separate.
    const context = createCircuitContext(dummyContractAddress(), '00'.repeat(32), this.#state, structuredClone(privateState));
    let result: CircuitResults<PrivateState, []>;
    switch (circuit) {
      case 'createRoom':
        if (argument === undefined) throw new Error('optionCount is required');
        result = this.#contract.impureCircuits.createRoom(context, id, argument); break;
      case 'joinRoom': result = this.#contract.impureCircuits.joinRoom(context, id); break;
      case 'commit':
        if (argument === undefined) throw new Error('slot is required');
        result = this.#contract.impureCircuits.commit(context, id, argument); break;
      case 'reveal': result = this.#contract.impureCircuits.reveal(context, id); break;
    }
    this.#state = result.context.currentQueryContext.state;
    // Do not yield between the state change and its event snapshot.
    this.#events.emit(circuit, this.mode, readSnapshot(ledger(this.#state), roomId, id));
  }

  subscribe(listener: (event: RoomEvent) => void): () => void { return this.#events.subscribe(listener); }
}

