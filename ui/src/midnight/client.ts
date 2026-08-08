import {
  deployContract,
  findDeployedContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import { map } from "rxjs";
import type { Observable } from "rxjs";
import {
  GovFundPrivateStateId,
  ledger,
  addMember,
  removeMember,
  setQuorumPercent,
  setApprovalsRequired,
  createProject,
  submitProposal,
  vote,
  finalizeSelection,
  revealCompany,
  fundProject,
  withdrawCollateral,
  requestPayment,
  approveStage,
  rejectStage,
  voteTerminate,
  cancelProject,
  expireFunding,
} from "@govfund/api";
import type {
  GovFundDeployedContract,
  GovFundProviders,
  Ledger,
  ShieldedCoinInfo,
  Stage,
  ZswapCoinPublicKey,
} from "@govfund/api";
import { govfundCompiledContract } from "./compiled.js";
import { toPrivateState } from "./identities.js";
import type { RoleIdentity } from "./identities.js";

export type GovFundClientOptions = {
  readonly providers: GovFundProviders;
};

/**
 * Browser client for the GovFund contract. Deploys/finds the contract with the
 * browser-safe compiled binding and exposes every circuit as a typed method plus
 * a live ledger observable.
 */
export class GovFundClient {
  constructor(private readonly providers: GovFundProviders) {}

  async deploy(
    args: {
      readonly quorumPercentParam: bigint;
      readonly fundingTokenParam: Uint8Array;
      readonly treasuryParam: ZswapCoinPublicKey;
      readonly approvalsRequiredParam: bigint;
    },
    admin: RoleIdentity,
  ): Promise<GovFundDeployedContract> {
    return deployContract(this.providers, {
      compiledContract: govfundCompiledContract,
      privateStateId: GovFundPrivateStateId,
      initialPrivateState: toPrivateState(admin),
      args: [
        args.quorumPercentParam,
        args.fundingTokenParam,
        args.treasuryParam,
        args.approvalsRequiredParam,
      ],
    });
  }

  async find(
    contractAddress: string,
    identity?: RoleIdentity,
  ): Promise<GovFundDeployedContract> {
    const base = {
      compiledContract: govfundCompiledContract,
      contractAddress,
    };
    return identity !== undefined
      ? findDeployedContract(this.providers, {
          ...base,
          privateStateId: GovFundPrivateStateId,
          initialPrivateState: toPrivateState(identity),
        })
      : findDeployedContract(this.providers, base);
  }

  /** Live on-chain ledger stream for the contract at `address`. */
  ledger$(address: string): Observable<Ledger> {
    return this.providers.publicDataProvider
      .contractStateObservable(address, { type: "latest" })
      .pipe(map((state) => ledger(state.data)));
  }

  // ------------------------------- Admin -----------------------------------

  addMember(d: GovFundDeployedContract, commit: Uint8Array) {
    return addMember(d)(commit);
  }

  removeMember(d: GovFundDeployedContract, commit: Uint8Array) {
    return removeMember(d)(commit);
  }

  setQuorumPercent(d: GovFundDeployedContract, percent: bigint) {
    return setQuorumPercent(d)(percent);
  }

  setApprovalsRequired(d: GovFundDeployedContract, required: bigint) {
    return setApprovalsRequired(d)(required);
  }

  // ------------------------------ Project ----------------------------------

  createProject(
    d: GovFundDeployedContract,
    args: {
      readonly projectId: Uint8Array;
      readonly title: string;
      readonly deadline: bigint;
      readonly fundingDeadline: bigint;
      readonly collateralRequired: bigint;
      readonly maxStageRejections: bigint;
    },
  ) {
    return createProject(d)(
      args.projectId,
      args.title,
      args.deadline,
      args.fundingDeadline,
      args.collateralRequired,
      args.maxStageRejections,
    );
  }

  submitProposal(
    d: GovFundDeployedContract,
    args: {
      readonly projectId: Uint8Array;
      readonly proposalId: Uint8Array;
      readonly budget: bigint;
      readonly collateralAmount: bigint;
      readonly stageCount: bigint;
      readonly stages: Stage[];
      readonly collateralCoin: ShieldedCoinInfo;
    },
  ) {
    return submitProposal(d)(
      args.projectId,
      args.proposalId,
      args.budget,
      args.collateralAmount,
      args.stageCount,
      args.stages,
      args.collateralCoin,
    );
  }

  vote(d: GovFundDeployedContract, projectId: Uint8Array, proposalId: Uint8Array) {
    return vote(d)(projectId, proposalId);
  }

  finalizeSelection(d: GovFundDeployedContract, projectId: Uint8Array) {
    return finalizeSelection(d)(projectId);
  }

  revealCompany(
    d: GovFundDeployedContract,
    args: {
      readonly projectId: Uint8Array;
      readonly proposalId: Uint8Array;
      readonly nonce: Uint8Array;
      readonly coinPk: ZswapCoinPublicKey;
    },
  ) {
    return revealCompany(d)(
      args.projectId,
      args.proposalId,
      args.nonce,
      args.coinPk,
    );
  }

  fundProject(
    d: GovFundDeployedContract,
    projectId: Uint8Array,
    depositCoin: ShieldedCoinInfo,
  ) {
    return fundProject(d)(projectId, depositCoin);
  }

  withdrawCollateral(
    d: GovFundDeployedContract,
    args: {
      readonly projectId: Uint8Array;
      readonly proposalId: Uint8Array;
      readonly nonce: Uint8Array;
      readonly coinPk: ZswapCoinPublicKey;
    },
  ) {
    return withdrawCollateral(d)(
      args.projectId,
      args.proposalId,
      args.nonce,
      args.coinPk,
    );
  }

  // ------------------------------ Vesting ----------------------------------

  requestPayment(d: GovFundDeployedContract, projectId: Uint8Array) {
    return requestPayment(d)(projectId);
  }

  approveStage(d: GovFundDeployedContract, projectId: Uint8Array) {
    return approveStage(d)(projectId);
  }

  rejectStage(d: GovFundDeployedContract, projectId: Uint8Array) {
    return rejectStage(d)(projectId);
  }

  voteTerminate(d: GovFundDeployedContract, projectId: Uint8Array) {
    return voteTerminate(d)(projectId);
  }

  cancelProject(d: GovFundDeployedContract, projectId: Uint8Array) {
    return cancelProject(d)(projectId);
  }

  expireFunding(d: GovFundDeployedContract, projectId: Uint8Array) {
    return expireFunding(d)(projectId);
  }
}
