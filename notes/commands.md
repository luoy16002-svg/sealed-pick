# Exact commands

Run every command from this repository folder. Node.js >=22, npm >=11, and Docker Desktop with Linux containers are required for the full workflow. Verified host: Windows, Node 24.14.0, npm 11.9.0, Docker Engine 28.1.1. Linux/macOS compiler bootstrap additionally uses `unzip`; Docker runs the pinned Linux amd64 compiler (emulated on ARM if supported).

## Immediate simulator / UI development

```sh
npm ci
npm run build
npm run demo
npm run demo -- --mismatch
```

No server, wallet, login, or Docker is needed for these commands. `demo` compiles the TypeScript runner automatically and uses the checked-in generated Compact JS. Expected final lines:

```text
REVEAL {"choices":[2,2,2],"matched":true,"score":1}
REVEAL {"choices":[2,1,2],"matched":false,"score":0}
```

## Contract compilation and verification

```sh
npm run setup:compiler
npm run compile
npm run typecheck
npm test
npm run check:licenses
```

`setup:compiler` downloads Compact 0.31.1 from the official release into `.tools/`, verifies the pinned SHA-256, and checks it inside Docker. Windows' system `compact.exe` is a filesystem utility, not the Midnight compiler; the scripts never invoke it. No global installation or shell-profile change is made.

`compile` generates JS/types, ZKIR, and all proving/verifying keys, and records the source hash in `.cache/proving-build.json`. First compilation downloads proving parameters into `.cache/compact/`. The compiler container exits immediately afterward. Large keys/ZKIR are generated locally and ignored by Git; the generated contract JS/types/info are included for a zero-setup simulator.

For fast contract iteration only: `npm run compile:fast`. This omits proving-key generation. Always run the full `compile` before any devnet operation; the network demo checks the current source hash against the last proving build.

`npm test` uses Node's built-in test runner after TypeScript compilation. No test server or watcher remains. `npm run build` emits the UI workspace package in `packages/core/dist`. Temporary runnable JS goes to `.cache/run`.

## Real local deployment, proofs, and three-player game

```sh
npm run devnet:e2e
```

Run full `compile` once first. This command:

1. Starts the isolated `sealed-pick-devnet` Docker Compose project and waits for all services.
2. Initializes the pre-funded local genesis fee wallet, enables its local DUST generation, and waits for usable DUST. No faucet or account is involved.
3. Deploys the compiled contract; creates a room; joins two players; generates three commitment proofs; generates one atomic reveal proof; waits for every transaction to finalize.
4. Confirms `SucceedEntirely` for eight game/deployment transactions and validates the public result `[2,2,2]`, score 1.
5. Writes only public receipts to `notes/evidence/devnet.json`.
6. Stops/removes its node, indexer, proof server, and Compose network in `finally`, including on failure. It also shuts down these project services if they were already up.

The first run pulls Docker images and proving parameters; allow several minutes. All addresses/receipts belong to **local `undeployed`**, not Preview, Preprod, or Mainnet. The chain is disposable and a new run produces different contract/transaction IDs. The genesis wallet's well-known seed is for this loopback devnet only. No real-value tokens are used.

For manual UI integration, the explicit commands are:

```sh
npm run devnet:up
npm run demo:devnet
npm run devnet:down
```

Always finish with `devnet:down`, or prefer `devnet:e2e` for automatic cleanup. `demo:devnet` closes the wallet but does not own/stop the external services.

| Service | Loopback endpoint |
| --- | --- |
| Node | `http://127.0.0.1:9944` / `ws://127.0.0.1:9944` |
| Indexer | `http://127.0.0.1:8088/api/v4/graphql` |
| Indexer subscription | `ws://127.0.0.1:8088/api/v4/graphql/ws` |
| Proof server | `http://127.0.0.1:6300` |

Do not stop another project's services if ports conflict; change this project's Compose ports and matching loopback constants together. The supplied devnet script has no public-network or faucet option. A brief `subscribeRuntimeVersion ... Normal Closure` message during wallet startup was observed on successful runs and is not itself failure. Use exit status, receipt status, and the final reveal as success evidence.

## License-sensitive install settings

Use this repository's `.npmrc` and lockfile. `omit=optional` excludes unused GPL light-client packages. The local SCALE integer adapter replaces a GPL transitive codec; `notes/licenses.md` explains its scope and tests. Do not override these choices with `--include=optional`. `check:licenses` verifies what is actually installed. No vendored `node_modules`, compiler binaries, logs, caches, or wallet/private-state files should be published.
