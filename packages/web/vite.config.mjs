// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from "vite";
import wasm from 'vite-plugin-wasm';

// The Compact runtime's browser build imports its WebAssembly module as ESM, so keep it out of dependency pre-bundling.
export default defineConfig({
  plugins: [wasm()],
  build: { target: 'esnext' },
  optimizeDeps: { exclude: ['@midnight-ntwrk/compact-runtime', '@midnight-ntwrk/onchain-runtime-v3'] },
  server: { port: 5391, strictPort: true },
  preview: { port: 5391, strictPort: true },
});
