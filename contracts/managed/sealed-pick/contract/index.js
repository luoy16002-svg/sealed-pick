import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

export var Phase;
(function (Phase) {
  Phase[Phase['lobby'] = 0] = 'lobby';
  Phase[Phase['committing'] = 1] = 'committing';
  Phase[Phase['ready'] = 2] = 'ready';
  Phase[Phase['revealed'] = 3] = 'revealed';
})(Phase || (Phase = {}));

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_1 = new __compactRuntime.CompactTypeEnum(3, 1);

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_3 = new __compactRuntime.CompactTypeVector(3, _descriptor_0);

const _descriptor_4 = __compactRuntime.CompactTypeBoolean;

const _descriptor_5 = new __compactRuntime.CompactTypeVector(3, _descriptor_4);

const _descriptor_6 = new __compactRuntime.CompactTypeVector(3, _descriptor_2);

class _Room_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_5.alignment().concat(_descriptor_6.alignment().concat(_descriptor_2.alignment()))))))));
  }
  fromValue(value_0) {
    return {
      phase: _descriptor_1.fromValue(value_0),
      optionCount: _descriptor_2.fromValue(value_0),
      joined: _descriptor_2.fromValue(value_0),
      committedCount: _descriptor_2.fromValue(value_0),
      members: _descriptor_3.fromValue(value_0),
      commitments: _descriptor_3.fromValue(value_0),
      committed: _descriptor_5.fromValue(value_0),
      choices: _descriptor_6.fromValue(value_0),
      score: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.phase).concat(_descriptor_2.toValue(value_0.optionCount).concat(_descriptor_2.toValue(value_0.joined).concat(_descriptor_2.toValue(value_0.committedCount).concat(_descriptor_3.toValue(value_0.members).concat(_descriptor_3.toValue(value_0.commitments).concat(_descriptor_5.toValue(value_0.committed).concat(_descriptor_6.toValue(value_0.choices).concat(_descriptor_2.toValue(value_0.score)))))))));
  }
}

const _descriptor_7 = new _Room_0();

class _Opening_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return {
      choice: _descriptor_2.fromValue(value_0),
      nonce: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.choice).concat(_descriptor_0.toValue(value_0.nonce));
  }
}

const _descriptor_8 = new _Opening_0();

const _descriptor_9 = new __compactRuntime.CompactTypeVector(3, _descriptor_8);

class _tuple_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment())));
  }
  fromValue(value_0) {
    return [
      _descriptor_0.fromValue(value_0),
      _descriptor_0.fromValue(value_0),
      _descriptor_0.fromValue(value_0),
      _descriptor_2.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0[0]).concat(_descriptor_0.toValue(value_0[1]).concat(_descriptor_0.toValue(value_0[2]).concat(_descriptor_2.toValue(value_0[3]))));
  }
}

const _descriptor_10 = new _tuple_0();

const _descriptor_11 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class _Either_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_4.fromValue(value_0),
      left: _descriptor_0.fromValue(value_0),
      right: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.is_left).concat(_descriptor_0.toValue(value_0.left).concat(_descriptor_0.toValue(value_0.right)));
  }
}

const _descriptor_12 = new _Either_0();

