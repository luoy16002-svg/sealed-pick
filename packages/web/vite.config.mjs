// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from "vite";
import wasm from 'vite-plugin-wasm';

// The Compact runtime's browser build imports its WebAssembly module as ESM, so keep it out of dependency pre-bundling.
// Its one CommonJS dependency (object-inspect) still has to be pre-bundled, or the dev server cannot import it.
// Relative asset paths, so the same build works at a site root and under GitHub Pages' /sealed-pick/ path.
export default defineConfig({
  base: './',
  plugins: [wasm()],
  build: { target: 'esnext' },
  optimizeDeps: {
    exclude: ['@midnight-ntwrk/compact-runtime', '@midnight-ntwrk/onchain-runtime-v3'],
    include: ['@midnight-ntwrk/compact-runtime > object-inspect'],
  },
  server: { port: 5391, strictPort: true },
  preview: { port: 5391, strictPort: true },
});
