import type {
  GovFundDeployedContract,
  Ledger,
  ProjectInfo,
  Proposal,
  ShieldedCoinInfo,
  Stage,
  ZswapCoinPublicKey,
} from '@govfund/api';
import { memberCommit, publicKeyOf } from '@govfund/api';
import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { RoleIdentity } from '../identities.js';
import { memberCommitOf } from '../identities.js';

// ---------------------------------------------------------------------------
// In-memory mock of the GovFund contract.
//
// Implements the same public API as `GovFundClient` so the provider can hold
// either and call it identically. State is kept in plain fields and every
// mutation pushes a fresh `Ledger` snapshot to a BehaviorSubject. It mirrors the
// state transitions, validation and asserts of `contract/src/index.compact` so
// the UI can be exercised end-to-end without a wallet, devnet or proof server.
// ---------------------------------------------------------------------------

const SENTINEL = {} as unknown as GovFundDeployedContract;

const bytesToHex = (b: Uint8Array): string =>
  Array.from(b)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');

const zero32 = (): Uint8Array => new Uint8Array(32);

const eqBytes = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i]);

const sumAll = (stages: Stage[]): bigint => stages.reduce((acc, s) => acc + s.amount, 0n);

/** Mirrors the contract's `ProjectStatus` enum values. */
const ProjectStatus = {
  Voting: 0,
  Selected: 1,
  InProgress: 2,
  Completed: 3,
  Terminated: 4,
} as const;

const noneBytes = () => ({ is_some: false, value: zero32() });

const noneWinner = () => ({
  is_some: false,
  value: { pk: zero32(), coinPk: { bytes: zero32() } },
});

const mockTree = (count: bigint) => ({
  isFull: () => count >= 64n,
  checkRoot: () => true,
  root: () => ({ field: 0n }),
  firstFree: () => count,
  pathForLeaf: () => ({ leaf: zero32(), path: [] }),
  findPathForLeaf: () => undefined,
  history: () => [][Symbol.iterator](),
});

const mockSet = () => ({
  isEmpty: () => true,
  size: () => 0n,
  member: () => false,
  [Symbol.iterator]: () => [][Symbol.iterator](),
});

const mockNullifierMap = () => ({
  isEmpty: () => true,
  size: () => 0n,
  member: () => false,
  lookup: () => mockSet(),
  [Symbol.iterator]: () => [][Symbol.iterator](),
});

export class GovFundMockClient {
  private admin = zero32();
  private quorumPercent = 50n;
  private approvalsRequired = 1n;
  private fundingToken = zero32();
  private treasury: ZswapCoinPublicKey = { bytes: zero32() };

  private memberCount = 0n;
  private members = new Set<string>();
  private revokedMembers = new Set<string>();

  private projects = new Map<string, ProjectInfo>();
  private proposals = new Map<string, Proposal>();
  private voteNullifiers = new Map<string, Set<string>>();
  private stageActionNullifiers = new Map<string, Set<string>>();
  private terminateNullifiers = new Map<string, Set<string>>();

  private potValue = 0n;
  private potHasCoin = false;
  private currentIdentity: RoleIdentity | null = null;

  private readonly subject = new BehaviorSubject<Ledger>(this.buildLedger());

  // ------------------------------ Lifecycle --------------------------------

  reset(): void {
    this.admin = zero32();
    this.quorumPercent = 50n;
    this.approvalsRequired = 1n;
    this.fundingToken = zero32();
    this.treasury = { bytes: zero32() };
    this.memberCount = 0n;
    this.members.clear();
    this.revokedMembers.clear();
    this.projects.clear();
    this.proposals.clear();
    this.voteNullifiers.clear();
    this.stageActionNullifiers.clear();
    this.terminateNullifiers.clear();
    this.potValue = 0n;
    this.potHasCoin = false;
    this.currentIdentity = null;
    this.emit();
  }

