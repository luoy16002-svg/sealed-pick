// SPDX-License-Identifier: Apache-2.0
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function fromHex(value: string): Uint8Array {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error('Expected 32 bytes as 64 lowercase hexadecimal characters');
  }
  return Uint8Array.from(value.match(/../g)!, (pair) => Number.parseInt(pair, 16));
}

export function random32(): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(32));
}

export function integer(value: number, min: number, max: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}`);
  }
}

