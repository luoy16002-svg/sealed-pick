// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulator } from '../packages/core/src/simulator.js';
import { pureCircuits } from '../packages/core/src/contract.js';
import { fromHex, toHex } from '../packages/core/src/encoding.js';
import type { PrivateState } from '../packages/core/src/types.js';
import { createCircuitContext, createConstructorContext, dummyContractAddress } from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger } from '../contracts/managed/sealed-pick/contract/index.js';
import { witnesses } from '../packages/core/src/contract.js';

const roomId = '01'.repeat(32);
function player(n: number, choice = 2): PrivateState {
  return { secret: new Uint8Array(32).fill(n), openings: {
    [roomId]: { choice: BigInt(choice), nonce: new Uint8Array(32).fill(n + 30) },
  }, batches: {} };
}
async function setup(options = 4) {
  const game = new Simulator();
  const players = [player(1), player(2), player(3)] as const;
  await game.execute('createRoom', roomId, players[0], BigInt(options));
  await game.execute('joinRoom', roomId, players[1]);
  await game.execute('joinRoom', roomId, players[2]);
  return { game, players };
}
async function committed(choices = [2, 2, 2]) {
  const { game, players } = await setup();
  for (let i = 0; i < 3; i++) {
    players[i]!.openings[roomId]!.choice = BigInt(choices[i]!);
    await game.execute('commit', roomId, players[i]!, BigInt(i));
  }
  return { game, players, revealState: { ...player(9), batches: { [roomId]: players.map(p => p.openings[roomId]!) } } };
}

test('contract creates a room; only third distinct player opens committing', async () => {
  const game = new Simulator();
  await game.execute('createRoom', roomId, player(1), 4n);
  assert.equal((await game.readRoom(roomId)).phase, 'lobby');
  await game.execute('joinRoom', roomId, player(2));
  assert.equal((await game.readRoom(roomId)).phase, 'lobby');
  await game.execute('joinRoom', roomId, player(3));
  assert.equal((await game.readRoom(roomId)).phase, 'committing');
});

for (const options of [0n, 1n, 17n, 255n]) {
  test(`contract refuses option count ${options}`, async () => {
    await assert.rejects(new Simulator().execute('createRoom', roomId, player(1), options), /Options must/);
  });
}

test('duplicate room and duplicate member cannot change public state', async () => {
  const game = new Simulator();
  await game.execute('createRoom', roomId, player(1), 4n);
  const before = await game.readRoom(roomId);
  await assert.rejects(game.execute('createRoom', roomId, player(9), 6n), /already exists/);
  await assert.rejects(game.execute('joinRoom', roomId, player(1)), /already joined/);
  assert.deepEqual(await game.readRoom(roomId), before);
});

test('unknown room, fourth player, early commit and early reveal are rejected by circuits', async () => {
  const game = new Simulator();
  await assert.rejects(game.execute('joinRoom', roomId, player(1)), /Unknown room/);
  await assert.rejects(game.execute('commit', roomId, player(1), 0n), /Unknown room/);
  await assert.rejects(game.execute('reveal', roomId, player(1)), /Unknown room/);
  await game.execute('createRoom', roomId, player(1), 4n);
  await assert.rejects(game.execute('commit', roomId, player(1), 0n), /not accepting/);
  await assert.rejects(game.execute('reveal', roomId, player(1)), /Not ready/);
  await game.execute('joinRoom', roomId, player(2));
  await game.execute('joinRoom', roomId, player(3));
  await assert.rejects(game.execute('joinRoom', roomId, player(4)), /full/);
});

test('slot ownership is proved from private secret, not caller-supplied identity', async () => {
  const { game, players } = await setup();
  const before = await game.readRoom(roomId);
  await assert.rejects(game.execute('commit', roomId, players[1], 0n), /does not own slot/);
  await assert.rejects(game.execute('commit', roomId, player(99), 0n), /does not own slot/);
  await assert.rejects(game.execute('commit', roomId, players[0], 3n), /Invalid slot/);
  assert.deepEqual(await game.readRoom(roomId), before);
});

test('out-of-range witness choice and double commit cannot change state', async () => {
  const { game, players } = await setup();
  players[0].openings[roomId]!.choice = 4n;
  await assert.rejects(game.execute('commit', roomId, players[0], 0n), /Choice is out of range/);
  assert.equal((await game.readRoom(roomId)).committedCount, 0);
  players[0].openings[roomId]!.choice = 2n;
  await game.execute('commit', roomId, players[0], 0n);
  const before = await game.readRoom(roomId);
  players[0].openings[roomId]!.choice = 1n;
  await assert.rejects(game.execute('commit', roomId, players[0], 0n), /already committed/);
  assert.deepEqual(await game.readRoom(roomId), before);
});

