// SPDX-License-Identifier: Apache-2.0
import type { Circuit, Mode, RoomEvent, RoomSnapshot } from './types.js';

const eventTypes = {
  createRoom: 'roomCreated', joinRoom: 'playerJoined', commit: 'choiceCommitted', reveal: 'roomRevealed',
} as const;

export class RoomEvents {
  #listeners = new Set<(event: RoomEvent) => void>();

  subscribe(listener: (event: RoomEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  }

  emit(circuit: Circuit | 'refresh', mode: Mode, room: RoomSnapshot): void {
    for (const listener of this.#listeners) {
      // A UI listener cannot roll back a successful contract call or mutate another listener's view.
      try { listener(structuredClone({ type: circuit === 'refresh' ? 'roomRefreshed' : eventTypes[circuit], mode, room })); }
      catch { /* Observer exceptions do not change transaction outcomes. */ }
    }
  }
}