  async deploy(
    args: {
      readonly quorumPercentParam: bigint;
      readonly fundingTokenParam: Uint8Array;
      readonly treasuryParam: ZswapCoinPublicKey;
      readonly approvalsRequiredParam: bigint;
    },
    admin: RoleIdentity,
  ): Promise<GovFundDeployedContract> {
    if (args.quorumPercentParam < 1n || args.quorumPercentParam > 100n) {
      throw new Error('Invalid quorum percent');
    }
    if (args.approvalsRequiredParam < 1n) {
      throw new Error('Invalid approval threshold');
    }
    this.admin = publicKeyOf(admin.sk!);
    this.quorumPercent = args.quorumPercentParam;
    this.approvalsRequired = args.approvalsRequiredParam;
    this.fundingToken = args.fundingTokenParam;
    this.treasury = args.treasuryParam;
    this.currentIdentity = admin;
    this.emit();
    return Promise.resolve(SENTINEL);
  }

  async find(_address: string, identity?: RoleIdentity): Promise<GovFundDeployedContract> {
    if (identity !== undefined) {
      this.currentIdentity = identity;
    }
    return Promise.resolve(SENTINEL);
  }

  ledger$(_address: string): Observable<Ledger> {
    return this.subject.asObservable();
  }

  // ------------------------------- Helpers ---------------------------------

  private emit(): void {
    this.subject.next(this.buildLedger());
  }

  private buildLedger(): Ledger {
    const projects = new Map<Uint8Array, ProjectInfo>();
    for (const p of this.projects.values()) {
      projects.set(p.id, structuredClone(p));
    }
    const proposals = new Map<Uint8Array, Proposal>();
    for (const p of this.proposals.values()) {
      proposals.set(p.id, structuredClone(p));
    }
    return {
      Mem_members: mockTree(this.memberCount),
      Mem_revokedMembers: mockSet(),
      Mem_memberCount: this.memberCount,
      admin: this.admin,
      quorumPercent: this.quorumPercent,
      approvalsRequired: this.approvalsRequired,
      fundingToken: this.fundingToken,
      treasury: this.treasury,
      projects,
      proposals,
      voteNullifiers: mockNullifierMap(),
      stageActionNullifiers: mockNullifierMap(),
      terminateNullifiers: mockNullifierMap(),
      pot: { nonce: zero32(), color: this.fundingToken, value: this.potValue, mt_index: 0n },
      potHasCoin: this.potHasCoin,
    } as unknown as Ledger;
  }

  /**
   * Stable per-actor id used for the one-action-per-actor nullifier tracking.
   * The mock intentionally does not enforce identity-based access control, so
   * this derives from whatever identity is active (or falls back to a constant)
   * instead of throwing when the actor isn't a registered admin/member.
   */
  private actorId(): string {
    const id = this.currentIdentity;
    if (id?.sk && id.salt) {
      return bytesToHex(memberCommitOf(id));
    }
    if (id?.sk) {
      return bytesToHex(publicKeyOf(id.sk));
    }
    return 'anon';
  }

  private quorumMet(votes: bigint): boolean {
    return votes * 100n >= this.memberCount * this.quorumPercent;
  }

  private payOut(amount: bigint): void {
    this.potValue -= amount;
    this.potHasCoin = this.potValue > 0n;
  }

  // ------------------------------- Admin -----------------------------------

  async addMember(_d: GovFundDeployedContract, commit: Uint8Array): Promise<void> {
    const hex = bytesToHex(commit);
    if (this.revokedMembers.has(hex)) {
      throw new Error('Member is revoked');
    }
    if (this.memberCount >= 64n) {
      throw new Error('Member limit reached');
    }
    this.members.add(hex);
    this.memberCount += 1n;
    this.emit();
    return Promise.resolve();
  }

