// SPDX-License-Identifier: Apache-2.0
// Original implementation of the public SCALE compact-unsigned-integer format.
// Only the ByteSink/Src methods used by Midnight address-format are provided.
// This is NOT the upstream @subsquid/scale-codec implementation or a general codec.
export class ByteSink {
  #bytes = [];

  compact(input) {
    if (typeof input !== 'bigint' && (typeof input !== 'number' || !Number.isSafeInteger(input))) {
      throw new Error('SCALE compact value must be a bigint or safe integer');
    }
    const value = BigInt(input);
    if (value < 0n || value >= (1n << 536n)) throw new Error('SCALE compact integer is out of range');
    let encoded;
    let length;
    if (value < 64n) { encoded = value << 2n; length = 1; }
    else if (value < 16384n) { encoded = (value << 2n) | 1n; length = 2; }
    else if (value < (1n << 30n)) { encoded = (value << 2n) | 2n; length = 4; }
    else {
      length = Math.ceil(value.toString(2).length / 8);
      this.#bytes.push(((length - 4) << 2) | 3);
      encoded = value;
    }
    for (let i = 0; i < length; i++) {
      this.#bytes.push(Number(encoded & 255n));
      encoded >>= 8n;
    }
  }

  toBytes() { return Uint8Array.from(this.#bytes); }
}

export class Src {
  #bytes;
  #offset = 0;

  constructor(bytes) {
    if (!(bytes instanceof Uint8Array)) throw new Error('SCALE input must be bytes');
    this.#bytes = new Uint8Array(bytes);
  }

  compact() {
    const header = this.#bytes[this.#offset];
    if (header === undefined) throw new Error('Truncated SCALE integer');
    const mode = header & 3;
    const length = mode === 0 ? 1 : mode === 1 ? 2 : mode === 2 ? 4 : (header >> 2) + 4;
    const start = this.#offset + (mode === 3 ? 1 : 0);
    const end = start + length;
    if (end > this.#bytes.length) throw new Error('Truncated SCALE integer');
    let value = 0n;
    for (let i = end - 1; i >= start; i--) value = (value << 8n) | BigInt(this.#bytes[i]);
    if (mode < 3) value >>= 2n;
    if ((mode === 1 && value < 64n) || (mode === 2 && value < 16384n)
      || (mode === 3 && (value < (1n << 30n) || this.#bytes[end - 1] === 0))) {
      throw new Error('Non-canonical SCALE integer');
    }
    this.#offset = end;
    return value;
  }

  assertEOF() {
    if (this.#offset !== this.#bytes.length) throw new Error('Unexpected trailing SCALE bytes');
  }
}
