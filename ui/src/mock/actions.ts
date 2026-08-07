import type { AppState, Member, ProjectInfo, Proposal, Review, Stage } from "../types";
import { isDeployer, quorumMet } from "./guards";
import { createSeedState } from "./seed";
import { DEMO_DEPLOYER_ADDRESS } from "../types";

export interface CreateProjectInput {
  title: string;
  description: string;
  deadline: number;
  fundingDeadline: number;
  collateralRequired: number;
  maxStageRejections: number;
}

export interface SubmitProposalInput {
  companyName: string;
  description: string;
  budget: number;
  collateral: number;
  stages: Stage[];
}

export type Action =
  | {
      type: "MERGE_DESCRIPTIONS";
      descriptions: Array<{ proposalId: string; projectId: string; description: string }>;
    }
  | { type: "ROLE_SET"; role: AppState["role"] }
  | { type: "SET_DEMO_COMPANY"; company: string }
  | { type: "WALLET_CONNECTED"; walletName: string; address: string; networkId: string }
  | { type: "WALLET_DISCONNECTED" }
  | { type: "WALLET_ERROR"; error: string }
  | { type: "TIME_SKIP"; days: number }
  | { type: "RESET" }
  | {
      type: "CONTRACT_DEPLOY";
      networkId: string;
      fundingToken: string;
      quorumPercent: number;
      approvalsRequired: number;
    }
  | { type: "ADD_MEMBER"; name: string; address: string }
  | { type: "REMOVE_MEMBER"; id: string }
  | { type: "SET_QUORUM"; percent: number }
  | { type: "SET_APPROVALS"; required: number }
  | { type: "CREATE_PROJECT"; input: CreateProjectInput }
  | { type: "VOTE"; projectId: string; proposalId: string }
  | { type: "FINALIZE"; projectId: string }
  | { type: "CANCEL"; projectId: string }
  | { type: "EXPIRE"; projectId: string }
  | { type: "FUND"; projectId: string }
  | { type: "APPROVE_STAGE"; projectId: string }
  | { type: "REJECT_STAGE"; projectId: string }
  | { type: "VOTE_TERMINATE"; projectId: string }
  | { type: "SUBMIT_PROPOSAL"; projectId: string; input: SubmitProposalInput }
  | { type: "REVEAL_COMPANY"; projectId: string }
  | { type: "REQUEST_PAYMENT"; projectId: string }
  | { type: "WITHDRAW_COLLATERAL"; projectId: string; proposalId: string };

function winnerOf(p: ProjectInfo): Proposal | null {
  if (!p.winnerProposalId) return null;
  return p.proposals.find((pr) => pr.id === p.winnerProposalId) ?? null;
}

function patchProject(state: AppState, projectId: string, fn: (p: ProjectInfo) => ProjectInfo): AppState {
  return {
    ...state,
    projects: state.projects.map((p) => (p.id === projectId ? fn(p) : p)),
  };
}

function nextProjectId(projects: ProjectInfo[]): string {
  const max = projects.reduce((acc, p) => {
    const n = Number(p.id.replace("P-", ""));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `P-${String(max + 1).padStart(3, "0")}`;
}

function pseudoCommit(n: number): string {
  let s = n;
  let out = "";
  for (let i = 0; i < 32; i++) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    out += ((s >>> 24) & 0xff).toString(16).padStart(2, "0");
  }
  return `0x${out}`;
}

function hashString(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 4294967296;
  }
  return h;
}