  async removeMember(_d: GovFundDeployedContract, commit: Uint8Array): Promise<void> {
    if (this.memberCount < 1n) {
      throw new Error('No members');
    }
    const newCount = this.memberCount - 1n;
    if (newCount < this.approvalsRequired) {
      throw new Error('Removal would make approvals unreachable');
    }
    if (!this.quorumMet(newCount)) {
      throw new Error('Removal would make quorum unreachable');
    }
    this.revokedMembers.add(bytesToHex(commit));
    this.members.delete(bytesToHex(commit));
    this.memberCount = newCount;
    this.emit();
    return Promise.resolve();
  }

  // ------------------------------ Project ----------------------------------

  async createProject(
    _d: GovFundDeployedContract,
    args: {
      readonly projectId: Uint8Array;
      readonly title: string;
      readonly collateralRequired: bigint;
      readonly maxStageRejections: bigint;
    },
  ): Promise<void> {
    const idHex = bytesToHex(args.projectId);
    if (this.projects.has(idHex)) {
      throw new Error('Project already exists');
    }
    if (args.maxStageRejections < 1n) {
      throw new Error('Invalid max rejections');
    }
    this.projects.set(idHex, {
      id: args.projectId,
      title: args.title,
      budget: 0n,
      status: ProjectStatus.Voting,
      collateralRequired: args.collateralRequired,
      maxStageRejections: args.maxStageRejections,
      totalVotes: 0n,
      leader: noneBytes(),
      leaderCount: 0n,
      winner: noneBytes(),
      winnerCompany: noneWinner(),
      currentStage: 0n,
      stagePending: false,
      stageApprovals: 0n,
      stageRejections: 0n,
      stageAttempt: 0n,
      stageCount: 0n,
      stageAmount: 0n,
      winnerCollateral: 0n,
      terminateVotes: 0n,
      disbursed: 0n,
    });
    this.voteNullifiers.set(idHex, new Set());
    this.stageActionNullifiers.set(idHex, new Set());
    this.terminateNullifiers.set(idHex, new Set());
    this.emit();
    return Promise.resolve();
  }

  async submitProposal(
    _d: GovFundDeployedContract,
    args: {
      readonly projectId: Uint8Array;
      readonly proposalId: Uint8Array;
      readonly budget: bigint;
      readonly collateralAmount: bigint;
      readonly stageCount: bigint;
      readonly stages: Stage[];
      readonly collateralCoin: ShieldedCoinInfo;
    },
  ): Promise<void> {
    const idHex = bytesToHex(args.projectId);
    const p = this.projects.get(idHex);
    if (!p) {
      throw new Error('Unknown project');
    }
    if (p.status !== ProjectStatus.Voting) {
      throw new Error('Not accepting proposals');
    }
    const propHex = bytesToHex(args.proposalId);
    if (this.proposals.has(propHex)) {
      throw new Error('Proposal already exists');
    }
    if (args.budget <= 0n) {
      throw new Error('Budget must be positive');
    }
    if (args.collateralAmount < p.collateralRequired) {
      throw new Error('Collateral below required');
    }
    if (args.stageCount < 1n || args.stageCount > 12n) {
      throw new Error('Invalid stage count');
    }
    if (!eqBytes(args.collateralCoin.color, this.fundingToken)) {
      throw new Error('Wrong token');
    }
    if (args.collateralCoin.value !== args.collateralAmount) {
      throw new Error('Collateral mismatch');
    }
    if (sumAll(args.stages) !== args.budget) {
      throw new Error('Stages must sum to budget');
    }
    this.potValue += args.collateralAmount;
    this.potHasCoin = true;
    const id = this.currentIdentity;
    if (!id?.sk) {
      throw new Error('Not a company');
    }
    const nonce = id.nonce ?? new Uint8Array(32);
    this.proposals.set(propHex, {
      id: args.proposalId,
      projectId: args.projectId,
      budget: args.budget,
      collateral: args.collateralAmount,
      companyCommit: memberCommit(id.sk, nonce),
      stages: args.stages,
      stageCount: args.stageCount,
      voteCount: 0n,
    });
    this.emit();
    return Promise.resolve();
  }

