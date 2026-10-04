// SPDX-License-Identifier: Apache-2.0
import type { Opening } from '../../../contracts/managed/sealed-pick/contract/index.js';

export type RoomId = string;
export type Slot = 0 | 1 | 2;
export type Triple<T> = [T, T, T];
export type RoomPhase = 'lobby' | 'committing' | 'ready' | 'revealed';
export type Circuit = 'createRoom' | 'joinRoom' | 'commit' | 'reveal';
export type Mode = 'simulator' | 'network';

export interface Results {
  choices: Triple<number>;
  matched: boolean;
  score: 0 | 1;
}

export interface RoomSnapshot {
  id: RoomId;
  phase: RoomPhase;
  optionCount: number;
  joined: number;
  committedCount: number;
  players: Triple<string | null>;
  commitments: Triple<string | null>;
  committed: Triple<boolean>;
  results: Results | null;
}

/** Sensitive: pass directly between consenting players only after phase=ready. */
export interface RevealShare {
  roomId: RoomId;
  slot: Slot;
  playerId: string;
  choice: number;
  nonce: string;
}

/** Local witness inputs; never put this object in events, logs, or public storage. */
export interface PrivateState {
  secret: Uint8Array;
  openings: Record<RoomId, Opening>;
  batches: Record<RoomId, Opening[]>;
}

export interface RoomEvent {
  type: 'roomCreated' | 'playerJoined' | 'choiceCommitted' | 'roomRevealed' | 'roomRefreshed';
  mode: Mode;
  room: RoomSnapshot;
}

export interface ContractTransport {
  readonly mode: Mode;
  readRoom(roomId: RoomId): Promise<RoomSnapshot>;
  execute(circuit: Circuit, roomId: RoomId, privateState: PrivateState, argument?: bigint): Promise<void>;
  subscribe(listener: (event: RoomEvent) => void): () => void;
}

