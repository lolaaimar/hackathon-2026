import { describe, expect, it } from "vitest";
import { pureCircuits, ProjectStatus } from "../src/managed/govfund/contract/index.js";
import {
  GovFundSimulator,
  INITIAL_TIME,
  makeCoin,
  makeStages,
  memberCommitOf,
} from "./GovFundSimulator.js";
import { adminState, bytes, companyState, memberState } from "./witnesses.js";

// ---------------------------------------------------------------------------
// End-to-end demo of the real application workflow.
//
// A government (5 members) opens a public works project; three companies bid;
// the members vote anonymously; the winning company is funded and paid out
// stage by stage as pairs of reviewers approve each milestone, until the
// project completes and every coin has moved out of the contract.
// ---------------------------------------------------------------------------

const ADMIN = adminState(0x01);

const MEMBERS = [
  memberState(0x11),
  memberState(0x12),
  memberState(0x13),
  memberState(0x14),
  memberState(0x15),
];
const [M1, M2, M3, M4, M5] = MEMBERS;
const COMMITS = MEMBERS.map((m) => memberCommitOf(m.sk!, m.salt!));

const COMPANIES = [
  companyState(0x21),
  companyState(0x22),
  companyState(0x23),
];
const [CA, CB, CC] = COMPANIES;

const PROJECT_ID = bytes(0x31);
const PROPOSAL_A = bytes(0x41);
const PROPOSAL_B = bytes(0x42);
const PROPOSAL_C = bytes(0x43);

const DEADLINE = BigInt(INITIAL_TIME + 1000);
const FUNDING_DEADLINE = BigInt(INITIAL_TIME + 5000);
const COLLATERAL = 50n;
const BUDGET_A = 1000n;
const STAGES_A = makeStages([400n, 400n, 200n]);
const STAGES_B = makeStages([600n, 600n]);
const STAGES_C = makeStages([500n, 450n]);
const WINNER_COINPK = { bytes: bytes(0xaa) };

let stepCount = 0;
const step = (label: string): void => {
  stepCount += 1;
  console.log(`\n  [${stepCount}] ${label}`);
};

