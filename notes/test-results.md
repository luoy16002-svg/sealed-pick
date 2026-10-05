# Verification — 2026-10-04, updated 2026-10-05

| Check | Observed result |
| --- | --- |
| Clean `npm ci` using checked-in settings/lockfile | Pass; local SCALE adapter resolves, optional GPL packages excluded |
| `npm run setup:compiler` | Pass; official archive checksum verified; compiler 0.31.1 |
| `npm run compile` | Pass; 4 provable circuits, 4 proving keys, 4 verifying keys; Compact language 0.23.0 / runtime 0.16.0 |
| `npm run typecheck` | Pass |
| `npm run build`, imports of both core/network package exports | Pass |
| `npm test` | **33 passed, 0 failed, 0 skipped**; includes 64 scoring combinations |
| Simulator CLI | `[2,2,2]` -> score 1; `--mismatch` `[2,1,2]` -> score 0 |
| `npm run check:licenses` | Pass; **354 installed dependencies**, 28 optional entries absent |
| Local deployment/proof/three-player flow | Pass on `undeployed`; eight finalized game/deployment transactions, all `SucceedEntirely` |
| Local devnet re-run, 2026-10-05 (`npm run devnet:e2e`) | Pass; same eight transactions with real proofs, all `SucceedEntirely`, 180 s from wallet start to reveal; containers and network removed afterwards |
| `npm run preprod:check`, 2026-10-05 | Pass; the Preprod node answers `Midnight Preprod` and the indexer reports block 2,846,660 |
| `npm run preprod:e2e` without a fee wallet | Exits with code 2 before sending anything, and removes the proof server it started |
| Browser table, 2026-10-05 | Every state (start, picking, sealed, forged swap refused, all sealed, match, mismatch, error note) checked with Playwright Chromium at 1440x900, 820x1180 and 390x844: no horizontal overflow, no wrapped buttons, no console errors. The production build plays a full round under the `/sealed-pick/` subpath. |

Evidence: `evidence/test-output.txt`, `evidence/compile.json`, `evidence/dependency-licenses.json`, `evidence/devnet.json`. Network receipts are generated from the indexer's finalized transaction responses. No fabricated public deployment address or explorer link is supplied. Regenerate current local receipts with `npm run devnet:e2e`.

## Coverage

- Raw Compact circuit checks: unknown/duplicate/full rooms, option bounds, early commit/reveal, per-seat secret ownership, double commitment, changed choice/nonce, swapped openings, finalized-state immutability, room isolation.
- All six commit orders; no result becomes visible early.
- All 64 triples over four options agree with the cooperative scoring rule.
- Direct inspection of the **raw public ledger** confirms that choice fields remain their zero defaults until one atomic reveal. This test bypasses the API's `results: null` filtering.
- Client validation, malformed/duplicate/missing/cross-room shares, event privacy/copy isolation, unsubscribe, observer exceptions, serialized local operations, retained openings across ambiguous network failure.
- SCALE spec vectors, integer mode boundaries, DUST field range, oversized/noncanonical/truncated/trailing inputs, real SDK address encoding.
- Local chain validates real proofs for room creation, both joins, all three commits, and batch reveal. Before reveal the CLI asserts null results after every commit; after reveal it checks the third player's independent public-state read.

## Practical limits

The browser table (`packages/web`) was played end to end against the simulator: a matching round, a mismatching round, and a forged second commitment that the circuit refused. The repository has no automated browser tests yet; the layout checks above were run from a separate script. No public network was deployed: the Preprod path (`npm run preprod:e2e`) is ready, but funding requires a faucet CAPTCHA and no funded project wallet exists yet. Local services use disposable state and are stopped/removed by the runner. Public receipts cease to be queryable after that devnet is removed; they document a completed local run, not a persistent public deployment.

Default player private state is in memory. Session recovery, encrypted durable state, remote share transport, three physical clients, and dropout recovery are not tested/implemented. Atomic ledger disclosure does not guarantee that a coordinator cannot learn the choices before broadcasting the reveal. See `architecture.md` for the complete privacy boundary.
