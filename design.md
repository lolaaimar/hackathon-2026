# GovFund — Design

A Midnight (Compact) platform for government procurement with private voting
and stage-based vesting. A single contract instance manages many projects.

## Actors

| Role | Description |
|------|-------------|
| **Admin** | Deployer. Manages the government member registry (`addMember`/`removeMember`). |
| **Government member** | Votes on proposals, reviews stages, votes to terminate. Membership is anonymous. |
| **Company** | Submits proposals (identity hidden behind a commitment), deposits collateral, receives staged payments if selected. |

## Contract configuration

- `admin` — pk hash of the deployer secret key (sealed).
- `quorumPercent` — % of members required to vote (quorum). Admin-modifiable
  via `setQuorumPercent`; constrained to `1..100` so quorum is always reachable.
- `approvalsRequired` — number of government members that must approve each
  stage. Admin-modifiable via `setApprovalsRequired`; constrained to
  `1..memberCount`.
- `fundingToken` — shielded token color for all funds (e.g. NIGHT = `nativeToken()`), sealed.
- `treasury` — coin public key that receives slashed collateral and un-released budget (sealed).

## Membership & privacy machinery

- `pk = persistentHash([pad(32,"govfund:pk:"), sk])` is the identity for members
  and companies; `sk` lives only in the actor's private state.
- Members register a **committed leaf** `commit = persistentCommit(pk, salt)` in
  `members: HistoricMerkleTree<16, Bytes<32>>`. A member proves membership with a
  Merkle path + by opening the commitment — who acts is hidden (leaves are
  commitments, not raw public keys).
- Removal (`removeMember`) adds the commitment to `revokedMembers`; revoked
  members can no longer prove membership. A removal is blocked if it would make
  `quorum` or `approvalsRequired` unreachable with the remaining members.
- Anonymous one-time actions use domain-separated nullifiers over `sk`:
  vote, stage action (per stage + attempt), and termination.

## Money flow

All funds are shielded coins of `fundingToken`, pooled in the contract (`pot`).

1. `submitProposal` — company deposits `collateral >= collateralRequired`.
2. `finalizeSelection` — winner chosen (quorum + plurality). Losers withdraw
   their collateral by re-opening their commitment.
3. `revealCompany` — the winner opens its commitment (identity becomes public).
4. `fundProject` — a member deposits the winner's **budget** into the contract.
5. `approveStage` — when N reviewers approve, `stage.amount` is released to the
   winner; last stage → project `Completed`, winner's collateral returned.
6. `voteTerminate` — at quorum the project is `Terminated`: winner's collateral
   is slashed to `treasury`, un-released stage funds go to `treasury`.

## Project lifecycle

```
Voting --finalizeSelection--> Selected --revealCompany--> --fundProject--> InProgress
   |                             |                          |--approveStage×N--> Completed
   |--cancelProject (deadline)   |--expireFunding          |
   v                             v                          |--voteTerminate--> Terminated
Cancelled                       Cancelled                  |
   (all collateral refundable)                        (collateral + funds -> treasury)
```

- `Voting`: proposals + votes until `deadline`. After the deadline, either
  `finalizeSelection` (quorum met, plurality winner) or `cancelProject` (quorum
  not met).
- `Selected`: winner set, awaiting `revealCompany` + `fundProject` (before
  `fundingDeadline`, else `expireFunding` cancels and all collateral is
  refundable).
- `InProgress`: vesting. Company calls `requestPayment` per stage; reviewers
  `approveStage`/`rejectStage`. Rejections accumulate; after
  `maxStageRejections` the company can no longer request. Reviewers are
  anonymous; each member acts once per (stage, attempt) via nullifiers.

## Circuits

| Circuit | Who | Effect |
|---------|-----|--------|
| `addMember` / `removeMember` | admin | manage member registry (removal guarded against unreachable thresholds) |
| `setQuorumPercent` | admin | change the voting quorum % (1..100) |
| `setApprovalsRequired` | admin | change the stage approval threshold (1..memberCount) |
| `createProject` | member | start a project (Voting) |
| `submitProposal` | company | propose budget + stages, deposit collateral |
| `vote` | member | anonymous vote, public per-proposal count |
| `finalizeSelection` | anyone | pick plurality winner after deadline |
| `revealCompany` | winner | open proposal commitment |
| `fundProject` | member | deposit the winner's budget |
| `withdrawCollateral` | company | reclaim collateral (losers, or anyone on cancel) |
| `requestPayment` | winner | request current stage review |
| `approveStage` / `rejectStage` | member | review current stage |
| `voteTerminate` | member | terminate project at quorum |
| `cancelProject` | anyone | cancel unfinalized project after deadline |
| `expireFunding` | anyone | cancel unfunded Selected project after funding deadline |

## Privacy

| Visible on-chain | Hidden |
|------------------|--------|
| Per-proposal vote counts, budgets, stage schedules | Who voted (per-member identity) |
| Milestone state, released amounts, nullifiers | Who proposed (until reveal/withdrawal) |
| Member count | Member leaf values (commitments) |

## Project layout

```
contract/src/index.compact      main contract (config ledgers, project/vesting circuits)
contract/src/types.compact      shared types (included by index)
contract/src/Membership.compact module Membership (member witnesses + members ledgers,
                                 require_member, get_public_key)
contract/src/managed/           compiler output (generated, gitignored)
api/src/types.ts                generated type re-exports + private-state types
api/src/witnesses.ts            witness factory + per-role private state helpers
```

The `Membership` module owns the government member registry; the main contract imports it
(`import "./Membership" prefix Mem_`) and reads/writes its exported ledgers directly. The
ledgers and the read-only views (`activeMemberCount`, `isRevoked`, `isMember`) are re-exported
at the top level, so the TypeScript `ledger()` exposes them as `Mem_members` (with
`findPathForLeaf`/`root`), `Mem_revokedMembers`, and `Mem_memberCount`.

Build: `npm run compile` (compiles contract, `--skip-zk`) ·
`npm run typecheck` (checks witnesses against generated types).
