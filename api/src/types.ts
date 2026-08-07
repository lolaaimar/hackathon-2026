import type {
  Ledger,
  MerkleTreePath,
  Maybe,
  Proposal,
  ProjectInfo,
  ProjectStatus,
  QualifiedShieldedCoinInfo,
  ShieldedCoinInfo,
  Stage,
  Winner,
  Witnesses,
  ZswapCoinPublicKey,
} from "../../contract/src/managed/govfund/contract/index.js";

export type {
  Ledger,
  MerkleTreePath,
  Maybe,
  Proposal,
  ProjectInfo,
  ProjectStatus,
  QualifiedShieldedCoinInfo,
  ShieldedCoinInfo,
  Stage,
  Winner,
  Witnesses,
  ZswapCoinPublicKey,
};

export const MAX_STAGES = 10;
export const MEMBER_DEPTH = 16;

/**
 * Private state shared by every role. Each role only populates the fields it
 * needs:
 *  - admin:   sk
 *  - member:  sk, salt, memberLeaves
 *  - company: sk, nonce, coinPk
 */
export type GovFundPrivateState = {
  readonly sk?: Uint8Array;
  readonly salt?: Uint8Array;
  readonly nonce?: Uint8Array;
  readonly coinPk?: ZswapCoinPublicKey;
  readonly memberLeaves?: Uint8Array[];
};

export type AdminPrivateState = Pick<GovFundPrivateState, "sk">;
export type MemberPrivateState = Pick<GovFundPrivateState, "sk" | "salt" | "memberLeaves">;
export type CompanyPrivateState = Pick<GovFundPrivateState, "sk" | "nonce" | "coinPk">;
