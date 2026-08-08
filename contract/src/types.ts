import { ZswapCoinPublicKey } from "./managed/govfund/contract/index.js";

export const MAX_STAGES = 10;
export const MEMBER_DEPTH = 16;

/**
 * Private state shared by every role. Each role only populates the fields it
 * needs:
 *  - admin:   sk
 *  - member:  sk, salt
 *  - company: sk, nonce, coinPk
 */
export type GovFundPrivateState = {
  readonly sk?: Uint8Array;
  readonly salt?: Uint8Array;
  readonly nonce?: Uint8Array;
  readonly coinPk?: ZswapCoinPublicKey;
};

export type AdminPrivateState = Pick<GovFundPrivateState, "sk">;
export type MemberPrivateState = Pick<GovFundPrivateState, "sk" | "salt">;
export type CompanyPrivateState = Pick<GovFundPrivateState, "sk" | "nonce" | "coinPk">;