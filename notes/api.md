# Core API

Build from the repository root with `npm ci`, then `npm run build`. Generated Compact JS/types are checked in, so the simulator does not require Docker or compiler installation. Import `@sealed-pick/core` from another workspace in this repository, or import `packages/core/src/index.ts` in a TypeScript build. Keep the `contracts/managed/sealed-pick/contract` directory with the workspace; this is a private workspace package, not a standalone npm publication.

## Simulator example

```ts
import { SealedPickClient, Simulator } from '@sealed-pick/core';

const game = new Simulator();
const alice = new SealedPickClient(game);
const bob = new SealedPickClient(game);
const carol = new SealedPickClient(game);
const unsubscribe = game.subscribe(event => render(event.room));

const room = await alice.createRoom(4);
await bob.join(room.id);
await carol.join(room.id);
await alice.commit(room.id, 2);
await bob.commit(room.id, 2);
await carol.commit(room.id, 2);
// Run only after phase=ready. These are sensitive off-chain payloads, not public events.
const shares = await Promise.all([alice, bob, carol].map(p => p.exportOpening(room.id)));
await alice.reveal(room.id, shares);
const result = await alice.readResults(room.id); // {choices:[2,2,2], matched:true, score:1}
unsubscribe();
```

The example intentionally coordinates three clients in one trusted process. Real players keep their own client/private state and share an opening with a reveal coordinator only after all commitments finalize.

## Functions

| Function | Behavior |
| --- | --- |
| `new Simulator()` | Shared in-memory ledger executing the generated contract. Never implies a proof or network tx. |
| `new SealedPickClient(transport, secret?)` | One player's private state. Default secret is cryptographically random; supplied secret must be 32 bytes. |
| `client.mode` | `simulator` or `network`; display this accurately in demos. |
| `client.playerId(roomId)` | Public room-specific pseudonym, 64 lowercase hex characters. |
| `client.createRoom(optionCount=4, roomId?)` | Creates room, joins creator at slot 0; returns `Promise<RoomSnapshot>`. Optional ID must be 32-byte lowercase hex. |
| `client.join(roomId)` | Takes next free slot; third join enables commitments. |
| `client.commit(roomId, choice)` | Seals integer `0 <= choice < optionCount`; choice and fresh nonce stay in private state. |
| `client.exportOpening(roomId)` | Returns `Promise<RevealShare>` only after `ready` or `revealed`; contains that player's choice and nonce. |
| `client.reveal(roomId, shares)` | Requires exactly one valid share per slot; publishes all choices in one contract call. Share order is arbitrary. |
| `client.readRoom(roomId)` | Reads public snapshot; never includes private choices before reveal. |
| `client.readResults(roomId)` | `Promise<Results|null>`; null until `revealed`. |
| `client.subscribe(listener)` | Observes transport events; returns unsubscribe function. |

Snapshots/events are JSON-safe: numbers, strings, booleans, arrays, and null (no bigint/WASM objects). Slots are 0, 1, 2. Choice labels, player display names, prompts, animations, and invite affordances belong to the UI; contract options are numeric. Keep displayed option meanings fixed for a round.

```ts
type RoomSnapshot = {
  id: string;
  phase: 'lobby' | 'committing' | 'ready' | 'revealed';
  optionCount: number; joined: number; committedCount: number;
  players: [string|null, string|null, string|null];
  commitments: [string|null, string|null, string|null];
  committed: [boolean, boolean, boolean];
  results: { choices: [number,number,number]; matched: boolean; score: 0|1 } | null;
};
type RevealShare = { roomId: string; slot: 0|1|2; playerId: string; choice: number; nonce: string };
```

## Events

`{type, mode, room}` where `type` is `roomCreated`, `playerJoined`, `choiceCommitted`, `roomRevealed`, or `roomRefreshed`. Room snapshots include counts, so the UI can derive the third-commit transition from `choiceCommitted` plus `room.phase === 'ready'`. Simulator subscriptions see all clients on the same simulator. Network subscriptions see writes made by that transport and explicit refreshes, not a global server push stream. No event contains a nonce, secret, or pre-reveal choice. Unsubscribing is required when the UI unmounts; observers receive separate copies and their exceptions cannot change a successful call's outcome.

## Network adapter

`@sealed-pick/core/network` exports `MidnightTransport`, `SealedPickProviders`, `compiledContract`, and `TransactionReceipt`.

```ts
const deployed = await MidnightTransport.deploy(providers, compiledAssetsPath, 'player-0');
const connection = new MidnightTransport(otherPlayerProviders, deployed.contractAddress, 'player-1', compiledAssetsPath);
const client = new SealedPickClient(connection);
// Same createRoom / join / commit / exportOpening / reveal API.
const freshSnapshot = await connection.refresh(roomId);
const receipts = connection.receipts; // selected PUBLIC transaction fields only
```

Set Midnight.js network ID before constructing providers. Providers must supply the correct indexer, proof server, compiled keys/assets, wallet, network transaction submission, and a separate private-state provider per player. See `scripts/demo-devnet.ts` for a fully wired local example. The adapter waits for transaction finalization; it has no fake success fallback. Network failures reject the operation. State conflicts require reading current state; if an uncertain commit landed, use the retained local opening rather than trying to overwrite it.

Use `readRoom` or `refresh` to poll other players while a network room is visible; the caller owns and stops any polling timer. Share delivery and wallet connection UI are deliberately not implemented. Default private state is memory-only; retaining a client instance is required until its round ends. Do not put `RevealShare` or `PrivateState` in public component/event logs or unencrypted shared storage.

## Browser bundling

The core uses Web Crypto, no Node crypto APIs. Midnight's on-chain runtime `browser` export imports a `.wasm` module. The UI bundler must support that module format and any asynchronous WASM initialization it requires; preserve the package's browser export condition. The simulator entry does not import the network adapter, testkit, Node ZK provider, or wallet SDK. `packages/web` shows a working setup: Vite with `vite-plugin-wasm`, the Compact runtime packages excluded from dependency pre-bundling, and an `esnext` build target.

## Expected failures

Promises reject for malformed IDs/options/choices, unknown/full rooms, duplicate joins/commits, seat-ownership failures, early or repeated reveal, and missing/altered/cross-room shares. Rejected circuit calls leave public state unchanged. Keep the UI responsive while a network proof/finalization is pending. A reveal requires cooperation from all players; no timeout can reconstruct a withheld opening.
