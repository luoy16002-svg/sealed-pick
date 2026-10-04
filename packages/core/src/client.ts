// SPDX-License-Identifier: Apache-2.0
import { pureCircuits } from './contract.js';
import { fromHex, integer, random32, toHex } from './encoding.js';
import type { ContractTransport, PrivateState, RevealShare, RoomId, RoomSnapshot, Slot, Results, RoomEvent } from './types.js';

export class SealedPickClient {
  #state: PrivateState;
  #tail: Promise<unknown> = Promise.resolve();

  constructor(readonly transport: ContractTransport, secret: Uint8Array = random32()) {
    if (!(secret instanceof Uint8Array) || secret.length !== 32) throw new Error('Player secret must be 32 bytes');
    this.#state = { secret: new Uint8Array(secret), openings: {}, batches: {} };
  }

  get mode() { return this.transport.mode; }

  playerId(roomId: RoomId): string {
    return toHex(pureCircuits.playerId(fromHex(roomId), this.#state.secret));
  }

  #serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.#tail.then(operation);
    this.#tail = next.catch(() => undefined);
    return next;
  }

  createRoom(optionCount = 4, roomId: RoomId = toHex(random32())): Promise<RoomSnapshot> {
    return this.#serial(async () => {
      integer(optionCount, 2, 16, 'optionCount');
      fromHex(roomId);
      await this.transport.execute('createRoom', roomId, this.#state, BigInt(optionCount));
      return this.readRoom(roomId);
    });
  }

  join(roomId: RoomId): Promise<RoomSnapshot> {
    return this.#serial(async () => {
      await this.transport.execute('joinRoom', roomId, this.#state);
      return this.readRoom(roomId);
    });
  }

  commit(roomId: RoomId, choice: number): Promise<RoomSnapshot> {
    return this.#serial(async () => {
      const room = await this.readRoom(roomId);
      integer(choice, 0, room.optionCount - 1, 'choice');
      const slot = room.players.indexOf(this.playerId(roomId));
      if (slot === -1) throw new Error('Player is not in this room');
      if (room.phase !== 'committing') throw new Error('Room is not accepting commitments');
      if (room.committed[slot]) throw new Error('Player already committed');
      const previous = this.#state.openings[roomId];
      if (previous && previous.choice !== BigInt(choice)) throw new Error('A sealed choice cannot be replaced; retry the same choice');
      // Retain the opening even if network confirmation fails: the transaction may have landed.
      this.#state.openings[roomId] ??= { choice: BigInt(choice), nonce: random32() };
      await this.transport.execute('commit', roomId, this.#state, BigInt(slot));
      return this.readRoom(roomId);
    });
  }

  async exportOpening(roomId: RoomId): Promise<RevealShare> {
    const room = await this.readRoom(roomId);
    if (room.phase !== 'ready' && room.phase !== 'revealed') throw new Error('Openings stay private until all players have committed');
    const member = this.playerId(roomId);
    const slot = room.players.indexOf(member);
    const opening = this.#state.openings[roomId];
    if (slot === -1 || !opening) throw new Error('No local committed choice for this player');
    if (toHex(pureCircuits.commitment(fromHex(roomId), fromHex(member), opening)) !== room.commitments[slot]) {
      throw new Error('Local opening does not match the public commitment');
    }
    return { roomId, slot: slot as Slot, playerId: member, choice: Number(opening.choice), nonce: toHex(opening.nonce) };
  }

  reveal(roomId: RoomId, shares: readonly RevealShare[]): Promise<RoomSnapshot> {
    // Own the input before waiting, so UI mutations cannot change a queued reveal.
    const input = structuredClone(shares);
    return this.#serial(async () => {
      const room = await this.readRoom(roomId);
      if (room.phase !== 'ready') throw new Error('Not ready to reveal');
      if (input.length !== 3 || new Set(input.map((share) => share.slot)).size !== 3) {
        throw new Error('Exactly one opening for each of the three slots is required');
      }
      const ordered = [...input].sort((a, b) => a.slot - b.slot);
      const openings = ordered.map((share, slot) => {
        if (share.slot !== slot || share.roomId !== roomId || share.playerId !== room.players[slot]) throw new Error('Opening belongs to a different room or player');
        integer(share.choice, 0, room.optionCount - 1, 'choice');
        const opening = { choice: BigInt(share.choice), nonce: fromHex(share.nonce) };
        const hash = toHex(pureCircuits.commitment(fromHex(roomId), fromHex(share.playerId), opening));
        if (hash !== room.commitments[slot]) throw new Error('Opening does not match commitment');
        return opening;
      });
      this.#state.batches[roomId] = openings;
      try { await this.transport.execute('reveal', roomId, this.#state); }
      finally { delete this.#state.batches[roomId]; }
      return this.readRoom(roomId);
    });
  }

  readRoom(roomId: RoomId): Promise<RoomSnapshot> { return this.transport.readRoom(roomId); }
  async readResults(roomId: RoomId): Promise<Results | null> { return (await this.readRoom(roomId)).results; }
  subscribe(listener: (event: RoomEvent) => void): () => void { return this.transport.subscribe(listener); }
}

