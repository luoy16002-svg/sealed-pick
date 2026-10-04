import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum Phase { lobby = 0, committing = 1, ready = 2, revealed = 3 }

export type Opening = { choice: bigint; nonce: Uint8Array };

export type Room = { phase: Phase;
                     optionCount: bigint;
                     joined: bigint;
                     committedCount: bigint;
                     members: Uint8Array[];
                     commitments: Uint8Array[];
                     committed: boolean[];
                     choices: bigint[];
                     score: bigint
                   };

export type Witnesses<PS> = {
  playerSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  ownOpening(context: __compactRuntime.WitnessContext<Ledger, PS>,
             roomId_0: Uint8Array): [PS, Opening];
  allOpenings(context: __compactRuntime.WitnessContext<Ledger, PS>,
              roomId_0: Uint8Array): [PS, Opening[]];
}

export type ImpureCircuits<PS> = {
  createRoom(context: __compactRuntime.CircuitContext<PS>,
             roomId_0: Uint8Array,
             optionCount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  joinRoom(context: __compactRuntime.CircuitContext<PS>, roomId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  commit(context: __compactRuntime.CircuitContext<PS>,
         roomId_0: Uint8Array,
         slot_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  reveal(context: __compactRuntime.CircuitContext<PS>, roomId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  createRoom(context: __compactRuntime.CircuitContext<PS>,
             roomId_0: Uint8Array,
             optionCount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  joinRoom(context: __compactRuntime.CircuitContext<PS>, roomId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  commit(context: __compactRuntime.CircuitContext<PS>,
         roomId_0: Uint8Array,
         slot_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  reveal(context: __compactRuntime.CircuitContext<PS>, roomId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  playerId(roomId_0: Uint8Array, secret_0: Uint8Array): Uint8Array;
  commitment(roomId_0: Uint8Array, member_0: Uint8Array, opening_0: Opening): Uint8Array;
}

export type Circuits<PS> = {
  playerId(context: __compactRuntime.CircuitContext<PS>,
           roomId_0: Uint8Array,
           secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  commitment(context: __compactRuntime.CircuitContext<PS>,
             roomId_0: Uint8Array,
             member_0: Uint8Array,
             opening_0: Opening): __compactRuntime.CircuitResults<PS, Uint8Array>;
  createRoom(context: __compactRuntime.CircuitContext<PS>,
             roomId_0: Uint8Array,
             optionCount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  joinRoom(context: __compactRuntime.CircuitContext<PS>, roomId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  commit(context: __compactRuntime.CircuitContext<PS>,
         roomId_0: Uint8Array,
         slot_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  reveal(context: __compactRuntime.CircuitContext<PS>, roomId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  rooms: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Room;
    [Symbol.iterator](): Iterator<[Uint8Array, Room]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
