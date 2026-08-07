export type Role = "admin" | "member" | "company";

export type ProjectStatus =
  | "Voting"
  | "Selected"
  | "InProgress"
  | "Completed"
  | "Cancelled"
  | "Terminated";

export const PROJECT_STATUSES: ProjectStatus[] = [
  "Voting",
  "Selected",
  "InProgress",
  "Completed",
  "Cancelled",
  "Terminated",
];

export const STATUS_META: Record<
  ProjectStatus,
  { label: string; color: string; soft: string; description: string }
> = {
  Voting: {
    label: "Voting",
    color: "var(--color-voting)",
    soft: "var(--color-voting-soft)",
    description: "Accepting proposals and votes until the deadline.",
  },
  Selected: {
    label: "Selected",
    color: "var(--color-selected)",
    soft: "var(--color-selected-soft)",
    description: "Winner picked. Awaiting identity reveal and funding.",
  },
  InProgress: {
    label: "In Progress",
    color: "var(--color-progress)",
    soft: "var(--color-progress-soft)",
    description: "Winner is being paid stage by stage as milestones pass.",
  },
  Completed: {
    label: "Completed",
    color: "var(--color-completed)",
    soft: "var(--color-completed-soft)",
    description: "All stages approved. Collateral returned to the winner.",
  },
  Cancelled: {
    label: "Cancelled",
    color: "var(--color-cancelled)",
    soft: "var(--color-cancelled-soft)",
    description: "Voting quorum missed or funding never provided.",
  },
  Terminated: {
    label: "Terminated",
    color: "var(--color-terminated)",
    soft: "var(--color-terminated-soft)",
    description: "Voted out. Collateral slashed to the treasury.",
  },
};

export interface Stage {
  title: string;
  description: string;
  amount: number;
}

export interface Proposal {
  id: string;
  projectId: string;
  companyName: string;
  description: string;
  budget: number;
  collateral: number;
  stages: Stage[];
  voteCount: number;
  revealed: boolean;
  withdrawn: boolean;
}

export interface WinnerInfo {
  proposalId: string;
  companyName: string;
  revealedAt: number;
}

export interface Member {
  id: string;
  name: string;
  address: string;
  commit: string;
  addedAt: number;
  revoked: boolean;
}

export interface Config {
  adminPk: string;
  quorumPercent: number;
  approvalsRequired: number;
  fundingToken: string;
  treasury: string;
  pot: number;
  potHasCoin: boolean;
  members: Member[];
}

export type ReviewAction = "approve" | "reject";

export interface Review {
  member: string;
  action: ReviewAction;
  at: number;
}

export interface ProjectInfo {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: ProjectStatus;
  deadline: number;
  fundingDeadline: number;
  collateralRequired: number;
  maxStageRejections: number;
  totalVotes: number;
  leader: string | null;
  leaderCount: number;
  winnerProposalId: string | null;
  winnerCompany: WinnerInfo | null;
  currentStage: number;
  stagePending: boolean;
  stageApprovals: number;
  stageRejections: number;
  stageAttempt: number;
  terminateVotes: number;
  disbursed: number;
  proposals: Proposal[];
  reviews: Record<number, Review[]>;
  voted: string | null;
  reviewedAttempt: number | null;
  terminateVoted: boolean;
  createdBy: string;
}

export interface WalletInfo {
  connected: boolean;
  walletName: string | null;
  address: string | null;
  networkId: string | null;
  error: string | null;
}

export interface ContractInfo {
  deployed: boolean;
  address: string | null;
  networkId: string | null;
  deployedAt: number | null;
  deployerAddress: string | null;
}

export interface AppState {
  config: Config;
  projects: ProjectInfo[];
  now: number;
  role: Role | null;
  wallet: WalletInfo;
  contract: ContractInfo;
  demoCompany: string;
}

export const DEMO_COMPANIES = [
  "VoltGrid Industries",
  "Atlas Rail Systems",
  "Reyes Construction",
  "Aeterna Builds",
] as const;

export const DEMO_DEPLOYER_ADDRESS = "0x9c4f2a71e83b05d6a1c9274eb3f80d12";

export const QUORUM_LABEL = "Quorum";
