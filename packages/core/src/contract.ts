// SPDX-License-Identifier: Apache-2.0
import { Contract, Phase, pureCircuits } from '../../../contracts/managed/sealed-pick/contract/index.js';
import type { Ledger, Witnesses, Room } from '../../../contracts/managed/sealed-pick/contract/index.js';
import { toHex } from './encoding.js';
import type { PrivateState, RoomId, RoomSnapshot, RoomPhase, Triple } from './types.js';

export { Contract, Phase, pureCircuits };

export const witnesses: Witnesses<PrivateState> = {
  playerSecret: ({ privateState }) => [privateState, privateState.secret],
  ownOpening: ({ privateState }, roomId) => {
    const opening = privateState.openings[toHex(roomId)];
    if (!opening) throw new Error('No local opening for this room');
    return [privateState, opening];
  },
  allOpenings: ({ privateState }, roomId) => {
    const openings = privateState.batches[toHex(roomId)];
    if (!openings || openings.length !== 3) throw new Error('All three openings are required');
    return [privateState, openings];
  },
};

export function snapshot(id: RoomId, room: Room): RoomSnapshot {
  const phases: RoomPhase[] = ['lobby', 'committing', 'ready', 'revealed'];
  const phase = phases[room.phase];
  if (!phase) throw new Error('Unsupported contract phase');
  return {
    id, phase, optionCount: Number(room.optionCount), joined: Number(room.joined),
    committedCount: Number(room.committedCount),
    players: room.members.map((member, i) => i < Number(room.joined) ? toHex(member) : null) as Triple<string | null>,
    commitments: room.commitments.map((value, i) => room.committed[i] ? toHex(value) : null) as Triple<string | null>,
    committed: [...room.committed] as Triple<boolean>,
    results: room.phase === Phase.revealed ? {
      choices: room.choices.map(Number) as Triple<number>, matched: room.score === 1n,
      score: Number(room.score) as 0 | 1,
    } : null,
  };
}

export function readSnapshot(state: Ledger, id: RoomId, bytes: Uint8Array): RoomSnapshot {
  if (!state.rooms.member(bytes)) throw new Error('Unknown room');
  return snapshot(id, state.rooms.lookup(bytes));
}

