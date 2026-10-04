// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { SealedPickClient, Simulator } from '../packages/core/src/index.js';
import type { RoomEvent, ContractTransport, PrivateState, Circuit, RoomId } from '../packages/core/src/index.js';

async function setup() {
  const game = new Simulator();
  const clients = [new SealedPickClient(game), new SealedPickClient(game), new SealedPickClient(game)] as const;
  const room = await clients[0].createRoom(4);
  await clients[1].join(room.id);
  await clients[2].join(room.id);
  return { game, clients, id: room.id };
}
async function ready() {
  const result = await setup();
  for (const client of result.clients) await client.commit(result.id, 2);
  return { ...result, shares: await Promise.all(result.clients.map(c => c.exportOpening(result.id))) };
}

test('public API completes a room with JSON-safe snapshots and results', async () => {
  const { clients, id, shares } = await ready();
  assert.equal(await clients[0].readResults(id), null);
  const room = await clients[2].reveal(id, [shares[2]!, shares[0]!, shares[1]!]);
  assert.equal(room.phase, 'revealed');
  assert.deepEqual(JSON.parse(JSON.stringify(await clients[1].readResults(id))), { choices: [2,2,2], matched: true, score: 1 });
});

test('clients cannot export early, double commit, or replace a sealed choice', async () => {
  const { clients, id } = await setup();
  await assert.rejects(clients[0].exportOpening(id), /stay private/);
  await clients[0].commit(id, 2);
  await assert.rejects(clients[0].exportOpening(id), /stay private/);
  await assert.rejects(clients[0].commit(id, 1), /already committed/);
});

test('API validates malformed inputs before they reach a transaction', async () => {
  const { clients, id, game } = await setup();
  await assert.rejects(clients[0].createRoom(1), /optionCount/);
  await assert.rejects(clients[0].createRoom(4, '../../bad'), /32 bytes/);
  for (const bad of [-1, 1.5, NaN, 4, Infinity]) await assert.rejects(clients[0].commit(id, bad), /choice/);
  await assert.rejects(new SealedPickClient(game).commit(id, 1), /not in this room/);
  assert.throws(() => new SealedPickClient(game, new Uint8Array(31)), /32 bytes/);
});

test('reveal rejects missing, duplicate, mismatched and tampered shares without partial results', async () => {
  const { clients, id, shares } = await ready();
  const before = await clients[0].readRoom(id);
  await assert.rejects(clients[0].reveal(id, shares.slice(0, 2)), /Exactly one opening/);
  await assert.rejects(clients[0].reveal(id, [shares[0]!, shares[0]!, shares[2]!]), /Exactly one opening/);
  await assert.rejects(clients[0].reveal(id, [{...shares[0]!, roomId: 'ab'.repeat(32)}, shares[1]!, shares[2]!]), /different room/);
  await assert.rejects(clients[0].reveal(id, [{...shares[0]!, choice: 1}, shares[1]!, shares[2]!]), /does not match/);
  assert.deepEqual(await clients[0].readRoom(id), before);
});

test('public events contain no openings; observers cannot mutate state or transaction outcomes', async () => {
  const { clients, id, game } = await setup();
  const events: RoomEvent[] = [];
  const stopBad = game.subscribe(event => { event.room.committedCount = 99; throw new Error('UI failed'); });
  const stop = game.subscribe(event => events.push(event));
  await clients[0].commit(id, 2);
  assert.equal(events[0]!.room.committedCount, 1);
  assert.equal(events[0]!.room.results, null);
  assert.doesNotMatch(JSON.stringify(events), /"nonce"|"secret"|"choice"|"openings"/);
  assert.equal((await game.readRoom(id)).committedCount, 1);
  stop(); stopBad();
  await clients[1].commit(id, 2);
  assert.equal(events.length, 1);
});

test('same-client concurrent calls serialize and failed calls do not poison the queue', async () => {
  const { clients, id } = await setup();
  const results = await Promise.allSettled([clients[0].commit(id, 1), clients[0].commit(id, 2)]);
  assert.equal(results[0]!.status, 'fulfilled');
  assert.equal(results[1]!.status, 'rejected');
  assert.equal((await clients[0].readRoom(id)).committedCount, 1);
  assert.equal((await clients[0].createRoom()).phase, 'lobby');
});

test('an ambiguous network error preserves the exact opening for a safe same-choice retry', async () => {
  const game = new Simulator();
  let failOnce = true;
  const seen: PrivateState[] = [];
  const transport: ContractTransport = {
    mode: 'simulator', readRoom: id => game.readRoom(id), subscribe: fn => game.subscribe(fn),
    execute: async (c: Circuit, id: RoomId, state: PrivateState, arg?: bigint) => {
      if (c === 'commit') {
        seen.push(structuredClone(state));
        if (failOnce) { failOnce = false; throw new Error('Connection lost'); }
      }
      await game.execute(c, id, state, arg);
    },
  };
  const host = new SealedPickClient(transport);
  const room = await host.createRoom();
  await new SealedPickClient(game).join(room.id);
  await new SealedPickClient(game).join(room.id);
  await assert.rejects(host.commit(room.id, 2), /Connection lost/);
  await assert.rejects(host.commit(room.id, 1), /cannot be replaced/);
  await host.commit(room.id, 2);
  assert.deepEqual(seen[0]!.openings, seen[1]!.openings);
});