const _descriptor_13 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_14 = new _ContractAddress_0();

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.playerSecret) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named playerSecret');
    }
    if (typeof(witnesses_0.ownOpening) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named ownOpening');
    }
    if (typeof(witnesses_0.allOpenings) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named allOpenings');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      playerId(context, ...args_1) {
        return { result: pureCircuits.playerId(...args_1), context };
      },
      commitment(context, ...args_1) {
        return { result: pureCircuits.commitment(...args_1), context };
      },
      createRoom: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`createRoom: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const roomId_0 = args_1[1];
        const optionCount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('createRoom',
                                     'argument 1 (as invoked from Typescript)',
                                     'sealed-pick.compact line 46 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(roomId_0.buffer instanceof ArrayBuffer && roomId_0.BYTES_PER_ELEMENT === 1 && roomId_0.length === 32)) {
          __compactRuntime.typeError('createRoom',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'sealed-pick.compact line 46 char 1',
                                     'Bytes<32>',
                                     roomId_0)
        }
        if (!(typeof(optionCount_0) === 'bigint' && optionCount_0 >= 0n && optionCount_0 <= 255n)) {
          __compactRuntime.typeError('createRoom',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'sealed-pick.compact line 46 char 1',
                                     'Uint<0..256>',
                                     optionCount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(roomId_0).concat(_descriptor_2.toValue(optionCount_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_2.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._createRoom_0(context,
                                            partialProofData,
                                            roomId_0,
                                            optionCount_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      joinRoom: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`joinRoom: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const roomId_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('joinRoom',
                                     'argument 1 (as invoked from Typescript)',
                                     'sealed-pick.compact line 60 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(roomId_0.buffer instanceof ArrayBuffer && roomId_0.BYTES_PER_ELEMENT === 1 && roomId_0.length === 32)) {
          __compactRuntime.typeError('joinRoom',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'sealed-pick.compact line 60 char 1',
                                     'Bytes<32>',
                                     roomId_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(roomId_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._joinRoom_0(context, partialProofData, roomId_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      commit: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`commit: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const roomId_0 = args_1[1];
        const slot_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('commit',
                                     'argument 1 (as invoked from Typescript)',
                                     'sealed-pick.compact line 78 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(roomId_0.buffer instanceof ArrayBuffer && roomId_0.BYTES_PER_ELEMENT === 1 && roomId_0.length === 32)) {
          __compactRuntime.typeError('commit',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'sealed-pick.compact line 78 char 1',
                                     'Bytes<32>',
                                     roomId_0)
        }
        if (!(typeof(slot_0) === 'bigint' && slot_0 >= 0n && slot_0 <= 255n)) {
          __compactRuntime.typeError('commit',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'sealed-pick.compact line 78 char 1',
                                     'Uint<0..256>',
                                     slot_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(roomId_0).concat(_descriptor_2.toValue(slot_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_2.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._commit_0(context,
                                        partialProofData,
                                        roomId_0,
                                        slot_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      reveal: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`reveal: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const roomId_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('reveal',
                                     'argument 1 (as invoked from Typescript)',
                                     'sealed-pick.compact line 108 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(roomId_0.buffer instanceof ArrayBuffer && roomId_0.BYTES_PER_ELEMENT === 1 && roomId_0.length === 32)) {
          __compactRuntime.typeError('reveal',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'sealed-pick.compact line 108 char 1',
                                     'Bytes<32>',
                                     roomId_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(roomId_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._reveal_0(context, partialProofData, roomId_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      createRoom: this.circuits.createRoom,
      joinRoom: this.circuits.joinRoom,
      commit: this.circuits.commit,
      reveal: this.circuits.reveal
    };
    this.provableCircuits = {
      createRoom: this.circuits.createRoom,
      joinRoom: this.circuits.joinRoom,
      commit: this.circuits.commit,
      reveal: this.circuits.reveal
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('createRoom', new __compactRuntime.ContractOperation());
    state_0.setOperation('joinRoom', new __compactRuntime.ContractOperation());
    state_0.setOperation('commit', new __compactRuntime.ContractOperation());
    state_0.setOperation('reveal', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_3, value_0);
    return result_0;
  }
  _persistentCommit_0(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_10,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _playerSecret_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.playerSecret(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('playerSecret',
                                 'return value',
                                 'sealed-pick.compact line 28 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _ownOpening_0(context, partialProofData, roomId_0) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.ownOpening(witnessContext_0,
                                                                     roomId_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && typeof(result_0.choice) === 'bigint' && result_0.choice >= 0n && result_0.choice <= 255n && result_0.nonce.buffer instanceof ArrayBuffer && result_0.nonce.BYTES_PER_ELEMENT === 1 && result_0.nonce.length === 32)) {
      __compactRuntime.typeError('ownOpening',
                                 'return value',
                                 'sealed-pick.compact line 29 char 1',
                                 'struct Opening<choice: Uint<0..256>, nonce: Bytes<32>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_8.toValue(result_0),
      alignment: _descriptor_8.alignment()
    });
    return result_0;
  }
  _allOpenings_0(context, partialProofData, roomId_0) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.allOpenings(witnessContext_0,
                                                                      roomId_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 3 && result_0.every((t) => typeof(t) === 'object' && typeof(t.choice) === 'bigint' && t.choice >= 0n && t.choice <= 255n && t.nonce.buffer instanceof ArrayBuffer && t.nonce.BYTES_PER_ELEMENT === 1 && t.nonce.length === 32))) {
      __compactRuntime.typeError('allOpenings',
                                 'return value',
                                 'sealed-pick.compact line 30 char 1',
                                 'Vector<3, struct Opening<choice: Uint<0..256>, nonce: Bytes<32>>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_9.toValue(result_0),
      alignment: _descriptor_9.alignment()
    });
    return result_0;
  }
  _playerId_0(roomId_0, secret_0) {
    return this._persistentHash_0([new Uint8Array([115, 101, 97, 108, 101, 100, 45, 112, 105, 99, 107, 58, 112, 108, 97, 121, 101, 114, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   roomId_0,
                                   secret_0]);
  }
  _commitment_0(roomId_0, member_0, opening_0) {
    return this._persistentCommit_0([new Uint8Array([115, 101, 97, 108, 101, 100, 45, 112, 105, 99, 107, 58, 99, 104, 111, 105, 99, 101, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                     roomId_0,
                                     member_0,
                                     opening_0.choice],
                                    opening_0.nonce);
  }
  _createRoom_0(context, partialProofData, roomId_0, optionCount_0) {
    const id_0 = roomId_0;
    const options_0 = optionCount_0;
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_2.toValue(0n),
                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Room already exists');
    __compactRuntime.assert(options_0 >= 2n && options_0 <= 16n,
                            'Options must be between 2 and 16');
    const member_0 = this._playerId_0(id_0,
                                      this._playerSecret_0(context,
                                                           partialProofData));
    const tmp_0 = { phase: 0,
                    optionCount: options_0,
                    joined: 1n,
                    committedCount: 0n,
                    members: [member_0, new Uint8Array(32), new Uint8Array(32)],
                    commitments: new Array(3).fill(new Uint8Array(32)),
                    committed: [false, false, false],
                    choices: [0n, 0n, 0n],
                    score: 0n };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_0),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _joinRoom_0(context, partialProofData, roomId_0) {
    const id_0 = roomId_0;
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(0n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Unknown room');
    const room_0 = _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(0n),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_0.toValue(id_0),
                                                                                                         alignment: _descriptor_0.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value);
    let t_0;
    __compactRuntime.assert(room_0.phase === 0
                            &&
                            (t_0 = room_0.joined, t_0 < 3n),
                            'Room is full');
    const member_0 = this._playerId_0(id_0,
                                      this._playerSecret_0(context,
                                                           partialProofData));
    this._folder_0(context,
                   partialProofData,
                   ((context, partialProofData, t_1, i_0) =>
                    {
                      __compactRuntime.assert(!this._equal_0(room_0.members[i_0],
                                                             member_0),
                                              'Player already joined');
                      return t_1;
                    }),
                   [],
                   [0n, 1n, 2n]);
    const tmp_0 = { phase: this._equal_3(room_0.joined, 2n) ? 1 : 0,
                    optionCount: room_0.optionCount,
                    joined:
                      ((t1) => {
                        if (t1 > 255n) {
                          throw new __compactRuntime.CompactError('sealed-pick.compact line 73 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                        }
                        return t1;
                      })(room_0.joined + 1n),
                    committedCount: room_0.committedCount,
                    members:
                      [room_0.members[0],
                       this._equal_2(room_0.joined, 1n) ?
                       member_0 :
                       room_0.members[1],
                       this._equal_1(room_0.joined, 2n) ?
                       member_0 :
                       room_0.members[2]],
                    commitments: room_0.commitments,
                    committed: room_0.committed,
                    choices: room_0.choices,
                    score: room_0.score };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_0),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _commit_0(context, partialProofData, roomId_0, slot_0) {
    const id_0 = roomId_0;
    const position_0 = slot_0;
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(0n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Unknown room');
    const room_0 = _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(0n),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_0.toValue(id_0),
                                                                                                         alignment: _descriptor_0.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value);
    __compactRuntime.assert(room_0.phase === 1,
                            'Room is not accepting commitments');
    __compactRuntime.assert(position_0 < 3n, 'Invalid slot');
    const member_0 = this._equal_4(position_0, 0n) ?
                     room_0.members[0] :
                     this._equal_5(position_0, 1n) ?
                     room_0.members[1] :
                     room_0.members[2];
    const alreadyCommitted_0 = this._equal_6(position_0, 0n) ?
                               room_0.committed[0] :
                               this._equal_7(position_0, 1n) ?
                               room_0.committed[1] :
                               room_0.committed[2];
    __compactRuntime.assert(this._equal_8(this._playerId_0(id_0,
                                                           this._playerSecret_0(context,
                                                                                partialProofData)),
                                          member_0),
                            'Player does not own slot');
    __compactRuntime.assert(!alreadyCommitted_0, 'Player already committed');
    const opening_0 = this._ownOpening_0(context, partialProofData, id_0);
    let t_0;
    __compactRuntime.assert((t_0 = opening_0.choice, t_0 < room_0.optionCount),
                            'Choice is out of range');
    const digest_0 = this._commitment_0(id_0, member_0, opening_0);
    const tmp_0 = { phase: this._equal_15(room_0.committedCount, 2n) ? 2 : 1,
                    optionCount: room_0.optionCount,
                    joined: room_0.joined,
                    committedCount:
                      ((t1) => {
                        if (t1 > 255n) {
                          throw new __compactRuntime.CompactError('sealed-pick.compact line 101 char 21: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                        }
                        return t1;
                      })(room_0.committedCount + 1n),
                    members: room_0.members,
                    commitments:
                      [this._equal_13(position_0, 0n) ?
                       digest_0 :
                       room_0.commitments[0],
                       this._equal_14(position_0, 1n) ?
                       digest_0 :
                       room_0.commitments[1],
                       this._equal_12(position_0, 2n) ?
                       digest_0 :
                       room_0.commitments[2]],
                    committed:
                      [room_0.committed[0] || this._equal_10(position_0, 0n),
                       room_0.committed[1] || this._equal_11(position_0, 1n),
                       room_0.committed[2] || this._equal_9(position_0, 2n)],
                    choices: room_0.choices,
                    score: room_0.score };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_0),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _reveal_0(context, partialProofData, roomId_0) {
    const id_0 = roomId_0;
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(0n),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Unknown room');
    const room_0 = _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(0n),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_0.toValue(id_0),
                                                                                                         alignment: _descriptor_0.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value);
    __compactRuntime.assert(room_0.phase === 2
                            &&
                            this._equal_16(room_0.committedCount, 3n),
                            'Not ready to reveal');
    const openings_0 = this._allOpenings_0(context, partialProofData, id_0);
    this._folder_1(context,
                   partialProofData,
                   ((context, partialProofData, t_0, i_0) =>
                    {
                      let t_1;
                      __compactRuntime.assert((t_1 = openings_0[i_0].choice,
                                               t_1 < room_0.optionCount),
                                              'Choice is out of range');
                      __compactRuntime.assert(this._equal_17(this._commitment_0(id_0,
                                                                                room_0.members[i_0],
                                                                                openings_0[i_0]),
                                                             room_0.commitments[i_0]),
                                              'Opening does not match commitment');
                      return t_0;
                    }),
                   [],
                   [0n, 1n, 2n]);
    const choices_0 = [openings_0[0].choice,
                       openings_0[1].choice,
                       openings_0[2].choice];
    const matched_0 = this._equal_18(choices_0[0], choices_0[1])
                      &&
                      this._equal_19(choices_0[1], choices_0[2]);
    const tmp_0 = { phase: 3,
                    optionCount: room_0.optionCount,
                    joined: room_0.joined,
                    committedCount: room_0.committedCount,
                    members: room_0.members,
                    commitments: room_0.commitments,
                    committed: room_0.committed,
                    choices: choices_0,
                    score: matched_0 ? 1n : 0n };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_0),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _folder_0(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 3; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
  }
  _equal_1(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_4(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_5(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_6(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_7(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_8(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_9(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_10(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_11(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_12(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_13(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_14(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_15(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_16(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_17(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _folder_1(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 3; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
  }
  _equal_18(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_19(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    rooms: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(0n),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(0n),
                                                                                                                                 alignment: _descriptor_11.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_2.toValue(0n),
                                                                                                      alignment: _descriptor_2.alignment() } }] } },
                                                                           'size',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'sealed-pick.compact line 25 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(0n),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'sealed-pick.compact line 25 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(0n),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[0];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_7.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  playerSecret: (...args) => undefined,
  ownOpening: (...args) => undefined,
  allOpenings: (...args) => undefined
});
export const pureCircuits = {
  playerId: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`playerId: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const roomId_0 = args_0[0];
    const secret_0 = args_0[1];
    if (!(roomId_0.buffer instanceof ArrayBuffer && roomId_0.BYTES_PER_ELEMENT === 1 && roomId_0.length === 32)) {
      __compactRuntime.typeError('playerId',
                                 'argument 1',
                                 'sealed-pick.compact line 32 char 1',
                                 'Bytes<32>',
                                 roomId_0)
    }
    if (!(secret_0.buffer instanceof ArrayBuffer && secret_0.BYTES_PER_ELEMENT === 1 && secret_0.length === 32)) {
      __compactRuntime.typeError('playerId',
                                 'argument 2',
                                 'sealed-pick.compact line 32 char 1',
                                 'Bytes<32>',
                                 secret_0)
    }
    return _dummyContract._playerId_0(roomId_0, secret_0);
  },
  commitment: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`commitment: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const roomId_0 = args_0[0];
    const member_0 = args_0[1];
    const opening_0 = args_0[2];
    if (!(roomId_0.buffer instanceof ArrayBuffer && roomId_0.BYTES_PER_ELEMENT === 1 && roomId_0.length === 32)) {
      __compactRuntime.typeError('commitment',
                                 'argument 1',
                                 'sealed-pick.compact line 38 char 1',
                                 'Bytes<32>',
                                 roomId_0)
    }
    if (!(member_0.buffer instanceof ArrayBuffer && member_0.BYTES_PER_ELEMENT === 1 && member_0.length === 32)) {
      __compactRuntime.typeError('commitment',
                                 'argument 2',
                                 'sealed-pick.compact line 38 char 1',
                                 'Bytes<32>',
                                 member_0)
    }
    if (!(typeof(opening_0) === 'object' && typeof(opening_0.choice) === 'bigint' && opening_0.choice >= 0n && opening_0.choice <= 255n && opening_0.nonce.buffer instanceof ArrayBuffer && opening_0.nonce.BYTES_PER_ELEMENT === 1 && opening_0.nonce.length === 32)) {
      __compactRuntime.typeError('commitment',
                                 'argument 3',
                                 'sealed-pick.compact line 38 char 1',
                                 'struct Opening<choice: Uint<0..256>, nonce: Bytes<32>>',
                                 opening_0)
    }
    return _dummyContract._commitment_0(roomId_0, member_0, opening_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
