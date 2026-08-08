import { beforeEach, describe, expect, it } from 'vitest';
import { ProjectStatus } from '../src/managed/govfund/contract/index.js';
import { GovFundSimulator, makeCoin, makeStages, memberCommitOf } from './GovFundSimulator.js';
import { adminState, bytes, companyState, memberState } from './witnesses.js';

const ADMIN = adminState(0x01);
const MEMBER_A = memberState(0x11);
const MEMBER_B = memberState(0x12);
const COMPANY_A = companyState(0x21);
const COMPANY_B = companyState(0x22);

const COMMIT_A = memberCommitOf(MEMBER_A.sk!, MEMBER_A.salt!);
const COMMIT_B = memberCommitOf(MEMBER_B.sk!, MEMBER_B.salt!);

const PROJECT_ID = bytes(0x31);
const PROPOSAL_1 = bytes(0x41);
const PROPOSAL_2 = bytes(0x42);
const WINNER_COINPK = { bytes: bytes(0xaa) };

const COLLATERAL = 10n;
const BUDGET = 100n;
const STAGES = makeStages([50n, 50n]);

const newGovSim = (
  opts: { approvalsRequired?: bigint; quorumPercent?: bigint } = {},
): GovFundSimulator => {
  const sim = new GovFundSimulator({ admin: ADMIN, ...opts });
  sim.setActor(ADMIN);
  sim.addMember(COMMIT_A);
  sim.addMember(COMMIT_B);
  return sim;
};

/** Brings a project to InProgress with COMPANY_A as the revealed winner. */
const toInProgress = (sim: GovFundSimulator): void => {
  sim.setActor(MEMBER_A);
  sim.createProject(PROJECT_ID, 'Bridge', COLLATERAL, 3n);
  sim.setActor(COMPANY_A);
  sim.submitProposal(PROJECT_ID, PROPOSAL_1, BUDGET, COLLATERAL, 2n, STAGES, makeCoin(COLLATERAL));
  sim.setActor(COMPANY_B);
  sim.submitProposal(PROJECT_ID, PROPOSAL_2, BUDGET, COLLATERAL, 2n, STAGES, makeCoin(COLLATERAL));
  sim.setActor(MEMBER_A);
  sim.vote(PROJECT_ID, PROPOSAL_1);
  sim.setActor(MEMBER_B);
  sim.vote(PROJECT_ID, PROPOSAL_1);
  sim.settleProject(PROJECT_ID);
  sim.setActor(COMPANY_A);
  sim.revealCompany(PROJECT_ID, PROPOSAL_1, COMPANY_A.nonce!, WINNER_COINPK);
  sim.setActor(MEMBER_A);
  sim.fundProject(PROJECT_ID, makeCoin(BUDGET));
};

