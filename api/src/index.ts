import type {
  MerkleTreePath,
  ShieldedCoinInfo,
  Stage,
  ZswapCoinPublicKey,
} from "../../contract/src/index.js";
import type { GovFundDeployedContract } from "./common-types.js";

export * from "./common-types.js";
export * from "../../contract/src/types.js";
export * from "../../contract/src/witnesses.js";
export { GovFund, ledger } from "../../contract/src/index.js";
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
} from "../../contract/src/index.js";

export type DeployArguments = {
  quorumPercentParam: bigint,
  fundingTokenParam: Uint8Array,
  treasuryParam: ZswapCoinPublicKey,
  approvalsRequiredParam: bigint
}

// ---------------------------- Membership views -----------------------------

/** Read-only view: current number of active government members. */
export const activeMemberCount =
  (d: GovFundDeployedContract) => () => d.callTx.Mem_activeMemberCount();

/** Read-only view: whether a committed identity is currently a member. */
export const isMember =
  (d: GovFundDeployedContract) =>
  (commit: Uint8Array, path: MerkleTreePath<Uint8Array>) =>
    d.callTx.Mem_isMember(commit, path);

/** Read-only view: whether a committed identity has been revoked. */
export const isRevoked =
  (d: GovFundDeployedContract) => (commit: Uint8Array) =>
    d.callTx.Mem_isRevoked(commit);

// ---------------------------- Admin circuits -------------------------------

/** Admin adds a government member by their committed identity. */
export const addMember =
  (d: GovFundDeployedContract) => (memberCommit: Uint8Array) =>
    d.callTx.addMember(memberCommit);

/** Admin revokes a government member. */
export const removeMember =
  (d: GovFundDeployedContract) => (memberCommit: Uint8Array) =>
    d.callTx.removeMember(memberCommit);

/** Admin changes the voting quorum percent. */
export const setQuorumPercent =
  (d: GovFundDeployedContract) => (newPercent: bigint) =>
    d.callTx.setQuorumPercent(newPercent);

/** Admin changes the per-stage reviewer threshold. */
export const setApprovalsRequired =
  (d: GovFundDeployedContract) => (newRequired: bigint) =>
    d.callTx.setApprovalsRequired(newRequired);

// ------------------------------ Project circuits ---------------------------

/** A member opens a project in Voting phase. */
export const createProject =
  (d: GovFundDeployedContract) =>
  (
    projectId: Uint8Array,
    title: string,
    deadline: bigint,
    fundingDeadline: bigint,
    collateralRequired: bigint,
    maxStageRejections: bigint,
  ) =>
    d.callTx.createProject(
      projectId,
      title,
      deadline,
      fundingDeadline,
      collateralRequired,
      maxStageRejections,
    );

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
  (d: GovFundDeployedContract) =>
  (projectId: Uint8Array, proposalId: Uint8Array) =>
    d.callTx.vote(projectId, proposalId);

/** After the deadline, picks the plurality winner if quorum is met. */
export const finalizeSelection =
  (d: GovFundDeployedContract) => (projectId: Uint8Array) =>
    d.callTx.finalizeSelection(projectId);

/** The winner opens its commitment so funding can proceed. */
export const revealCompany =
  (d: GovFundDeployedContract) =>
  (
    projectId: Uint8Array,
    proposalId: Uint8Array,
    nonce: Uint8Array,
    coinPk: ZswapCoinPublicKey,
  ) =>
    d.callTx.revealCompany(projectId, proposalId, nonce, coinPk);

/** A member deposits the winner's budget. */
export const fundProject =
  (d: GovFundDeployedContract) =>
  (projectId: Uint8Array, depositCoin: ShieldedCoinInfo) =>
    d.callTx.fundProject(projectId, depositCoin);

/** A company reclaims its collateral. */
export const withdrawCollateral =
  (d: GovFundDeployedContract) =>
  (
    projectId: Uint8Array,
    proposalId: Uint8Array,
    nonce: Uint8Array,
    coinPk: ZswapCoinPublicKey,
  ) =>
    d.callTx.withdrawCollateral(projectId, proposalId, nonce, coinPk);

// ---------------------------- Vesting circuits -----------------------------

/** The winner opens the current stage for review. */
export const requestPayment =
  (d: GovFundDeployedContract) => (projectId: Uint8Array) =>
    d.callTx.requestPayment(projectId);

/** A member approves the pending stage. */
export const approveStage =
  (d: GovFundDeployedContract) => (projectId: Uint8Array) =>
    d.callTx.approveStage(projectId);

/** A member rejects the pending stage. */
export const rejectStage =
  (d: GovFundDeployedContract) => (projectId: Uint8Array) =>
    d.callTx.rejectStage(projectId);

// ------------------------ Termination & cancellation ------------------------

/** A member votes to terminate a project. */
export const voteTerminate =
  (d: GovFundDeployedContract) => (projectId: Uint8Array) =>
    d.callTx.voteTerminate(projectId);

/** Anyone cancels an unfinalized Voting project after its deadline. */
export const cancelProject =
  (d: GovFundDeployedContract) => (projectId: Uint8Array) =>
    d.callTx.cancelProject(projectId);

/** Anyone cancels an unfunded Selected project after its funding deadline. */
export const expireFunding =
  (d: GovFundDeployedContract) => (projectId: Uint8Array) =>
    d.callTx.expireFunding(projectId);
