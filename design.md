# GovFund — Design

A Midnight (Compact) platform for government procurement with private voting
and stage-based vesting. A single contract instance manages many projects.

## Actors

| Role | Description |
|------|-------------|
| **Admin** | Deployer. Manages the government member registry (`manageMember`). |
| **Government member** | Votes on proposals, reviews stages, votes to terminate. Membership is anonymous. |
| **Company** | Submits proposals (identity hidden behind a commitment), deposits collateral, receives staged payments if selected. |

## Contract configuration

All configuration is set in the **constructor** and sealed (immutable after
deploy):

- `admin` — pk hash of the deployer secret key (sealed).
- `quorumPercent` — % of members required to vote (quorum). Sealed at deploy;
  the constructor asserts `1..100`.
- `approvalsRequired` — number of government members that must approve each
  stage. Sealed at deploy; the constructor asserts `>= 1`.
- `fundingToken` — shielded token color for all funds (e.g. NIGHT = zero bytes
  in the demo), sealed.
- `treasury` — coin public key that receives slashed collateral and un-released
  budget (sealed).

The constructor takes `quorumPercentParam`, `fundingTokenParam`,
`treasuryParam`, `approvalsRequiredParam`, and `adminCommitParam`. The
deployer's commitment (`persistentCommit(pk, salt)`) is computed off-chain and
passed as `adminCommitParam` so the constructor stays a cheap single-hash
circuit (keeping the deploy transaction within block limits); the deployer is
registered as the **first government member**.

## Membership & privacy machinery

- `pk = persistentHash([pad(32,"govfund:pk:"), sk])` is the identity for members
  and companies; `sk` lives only in the actor's private state.
- Members register a **committed leaf** `commit = persistentCommit(pk, salt)` in
  `members: HistoricMerkleTree<6, Bytes<32>>` (depth 6 = max 64 members; shallow
  depth keeps the per-circuit Merkle path proof cheap). A member proves membership
  with a Merkle path + by opening the commitment — who acts is hidden (leaves are
  commitments, not raw public keys).
- Removal (`manageMember(commit, true)`) adds the commitment to
  `revokedMembers`; revoked members can no longer prove membership. A removal is
  blocked if it would make `quorum` or `approvalsRequired` unreachable with the
  remaining members.
- Anonymous one-time actions use domain-separated nullifiers over `sk`:
  vote, stage action (per stage + attempt), and termination.

## Money flow

All funds are shielded coins of `fundingToken`, pooled in the contract (`pot`).

1. `submitProposal` — company deposits `collateral >= collateralRequired`.
2. `settleProject` — winner chosen (quorum + plurality). Losers withdraw their
   collateral by re-opening their commitment.
3. `companyClaim(..., reveal=true)` — the winner opens its commitment (identity
   becomes public). `companyClaim(..., reveal=false)` lets losers reclaim their
   collateral after voting.
4. `fundProject` — a member deposits the winner's **budget** into the contract.
5. `reviewStage(projectId, approve=true)` — when N reviewers approve,
   `stage.amount` is released to the winner; last stage → project `Completed`,
   winner's collateral returned.
6. `voteTerminate` — at quorum the project is `Terminated`: winner's collateral
   is slashed to `treasury`, un-released stage funds go to `treasury`.

## Project lifecycle

```
Voting --settleProject--> Selected --companyClaim(reveal) + fundProject--> InProgress
   |                                                                       |--reviewStage×N--> Completed
   (finalizes as soon as quorum is met)                                    |--voteTerminate--> Terminated
                                                              (collateral + funds -> treasury)
```

- `Voting`: proposals and anonymous votes. As soon as quorum is met,
  `settleProject` picks the plurality leader and moves the project to
  `Selected` (there are no deadlines).
- `Selected`: winner set, awaiting `companyClaim(..., reveal=true)` to open its
  commitment and `fundProject` (by a member) to deposit the budget.
- `InProgress`: vesting. The company calls `requestPayment` per stage; reviewers
  `reviewStage` approve/reject. Rejections accumulate; after
  `maxStageRejections` the company can no longer request. Reviewers are
  anonymous; each member acts once per (stage, attempt) via nullifiers.

## Circuits

| Circuit | Who | Effect |
|---------|-----|--------|
| `manageMember(commit, revoke)` | admin | add/remove member (removal guarded against unreachable thresholds) |
| `createProject` | member | start a project (Voting) |
| `submitProposal` | company | propose budget + stages, deposit collateral |
| `vote` | member | anonymous vote, public per-proposal count |
| `settleProject` | anyone | pick plurality winner once quorum is met |
| `companyClaim(..., reveal)` | company | open winner commitment (`true`) or reclaim collateral (`false`) |
| `fundProject` | member | deposit the winner's budget |
| `requestPayment` | winner | request current stage review |
| `reviewStage(projectId, approve)` | member | approve/reject current stage |
| `voteTerminate` | member | terminate project at quorum |

Configuration thresholds (`quorumPercent`, `approvalsRequired`) are set once in
the constructor — there are no admin threshold circuits.

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
contract/src/types.ts           private-state types
contract/src/witnesses.ts       witness factory + per-role private state helpers
api/src/index.ts                public API: per-circuit callTx helpers + type re-exports
api/src/node.ts                 node-side deploy/find helpers (zk config, deploy)
```

The `Membership` module owns the government member registry; the main contract imports it
(`import "./Membership" prefix Mem_`) and reads/writes its exported ledgers directly. The
ledgers are re-exported at the top level, so the TypeScript `ledger()` exposes them as
`Mem_members` (with
`findPathForLeaf`/`root`), `Mem_revokedMembers`, and `Mem_memberCount`.

Build: `npm run compile` (compiles contract, `--skip-zk`) ·
`npm run typecheck` (checks witnesses against generated types).