function contractAddress(): string {
  return `011c${pseudoCommit(Date.now()).slice(4, 44)}`;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "MERGE_DESCRIPTIONS": {
      const map = new Map<string, string>();
      for (const d of action.descriptions) {
        map.set(d.proposalId, d.description);
      }
      return {
        ...state,
        projects: state.projects.map((p) => ({
          ...p,
          proposals: p.proposals.map((pr) => {
            const remote = map.get(pr.id);
            return remote !== undefined ? { ...pr, description: remote } : pr;
          }),
        })),
      };
    }

    case "ROLE_SET":
      return { ...state, role: action.role };

    case "SET_DEMO_COMPANY":
      return { ...state, demoCompany: action.company };

    case "WALLET_CONNECTED":
      return {
        ...state,
        wallet: {
          connected: true,
          walletName: action.walletName,
          address: action.address,
          networkId: action.networkId,
          error: null,
        },
      };

    case "WALLET_DISCONNECTED":
      return {
        ...state,
        wallet: {
          connected: false,
          walletName: null,
          address: null,
          networkId: null,
          error: null,
        },
      };

    case "WALLET_ERROR":
      return { ...state, wallet: { ...state.wallet, error: action.error } };

    case "TIME_SKIP":
      return { ...state, now: state.now + action.days * 24 * 60 * 60 * 1000 };

    case "RESET":
      return createSeedState();

    case "CONTRACT_DEPLOY":
      if (state.contract.deployed) return state;
      {
        const deployerAddress = state.wallet.address ?? DEMO_DEPLOYER_ADDRESS;
        const adminRegistered = state.config.members.some(
          (m) => m.address.toLowerCase() === deployerAddress.toLowerCase()
        );
        const adminMember: Member = {
          id: `MBR-${String(state.config.members.length + 1).padStart(3, "0")}`,
          name: "Admin",
          address: deployerAddress,
          commit: pseudoCommit(hashString(deployerAddress)),
          addedAt: state.now,
          revoked: false,
        };
        return {
          ...state,
          config: {
            ...state.config,
            fundingToken: action.fundingToken,
            quorumPercent: Math.max(1, Math.min(100, action.quorumPercent)),
            approvalsRequired: Math.max(1, Math.min(100, action.approvalsRequired)),
            members: adminRegistered
              ? state.config.members
              : [...state.config.members, adminMember],
          },
          contract: {
            deployed: true,
            address: contractAddress(),
            networkId: action.networkId,
            deployedAt: state.now,
            deployerAddress,
          },
        };
      }

    case "ADD_MEMBER":
      if (!isDeployer(state)) return state;
      if (
        state.config.members.some(
          (m) => m.address.toLowerCase() === action.address.toLowerCase()
        )
      ) {
        return state;
      }
      return {
        ...state,
        config: {
          ...state.config,
          members: [
            ...state.config.members,
            {
              id: `MBR-${String(state.config.members.length + 1).padStart(3, "0")}`,
              name: action.name,
              address: action.address,
              commit: pseudoCommit(hashString(action.address)),
              addedAt: state.now,
              revoked: false,
            },
          ],
        },
      };

    case "REMOVE_MEMBER": {
      if (!isDeployer(state)) return state;
      const newCount = state.config.members.length - 1;
      if (newCount < 0) return state;
      if (newCount < state.config.approvalsRequired) return state;
      const simulated = {
        ...state,
        config: { ...state.config, members: state.config.members.slice(0, -1) },
      };
      if (!quorumMet(simulated, newCount)) return state;
      return {
        ...state,
        config: {
          ...state.config,
          members: state.config.members
            .map((m) => (m.id === action.id ? { ...m, revoked: true } : m))
            .filter((m) => m.id !== action.id),
        },
      };
    }

    case "SET_QUORUM":
      return {
        ...state,
        config: {
          ...state.config,
          quorumPercent: Math.max(1, Math.min(100, action.percent)),
        },
      };

    case "SET_APPROVALS":
      return {
        ...state,
        config: {
          ...state.config,
          approvalsRequired: Math.max(
            1,
            Math.min(100, action.required)
          ),
        },
      };

    case "CREATE_PROJECT": {
      const id = nextProjectId(state.projects);
      const p: ProjectInfo = {
        id,
        title: action.input.title,
        description: action.input.description,
        budget: 0,
        status: "Voting",
        deadline: action.input.deadline,
        fundingDeadline: action.input.fundingDeadline,
        collateralRequired: action.input.collateralRequired,
        maxStageRejections: action.input.maxStageRejections,
        totalVotes: 0,
        leader: null,
        leaderCount: 0,
        winnerProposalId: null,
        winnerCompany: null,
        currentStage: 0,
        stagePending: false,
        stageApprovals: 0,
        stageRejections: 0,
        stageAttempt: 0,
        terminateVotes: 0,
        disbursed: 0,
        proposals: [],
        reviews: {},
        voted: null,
        reviewedAttempt: null,
        terminateVoted: false,
        createdBy: "You",
      };
      return { ...state, projects: [...state.projects, p] };
    }

    case "VOTE":
      return patchProject(state, action.projectId, (p) => {
        const prop = p.proposals.find((pr) => pr.id === action.proposalId);
        if (!prop || p.status !== "Voting" || state.now >= p.deadline || p.voted !== null) {
          return p;
        }
        const newCount = prop.voteCount + 1;
        const becomesLeader = newCount > p.leaderCount;
        return {
          ...p,
          voted: action.proposalId,
          totalVotes: p.totalVotes + 1,
          leader: becomesLeader ? action.proposalId : p.leader,
          leaderCount: becomesLeader ? newCount : p.leaderCount,
          proposals: p.proposals.map((pr) =>
            pr.id === action.proposalId ? { ...pr, voteCount: newCount } : pr
          ),
        };
      });

    case "FINALIZE":
      return patchProject(state, action.projectId, (p) => {
        if (p.status !== "Voting" || state.now < p.deadline || !quorumMet(state, p.totalVotes) || p.leader === null) {
          return p;
        }
        return { ...p, status: "Selected", winnerProposalId: p.leader };
      });

    case "CANCEL":
      return patchProject(state, action.projectId, (p) => {
        if (p.status !== "Voting" || state.now < p.deadline || quorumMet(state, p.totalVotes)) {
          return p;
        }
        return { ...p, status: "Cancelled" };
      });

    case "EXPIRE":
      return patchProject(state, action.projectId, (p) => {
        if (p.status !== "Selected" || state.now < p.fundingDeadline) return p;
        return { ...p, status: "Cancelled" };
      });

    case "FUND": {
      const p = state.projects.find((pr) => pr.id === action.projectId);
      if (!p || p.status !== "Selected" || p.winnerCompany === null || state.now >= p.fundingDeadline) {
        return state;
      }
      const winner = winnerOf(p);
      if (!winner) return state;
      return {
        ...state,
        config: { ...state.config, pot: state.config.pot + winner.budget },
        projects: state.projects.map((pr) =>
          pr.id === action.projectId
            ? { ...pr, status: "InProgress", budget: winner.budget }
            : pr
        ),
      };
    }

    case "APPROVE_STAGE": {
      const p = state.projects.find((pr) => pr.id === action.projectId);
      if (!p || p.status !== "InProgress" || !p.stagePending || p.reviewedAttempt === p.stageAttempt) {
        return state;
      }
      const winner = winnerOf(p);
      if (!winner) return state;
      const stageAmount = winner.stages[p.currentStage]?.amount ?? 0;
      const newApprovals = p.stageApprovals + 1;
      const review: Review = { member: "You", action: "approve", at: state.now };
      const reviews = {
        ...p.reviews,
        [p.stageAttempt]: [...(p.reviews[p.stageAttempt] ?? []), review],
      };
      const approved = newApprovals >= state.config.approvalsRequired;
      const nextStage = p.currentStage + 1;
      const done = approved && nextStage >= winner.stages.length;
      const potDelta = (done ? stageAmount + winner.collateral : stageAmount);
      return {
        ...state,
        config: approved
          ? { ...state.config, pot: state.config.pot - potDelta }
          : state.config,
        projects: state.projects.map((pr) =>
          pr.id === action.projectId
            ? {
                ...pr,
                ...(done ? { status: "Completed" } : {}),
                currentStage: approved ? nextStage : p.currentStage,
                stagePending: approved ? false : p.stagePending,
                stageApprovals: approved ? 0 : newApprovals,
                stageRejections: approved ? 0 : p.stageRejections,
                disbursed: approved ? p.disbursed + stageAmount : p.disbursed,
                reviews,
                reviewedAttempt: p.stageAttempt,
              }
            : pr
        ),
      };
    }

    case "REJECT_STAGE":
      return patchProject(state, action.projectId, (p) => {
        if (p.status !== "InProgress" || !p.stagePending || p.reviewedAttempt === p.stageAttempt) {
          return p;
        }
        const review: Review = { member: "You", action: "reject", at: state.now };
        const reviews = {
          ...p.reviews,
          [p.stageAttempt]: [...(p.reviews[p.stageAttempt] ?? []), review],
        };
        return {
          ...p,
          stageRejections: p.stageRejections + 1,
          stagePending: false,
          reviews,
          reviewedAttempt: p.stageAttempt,
        };
      });

    case "VOTE_TERMINATE": {
      const p = state.projects.find((pr) => pr.id === action.projectId);
      if (!p || (p.status !== "Selected" && p.status !== "InProgress") || p.terminateVoted) {
        return state;
      }
      const newVotes = p.terminateVotes + 1;
      if (quorumMet(state, newVotes)) {
        const winner = winnerOf(p);
        let pot = state.config.pot;
        if (winner) {
          if (p.status === "InProgress") pot -= winner.budget - p.disbursed;
          pot -= winner.collateral;
        }
        return {
          ...state,
          config: { ...state.config, pot: Math.max(0, pot) },
          projects: state.projects.map((pr) =>
            pr.id === action.projectId
              ? { ...pr, status: "Terminated", terminateVotes: newVotes, terminateVoted: true }
              : pr
          ),
        };
      }
      return patchProject(state, action.projectId, (p) => ({
        ...p,
        terminateVotes: newVotes,
        terminateVoted: true,
      }));
    }

    case "SUBMIT_PROPOSAL": {
      const idx = state.projects.findIndex((p) => p.id === action.projectId);
      if (idx === -1) return state;
      const p = state.projects[idx];
      if (p.status !== "Voting" || state.now >= p.deadline) return state;
      const id = `${p.id}-${String.fromCharCode(65 + p.proposals.length)}`;
      const proposal: Proposal = {
        id,
        projectId: p.id,
        companyName: action.input.companyName,
        description: action.input.description,
        budget: action.input.budget,
        collateral: action.input.collateral,
        stages: action.input.stages,
        voteCount: 0,
        revealed: false,
        withdrawn: false,
      };
      const projects = [...state.projects];
      projects[idx] = { ...p, proposals: [...p.proposals, proposal] };
      return {
        ...state,
        projects,
        config: { ...state.config, pot: state.config.pot + action.input.collateral },
      };
    }

    case "REVEAL_COMPANY":
      return patchProject(state, action.projectId, (p) => {
        if (p.status !== "Selected" || p.winnerCompany !== null) return p;
        const winner = p.proposals.find(
          (pr) => pr.id === p.winnerProposalId && pr.companyName === state.demoCompany
        );
        if (!winner) return p;
        return {
          ...p,
          winnerCompany: {
            proposalId: winner.id,
            companyName: winner.companyName,
            revealedAt: state.now,
          },
          proposals: p.proposals.map((pr) =>
            pr.id === winner.id ? { ...pr, revealed: true } : pr
          ),
        };
      });

    case "REQUEST_PAYMENT":
      return patchProject(state, action.projectId, (p) => {
        const winner = winnerOf(p);
        if (
          p.status !== "InProgress" ||
          p.stagePending ||
          p.stageRejections >= p.maxStageRejections ||
          !winner ||
          p.currentStage >= winner.stages.length
        ) {
          return p;
        }
        return {
          ...p,
          stagePending: true,
          stageApprovals: 0,
          stageAttempt: p.stageAttempt + 1,
          reviewedAttempt: null,
        };
      });

    case "WITHDRAW_COLLATERAL": {
      const p = state.projects.find((pr) => pr.id === action.projectId);
      if (!p) return state;
      const pr = p.proposals.find((x) => x.id === action.proposalId);
      if (!pr || pr.withdrawn || pr.collateral <= 0) return state;
      const postVote =
        p.status === "Selected" ||
        p.status === "InProgress" ||
        p.status === "Completed" ||
        p.status === "Cancelled" ||
        p.status === "Terminated";
      const winnerHeld = p.winnerProposalId === pr.id && p.status !== "Cancelled";
      if (!postVote || winnerHeld) return state;
      return {
        ...state,
        config: { ...state.config, pot: state.config.pot - pr.collateral },
        projects: state.projects.map((x) =>
          x.id === action.projectId
            ? {
                ...x,
                proposals: x.proposals.map((q) =>
                  q.id === action.proposalId ? { ...q, withdrawn: true, collateral: 0 } : q
                ),
              }
            : x
        ),
      };
    }

    default:
      return state;
  }
}
