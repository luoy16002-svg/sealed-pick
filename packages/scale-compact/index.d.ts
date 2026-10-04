export declare class ByteSink {
  compact(input: number | bigint): void;
  toBytes(): Uint8Array;
}
export declare class Src {
  constructor(bytes: Uint8Array);
  compact(): bigint;
  assertEOF(): void;
}
