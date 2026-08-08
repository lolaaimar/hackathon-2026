import type { AppState, Member, ProjectInfo, Proposal } from '../types';

export function memberCount(state: AppState): number {
  return state.config.members.length;
}

export function isDeployed(state: AppState): boolean {
  return state.contract.deployed;
}

export function isDeployer(state: AppState): boolean {
  if (!state.contract.deployed || !state.contract.deployerAddress) return false;
  if (state.wallet.connected) {
    return state.wallet.address === state.contract.deployerAddress;
  }
  return state.role === 'admin';
}

export function memberByAddress(state: AppState, address: string | null): Member | null {
  if (!address) return null;
  return (
    state.config.members.find((m) => m.address.toLowerCase() === address.toLowerCase()) ?? null
  );
}

export function currentCompany(state: AppState): string {
  return state.demoCompany;
}

export function mineOf(state: AppState, proposal: Proposal): boolean {
  return proposal.companyName === state.demoCompany;
}

export function quorumMet(state: AppState, votes: number): boolean {
  return votes * 100 >= memberCount(state) * state.config.quorumPercent;
}

export function quorumNeeded(state: AppState): number {
  const q = state.config.quorumPercent;
  const m = memberCount(state);
  return Math.ceil((m * q) / 100);
}

export function winnerProposal(p: ProjectInfo): Proposal | null {
  if (!p.winnerProposalId) return null;
  return p.proposals.find((pr) => pr.id === p.winnerProposalId) ?? null;
}

export function winnerStages(p: ProjectInfo) {
  return winnerProposal(p)?.stages ?? [];
}

export function canVote(p: ProjectInfo): boolean {
  return p.status === 'Voting' && p.voted === null && p.proposals.length > 0;
}

export function canSubmitProposal(p: ProjectInfo): boolean {
  return p.status === 'Voting';
}

export function canFinalize(p: ProjectInfo, state: AppState): boolean {
  return p.status === 'Voting' && quorumMet(state, p.totalVotes) && p.leader !== null;
}

export function canReveal(p: ProjectInfo): boolean {
  return p.status === 'Selected' && p.winnerCompany === null;
}

export function canFund(p: ProjectInfo): boolean {
  return p.status === 'Selected' && p.winnerCompany !== null;
}

export function canRequestPayment(p: ProjectInfo): boolean {
  if (p.status !== 'InProgress' || p.stagePending) return false;
  if (p.stageRejections >= p.maxStageRejections) return false;
  return p.currentStage < winnerStages(p).length;
}

export function canReviewStage(p: ProjectInfo): boolean {
  return p.status === 'InProgress' && p.stagePending && p.reviewedAttempt !== p.stageAttempt;
}

export function canTerminate(p: ProjectInfo): boolean {
  return (p.status === 'Selected' || p.status === 'InProgress') && !p.terminateVoted;
}

export function canWithdraw(p: ProjectInfo, proposal: Proposal): boolean {
  if (proposal.withdrawn || proposal.collateral <= 0) return false;
  const postVote =
    p.status === 'Selected' ||
    p.status === 'InProgress' ||
    p.status === 'Completed' ||
    p.status === 'Terminated';
  const winnerHeld = p.winnerProposalId === proposal.id;
  return postVote && !winnerHeld;
}

export function isWinner(p: ProjectInfo, proposal: Proposal): boolean {
  return p.winnerProposalId === proposal.id;
}