  async vote(_d: GovFundDeployedContract, projectId: Uint8Array, proposalId: Uint8Array): Promise<void> {
    const commit = this.actorId();
    const idHex = bytesToHex(projectId);
    const p = this.projects.get(idHex);
    if (!p) {
      throw new Error('Unknown project');
    }
    if (p.status !== ProjectStatus.Voting) {
      throw new Error('Voting closed');
    }
    const propHex = bytesToHex(proposalId);
    const prop = this.proposals.get(propHex);
    if (!prop) {
      throw new Error('Unknown proposal');
    }
    const voters = this.voteNullifiers.get(idHex) ?? new Set<string>();
    if (voters.has(commit)) {
      throw new Error('Already voted');
    }
    voters.add(commit);
    this.voteNullifiers.set(idHex, voters);
    const newCount = prop.voteCount + 1n;
    this.proposals.set(propHex, { ...prop, voteCount: newCount });
    const newTotal = p.totalVotes + 1n;
    const isLeader = newCount > p.leaderCount;
    this.projects.set(idHex, {
      ...p,
      totalVotes: newTotal,
      leader: isLeader ? { is_some: true, value: proposalId } : p.leader,
      leaderCount: isLeader ? newCount : p.leaderCount,
    });
    this.emit();
    return Promise.resolve();
  }

  async settleProject(_d: GovFundDeployedContract, projectId: Uint8Array): Promise<void> {
    const idHex = bytesToHex(projectId);
    const p = this.projects.get(idHex);
    if (!p) {
      throw new Error('Unknown project');
    }
    if (p.status !== ProjectStatus.Voting) {
      throw new Error('Not in voting');
    }
    if (!this.quorumMet(p.totalVotes)) {
      throw new Error('Quorum not met');
    }
    if (!p.leader.is_some) {
      throw new Error('No votes cast');
    }
    const leaderProposal = this.proposals.get(bytesToHex(p.leader.value));
    if (!leaderProposal) {
      throw new Error('Unknown proposal');
    }
    this.projects.set(idHex, {
      ...p,
      status: ProjectStatus.Selected,
      winner: { is_some: true, value: p.leader.value },
      winnerCollateral: leaderProposal.collateral,
    });
    this.emit();
    return Promise.resolve();
  }

  async revealCompany(
    _d: GovFundDeployedContract,
    args: {
      readonly projectId: Uint8Array;
      readonly proposalId: Uint8Array;
      readonly nonce: Uint8Array;
      readonly coinPk: ZswapCoinPublicKey;
    },
  ): Promise<void> {
    const idHex = bytesToHex(args.projectId);
    const p = this.projects.get(idHex);
    if (!p) {
      throw new Error('Unknown project');
    }
    if (p.status !== ProjectStatus.Selected) {
      throw new Error('Not selected');
    }
    if (!p.winner.is_some || !eqBytes(p.winner.value, args.proposalId)) {
      throw new Error('Not the winning proposal');
    }
    if (p.winnerCompany.is_some) {
      throw new Error('Winner already revealed');
    }
    const prop = this.proposals.get(bytesToHex(args.proposalId));
    if (!prop) {
      throw new Error('Unknown proposal');
    }
    const id = this.currentIdentity;
    if (!id?.sk) {
      throw new Error('Not a company');
    }
    const commit = memberCommit(id.sk, args.nonce);
    if (!eqBytes(commit, prop.companyCommit)) {
      throw new Error('Invalid reveal');
    }
    this.projects.set(idHex, {
      ...p,
      winnerCompany: { is_some: true, value: { pk: publicKeyOf(id.sk), coinPk: args.coinPk } },
    });
    this.emit();
    return Promise.resolve();
  }

