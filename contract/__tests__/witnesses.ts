import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import {
  type Ledger,
  type MerkleTreePath,
  pureCircuits,
  type Witnesses,
} from '../src/managed/govfund/contract/index.js';

/**
 * Private state shared by every role in the tests. The simulator swaps
 * `sk`/`salt`/`nonce` between calls to act as different members/companies.
 */
export type TestPrivateState = {
  readonly sk: Uint8Array;
  readonly salt?: Uint8Array;
  readonly nonce?: Uint8Array;
};

/** Deterministic 32-byte value from a seed byte. */
export const bytes = (seed: number): Uint8Array => new Uint8Array(32).fill(seed);

export const memberState = (seed: number): TestPrivateState => ({
  sk: bytes(seed),
  salt: bytes(seed + 0x10),
});

export const companyState = (seed: number): TestPrivateState => ({
  sk: bytes(seed),
  nonce: bytes(seed + 0x20),
});

export const adminState = (seed: number): TestPrivateState => ({
  sk: bytes(seed),
});

export const makeTestWitnesses = (): Witnesses<TestPrivateState> => ({
  admin_sk: ({
    privateState,
  }: WitnessContext<Ledger, TestPrivateState>): [TestPrivateState, Uint8Array] => [
    privateState,
    privateState.sk,
  ],

  member_sk: ({
    privateState,
  }: WitnessContext<Ledger, TestPrivateState>): [TestPrivateState, Uint8Array] => [
    privateState,
    privateState.sk,
  ],

  member_pk: ({
    privateState,
  }: WitnessContext<Ledger, TestPrivateState>): [TestPrivateState, Uint8Array] => [
    privateState,
    pureCircuits.publicKeyOf(privateState.sk),
  ],

  member_salt: ({
    privateState,
  }: WitnessContext<Ledger, TestPrivateState>): [TestPrivateState, Uint8Array] => [
    privateState,
    privateState.salt ?? new Uint8Array(32),
  ],

  company_sk: ({
    privateState,
  }: WitnessContext<Ledger, TestPrivateState>): [TestPrivateState, Uint8Array] => [
    privateState,
    privateState.sk,
  ],

  company_nonce: ({
    privateState,
  }: WitnessContext<Ledger, TestPrivateState>): [TestPrivateState, Uint8Array] => [
    privateState,
    privateState.nonce ?? new Uint8Array(32),
  ],

  member_path: (
    { privateState, ledger: l }: WitnessContext<Ledger, TestPrivateState>,
    commit: Uint8Array,
  ): [TestPrivateState, MerkleTreePath<Uint8Array>] => {
    const path = l.Mem_members.findPathForLeaf(commit);
    if (path === undefined) {
      // Not a member: return a fabricated path so the contract's own
      // "Not a member" assertion (root mismatch) fires instead of failing
      // here in the witness.
      return [
        privateState,
        {
          leaf: commit,
          path: Array.from({ length: 6 }, () => ({
            sibling: { field: 0n },
            goes_left: false,
          })),
        },
      ];
    }
    return [privateState, path];
  },
});