describe('GovFund vesting & money', () => {
  let sim: GovFundSimulator;

  describe('requestPayment', () => {
    beforeEach(() => {
      sim = newGovSim({ approvalsRequired: 1n });
      toInProgress(sim);
    });

    it('opens the current stage for review', () => {
      sim.setActor(COMPANY_A);
      sim.requestPayment(PROJECT_ID);

      const p = sim.getLedger().projects.lookup(PROJECT_ID);
      expect(p.stagePending).toBe(true);
      expect(p.stageAttempt).toEqual(1n);
    });

    it('fails for a non-winner', () => {
      sim.setActor(COMPANY_B);
      expect(() => sim.requestPayment(PROJECT_ID)).toThrow('Not the winner');
    });

    it('fails when a payment is already requested', () => {
      sim.setActor(COMPANY_A);
      sim.requestPayment(PROJECT_ID);
      expect(() => sim.requestPayment(PROJECT_ID)).toThrow('Payment already requested');
    });
  });

  describe('approveStage', () => {
    it('releases the stage once the reviewer threshold is met', () => {
      sim = newGovSim({ approvalsRequired: 1n });
      toInProgress(sim);
      const potBefore = sim.getLedger().pot.value;

      sim.setActor(COMPANY_A);
      sim.requestPayment(PROJECT_ID);
      sim.setActor(MEMBER_A);
      sim.approveStage(PROJECT_ID);

      const p = sim.getLedger().projects.lookup(PROJECT_ID);
      expect(p.currentStage).toEqual(1n);
      expect(p.stagePending).toBe(false);
      // stage 1 (50) released from the pot
      expect(sim.getLedger().pot.value).toEqual(potBefore - 50n);
    });

    it('needs distinct members to reach the threshold', () => {
      sim = newGovSim({ approvalsRequired: 2n });
      toInProgress(sim);

      sim.setActor(COMPANY_A);
      sim.requestPayment(PROJECT_ID);

      sim.setActor(MEMBER_A);
      sim.approveStage(PROJECT_ID);
      // threshold (2) not reached yet: stage still pending, nothing released
      const p1 = sim.getLedger().projects.lookup(PROJECT_ID);
      expect(p1.stageApprovals).toEqual(1n);
      expect(p1.stagePending).toBe(true);
      expect(p1.currentStage).toEqual(0n);

      sim.setActor(MEMBER_B);
      sim.approveStage(PROJECT_ID);
      const p2 = sim.getLedger().projects.lookup(PROJECT_ID);
      expect(p2.currentStage).toEqual(1n);
      expect(p2.stagePending).toBe(false);
    });

    it('blocks the same member acting twice on a stage', () => {
      sim = newGovSim({ approvalsRequired: 2n });
      toInProgress(sim);

      sim.setActor(COMPANY_A);
      sim.requestPayment(PROJECT_ID);

      sim.setActor(MEMBER_A);
      sim.approveStage(PROJECT_ID);
      expect(() => sim.approveStage(PROJECT_ID)).toThrow('Already acted on this stage');
    });

    it('fails when no payment is requested', () => {
      sim = newGovSim({ approvalsRequired: 1n });
      toInProgress(sim);

      sim.setActor(MEMBER_A);
      expect(() => sim.approveStage(PROJECT_ID)).toThrow('No payment requested');
    });

    it('fails for a non-member', () => {
      sim = newGovSim({ approvalsRequired: 1n });
      toInProgress(sim);

      sim.setActor(COMPANY_A);
      sim.requestPayment(PROJECT_ID);
      sim.setActor(adminState(0x99));
      expect(() => sim.approveStage(PROJECT_ID)).toThrow('Not a member');
    });

    it('completes the project and returns the winner collateral on the last stage', () => {
      sim = newGovSim({ approvalsRequired: 1n });
      toInProgress(sim);
      const potBefore = sim.getLedger().pot.value; // 120 = budget + 2 collaterals

      sim.setActor(COMPANY_A);
      sim.requestPayment(PROJECT_ID);
      sim.setActor(MEMBER_A);
      sim.approveStage(PROJECT_ID); // stage 1 -> 50 released

      sim.setActor(COMPANY_A);
      sim.requestPayment(PROJECT_ID);
      sim.setActor(MEMBER_A);
      sim.approveStage(PROJECT_ID); // stage 2 -> 50 released + winner collateral returned

      const p = sim.getLedger().projects.lookup(PROJECT_ID);
      expect(p.status).toEqual(ProjectStatus.Completed);
      expect(p.currentStage).toEqual(2n);
      // 100 released to the winner + 10 collateral returned; loser's 10 still held
      expect(sim.getLedger().pot.value).toEqual(potBefore - 110n);
    });
  });

  describe('rejectStage', () => {
    it('closes the review window so the company can retry', () => {
      sim = newGovSim({ approvalsRequired: 1n });
      toInProgress(sim);

      sim.setActor(COMPANY_A);
      sim.requestPayment(PROJECT_ID);

      sim.setActor(MEMBER_A);
      sim.rejectStage(PROJECT_ID);

      // window closed: further review fails until a new request
      expect(() => sim.approveStage(PROJECT_ID)).toThrow('No payment requested');
      expect(sim.getLedger().projects.lookup(PROJECT_ID).stageRejections).toEqual(1n);

      // company retries on a fresh attempt
      sim.setActor(COMPANY_A);
      sim.requestPayment(PROJECT_ID);
      expect(sim.getLedger().projects.lookup(PROJECT_ID).stagePending).toBe(true);
    });

    it('blocks further requests once the rejection limit is reached', () => {
      sim = newGovSim({ approvalsRequired: 1n });
      toInProgress(sim);

      // reject -> retry -> reject -> retry -> reject (maxStageRejections = 3)
      for (let i = 0; i < 3; i += 1) {
        sim.setActor(COMPANY_A);
        sim.requestPayment(PROJECT_ID);
        sim.setActor(MEMBER_A);
        sim.rejectStage(PROJECT_ID);
      }

      expect(sim.getLedger().projects.lookup(PROJECT_ID).stageRejections).toEqual(3n);

      sim.setActor(COMPANY_A);
      expect(() => sim.requestPayment(PROJECT_ID)).toThrow('Max rejections reached');
    });
  });

  describe('voteTerminate', () => {
    it('terminates at quorum, slashing collateral and refunding remaining funds', () => {
      sim = newGovSim({ approvalsRequired: 1n, quorumPercent: 50n });
      toInProgress(sim);
      const potBefore = sim.getLedger().pot.value; // 120

      sim.setActor(COMPANY_A);
      sim.requestPayment(PROJECT_ID);
      sim.setActor(MEMBER_A);
      sim.approveStage(PROJECT_ID); // release stage 1 -> pot 70

      sim.setActor(MEMBER_A);
      sim.voteTerminate(PROJECT_ID); // quorum (50% of 2 = 1)

      const p = sim.getLedger().projects.lookup(PROJECT_ID);
      expect(p.status).toEqual(ProjectStatus.Terminated);

      // remaining budget (stage 2 = 50) + winner collateral (10) -> treasury
      expect(sim.getLedger().pot.value).toEqual(potBefore - 50n - 60n);
    });

    it('requires quorum before terminating', () => {
      sim = newGovSim({ approvalsRequired: 1n, quorumPercent: 100n });
      toInProgress(sim);

      sim.setActor(MEMBER_A);
      sim.voteTerminate(PROJECT_ID);

      // not yet quorum (2 members needed at 100%)
      expect(sim.getLedger().projects.lookup(PROJECT_ID).status).toEqual(ProjectStatus.InProgress);
      expect(sim.getLedger().projects.lookup(PROJECT_ID).terminateVotes).toEqual(1n);

      sim.setActor(MEMBER_B);
      sim.voteTerminate(PROJECT_ID);

      expect(sim.getLedger().projects.lookup(PROJECT_ID).status).toEqual(ProjectStatus.Terminated);
    });

    it('blocks a member voting to terminate twice', () => {
      sim = newGovSim({ approvalsRequired: 1n, quorumPercent: 100n });
      toInProgress(sim);

      sim.setActor(MEMBER_A);
      sim.voteTerminate(PROJECT_ID);
      expect(() => sim.voteTerminate(PROJECT_ID)).toThrow('Already voted to terminate');
    });
  });

  describe('withdrawCollateral', () => {
    it('refunds a losing proposal after selection', () => {
      sim = newGovSim({ approvalsRequired: 1n });
      toInProgress(sim);
      const potBefore = sim.getLedger().pot.value; // 120

      sim.setActor(COMPANY_B);
      sim.withdrawCollateral(PROJECT_ID, PROPOSAL_2, COMPANY_B.nonce!, {
        bytes: bytes(0xbb),
      });

      expect(sim.getLedger().proposals.lookup(PROPOSAL_2).collateral).toEqual(0n);
      expect(sim.getLedger().pot.value).toEqual(potBefore - COLLATERAL);
    });

    it("holds the winner's collateral during the project", () => {
      sim = newGovSim({ approvalsRequired: 1n });
      toInProgress(sim);

      sim.setActor(COMPANY_A);
      expect(() =>
        sim.withdrawCollateral(PROJECT_ID, PROPOSAL_1, COMPANY_A.nonce!, WINNER_COINPK),
      ).toThrow('Winner collateral is held');
    });

    it('fails for a wrong commitment nonce', () => {
      sim = newGovSim({ approvalsRequired: 1n });
      toInProgress(sim);

      sim.setActor(COMPANY_B);
      expect(() =>
        sim.withdrawCollateral(PROJECT_ID, PROPOSAL_2, bytes(0xff), {
          bytes: bytes(0xbb),
        }),
      ).toThrow('Invalid reveal');
    });

    it("holds the winner's collateral when the project is terminated", () => {
      sim = newGovSim({ approvalsRequired: 1n });
      toInProgress(sim);

      sim.setActor(MEMBER_A);
      sim.voteTerminate(PROJECT_ID); // terminate (quorum 50% = 1)
      const status = sim.getLedger().projects.lookup(PROJECT_ID).status;
      expect(status).toEqual(ProjectStatus.Terminated);
      // winner cannot withdraw once terminated (collateral slashed)
      sim.setActor(COMPANY_A);
      expect(() =>
        sim.withdrawCollateral(PROJECT_ID, PROPOSAL_1, COMPANY_A.nonce!, WINNER_COINPK),
      ).toThrow('Winner collateral is held');
    });
  });
});