  async fundProject(
    _d: GovFundDeployedContract,
    projectId: Uint8Array,
    depositCoin: ShieldedCoinInfo,
  ): Promise<void> {
    const idHex = bytesToHex(projectId);
    const p = this.projects.get(idHex);
    if (!p) {
      throw new Error('Unknown project');
    }
    if (p.status !== ProjectStatus.Selected) {
      throw new Error('Not selected');
    }
    if (!p.winnerCompany.is_some) {
      throw new Error('Winner not revealed');
    }
    if (!eqBytes(depositCoin.color, this.fundingToken)) {
      throw new Error('Wrong token');
    }
    const prop = this.proposals.get(bytesToHex(p.winner.value));
    if (!prop) {
      throw new Error('Unknown proposal');
    }
    if (depositCoin.value !== prop.budget) {
      throw new Error('Wrong funding amount');
    }
    this.potValue += depositCoin.value;
    this.potHasCoin = true;
    this.projects.set(idHex, { ...p, budget: prop.budget, status: ProjectStatus.InProgress });
    this.emit();
    return Promise.resolve();
  }

  async withdrawCollateral(
    _d: GovFundDeployedContract,
    args: {
      readonly projectId: Uint8Array;
      readonly proposalId: Uint8Array;
      readonly nonce: Uint8Array;
      readonly coinPk: ZswapCoinPublicKey;
    },
  ): Promise<void> {
    const idHex = bytesToHex(args.projectId);
    const p = this.projects.get(idHex);
    if (!p) {
      throw new Error('Unknown project');
    }
    const postVote =
      p.status === ProjectStatus.Selected ||
      p.status === ProjectStatus.InProgress ||
      p.status === ProjectStatus.Completed ||
      p.status === ProjectStatus.Terminated;
    if (!postVote) {
      throw new Error('Not withdrawable yet');
    }
    const propHex = bytesToHex(args.proposalId);
    const prop = this.proposals.get(propHex);
    if (!prop) {
      throw new Error('Unknown proposal');
    }
    if (prop.collateral <= 0n) {
      throw new Error('Collateral already withdrawn');
    }
    const isWinner = p.winner.is_some && eqBytes(p.winner.value, args.proposalId);
    if (isWinner) {
      throw new Error('Winner collateral is held');
    }
    const id = this.currentIdentity;
    if (!id?.sk) {
      throw new Error('Not a company');
    }
    const commit = memberCommit(id.sk, args.nonce);
    if (!eqBytes(commit, prop.companyCommit)) {
      throw new Error('Invalid reveal');
    }
    this.payOut(prop.collateral);
    this.proposals.set(propHex, { ...prop, collateral: 0n });
    this.emit();
    return Promise.resolve();
  }

  // ------------------------------ Vesting ----------------------------------

  async requestPayment(_d: GovFundDeployedContract, projectId: Uint8Array): Promise<void> {
    const id = this.currentIdentity;
    if (!id?.sk) {
      throw new Error('Not the winner');
    }
    const pk = publicKeyOf(id.sk);
    const idHex = bytesToHex(projectId);
    const p = this.projects.get(idHex);
    if (!p) {
      throw new Error('Unknown project');
    }
    if (p.status !== ProjectStatus.InProgress) {
      throw new Error('Not in progress');
    }
    if (!p.winnerCompany.is_some || !eqBytes(p.winnerCompany.value.pk, pk)) {
      throw new Error('Not the winner');
    }
    const prop = this.proposals.get(bytesToHex(p.winner.value));
    if (!prop) {
      throw new Error('Unknown proposal');
    }
    if (p.currentStage >= prop.stageCount) {
      throw new Error('All stages completed');
    }
    if (p.stagePending) {
      throw new Error('Payment already requested');
    }
    if (p.stageRejections >= p.maxStageRejections) {
      throw new Error('Max rejections reached');
    }
    this.projects.set(idHex, {
      ...p,
      stagePending: true,
      stageApprovals: 0n,
      stageAttempt: p.stageAttempt + 1n,
      stageCount: prop.stageCount,
      stageAmount: prop.stages[Number(p.currentStage)]?.amount ?? 0n,
    });
    this.emit();
    return Promise.resolve();
  }

