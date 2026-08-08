import { Contract, type GovFundPrivateState } from '../../contract/src/index.js';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';

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