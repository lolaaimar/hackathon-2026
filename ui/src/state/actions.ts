import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import type { Role, Stage } from "../types";

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
  | { type: "ROLE_SET"; role: Role | null }
  | { type: "SET_DEMO_COMPANY"; company: string }
  | {
      type: "WALLET_CONNECTED";
      walletName: string;
      address: string;
      networkId: string;
      api: ConnectedAPI;
    }
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
  | { type: "WITHDRAW_COLLATERAL"; projectId: string; proposalId: string }
  | {
      type: "MERGE_DESCRIPTIONS";
      descriptions: Array<{
        proposalId: string;
        projectId: string;
        description: string;
      }>;
    };

export type AsyncDispatch = (action: Action) => Promise<void>;
