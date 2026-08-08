# Deploy Block-Limit Failure — Research & Fix Plan

## Problem

`Operation failed: 1010: Invalid Transaction: Transaction would exhaust the block limits`
raised on `deployContract`. Midnight uses a multi-dimensional cost model, not byte
size alone.

## Diagnosis (measured with ledger v8.0.2 / node 0.22.0)

Unproven deploy transaction vs on-chain block limits (`LedgerParameters.initialParameters()`):

| Dimension      | Deploy tx cost | Block limit | Result |
|----------------|----------------|-------------|--------|
| `readTime`     | 1.785 ms       | 2.0 s       | OK (0.09%) |
| `computeTime`  | 1.976 ms       | 2.0 s       | OK (0.1%) |
| `blockUsage`   | ~40.6 KB       | 1 MB        | OK (4%) |
| `bytesWritten` | **48.4 KB**    | **50 KB**   | **97% — binding constraint** |

Key facts:
- `bytesWritten` is the limiting dimension: 48.4 KB against a 50 KB block limit.
- ~38.5 KB (80%) of that is **verifier keys**: one ~2 KB key embedded per circuit
  at deploy (17 provable circuits).
- `readTime`/`computeTime` are negligible (constructor runs one `persistentHash`).
- The real deploy adds the **constructor proof + DUST fee offers**, which push
  `bytesWritten` over 50 KB → the error.
- `transaction_byte_limit` is 1 MiB — serialized deploy tx is only ~40 KB, so the
  official AI's ">1 MiB" and "non-zero balance" causes do NOT apply here. **Large
  verifier keys** is the correct cause.

## Why changing `Vector<60, Stage>` → `Vector<12, Stage>` did NOT fix it

Deploy tx cost measured **byte-for-byte identical** before/after the change
(1.785 ms / 1.976 ms / 48.4 KB). Reason: the stage vector lives inside `Proposal`
records, which do not exist at deploy (maps start empty). The deploy payload is
verifier keys + initial state, neither of which depends on the vector length.

The 60→12 change IS still worth keeping: it shrinks `approveStage` zkir
126→92 KB and `voteTerminate` zkir 145→92 KB (faster proof generation) and makes
each `submitProposal`/`approveStage` call cheaper — it just does not help deploy.

## Fix: merge circuits to remove verifier keys

Each merged circuit removes one ~2 KB verifier key. Merging 7 circuits → 3 removes
4 keys ≈ 8 KB, dropping deploy `bytesWritten` to ~40 KB (80%), with ~10 KB headroom
for the constructor proof + DUST offers.

### Merge 1 — `setQuorumPercent` + `setApprovalsRequired` → `setThresholds`

```compact
export circuit setThresholds(newQuorumPercent: Uint<16>, newApprovalsRequired: Uint<16>): [] {
  require_admin();
  const qOk = disclose(newQuorumPercent >= 1 && newQuorumPercent <= 100);
  assert(disclose(qOk), "Invalid quorum percent");
  const aOk = disclose(newApprovalsRequired >= 1 &&
                       (newApprovalsRequired as Uint<64>) <= Mem_memberCount.read());
  assert(disclose(aOk), "Invalid approval threshold");
  quorumPercent = disclose(newQuorumPercent);
  approvalsRequired = disclose(newApprovalsRequired);
}
```

### Merge 2 — `finalizeSelection` + `cancelProject` + `expireFunding` → `settleProject`

```compact
export circuit settleProject(projectId: Bytes<32>): [] {
  assert(disclose(projects.member(disclose(projectId))), "Unknown project");
  const p = projects.lookup(disclose(projectId));
  const inVoting = disclose(p.status == ProjectStatus.Voting);
  const inSelected = disclose(p.status == ProjectStatus.Selected);
  assert(disclose(inVoting || inSelected), "Project not settleable");
  if (inVoting) {
    assert(blockTimeGte(p.deadline), "Voting deadline not reached");
    if (disclose(quorumMet(p.totalVotes))) {
      assert(disclose(p.leader.is_some), "No votes cast");
      projects.insert(disclose(projectId),
        disclose(ProjectInfo { ...p, status: ProjectStatus.Selected, winner: p.leader }));
    } else {
      projects.insert(disclose(projectId),
        disclose(ProjectInfo { ...p, status: ProjectStatus.Cancelled }));
    }
  } else {
    assert(blockTimeGte(p.fundingDeadline), "Funding deadline not reached");
    projects.insert(disclose(projectId),
      disclose(ProjectInfo { ...p, status: ProjectStatus.Cancelled }));
  }
}
```

### Merge 3 — `addMember` + `removeMember` → `manageMember(memberCommit, revoke)`

```compact
export circuit manageMember(memberCommit: Bytes<32>, revoke: Boolean): [] {
  require_admin();
  if (disclose(revoke)) {
    assert(!disclose(Mem_memberCount.lessThan(1)), "No members");
    const newCount = (Mem_memberCount.read() - 1) as Uint<64>;
    assert(disclose(newCount >= (approvalsRequired as Uint<64>)),
           "Removal would make approvals unreachable");
    assert(disclose(quorumMet(newCount as Uint<16>)), "Removal would make quorum unreachable");
    Mem_revokedMembers.insert(disclose(memberCommit));
    Mem_memberCount.decrement(1);
  } else {
    assert(!disclose(Mem_revokedMembers.member(disclose(memberCommit))), "Member is revoked");
    Mem_members.insert(disclose(memberCommit));
    Mem_memberCount.increment(1);
  }
}
```

**Left unchanged:** `requestPayment`, `approveStage`, `rejectStage` (per decision),
plus `createProject`, `submitProposal`, `vote`, `revealCompany`, `fundProject`,
`withdrawCollateral`, `voteTerminate`, and the 3 `Mem_*` views.

## Files to update

| File | Change |
|------|--------|
| `contract/src/index.compact` | Remove 7 circuits; add 3 merged |
| `api/src/common-types.ts` | `GovFundCircuits`: 7 names → `setThresholds`, `settleProject`, `manageMember` |
| `api/src/index.ts` | Replace 7 `callTx.*` helpers with 3 |
| `contract/__tests__/GovFundSimulator.ts` | Simulator methods → merged |
| `contract/__tests__/admin.test.ts` | Update `sim.*` calls + assert messages |
| `contract/__tests__/membership.test.ts` | Update `sim.*` calls + assert messages |
| `contract/__tests__/workflow.test.ts` | Update `sim.*` calls |
| `ui/src/midnight/client.ts` | Client methods + imports |
| `ui/src/state/provider.tsx` | Dispatch cases (`SET_QUORUM`, `SET_APPROVALS`, `FINALIZE`, `CANCEL`, `EXPIRE`, `ADD_MEMBER`, `REMOVE_MEMBER`) |
| `ui/src/pages/admin/AdminHome.tsx` | Call sites for add/remove/threshold setters |

## Verification

1. `npm run compile:zk` (regenerate keys — merged circuits produce new verifier keys)
2. `npm run test` + `npm run typecheck`
3. Re-run deploy-cost measurement script; expect `bytesWritten` ≈ 40 KB (80%)

## Open decisions

1. Keep old helper names (`sim.addMember`, `c.setQuorumPercent`) mapped onto merged
   circuits, or rename everywhere to the merged names?
2. `setThresholds` needs both params. UI currently sends only the changed one — OK to
   pass the other current value from `state.config`, or keep the two threshold circuits
   separate and only do merges 2 + 3?
