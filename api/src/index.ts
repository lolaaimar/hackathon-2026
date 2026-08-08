import type { ShieldedCoinInfo, Stage, ZswapCoinPublicKey } from '../../contract/src/index.js';
import type { GovFundDeployedContract } from './common-types.js';

export type {
  Ledger,
  Maybe,
  MerkleTreePath,
  ProjectInfo,
  ProjectStatus,
  Proposal,
  QualifiedShieldedCoinInfo,
  ShieldedCoinInfo,
  Stage,
  Winner,
  Witnesses,
  ZswapCoinPublicKey,
} from '../../contract/src/index.js';
// biome-ignore lint/performance/noBarrelFile: public package entry point
export { GovFund, ledger } from '../../contract/src/index.js';
// biome-ignore lint/performance/noReExportAll: public package entry point
export * from '../../contract/src/types.js';
// biome-ignore lint/performance/noReExportAll: public package entry point
export * from '../../contract/src/witnesses.js';
// biome-ignore lint/performance/noReExportAll: public package entry point
export * from './common-types.js';

export type DeployArguments = {
  quorumPercentParam: bigint;
  fundingTokenParam: Uint8Array;
  treasuryParam: ZswapCoinPublicKey;
  approvalsRequiredParam: bigint;
};

// ---------------------------- Admin circuits -------------------------------

/** Admin adds a government member by their committed identity. */
export const addMember = (d: GovFundDeployedContract) => (memberCommit: Uint8Array) =>
  d.callTx.manageMember(memberCommit, false);

/** Admin revokes a government member by their committed identity. */
export const removeMember = (d: GovFundDeployedContract) => (memberCommit: Uint8Array) =>
  d.callTx.manageMember(memberCommit, true);

// ------------------------------ Project circuits ---------------------------

/** A member opens a project in Voting phase. */
export const createProject = (
  d: GovFundDeployedContract,
  projectId: Uint8Array,
  title: string,
  collateralRequired: bigint,
  maxStageRejections: bigint,
) => d.callTx.createProject(projectId, title, collateralRequired, maxStageRejections);

/** A company bids a budget and stage schedule, depositing collateral. */
export const submitProposal =
  (d: GovFundDeployedContract) =>
  (
    projectId: Uint8Array,
    proposalId: Uint8Array,
    budget: bigint,
    collateralAmount: bigint,
    stageCount: bigint,
    stages: Stage[],
    collateralCoin: ShieldedCoinInfo,
  ) =>
    d.callTx.submitProposal(
      projectId,
      proposalId,
      budget,
      collateralAmount,
      stageCount,
      stages,
      collateralCoin,
    );

/** A member anonymously casts a vote for a proposal. */
export const vote =
  (d: GovFundDeployedContract) => (projectId: Uint8Array, proposalId: Uint8Array) =>
    d.callTx.vote(projectId, proposalId);

/** Picks the plurality winner once quorum is reached (`Voting` -> `Selected`). */
export const settleProject = (d: GovFundDeployedContract) => (projectId: Uint8Array) =>
  d.callTx.settleProject(projectId);

/** The winner opens its commitment so funding can proceed. */
export const revealCompany =
  (d: GovFundDeployedContract) =>
  (projectId: Uint8Array, proposalId: Uint8Array, nonce: Uint8Array, coinPk: ZswapCoinPublicKey) =>
    d.callTx.revealCompany(projectId, proposalId, nonce, coinPk);

/** A member deposits the winner's budget. */
export const fundProject =
  (d: GovFundDeployedContract) => (projectId: Uint8Array, depositCoin: ShieldedCoinInfo) =>
    d.callTx.fundProject(projectId, depositCoin);

/** A company reclaims its collateral. */
export const withdrawCollateral =
  (d: GovFundDeployedContract) =>
  (projectId: Uint8Array, proposalId: Uint8Array, nonce: Uint8Array, coinPk: ZswapCoinPublicKey) =>
    d.callTx.withdrawCollateral(projectId, proposalId, nonce, coinPk);

// ---------------------------- Vesting circuits -----------------------------

/** The winner opens the current stage for review. */
export const requestPayment = (d: GovFundDeployedContract) => (projectId: Uint8Array) =>
  d.callTx.requestPayment(projectId);

/** A member approves the pending stage. */
export const approveStage = (d: GovFundDeployedContract) => (projectId: Uint8Array) =>
  d.callTx.approveStage(projectId);

/** A member rejects the pending stage. */
export const rejectStage = (d: GovFundDeployedContract) => (projectId: Uint8Array) =>
  d.callTx.rejectStage(projectId);

// ------------------------ Termination & cancellation ------------------------

/** A member votes to terminate a project. */
export const voteTerminate = (d: GovFundDeployedContract) => (projectId: Uint8Array) =>
  d.callTx.voteTerminate(projectId);
