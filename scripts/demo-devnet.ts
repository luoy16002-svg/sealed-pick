// SPDX-License-Identifier: Apache-2.0
// Hard-coded loopback-only devnet. This script cannot select a public network or call a faucet. The fee wallet is the
// devnet's well-known pre-funded genesis wallet, which exists only on this local chain.
import { LOCAL, playRound } from './network-game.js';

process.exitCode = await playRound(LOCAL, '0'.repeat(63) + '1');
