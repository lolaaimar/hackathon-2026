import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import {
  CompiledContract,
  Contract as CompactContract,
} from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import {
  deployContract,
  findDeployedContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import type {
  DeployedContract,
  FoundContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { toHex } from "@midnight-ntwrk/midnight-js-utils";
import { GovFund, witnesses, createAdminState } from "../../contract/src/index.js";
import type {
  GovFundPrivateState,
  MerkleTreePath,
  ShieldedCoinInfo,
  Stage,
  ZswapCoinPublicKey,
} from "../../contract/src/index.js";
import { GovFundPrivateStateId } from "./common-types.js";
import type {
  GovFundContract,
  GovFundProviders,
} from "./common-types.js";

export * from "./common-types.js";
export * from "../../contract/src/types.js";
export * from "../../contract/src/witnesses.js";

export type DeployArguments = {
  quorumPercentParam: bigint,
  fundingTokenParam: Uint8Array,
  treasuryParam: ZswapCoinPublicKey,
  approvalsRequiredParam: bigint
}

/**
 * Absolute path to the compiled GovFund assets produced by `compactc`
 * (prover/verifier keys under `keys/`, ZKIRs under `zkir/`).
 */
export const zkConfigPath = fileURLToPath(
  new URL("../../contract/src/managed/govfund", import.meta.url),
);

/**
 * A Compact-js binding to the compiled GovFund contract: witnesses + the
 * location of the compiled file assets.
 */
export const govfundCompiledContract = CompiledContract.make(
  "GovFund",
  GovFund,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

/**
 * A filesystem-backed {@link ZKConfigProvider} for the GovFund circuits.
 * Reads prover/verifier keys and ZKIRs from `zkConfigPath`.
 *
 * @throws If the compiled proving keys are missing — run `npm run compile:zk`
 * to generate them (`npm run compile` uses `--skip-zk`).
 */
export const createZkConfigProvider = () => {
  const keysPath = fileURLToPath(
    new URL("../../contract/src/managed/govfund/keys", import.meta.url),
  );
  if (!existsSync(keysPath)) {
    throw new Error(
      `GovFund proving keys not found under ${keysPath}. ` +
        "Run `npm run compile:zk` to generate them (the default `compile` script uses --skip-zk).",
    );
  }
  return new NodeZkConfigProvider(zkConfigPath);
};

/**
 * A deployed GovFund contract (freshly deployed or found), exposing the typed
 * `callTx` interface for every circuit.
 */
export type GovFundDeployedContract =
  | DeployedContract<GovFundContract>
  | FoundContract<GovFundContract>;

/**
 * Deploys the GovFund contract with the given constructor arguments.
 */
export const deployGovFundContract = async (
  providers: GovFundProviders,
  args: DeployArguments,
  adminSk: Uint8Array,
) => {
  return deployContract(providers, {
    compiledContract: govfundCompiledContract,
    privateStateId: GovFundPrivateStateId,
    initialPrivateState: createAdminState(adminSk),
    args: [ args.quorumPercentParam, args.fundingTokenParam, args.treasuryParam, args.approvalsRequiredParam ]
  });
}

/**
 * Finds an already-deployed GovFund contract at `contractAddress`.
 *
 * Pass `initialPrivateState` to seed the caller's role: build it with the
 * exported role factories — `createAdminState(sk)`, `createMemberState(sk,
 * salt)` or `createCompanyState(sk, nonce, coinPk)`. The SDK stores it under
 * `GovFundPrivateStateId` (scoped to the contract address), reuses it on
 * subsequent calls and persists updates after each transaction. Note: seeding
 * a new role overwrites the previously stored one.
 *
 * Members need no data beyond their own `sk`/`salt`: the membership path is
 * derived from the public ledger tree at call time, so the only admin
 * involvement is the `addMember` transaction itself.
 */
export const findGovFundContract = async (
  providers: GovFundProviders,
  options: {
    readonly contractAddress: string;
    readonly signingKey?: Uint8Array;
    readonly initialPrivateState?: GovFundPrivateState;
  },
) => {
  const base = {
    compiledContract: govfundCompiledContract,
    contractAddress: options.contractAddress,
    signingKey: options.signingKey ? toHex(options.signingKey) : undefined,
  };
  return options.initialPrivateState !== undefined
    ? findDeployedContract(providers, {
        ...base,
        privateStateId: GovFundPrivateStateId,
        initialPrivateState: options.initialPrivateState,
      })
    : findDeployedContract(providers, base);
};

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