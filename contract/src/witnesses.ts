import {
  CompactTypeBytes,
  CompactTypeMerkleTreePath,
  StateBoundedMerkleTree,
} from "@midnight-ntwrk/compact-runtime";
import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import { pureCircuits } from "./managed/govfund/contract/index.js";
import type {
  Ledger,
  MerkleTreePath,
  Witnesses,
  ZswapCoinPublicKey,
} from "./managed/govfund/contract/index.js";
import { GovFundPrivateState, MEMBER_DEPTH } from "./types.js";

const bytesDescriptor = new CompactTypeBytes(32);

/**
 * Computes a member's committed identity: commit(pk(sk), salt).
 * Used off-chain to obtain the Merkle leaf before proving membership.
 */
export const memberCommit = (sk: Uint8Array, salt: Uint8Array): Uint8Array =>
  pureCircuits.memberCommit(pureCircuits.publicKeyOf(sk), salt);

/**
 * Rebuilds the members tree from the locally observed leaves and returns the
 * Merkle path proving `commit` is a leaf.
 */
const computeMemberPath = (
  leaves: Uint8Array[],
  commit: Uint8Array,
): MerkleTreePath<Uint8Array> => {
  let tree = new StateBoundedMerkleTree(MEMBER_DEPTH);
  leaves.forEach((leaf, index) => {
    tree = tree.update(BigInt(index), {
      value: bytesDescriptor.toValue(leaf),
      alignment: bytesDescriptor.alignment(),
    });
  });
  const rawPath = tree.rehash().findPathForLeaf({
    value: bytesDescriptor.toValue(commit),
    alignment: bytesDescriptor.alignment(),
  });
  if (rawPath === undefined) {
    throw new Error("Member leaf not found in the membership tree");
  }
  return new CompactTypeMerkleTreePath(MEMBER_DEPTH, bytesDescriptor).fromValue(
    rawPath.value,
  ) as MerkleTreePath<Uint8Array>;
};

export const createAdminState = (sk: Uint8Array): GovFundPrivateState => ({ sk });

export const createMemberState = (
  sk: Uint8Array,
  salt: Uint8Array,
  memberLeaves: Uint8Array[],
): GovFundPrivateState => ({ sk, salt, memberLeaves });

export const createCompanyState = (
  sk: Uint8Array,
  nonce: Uint8Array,
  coinPk: ZswapCoinPublicKey,
): GovFundPrivateState => ({ sk, nonce, coinPk });

/**
 * Binds every witness declared by the contract to a role's private state.
 * A role only ever invokes the circuits that use the witnesses relevant to it.
 */
export const witnesses = {
  admin_sk: ({
    privateState: ps,
  }: WitnessContext<Ledger, GovFundPrivateState>): [
    GovFundPrivateState,
    Uint8Array,
  ] => [ps, ps.sk!],

  member_sk: ({
    privateState: ps,
  }: WitnessContext<Ledger, GovFundPrivateState>): [
    GovFundPrivateState,
    Uint8Array,
  ] => [ps, ps.sk!],

  member_salt: ({
    privateState: ps,
  }: WitnessContext<Ledger, GovFundPrivateState>): [
    GovFundPrivateState,
    Uint8Array,
  ] => [ps, ps.salt!],

  company_sk: ({
    privateState: ps,
  }: WitnessContext<Ledger, GovFundPrivateState>): [
    GovFundPrivateState,
    Uint8Array,
  ] => [ps, ps.sk!],

  company_nonce: ({
    privateState: ps,
  }: WitnessContext<Ledger, GovFundPrivateState>): [
    GovFundPrivateState,
    Uint8Array,
  ] => [ps, ps.nonce!],

  member_path: (
    { privateState: ps }: WitnessContext<Ledger, GovFundPrivateState>,
    commit: Uint8Array,
  ): [GovFundPrivateState, MerkleTreePath<Uint8Array>] => [
    ps,
    computeMemberPath(ps.memberLeaves!, commit),
  ],
};
