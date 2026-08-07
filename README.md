# GovFund

A Midnight (Compact) smart contract for government procurement with private
voting and stage-based vesting. A single contract instance manages many projects.

## How it works

- **Government members** create projects and vote on proposals. Voting is
  anonymous — who voted is hidden, vote counts are public.
- **Companies** submit budget proposals (identity hidden behind a commitment)
  and deposit a collateral.
- The government selects a winner by **quorum + plurality** after the project
  deadline.
- The winner reveals its identity, the government **deposits the budget** into
  the contract, and funds are released **stage by stage** as reviewers approve
  each milestone.
- Collateral is returned to losers, returned to the winner on successful
  completion, or slashed to the government treasury on termination.

## Contract features

| Area | Behavior |
| ------ | ---------- |
| Admin | Manages members and configures `quorumPercent` / `approvalsRequired` |
| Private voting | Merkle-tree membership + nullifiers; per-proposal counts are public |
| Proposer privacy | Proposals committed; identity revealed only to proceed with funding |
| Vesting | Fixed stage schedule per proposal; N reviewers must approve each stage |
| Collateral | Deposited at proposal time; returned to losers / winner, slashed on termination |
| Deadlines | Voting deadline (cancel if not finalized) and funding deadline (cancel if unfunded) |
| Funds | Shielded `fundingToken` (e.g. NIGHT) pooled in the contract |

## Project layout

```
contract/src/index.compact      main contract (config ledgers, project/vesting circuits)
contract/src/types.compact      shared types (included by index)
contract/src/Membership.compact module: government member registry + anonymous membership
contract/src/managed/           compiler output (generated, gitignored)
contract/__tests__/             native vitest suite (simulator + witnesses + tests)
api/src/witnesses.ts            witness factory + per-role private state
api/src/types.ts                generated type re-exports + private-state types
design.md                       full design document
```

## Build & test

```bash
npm install
npm run compile    # compile the Compact contract (--skip-zk)
npm run typecheck  # type-check witnesses and tests
npm test           # run the vitest suite
npm run compile:zk # compile with full proving keys
```
