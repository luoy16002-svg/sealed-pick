# Dependency and attribution notes

Original project code, Compact source, generated contract code, and the local SCALE adapter are Apache-2.0; see the root `LICENSE`. The repo does not vendor `node_modules` or Docker images. Each third-party package retains its own notices/license.

Direct application dependencies are the official Compact runtime and Midnight.js contract/protocol packages. Development dependencies are TypeScript, Node types, the official Midnight testkit/providers, RxJS, and Pino. Testkit's 4.1.1 release brings its pinned Wallet SDK 1.1.0; the lockfile records its exact component versions. No UI framework, custom cryptography library, separate testing framework, or TypeScript runtime transpiler is needed.

## GPL transitive dependencies resolved

The unmodified SDK dependency tree introduces GPL-3.0 `@subsquid/scale-codec` and its utilities via wallet address formatting, and optional GPL light-client packages via Polkadot. Apache compatibility is not symmetric; do not describe a combined GPL distribution as Apache-only ([ASF explanation](https://www.apache.org/licenses/GPL-compatibility.html)).

This project avoids those components:

- `.npmrc` sets `omit=optional`. Unused `@substrate/connect`, its GPL companion packages, and `smoldot` remain optional metadata in the npm lockfile but are not installed or used. This project connects to a full local node over WebSocket, never the embedded light client.
- `packages/scale-compact` is an original Apache-2.0 implementation of the standard compact unsigned SCALE integer representation. Root dependency/override redirects `@subsquid/scale-codec` to this local package. No upstream GPL implementation was copied. It only provides `ByteSink.compact/toBytes` and `Src.compact/assertEOF`, the API surface used by the pinned Midnight address-format package. It is not a general replacement for the upstream codec.
- The adapter is checked against [Polkadot's published encoding vectors](https://docs.polkadot.com/reference/parachains/data-encoding/), mode boundaries, full DUST-field values, malformed/truncated/trailing input, and an actual Midnight DUST address encode/decode. The full local-chain wallet/proof/deployment run also exercises this dependency set.
- `npm run check:licenses` records every installed dependency in `notes/evidence/dependency-licenses.json` and rejects licenses outside the permissive allowlist. This is a metadata/source-license check, not a legal opinion.

The three Midnight WASM packages (`ledger-v8`, `onchain-runtime-v3`, `zkir-v2`) omit SPDX license metadata in their published npm manifests. Their ledger source uses [Apache-2.0](https://github.com/midnightntwrk/midnight-ledger/blob/main/LICENSE); the evidence report records that source explicitly. Legacy `licenses` metadata is used for `buildcheck`, `cpu-features`, and `ssh2` if installed (MIT).

## Upstream references

- Compact compiler/runtime and Midnight.js: Midnight Foundation / IOG, original package notices retained by npm.
- Local service versions/environment configuration follow the Apache-2.0 [midnight-local-dev](https://github.com/midnightntwrk/midnight-local-dev) project. Node, indexer, and proof server run as separate development tools; base-image operating-system packages retain their own licenses.
- The `LICENSE` text was obtained from [Apache](https://www.apache.org/licenses/LICENSE-2.0.txt).

Keep root install settings when using the private core workspace. A downstream app choosing a different SDK version must recheck the adapter's narrow interface and its own dependency tree. Do not remove the override while retaining an Apache-only dependency claim.