  async approveStage(_d: GovFundDeployedContract, projectId: Uint8Array): Promise<void> {
    const commit = this.actorId();
    const idHex = bytesToHex(projectId);
    const p = this.projects.get(idHex);
    if (!p) {
      throw new Error('Unknown project');
    }
    if (p.status !== ProjectStatus.InProgress) {
      throw new Error('Not in progress');
    }
    if (!p.stagePending) {
      throw new Error('No payment requested');
    }
    if (p.currentStage >= p.stageCount) {
      throw new Error('Out of stages');
    }
    const key = `${p.currentStage}:${p.stageAttempt}:${commit}`;
    const actors = this.stageActionNullifiers.get(idHex) ?? new Set<string>();
    if (actors.has(key)) {
      throw new Error('Already acted on this stage');
    }
    actors.add(key);
    this.stageActionNullifiers.set(idHex, actors);
    const amount = p.stageAmount;
    const newApprovals = p.stageApprovals + 1n;
    const nextStage = p.currentStage + 1n;
    const approved = newApprovals >= this.approvalsRequired;
    const finished = approved && nextStage >= p.stageCount;
    if (approved) {
      this.payOut(amount);
      if (finished) {
        this.payOut(p.winnerCollateral);
      }
    }
    this.projects.set(idHex, {
      ...p,
      status: finished ? ProjectStatus.Completed : ProjectStatus.InProgress,
      currentStage: approved ? nextStage : p.currentStage,
      stagePending: approved ? false : p.stagePending,
      stageApprovals: approved ? 0n : newApprovals,
      stageRejections: approved ? 0n : p.stageRejections,
      disbursed: approved ? p.disbursed + amount : p.disbursed,
    });
    this.emit();
    return Promise.resolve();
  }

  async rejectStage(_d: GovFundDeployedContract, projectId: Uint8Array): Promise<void> {
    const commit = this.actorId();
    const idHex = bytesToHex(projectId);
    const p = this.projects.get(idHex);
    if (!p) {
      throw new Error('Unknown project');
    }
    if (p.status !== ProjectStatus.InProgress) {
      throw new Error('Not in progress');
    }
    if (!p.stagePending) {
      throw new Error('No payment requested');
    }
    if (p.currentStage >= p.stageCount) {
      throw new Error('Out of stages');
    }
    const key = `${p.currentStage}:${p.stageAttempt}:${commit}`;
    const actors = this.stageActionNullifiers.get(idHex) ?? new Set<string>();
    if (actors.has(key)) {
      throw new Error('Already acted on this stage');
    }
    actors.add(key);
    this.stageActionNullifiers.set(idHex, actors);
    this.projects.set(idHex, {
      ...p,
      stagePending: false,
      stageRejections: p.stageRejections + 1n,
    });
    this.emit();
    return Promise.resolve();
  }

  // ------------------------ Termination & cancel ---------------------------

  async voteTerminate(_d: GovFundDeployedContract, projectId: Uint8Array): Promise<void> {
    const commit = this.actorId();
    const idHex = bytesToHex(projectId);
    const p = this.projects.get(idHex);
    if (!p) {
      throw new Error('Unknown project');
    }
    if (p.status !== ProjectStatus.InProgress && p.status !== ProjectStatus.Selected) {
      throw new Error('Cannot terminate');
    }
    const voters = this.terminateNullifiers.get(idHex) ?? new Set<string>();
    if (voters.has(commit)) {
      throw new Error('Already voted to terminate');
    }
    voters.add(commit);
    this.terminateNullifiers.set(idHex, voters);
    const newVotes = p.terminateVotes + 1n;
    const terminated = this.quorumMet(newVotes);
    if (terminated) {
      if (p.status === ProjectStatus.InProgress) {
        this.payOut(p.budget - p.disbursed);
      }
      this.payOut(p.winnerCollateral);
    }
    this.projects.set(idHex, {
      ...p,
      status: terminated ? ProjectStatus.Terminated : p.status,
      terminateVotes: newVotes,
    });
    this.emit();
    return Promise.resolve();
  }
}
