import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { Contract, GovFundPrivateState } from '../../contract/src/index.js';

// Provable circuit IDs produced by compactc for the main GovFund contract,
// taken from the generated `managed/govfund/contract/index.d.ts`.
export type GovFundCircuits =
  | 'manageMember'
  | 'createProject'
  | 'submitProposal'
  | 'vote'
  | 'settleProject'
  | 'revealCompany'
  | 'fundProject'
  | 'withdrawCollateral'
  | 'requestPayment'
  | 'approveStage'
  | 'rejectStage'
  | 'voteTerminate';

export const GovFundPrivateStateId = 'GovFundPrivateState';

export type GovFundProviders = MidnightProviders<
  GovFundCircuits,
  typeof GovFundPrivateStateId,
  GovFundPrivateState
>;

export type GovFundContract = Contract.Contract<GovFundPrivateState>;

/**
 * A deployed GovFund contract (freshly deployed or found), exposing the typed
 * `callTx` interface for every circuit.
 */
export type GovFundDeployedContract =
  | DeployedContract<GovFundContract>
  | FoundContract<GovFundContract>;
