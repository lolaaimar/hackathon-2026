import type { AppState } from "../types";
import { makeProject, type ProjectSeed } from "./seedHelpers";

const DAY = 24 * 60 * 60 * 1000;

export function createSeedState(): AppState {
  const base = Date.now();

  const seeds: ProjectSeed[] = [
    {
      id: "P-001",
      title: "Metro Line 4 — Signaling Upgrade",
      description:
        "Modernize the line-4 signal control system: design freeze, field installation, integration and go-live.",
      status: "Voting",
      deadline: base + 10 * DAY,
      fundingDeadline: base + 17 * DAY,
      collateralRequired: 20000,
      maxStageRejections: 2,
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
      createdBy: "M. Okafor",
      proposals: [],
    },
  ];

  const projects = seeds.map((s) => makeProject(s, base));

  return {
    config: {
      adminPk: "gv-8f3a…9c21",
      quorumPercent: 60,
      approvalsRequired: 3,
      fundingToken: "NIGHT",
      treasury: "tz-1b7e…4a90",
      pot: 3450000,
      potHasCoin: true,
      members: [],
    },
    projects,
    now: base,
    role: null,
    wallet: {
      connected: false,
      walletName: null,
      address: null,
      networkId: null,
      error: null,
    },
    contract: {
      deployed: false,
      address: null,
      networkId: null,
      deployedAt: null,
      deployerAddress: null,
    },
    demoCompany: "VoltGrid Industries",
  };
}