describe("GovFund end-to-end workflow (demo)", () => {
  it("runs a project from creation to completed payment", () => {
    stepCount = 0;
    const sim = new GovFundSimulator({ admin: ADMIN });

    // ----------------------------------------------------------------
    step("Deploy: the government deploys GovFund with its configuration");
    // ----------------------------------------------------------------
    let s = sim.getLedger();
    expect(s.admin).toEqual(pureCircuits.publicKeyOf(ADMIN.sk!));
    expect(s.quorumPercent).toEqual(50n);
    expect(s.approvalsRequired).toEqual(2n);
    expect(s.Mem_memberCount).toEqual(0n);
    console.log(`      quorum ${s.quorumPercent}%, ${s.approvalsRequired} reviewers per stage`);

    // ----------------------------------------------------------------
    step("Admin registers the 5 government members");
    // ----------------------------------------------------------------
    sim.setActor(ADMIN);
    COMMITS.forEach((commit) => sim.addMember(commit));
    s = sim.getLedger();
    expect(s.Mem_memberCount).toEqual(5n);
    console.log("      5 members added");

    // ----------------------------------------------------------------
    step("A member opens the project \"Suspension Bridge\"");
    // ----------------------------------------------------------------
    sim.setActor(M1);
    sim.createProject(
      PROJECT_ID,
      "Suspension Bridge",
      DEADLINE,
      FUNDING_DEADLINE,
      COLLATERAL,
      3n,
    );
    let p = sim.getLedger().projects.lookup(PROJECT_ID);
    expect(p.status).toEqual(ProjectStatus.Voting);
    expect(p.collateralRequired).toEqual(COLLATERAL);
    console.log("      project open for bids");

    // ----------------------------------------------------------------
    step("Three companies bid, each depositing the 50 collateral");
    // ----------------------------------------------------------------
    const bid = (
      company: typeof CA,
      proposalId: Uint8Array,
      budget: bigint,
      stages: ReturnType<typeof makeStages>,
    ): void => {
      sim.setActor(company);
      sim.submitProposal(
        PROJECT_ID,
        proposalId,
        budget,
        COLLATERAL,
        BigInt(stages.filter((st) => st.amount !== 0n).length),
        stages,
        makeCoin(COLLATERAL),
      );
    };
    bid(CA, PROPOSAL_A, BUDGET_A, STAGES_A);
    bid(CB, PROPOSAL_B, 1200n, STAGES_B);
    bid(CC, PROPOSAL_C, 950n, STAGES_C);
    for (const id of [PROPOSAL_A, PROPOSAL_B, PROPOSAL_C]) {
      const proposal = sim.getLedger().proposals.lookup(id);
      expect(proposal.collateral).toEqual(COLLATERAL);
      expect(proposal.voteCount).toEqual(0n);
    }
    console.log("      3 proposals received, identities committed");

    // ----------------------------------------------------------------
    step("Members vote anonymously (quorum is 3 of 5)");
    // ----------------------------------------------------------------
    sim.setActor(M1); sim.vote(PROJECT_ID, PROPOSAL_A);
    sim.setActor(M2); sim.vote(PROJECT_ID, PROPOSAL_C);
    sim.setActor(M3); sim.vote(PROJECT_ID, PROPOSAL_A);
    sim.setActor(M4); sim.vote(PROJECT_ID, PROPOSAL_B);
    sim.setActor(M5); sim.vote(PROJECT_ID, PROPOSAL_A);

    p = sim.getLedger().projects.lookup(PROJECT_ID);
    expect(p.totalVotes).toEqual(5n);
    expect(sim.getLedger().proposals.lookup(PROPOSAL_A).voteCount).toEqual(3n);
    expect(sim.getLedger().proposals.lookup(PROPOSAL_B).voteCount).toEqual(1n);
    expect(sim.getLedger().proposals.lookup(PROPOSAL_C).voteCount).toEqual(1n);
    console.log("      A: 3 votes, B: 1 vote, C: 1 vote");

    // ----------------------------------------------------------------
    step("Voting closes and the plurality winner is selected");
    // ----------------------------------------------------------------
    sim.setBlockTime(Number(DEADLINE) + 1);
    sim.finalizeSelection(PROJECT_ID);
    p = sim.getLedger().projects.lookup(PROJECT_ID);
    expect(p.status).toEqual(ProjectStatus.Selected);
    expect(p.winner).toEqual({ is_some: true, value: PROPOSAL_A });
    console.log("      winner: Company A");

    // ----------------------------------------------------------------
    step("The losing companies reclaim their collateral");
    // ----------------------------------------------------------------
    const potAfterBids = sim.getLedger().pot.value; // 150
    sim.setActor(CB);
    sim.withdrawCollateral(PROJECT_ID, PROPOSAL_B, CB.nonce!, { bytes: bytes(0xbb) });
    sim.setActor(CC);
    sim.withdrawCollateral(PROJECT_ID, PROPOSAL_C, CC.nonce!, { bytes: bytes(0xcc) });
    expect(sim.getLedger().pot.value).toEqual(potAfterBids - 2n * COLLATERAL);
    console.log("      B and C refunded");

    // ----------------------------------------------------------------
    step("The winner reveals its identity so it can be paid");
    // ----------------------------------------------------------------
    sim.setActor(CA);
    sim.revealCompany(PROJECT_ID, PROPOSAL_A, CA.nonce!, WINNER_COINPK);
    const winnerCompany = sim.getLedger().projects.lookup(PROJECT_ID).winnerCompany;
    expect(winnerCompany.is_some).toBe(true);
    console.log("      Company A revealed");

    // ----------------------------------------------------------------
    step("A government member funds the winner's 1000 budget");
    // ----------------------------------------------------------------
    sim.setActor(M2);
    sim.fundProject(PROJECT_ID, makeCoin(BUDGET_A));
    p = sim.getLedger().projects.lookup(PROJECT_ID);
    expect(p.status).toEqual(ProjectStatus.InProgress);
    expect(p.budget).toEqual(BUDGET_A);
    expect(sim.getLedger().pot.value).toEqual(1050n); // 1000 budget + 50 winner collateral
    console.log("      contract now holds 1000 budget + 50 collateral");

    // ----------------------------------------------------------------
    step("Vesting: stage 1 (400) approved by reviewers M1 and M2");
    // ----------------------------------------------------------------
    sim.setActor(CA);
    sim.requestPayment(PROJECT_ID);
    sim.setActor(M1);
    sim.approveStage(PROJECT_ID);
    sim.setActor(M2);
    sim.approveStage(PROJECT_ID);
    p = sim.getLedger().projects.lookup(PROJECT_ID);
    expect(p.currentStage).toEqual(1n);
    expect(sim.getLedger().pot.value).toEqual(650n);
    console.log("      400 released to Company A");

    // ----------------------------------------------------------------
    step("Vesting: stage 2 (400) approved by reviewers M3 and M4");
    // ----------------------------------------------------------------
    sim.setActor(CA);
    sim.requestPayment(PROJECT_ID);
    sim.setActor(M3);
    sim.approveStage(PROJECT_ID);
    sim.setActor(M4);
    sim.approveStage(PROJECT_ID);
    p = sim.getLedger().projects.lookup(PROJECT_ID);
    expect(p.currentStage).toEqual(2n);
    expect(sim.getLedger().pot.value).toEqual(250n);
    console.log("      400 released to Company A");

    // ----------------------------------------------------------------
    step("Vesting: stage 3 (200) approved by reviewers M5 and M1");
    // ----------------------------------------------------------------
    sim.setActor(CA);
    sim.requestPayment(PROJECT_ID);
    sim.setActor(M5);
    sim.approveStage(PROJECT_ID);
    sim.setActor(M1);
    sim.approveStage(PROJECT_ID);
    console.log("      200 released to Company A");

    // ----------------------------------------------------------------
    step("The project completes and the winner's collateral is returned");
    // ----------------------------------------------------------------
    p = sim.getLedger().projects.lookup(PROJECT_ID);
    expect(p.status).toEqual(ProjectStatus.Completed);
    expect(p.currentStage).toEqual(3n);
    expect(p.disbursed).toEqual(BUDGET_A);
    expect(sim.getLedger().potHasCoin).toBe(false); // everything paid out
    console.log("      project completed, 1000 paid out, collateral returned");
    console.log(`      pot fully drained: ${!sim.getLedger().potHasCoin}`);
  });
});
