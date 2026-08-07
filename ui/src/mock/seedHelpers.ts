import type { Proposal, ProjectInfo, Stage } from "../types";

export function stage(title: string, description: string, amount: number): Stage {
  return { title, description, amount };
}

function st(title: string, amount: number): Stage {
  return { title, description: "", amount };
}

export interface ProposalSeed {
  id: string;
  company: string;
  budget: number;
  stages: Stage[];
  votes: number;
  revealed?: boolean;
}

export function makeProposal(p: ProposalSeed): Proposal {
  return {
    id: p.id,
    projectId: "unset",
    companyName: p.company,
    description: "",
    budget: p.budget,
    collateral: Math.round(p.budget * 0.02),
    stages: p.stages,
    voteCount: p.votes,
    revealed: p.revealed ?? false,
    withdrawn: false,
  };
}

export interface ProjectSeed {
  id: string;
  title: string;
  description: string;
  status: ProjectInfo["status"];
  deadline: number;
  fundingDeadline: number;
  collateralRequired: number;
  maxStageRejections: number;
  totalVotes: number;
  leader: string | null;
  leaderCount: number;
  winnerProposalId: string | null;
  winnerCompany: { proposalId: string; companyName: string } | null;
  currentStage: number;
  stagePending: boolean;
  stageApprovals: number;
  stageRejections: number;
  stageAttempt: number;
  terminateVotes: number;
  disbursed: number;
  createdBy: string;
  proposals: ProposalSeed[];
}

export function makeProject(p: ProjectSeed, now: number): ProjectInfo {
  const winner = p.winnerProposalId
    ? p.proposals.find((pr) => pr.id === p.winnerProposalId)
    : undefined;
  const isFunded =
    p.status === "InProgress" || p.status === "Completed" || p.status === "Terminated";
  const isRevealed = p.winnerCompany != null;
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    budget: isFunded && winner ? winner.budget : 0,
    status: p.status,
    deadline: p.deadline,
    fundingDeadline: p.fundingDeadline,
    collateralRequired: p.collateralRequired,
    maxStageRejections: p.maxStageRejections,
    totalVotes: p.totalVotes,
    leader: p.leader,
    leaderCount: p.leaderCount,
    winnerProposalId:
      isFunded || p.status === "Selected" ? p.winnerProposalId : null,
    winnerCompany:
      isRevealed && winner
        ? {
            proposalId: winner.id,
            companyName: p.winnerCompany?.companyName ?? winner.company,
            revealedAt: now,
          }
        : null,
    currentStage: p.currentStage,
    stagePending: p.stagePending,
    stageApprovals: p.stageApprovals,
    stageRejections: p.stageRejections,
    stageAttempt: p.stageAttempt,
    terminateVotes: p.terminateVotes,
    disbursed: p.disbursed,
    proposals: p.proposals.map((pr) => ({
      ...makeProposal(pr),
      projectId: p.id,
      revealed:
        isRevealed && pr.id === p.winnerProposalId ? true : (pr.revealed ?? false),
    })),
    reviews: {},
    voted: null,
    reviewedAttempt: null,
    terminateVoted: false,
    createdBy: p.createdBy,
  };
}

export { st };
