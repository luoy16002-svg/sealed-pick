// SPDX-License-Identifier: Apache-2.0
import { SealedPickClient, Simulator } from '../packages/core/src/index.js';

const game = new Simulator();
const players = [new SealedPickClient(game), new SealedPickClient(game), new SealedPickClient(game)] as const;
const choices = process.argv.includes('--mismatch') ? [2, 1, 2] : [2, 2, 2];
const unsubscribe = game.subscribe(({ type, room }) => {
  console.log(`${type}: ${room.phase}, joined ${room.joined}/3, committed ${room.committedCount}/3, results ${room.results ? JSON.stringify(room.results) : 'SEALED'}`);
});
try {
  console.log('Sealed Pick | LOCAL SIMULATOR | real Compact circuit execution; no ZK proof or network transaction');
  const room = await players[0].createRoom(4);
  await players[1].join(room.id);
  await players[2].join(room.id);
  for (const [slot, player] of players.entries()) await player.commit(room.id, choices[slot]!);
  const shares = await Promise.all(players.map((player) => player.exportOpening(room.id)));
  await players[0].reveal(room.id, shares);
  console.log('REVEAL', JSON.stringify(await players[0].readResults(room.id)));
} finally { unsubscribe(); }
