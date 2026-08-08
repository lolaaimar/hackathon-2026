import type { CircuitContext } from '@midnight-ntwrk/compact-runtime';
import {
  CostModel,
  createCircuitContext,
  createConstructorContext,
  dummyContractAddress,
} from '@midnight-ntwrk/compact-runtime';
import type {
  Ledger,
  ProjectStatus,
  ShieldedCoinInfo,
  Stage,
  ZswapCoinPublicKey,
} from '../src/managed/govfund/contract/index.js';
import { Contract, ledger, pureCircuits } from '../src/managed/govfund/contract/index.js';
import type { TestPrivateState } from './witnesses.js';
import { adminState, makeTestWitnesses } from './witnesses.js';

export const INITIAL_TIME = 1_700_000_000;
export const COIN_PK = '0'.repeat(64);
export const ZERO_TOKEN = new Uint8Array(32);
export const MAX_STAGES = 12;

export type GovFundConfig = {
  admin?: TestPrivateState;
  quorumPercent?: bigint;
  approvalsRequired?: bigint;
  fundingToken?: Uint8Array;
  treasury?: ZswapCoinPublicKey;
  initialTime?: number;
};

/** A member's committed identity, matching the contract's `memberCommit` pure circuit. */
export const memberCommitOf = (sk: Uint8Array, salt: Uint8Array): Uint8Array =>
  pureCircuits.memberCommit(pureCircuits.publicKeyOf(sk), salt);

/** Builds a 12-slot stage schedule; unused slots are zero and must sum to `budget`. */
export const makeStages = (amounts: bigint[]): Stage[] => {
  const stages: Stage[] = amounts.map((amount) => ({ amount }));
  while (stages.length < MAX_STAGES) {
    stages.push({ amount: 0n });
  }
  return stages;
};

/** A shielded fundingToken coin (random nonce, so each deposit is unique). */
export const makeCoin = (value: bigint, color: Uint8Array = ZERO_TOKEN): ShieldedCoinInfo => ({
  nonce: crypto.getRandomValues(new Uint8Array(32)),
  color,
  value,
});

/**
 * Threads the runtime `CircuitContext` through every impure circuit call.
 */
export class GovFundSimulator {
  readonly contract: Contract<TestPrivateState>;
  circuitContext: CircuitContext<TestPrivateState>;

  constructor(config: GovFundConfig = {}) {
    const admin = config.admin ?? adminState(0x01);
    this.contract = new Contract<TestPrivateState>(makeTestWitnesses());
    const init = this.contract.initialState(
      createConstructorContext(admin, COIN_PK),
      config.quorumPercent ?? 50n,
      config.fundingToken ?? ZERO_TOKEN,
      config.treasury ?? { bytes: new Uint8Array(32).fill(0xee) },
      config.approvalsRequired ?? 2n,
      memberCommitOf(admin.sk!, admin.salt!),
    );
    this.circuitContext = createCircuitContext(
      dummyContractAddress(),
      init.currentZswapLocalState,
      init.currentContractState.data,
      init.currentPrivateState,
      undefined,
      CostModel.initialCostModel(),
      config.initialTime ?? INITIAL_TIME,
    );
  }

  /** Advances the block time, preserving state, private state and zswap state. */
  setBlockTime(seconds: number): this {
    this.circuitContext = createCircuitContext(
      dummyContractAddress(),
      this.circuitContext.currentZswapLocalState,
      this.circuitContext.currentQueryContext.state,
      this.circuitContext.currentPrivateState,
      this.circuitContext.gasLimit,
      this.circuitContext.costModel,
      seconds,
    );
    return this;
  }

  /** Switches which actor the witnesses present (witness-based auth). */
  setActor(state: TestPrivateState): this {
    this.circuitContext = {
      ...this.circuitContext,
      currentPrivateState: state,
    };
    return this;
  }

  getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  get blockTime(): number {
    return Number(this.circuitContext.currentQueryContext.block.secondsSinceEpoch);
  }

  // ------------------------------ Admin -----------------------------------

  addMember(memberCommit: Uint8Array): void {
    this.circuitContext = this.contract.impureCircuits.manageMember(
      this.circuitContext,
      memberCommit,
      false,
    ).context;
  }

  removeMember(memberCommit: Uint8Array): void {
    this.circuitContext = this.contract.impureCircuits.manageMember(
      this.circuitContext,
      memberCommit,
      true,
    ).context;
  }

  // ---------------------------- Project -----------------------------------

  createProject(
    projectId: Uint8Array,
    title: string,
    collateralRequired: bigint,
    maxStageRejections: bigint,
  ): void {
    this.circuitContext = this.contract.impureCircuits.createProject(
      this.circuitContext,
      projectId,
      title,
      collateralRequired,
      maxStageRejections,
    ).context;
  }

  submitProposal(
    projectId: Uint8Array,
    proposalId: Uint8Array,
    budget: bigint,
    collateralAmount: bigint,
    stageCount: bigint,
    stages: Stage[],
    collateralCoin: ShieldedCoinInfo,
  ): void {
    this.circuitContext = this.contract.impureCircuits.submitProposal(
      this.circuitContext,
      projectId,
      proposalId,
      budget,
      collateralAmount,
      stageCount,
      stages,
      collateralCoin,
    ).context;
  }

  vote(projectId: Uint8Array, proposalId: Uint8Array): void {
    this.circuitContext = this.contract.impureCircuits.vote(
      this.circuitContext,
      projectId,
      proposalId,
    ).context;
  }

  settleProject(projectId: Uint8Array): void {
    this.circuitContext = this.contract.impureCircuits.settleProject(
      this.circuitContext,
      projectId,
    ).context;
  }

  revealCompany(
    projectId: Uint8Array,
    proposalId: Uint8Array,
    nonce: Uint8Array,
    coinPk: ZswapCoinPublicKey,
  ): void {
    this.circuitContext = this.contract.impureCircuits.companyClaim(
      this.circuitContext,
      projectId,
      proposalId,
      nonce,
      coinPk,
      true,
    ).context;
  }

  fundProject(projectId: Uint8Array, depositCoin: ShieldedCoinInfo): void {
    this.circuitContext = this.contract.impureCircuits.fundProject(
      this.circuitContext,
      projectId,
      depositCoin,
    ).context;
  }

  withdrawCollateral(
    projectId: Uint8Array,
    proposalId: Uint8Array,
    nonce: Uint8Array,
    coinPk: ZswapCoinPublicKey,
  ): void {
    this.circuitContext = this.contract.impureCircuits.companyClaim(
      this.circuitContext,
      projectId,
      proposalId,
      nonce,
      coinPk,
      false,
    ).context;
  }

  // ---------------------------- Vesting -----------------------------------

  requestPayment(projectId: Uint8Array): void {
    this.circuitContext = this.contract.impureCircuits.requestPayment(
      this.circuitContext,
      projectId,
    ).context;
  }

  approveStage(projectId: Uint8Array): void {
    this.circuitContext = this.contract.impureCircuits.reviewStage(
      this.circuitContext,
      projectId,
      true,
    ).context;
  }

  rejectStage(projectId: Uint8Array): void {
    this.circuitContext = this.contract.impureCircuits.reviewStage(
      this.circuitContext,
      projectId,
      false,
    ).context;
  }

  // ------------------------ Termination ------------------------------------

  voteTerminate(projectId: Uint8Array): void {
    this.circuitContext = this.contract.impureCircuits.voteTerminate(
      this.circuitContext,
      projectId,
    ).context;
  }

  /** Reads a project's status. */
  projectStatus(projectId: Uint8Array): ProjectStatus {
    return this.getLedger().projects.lookup(projectId).status;
  }
}
