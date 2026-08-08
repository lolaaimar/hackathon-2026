import { Contract, type GovFundPrivateState } from '../../contract/src/index.js';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type {
  DeployedContract,
  FoundContract,
} from '@midnight-ntwrk/midnight-js-contracts';

// Provable circuit IDs produced by compactc for the main GovFund contract,
// taken from the generated `managed/govfund/contract/index.d.ts`.
export type GovFundCircuits =
  | 'Mem_activeMemberCount'
  | 'Mem_isRevoked'
  | 'Mem_isMember'
  | 'addMember'
  | 'removeMember'
  | 'setQuorumPercent'
  | 'setApprovalsRequired'
  | 'createProject'
  | 'submitProposal'
  | 'vote'
  | 'finalizeSelection'
  | 'revealCompany'
  | 'fundProject'
  | 'withdrawCollateral'
  | 'requestPayment'
  | 'approveStage'
  | 'rejectStage'
  | 'voteTerminate'
  | 'cancelProject'
  | 'expireFunding';

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