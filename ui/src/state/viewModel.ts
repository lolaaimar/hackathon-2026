import type {
  Ledger,
  Proposal as LedgerProposal,
  ProjectStatus as LedgerStatus,
} from '@govfund/api';
import type {
  AppState,
  Config,
  ContractInfo,
  ProjectInfo,
  ProjectStatus,
  Proposal,
  Role,
  WalletInfo,
} from '../types';

export type ViewModelLocal = {
  readonly memberRegistry: { id?: string; commit: string; label: string }[];
  readonly descriptions: Record<string, string>;
  readonly projectDescriptions: Record<string, string>;
  readonly myVotes: Record<string, string>;
  readonly myReviewedAttempt: Record<string, number>;
  readonly myTerminateVotes: Record<string, boolean>;
  readonly demoCompany: string;
  readonly myCompanyCommit: string | null;
};

export const bytesToHex = (b: Uint8Array): string =>
  Array.from(b)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');

export const hexToBytes = (hex: string): Uint8Array =>
  new Uint8Array((hex.match(/.{2}/g) ?? []).map((h) => Number.parseInt(h, 16)));

const toStatus = (status: LedgerStatus): ProjectStatus => {
  const s = Number(status);
  const names: ProjectStatus[] = ['Voting', 'Selected', 'InProgress', 'Completed', 'Terminated'];
  return names[s] ?? 'Voting';
};

const safeNumber = (v: bigint): number => Number(v);

export function toViewModel(
  ledger: Ledger,
  local: ViewModelLocal,
  role: Role | null,
  wallet: WalletInfo,
  contract: ContractInfo,
): AppState {
  const proposals: LedgerProposal[] = [];
  for (const [, p] of ledger.proposals) {
    proposals.push(p);
  }
  const proposalsByProject = new Map<string, LedgerProposal[]>();
  for (const p of proposals) {
    const key = bytesToHex(p.projectId);
    const list = proposalsByProject.get(key) ?? [];
    list.push(p);
    proposalsByProject.set(key, list);
  }

  const config: Config = {
    adminPk: bytesToHex(ledger.admin),
    quorumPercent: safeNumber(ledger.quorumPercent),
    approvalsRequired: safeNumber(ledger.approvalsRequired),
    fundingToken: ledger.fundingToken.every((b) => b === 0)
      ? 'NIGHT'
      : bytesToHex(ledger.fundingToken),
    treasury: bytesToHex(ledger.treasury.bytes),
    pot: safeNumber(ledger.pot.value),
    potHasCoin: ledger.potHasCoin,
    members: local.memberRegistry.map((m) => ({
      id: m.id ?? m.commit,
      name: m.label,
      address: m.commit,
      commit: m.commit,
      addedAt: 0,
      revoked: false,
    })),
  };

  const projects: ProjectInfo[] = [];
  for (const [id, p] of ledger.projects) {
    const projectId = bytesToHex(id);
    const winnerId = p.winner.is_some ? bytesToHex(p.winner.value) : null;
    const projectProposals: Proposal[] = (proposalsByProject.get(projectId) ?? []).map((pr) => {
      const proposalId = bytesToHex(pr.id);
      const isMine =
        local.myCompanyCommit !== null && local.myCompanyCommit === bytesToHex(pr.companyCommit);
      const stageCount = Math.min(
        Number(pr.stageCount),
        pr.stages.filter((s) => s.amount !== 0n).length || Number(pr.stageCount),
      );
      return {
        id: proposalId,
        projectId,
        companyName: isMine ? local.demoCompany : `Bidder ${proposalId.slice(0, 6)}`,
        description: local.descriptions[proposalId] ?? '',
        budget: safeNumber(pr.budget),
        collateral: safeNumber(pr.collateral),
        stages: pr.stages.slice(0, stageCount).map((s, i) => ({
          title: `Stage ${i + 1}`,
          description: '',
          amount: safeNumber(s.amount),
        })),
        voteCount: safeNumber(pr.voteCount),
        revealed: winnerId === proposalId && p.winnerCompany.is_some,
        withdrawn: pr.collateral === 0n,
      };
    });

    const now = Math.floor(Date.now() / 1000);
    projects.push({
      id: projectId,
      title: p.title,
      description: local.projectDescriptions[projectId] ?? '',
      budget: safeNumber(p.budget),
      status: toStatus(p.status),
      collateralRequired: safeNumber(p.collateralRequired),
      maxStageRejections: safeNumber(p.maxStageRejections),
      totalVotes: safeNumber(p.totalVotes),
      leader: p.leader.is_some ? bytesToHex(p.leader.value) : null,
      leaderCount: safeNumber(p.leaderCount),
      winnerProposalId: winnerId,
      winnerCompany: p.winnerCompany.is_some
        ? { proposalId: winnerId ?? '', companyName: 'Winner', revealedAt: now }
        : null,
      currentStage: safeNumber(p.currentStage),
      stagePending: p.stagePending,
      stageApprovals: safeNumber(p.stageApprovals),
      stageRejections: safeNumber(p.stageRejections),
      stageAttempt: safeNumber(p.stageAttempt),
      terminateVotes: safeNumber(p.terminateVotes),
      disbursed: safeNumber(p.disbursed),
      proposals: projectProposals,
      reviews: {},
      voted: local.myVotes[projectId] ?? null,
      reviewedAttempt: local.myReviewedAttempt[projectId] ?? null,
      terminateVoted: local.myTerminateVotes[projectId] ?? false,
      createdBy: '',
    });
  }

  return {
    config,
    projects,
    now: Math.floor(Date.now() / 1000),
    role,
    wallet,
    contract,
    demoCompany: local.demoCompany,
  };
}
