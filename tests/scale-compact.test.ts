// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { ByteSink, Src } from '@subsquid/scale-codec';
import { ScaleBigInt, DustAddress, MidnightBech32m, BLSScalar } from '@midnight-ntwrk/wallet-sdk-address-format';

// Vectors from Polkadot's public SCALE specification, plus the four mode boundaries.
const vectors: [bigint, string][] = [
  [0n, '00'], [1n, '04'], [42n, 'a8'], [63n, 'fc'], [64n, '0101'], [69n, '1501'],
  [16383n, 'fdff'], [16384n, '02000100'], [65535n, 'feff0300'],
  [1073741823n, 'feffffff'], [1073741824n, '0300000040'],
  [100000000000000n, '0b00407a10f35a'],
];

test('permissive SCALE adapter and real Midnight address package agree with specification vectors', () => {
  for (const [value, hex] of vectors) {
    const sink = new ByteSink();
    sink.compact(value);
    assert.equal(Buffer.from(sink.toBytes()).toString('hex'), hex);
    const src = new Src(Buffer.from(hex, 'hex'));
    assert.equal(src.compact(), value);
    src.assertEOF();
    assert.equal(ScaleBigInt.encode(value).toString('hex'), hex);
    assert.equal(ScaleBigInt.decode(Buffer.from(hex, 'hex')), value);
  }
});

test('SCALE adapter handles full DUST field and maximum format size without precision loss', () => {
  for (const value of [BLSScalar.modulus - 1n, (1n << 536n) - 1n]) {
    assert.equal(ScaleBigInt.decode(ScaleBigInt.encode(value)), value);
  }
  const dust = new DustAddress(BLSScalar.modulus - 1n);
  const encoded = MidnightBech32m.encode('undeployed', dust).asString();
  assert.equal(MidnightBech32m.parse(encoded).decode(DustAddress, 'undeployed').data, dust.data);
});

test('SCALE adapter rejects truncated, trailing, noncanonical and out-of-range values', () => {
  for (const hex of ['', '01', '02', '03', '0100', '02000000', '0300000000', '070000004000']) {
    assert.throws(() => ScaleBigInt.decode(Buffer.from(hex, 'hex')));
  }
  assert.throws(() => ScaleBigInt.decode(Buffer.from('0000', 'hex')), /trailing/);
  assert.throws(() => new ByteSink().compact(-1n), /out of range/);
  assert.throws(() => new ByteSink().compact(1n << 536n), /out of range/);
  assert.throws(() => new ByteSink().compact(Number.MAX_SAFE_INTEGER + 1), /safe integer/);
});
