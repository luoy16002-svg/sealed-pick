# Sealed Pick: engineering notes

## State and flow

One Compact deployment hosts multiple rooms in `Map<Bytes<32>, Room>`. Each room has exactly three seats, 2–16 numeric options, and one round. Creator takes seat 0; distinct joins take seats 1 and 2. Third join closes the lobby. Every player commits once; third commitment changes phase to `ready`. `reveal` checks three openings and publishes the three choices plus score in one transaction. Score is 1 iff all choices match, otherwise 0. No balances, transfers, wagers, prizes, or token logic exist in the game contract.

```text
lobby -- third player joins --> committing -- third commitment --> ready
                                                                    |
                                             all three valid openings|
                                                                    v
                                                                revealed
```

`contracts/sealed-pick.compact` is the authority for transitions and validation. Generated JS executes the same circuits in `Simulator`; no second implementation of the game rules exists. `SealedPickClient` manages player secrets/openings and provides a uniform async API. `MidnightTransport` submits actual proofs/transactions through Midnight.js and reads finalized public state via the indexer.

Each client serializes its own operations. Different players can encounter ordinary on-chain state conflicts; refetch and retry as appropriate. A failed or uncertain commit retains its original opening, so a retry never silently commits a different choice. Reveals are immutable once accepted. There is no reset, timeout, room deletion, administrative override, or rematch; create a new room for another round.

## Privacy boundary

| Data | Location / visibility |
| --- | --- |
| Random 32-byte player secret | Client private state; private witness for seat ownership |
| Choice and random 32-byte nonce before reveal | Player private state; private witness for commitment proof |
| Room ID, option count, seat pseudonyms, commitment hashes, flags/counts, phase | Public ledger |
| All three choices and score after reveal | Public ledger, atomic update |
| Nonces and player secrets after reveal | Never written to the public ledger |
| Reveal shares after `ready` | Private off-chain transfer to a cooperating reveal coordinator |

Seat pseudonym = `persistentHash(domain, roomId, playerSecret)`.
Choice seal = `persistentCommit((domain, roomId, seatPseudonym, choice), nonce)`.
Domains are fixed, separate 32-byte tags. The circuit proves ownership and option bounds without disclosing the choice, nonce, or secret. Only the seal is disclosed on commit. `reveal` proves all openings against all public seals before disclosing all choices. Compact's disclosure checks and generated ZK circuits enforce that boundary. Salt entropy comes from `crypto.getRandomValues`; zero or reused salts are not produced by the client.

The proof server necessarily receives private proof inputs. The provided setup points only to loopback; treat any remote proving service as trusted with witnesses. Never serialize or log Midnight.js transaction objects or their `.private` fields. Evidence files select only public identifiers, block heights, status, and the final public result.

The simulator does not generate or verify cryptographic proofs and has no decentralized trust boundary. It is for UI development and circuit tests in a single trusted process. The devnet flow generates proofs and obtains chain finalization.

## Atomic reveal and its limits

The ledger never offers a per-player public reveal. Once all commits exist, each player's `exportOpening` checks the public phase and its own seal, then releases a share to the coordinator. That coordinator learns the batch before broadcasting the reveal transaction. This is a cooperative protocol, not threshold encryption, automatic decryption, or guaranteed simultaneous knowledge for all humans.

Players can voluntarily disclose their own choices early outside the API; no blockchain can prevent that. An offline or withholding player can stall the room indefinitely. Lost private state also prevents opening that player's seal. The default clients/private providers are memory-only: retain each client for the round, and do not refresh a network session mid-round. Durable encrypted private-state recovery and authenticated share delivery are future integration work, not claimed features. Three clients in the demo are separate private states within one process, not three independent devices.

Room IDs are public invitation identifiers, not access-control secrets. Player secrets establish per-room seat ownership, not personhood; one person can occupy multiple seats with different secrets. The local CLI uses one genesis wallet to sponsor fees for all seats. Room pseudonyms do not hide transaction timing, fee payer, seat number, or membership.

## Handoff scope

The browser table in `packages/web` runs three `SealedPickClient` instances against one `Simulator`, so every button press executes the generated circuits in the page. It has no UI framework dependency. The local chain is disposable and its receipts are never presented as public-testnet transactions.
