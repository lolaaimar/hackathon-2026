import { beforeEach, describe, expect, it } from 'vitest';
import { pureCircuits } from '../src/managed/govfund/contract/index.js';
import { GovFundSimulator, memberCommitOf, ZERO_TOKEN } from './GovFundSimulator.js';
import { adminState, bytes, memberState } from './witnesses.js';

const ADMIN = adminState(0x01);
const OTHER = adminState(0x99);
const MEMBER_A = memberState(0x11);
const MEMBER_B = memberState(0x12);

const COMMIT_A = memberCommitOf(MEMBER_A.sk!, MEMBER_A.salt!);
const COMMIT_B = memberCommitOf(MEMBER_B.sk!, MEMBER_B.salt!);
const COMMIT_ADMIN = memberCommitOf(ADMIN.sk!, ADMIN.salt!);

describe('GovFund admin', () => {
  let sim: GovFundSimulator;

  beforeEach(() => {
    sim = new GovFundSimulator({ admin: ADMIN });
    sim.setActor(ADMIN);
  });

  describe('constructor', () => {
    it('seals the deployer as admin and stores the configuration', () => {
      const s = sim.getLedger();
      expect(s.admin).toEqual(pureCircuits.publicKeyOf(ADMIN.sk!));
      expect(s.quorumPercent).toEqual(50n);
      expect(s.approvalsRequired).toEqual(2n);
      expect(s.fundingToken).toEqual(ZERO_TOKEN);
      expect(s.treasury.bytes).toEqual(bytes(0xee));
    });

    it('registers the deployer as the first member', () => {
      const s = sim.getLedger();
      expect(s.Mem_memberCount).toEqual(1n);
      expect(s.Mem_members.findPathForLeaf(COMMIT_ADMIN)).toBeDefined();
    });
  });

  describe('addMember', () => {
    it('inserts the commitment and increments the member count', () => {
      expect(sim.getLedger().Mem_memberCount).toEqual(1n);

      sim.addMember(COMMIT_A);
      expect(sim.getLedger().Mem_memberCount).toEqual(2n);
    });

    it('fails when called by a non-admin', () => {
      sim.setActor(OTHER);
      expect(() => sim.addMember(COMMIT_A)).toThrow('Not admin');
    });

    it('fails when the commitment was already revoked', () => {
      const sim2 = new GovFundSimulator({
        admin: ADMIN,
        approvalsRequired: 1n,
      });
      sim2.setActor(ADMIN);
      sim2.addMember(COMMIT_A);
      sim2.addMember(COMMIT_B);
      sim2.removeMember(COMMIT_A);

      expect(() => sim2.addMember(COMMIT_A)).toThrow('Member is revoked');
    });
  });

  describe('removeMember', () => {
    let sim2: GovFundSimulator;

    beforeEach(() => {
      sim2 = new GovFundSimulator({ admin: ADMIN, approvalsRequired: 2n });
      sim2.setActor(ADMIN);
      sim2.addMember(COMMIT_A);
      sim2.addMember(COMMIT_B);
    });

    it('revokes the commitment and decrements the count', () => {
      sim2.removeMember(COMMIT_A);

      const s = sim2.getLedger();
      expect(s.Mem_memberCount).toEqual(2n);
      expect(s.Mem_revokedMembers.member(COMMIT_A)).toBe(true);
    });

    it('fails when called by a non-admin', () => {
      sim2.setActor(OTHER);
      expect(() => sim2.removeMember(COMMIT_A)).toThrow('Not admin');
    });

    it('blocks removal that would make approvals unreachable', () => {
      // removing B would leave only the deployer (1 < 2) -> blocked
      sim2.removeMember(COMMIT_A);
      expect(() => sim2.removeMember(COMMIT_B)).toThrow('Removal would make approvals unreachable');
    });

    it('allows removing the deployer while thresholds stay reachable', () => {
      const sim0 = new GovFundSimulator({
        admin: ADMIN,
        approvalsRequired: 1n,
      });
      sim0.setActor(ADMIN);
      sim0.addMember(COMMIT_A);
      sim0.removeMember(COMMIT_ADMIN);

      const s = sim0.getLedger();
      expect(s.Mem_memberCount).toEqual(1n);
      expect(s.Mem_revokedMembers.member(COMMIT_ADMIN)).toBe(true);
    });
  });
});