for (const order of [[0,1,2], [0,2,1], [1,0,2], [1,2,0], [2,0,1], [2,1,0]]) {
  test(`all choices stay sealed in commit order ${order}`, async () => {
    const { game, players } = await setup();
    for (const [n, i] of order.entries()) {
      await game.execute('commit', roomId, players[i]!, BigInt(i));
      const room = await game.readRoom(roomId);
      assert.equal(room.committedCount, n + 1);
      assert.equal(room.results, null);
      assert.equal(room.phase, n === 2 ? 'ready' : 'committing');
      if (n < 2) await assert.rejects(game.execute('reveal', roomId, player(9)), /Not ready/);
    }
  });
}

for (const mutation of ['choice', 'nonce', 'swapped'] as const) {
  test(`bad reveal (${mutation}) is rejected atomically by the contract`, async () => {
    const { game, revealState } = await committed([1, 2, 3]);
    const before = await game.readRoom(roomId);
    const batch = revealState.batches[roomId]!;
    if (mutation === 'choice') batch[0]!.choice = 0n;
    if (mutation === 'nonce') batch[1]!.nonce[0] = 99;
    if (mutation === 'swapped') [batch[0], batch[1]] = [batch[1]!, batch[0]!];
    await assert.rejects(game.execute('reveal', roomId, revealState), /does not match commitment/);
    assert.deepEqual(await game.readRoom(roomId), before);
  });
}

test('valid reveal publishes all choices together and is final', async () => {
  const { game, players, revealState } = await committed();
  await game.execute('reveal', roomId, revealState);
  const result = await game.readRoom(roomId);
  assert.deepEqual(result.results, { choices: [2, 2, 2], matched: true, score: 1 });
  await assert.rejects(game.execute('reveal', roomId, revealState), /Not ready/);
  await assert.rejects(game.execute('commit', roomId, players[0], 0n), /not accepting/);
  assert.deepEqual(await game.readRoom(roomId), result);
});

test('scoring agrees with the cooperative rule for all 64 four-option triples', async () => {
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 4; c++) {
    const { game, revealState } = await committed([a,b,c]);
    await game.execute('reveal', roomId, revealState);
    assert.deepEqual((await game.readRoom(roomId)).results, {
      choices: [a,b,c], matched: a === b && b === c, score: a === b && b === c ? 1 : 0,
    });
  }
});

test('commitments bind room, player, choice and nonce', () => {
  const id = fromHex(roomId);
  const state = player(1);
  const member = pureCircuits.playerId(id, state.secret);
  const opening = state.openings[roomId]!;
  const digest = toHex(pureCircuits.commitment(id, member, opening));
  assert.notEqual(digest, toHex(pureCircuits.commitment(new Uint8Array(32), member, opening)));
  assert.notEqual(digest, toHex(pureCircuits.commitment(id, new Uint8Array(32), opening)));
  assert.notEqual(digest, toHex(pureCircuits.commitment(id, member, {...opening, choice: 1n})));
  assert.notEqual(digest, toHex(pureCircuits.commitment(id, member, {...opening, nonce: new Uint8Array(32)})));
});

test('rooms remain isolated on the same contract', async () => {
  const { game, players } = await setup();
  const otherId = 'ff'.repeat(32);
  await game.execute('createRoom', otherId, players[0], 2n);
  const other = await game.readRoom(otherId);
  await game.execute('commit', roomId, players[0], 0n);
  assert.deepEqual(await game.readRoom(otherId), other);
  assert.notEqual((await game.readRoom(roomId)).players[0], other.players[0]);
});

test('raw public Compact ledger contains no choices before batch reveal (independent of UI filtering)', () => {
  const contract = new Contract<PrivateState>(witnesses);
  const players = [player(1, 1), player(2, 2), player(3, 3)] as const;
  const id = fromHex(roomId);
  let state = contract.initialState(createConstructorContext(players[0], '00'.repeat(32))).currentContractState.data;
  const context = (privateState: PrivateState) => createCircuitContext(dummyContractAddress(), '00'.repeat(32), state, privateState);
  state = contract.impureCircuits.createRoom(context(players[0]), id, 4n).context.currentQueryContext.state;
  for (const p of players.slice(1)) state = contract.impureCircuits.joinRoom(context(p), id).context.currentQueryContext.state;
  for (const [slot, p] of players.entries()) {
    state = contract.impureCircuits.commit(context(p), id, BigInt(slot)).context.currentQueryContext.state;
    const raw = ledger(state).rooms.lookup(id);
    assert.deepEqual(raw.choices, [0n, 0n, 0n]);
    assert.equal(raw.score, 0n);
    assert.equal('nonce' in raw, false);
    assert.equal('secret' in raw, false);
  }
  const opener = { ...player(9), batches: { [roomId]: players.map(p => p.openings[roomId]!) } };
  state = contract.impureCircuits.reveal(context(opener), id).context.currentQueryContext.state;
  assert.deepEqual(ledger(state).rooms.lookup(id).choices, [1n, 2n, 3n]);
});
