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

const COLLATERAL = 10n;
const BUDGET = 100n;
const STAGES = makeStages([50n, 50n]);

/** Fresh simulator with admin + two members registered. */
const newGovSim = (): GovFundSimulator => {
  const sim = new GovFundSimulator({ admin: ADMIN });
  sim.setActor(ADMIN);
  sim.addMember(COMMIT_A);
  sim.addMember(COMMIT_B);
  return sim;
};

const openProject = (sim: GovFundSimulator): void => {
  sim.setActor(MEMBER_A);
  sim.createProject(PROJECT_ID, 'Suspension bridge', COLLATERAL, 3n);
};

const submitBid = (
  sim: GovFundSimulator,
  company: typeof COMPANY_A,
  proposalId: Uint8Array,
): void => {
  sim.setActor(company);
  sim.submitProposal(PROJECT_ID, proposalId, BUDGET, COLLATERAL, 2n, STAGES, makeCoin(COLLATERAL));
};

describe('GovFund membership & voting', () => {
  let sim: GovFundSimulator;

  beforeEach(() => {
    sim = newGovSim();
  });

  describe('createProject', () => {
    it('opens a project in Voting phase', () => {
      openProject(sim);

      const p = sim.getLedger().projects.lookup(PROJECT_ID);
      expect(p.status).toEqual(ProjectStatus.Voting);
      expect(p.collateralRequired).toEqual(COLLATERAL);
    });

    it('fails for a non-member', () => {
      sim.setActor(adminState(0x99));
      expect(() => sim.createProject(PROJECT_ID, 'x', COLLATERAL, 3n)).toThrow('Not a member');
    });

    it('fails for a duplicate project id', () => {
      openProject(sim);
      expect(() => sim.createProject(PROJECT_ID, 'x', COLLATERAL, 3n)).toThrow(
        'Project already exists',
      );
    });

    it('fails when maxStageRejections is zero', () => {
      sim.setActor(MEMBER_A);
      expect(() => sim.createProject(PROJECT_ID, 'x', COLLATERAL, 0n)).toThrow(
        'Invalid max rejections',
      );
    });
  });

  describe('submitProposal', () => {
    beforeEach(() => openProject(sim));

    it('registers a proposal with committed company identity', () => {
      submitBid(sim, COMPANY_A, PROPOSAL_1);

      const prop = sim.getLedger().proposals.lookup(PROPOSAL_1);
      expect(prop.projectId).toEqual(PROJECT_ID);
      expect(prop.budget).toEqual(BUDGET);
      expect(prop.collateral).toEqual(COLLATERAL);
      expect(prop.voteCount).toEqual(0n);
      expect(prop.companyCommit).toBeInstanceOf(Uint8Array);
    });

    it('fails for an unknown project', () => {
      sim.setActor(COMPANY_A);
      expect(() =>
        sim.submitProposal(
          bytes(0x99),
          PROPOSAL_1,
          BUDGET,
          COLLATERAL,
          2n,
          STAGES,
          makeCoin(COLLATERAL),
        ),
      ).toThrow('Unknown project');
    });

    it('fails for a duplicate proposal id', () => {
      submitBid(sim, COMPANY_A, PROPOSAL_1);
      expect(() => submitBid(sim, COMPANY_B, PROPOSAL_1)).toThrow('Proposal already exists');
    });

    it('fails when collateral is below the required amount', () => {
      sim.setActor(COMPANY_A);
      expect(() =>
        sim.submitProposal(
          PROJECT_ID,
          PROPOSAL_1,
          BUDGET,
          COLLATERAL - 1n,
          2n,
          STAGES,
          makeCoin(COLLATERAL - 1n),
        ),
      ).toThrow('Collateral below required');
    });

    it('fails when the collateral coin is the wrong token', () => {
      sim.setActor(COMPANY_A);
      expect(() =>
        sim.submitProposal(
          PROJECT_ID,
          PROPOSAL_1,
          BUDGET,
          COLLATERAL,
          2n,
          STAGES,
          makeCoin(COLLATERAL, bytes(0xab)),
        ),
      ).toThrow('Wrong token');
    });

    it('fails when the collateral coin value does not match', () => {
      sim.setActor(COMPANY_A);
      expect(() =>
        sim.submitProposal(
          PROJECT_ID,
          PROPOSAL_1,
          BUDGET,
          COLLATERAL,
          2n,
          STAGES,
          makeCoin(COLLATERAL + 1n),
        ),
      ).toThrow('Collateral mismatch');
    });

    it('fails when stages do not sum to the budget', () => {
      sim.setActor(COMPANY_A);
      expect(() =>
        sim.submitProposal(
          PROJECT_ID,
          PROPOSAL_1,
          BUDGET,
          COLLATERAL,
          2n,
          makeStages([30n, 30n]),
          makeCoin(COLLATERAL),
        ),
      ).toThrow('Stages must sum to budget');
    });

    it('fails when the budget is zero', () => {
      sim.setActor(COMPANY_A);
      expect(() =>
        sim.submitProposal(
          PROJECT_ID,
          PROPOSAL_1,
          0n,
          COLLATERAL,
          2n,
          makeStages([0n, 0n]),
          makeCoin(COLLATERAL),
        ),
      ).toThrow('Budget must be positive');
    });
  });

  describe('vote', () => {
    beforeEach(() => {
      openProject(sim);
      submitBid(sim, COMPANY_A, PROPOSAL_1);
    });

    it("counts a member's anonymous vote publicly", () => {
      sim.setActor(MEMBER_A);
      sim.vote(PROJECT_ID, PROPOSAL_1);

      const prop = sim.getLedger().proposals.lookup(PROPOSAL_1);
      expect(prop.voteCount).toEqual(1n);
      expect(sim.getLedger().projects.lookup(PROJECT_ID).totalVotes).toEqual(1n);
    });

    it('blocks a second vote from the same member (nullifier)', () => {
      sim.setActor(MEMBER_A);
      sim.vote(PROJECT_ID, PROPOSAL_1);
      expect(() => sim.vote(PROJECT_ID, PROPOSAL_1)).toThrow('Already voted');
    });

    it('fails for a non-member', () => {
      sim.setActor(adminState(0x99));
      expect(() => sim.vote(PROJECT_ID, PROPOSAL_1)).toThrow('Not a member');
    });

    it('fails for an unknown proposal', () => {
      sim.setActor(MEMBER_A);
      expect(() => sim.vote(PROJECT_ID, bytes(0x99))).toThrow('Unknown proposal');
    });
  });

  describe('settleProject', () => {
    it('fails when quorum is not met', () => {
      openProject(sim);
      expect(() => sim.settleProject(PROJECT_ID)).toThrow('Quorum not met');
    });

    it('selects the plurality leader once quorum is met', () => {
      openProject(sim);
      submitBid(sim, COMPANY_A, PROPOSAL_1);
      submitBid(sim, COMPANY_B, PROPOSAL_2);

      sim.setActor(MEMBER_A);
      sim.vote(PROJECT_ID, PROPOSAL_1);
      sim.setActor(MEMBER_B);
      sim.vote(PROJECT_ID, PROPOSAL_1);

      sim.settleProject(PROJECT_ID);

      const p = sim.getLedger().projects.lookup(PROJECT_ID);
      expect(p.status).toEqual(ProjectStatus.Selected);
      expect(p.winner).toEqual({ is_some: true, value: PROPOSAL_1 });
    });

    it('keeps the first proposal to reach a vote count on a tie', () => {
      openProject(sim);
      submitBid(sim, COMPANY_A, PROPOSAL_1);
      submitBid(sim, COMPANY_B, PROPOSAL_2);

      sim.setActor(MEMBER_A);
      sim.vote(PROJECT_ID, PROPOSAL_1);
      sim.setActor(MEMBER_B);
      sim.vote(PROJECT_ID, PROPOSAL_2);

      sim.settleProject(PROJECT_ID);

      expect(sim.getLedger().projects.lookup(PROJECT_ID).winner).toEqual({
        is_some: true,
        value: PROPOSAL_1,
      });
    });
  });

  describe('revealCompany', () => {
    const selectWinner = (): void => {
      openProject(sim);
      submitBid(sim, COMPANY_A, PROPOSAL_1);
      sim.setActor(MEMBER_A);
      sim.vote(PROJECT_ID, PROPOSAL_1);
      sim.settleProject(PROJECT_ID);
    };

    it("reveals the winning company's identity", () => {
      selectWinner();

      sim.setActor(COMPANY_A);
      sim.revealCompany(PROJECT_ID, PROPOSAL_1, COMPANY_A.nonce!, {
        bytes: bytes(0xaa),
      });

      const winnerCompany = sim.getLedger().projects.lookup(PROJECT_ID).winnerCompany;
      expect(winnerCompany.is_some).toBe(true);
      expect(winnerCompany.value!.coinPk.bytes).toEqual(bytes(0xaa));
    });

    it('fails for a non-winning proposal', () => {
      selectWinner();
      sim.setActor(COMPANY_A);
      expect(() =>
        sim.revealCompany(PROJECT_ID, PROPOSAL_2, COMPANY_A.nonce!, {
          bytes: bytes(0xaa),
        }),
      ).toThrow('Not the winning proposal');
    });

    it('fails with the wrong commitment nonce', () => {
      selectWinner();
      sim.setActor(COMPANY_A);
      expect(() =>
        sim.revealCompany(PROJECT_ID, PROPOSAL_1, bytes(0xff), {
          bytes: bytes(0xaa),
        }),
      ).toThrow('Invalid reveal');
    });

    it('fails when called by a different company', () => {
      selectWinner();
      sim.setActor(COMPANY_B);
      expect(() =>
        sim.revealCompany(PROJECT_ID, PROPOSAL_1, COMPANY_B.nonce!, {
          bytes: bytes(0xaa),
        }),
      ).toThrow('Invalid reveal');
    });
  });

  describe('fundProject', () => {
    const toSelectedAndRevealed = (): void => {
      openProject(sim);
      submitBid(sim, COMPANY_A, PROPOSAL_1);
      sim.setActor(MEMBER_A);
      sim.vote(PROJECT_ID, PROPOSAL_1);
      sim.settleProject(PROJECT_ID);
      sim.setActor(COMPANY_A);
      sim.revealCompany(PROJECT_ID, PROPOSAL_1, COMPANY_A.nonce!, {
        bytes: bytes(0xaa),
      });
    };

    it("deposits the winner's budget and moves to InProgress", () => {
      toSelectedAndRevealed();

      sim.setActor(MEMBER_A);
      sim.fundProject(PROJECT_ID, makeCoin(BUDGET));

      const p = sim.getLedger().projects.lookup(PROJECT_ID);
      expect(p.status).toEqual(ProjectStatus.InProgress);
      expect(p.budget).toEqual(BUDGET);
    });

    it('fails before the winner is revealed', () => {
      openProject(sim);
      submitBid(sim, COMPANY_A, PROPOSAL_1);
      sim.setActor(MEMBER_A);
      sim.vote(PROJECT_ID, PROPOSAL_1);
      sim.settleProject(PROJECT_ID);

      sim.setActor(MEMBER_A);
      expect(() => sim.fundProject(PROJECT_ID, makeCoin(BUDGET))).toThrow('Winner not revealed');
    });

    it("fails when the deposit is not the winner's budget", () => {
      toSelectedAndRevealed();
      sim.setActor(MEMBER_A);
      expect(() => sim.fundProject(PROJECT_ID, makeCoin(BUDGET - 1n))).toThrow(
        'Wrong funding amount',
      );
    });
  });
});
