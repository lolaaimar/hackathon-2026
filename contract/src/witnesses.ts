import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import { pureCircuits } from "./managed/govfund/contract/index.js";
import type {
  Ledger,
  MerkleTreePath,
  Witnesses,
  ZswapCoinPublicKey,
} from "./managed/govfund/contract/index.js";
import { GovFundPrivateState } from "./types.js";

/**
 * Computes a member's committed identity: commit(pk(sk), salt).
 * Used off-chain to obtain the Merkle leaf before proving membership.
 */
export const memberCommit = (sk: Uint8Array, salt: Uint8Array): Uint8Array =>
  pureCircuits.memberCommit(pureCircuits.publicKeyOf(sk), salt);

export const createAdminState = (sk: Uint8Array): GovFundPrivateState => ({ sk });

export const createMemberState = (
  sk: Uint8Array,
  salt: Uint8Array,
): GovFundPrivateState => ({ sk, salt });

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
    { privateState: ps, ledger: l }: WitnessContext<Ledger, GovFundPrivateState>,
    commit: Uint8Array,
  ): [GovFundPrivateState, MerkleTreePath<Uint8Array>] => {
    const path = l.Mem_members.findPathForLeaf(commit);
    if (path === undefined) {
      throw new Error("Member leaf not found in the membership tree");
    }
    return [ps, path];
  },
};
