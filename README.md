# GovFund

A Midnight (Compact) smart contract for government procurement with private
voting and stage-based vesting. A single contract instance manages many projects.

## How it works

- **Government members** create projects and vote on proposals. Voting is
  anonymous — who voted is hidden, vote counts are public.
- **Companies** submit budget proposals (identity hidden behind a commitment)
  and deposit a collateral.
- The government selects a winner by **quorum + plurality** once quorum is met.
- The winner reveals its identity, the government **deposits the budget** into
  the contract, and funds are released **stage by stage** as reviewers approve
  each milestone.
- Collateral is returned to losers, returned to the winner on successful
  completion, or slashed to the government treasury on termination.

## Contract features

| Area             | Behavior                                                                              |
| ---------------- | ------------------------------------------------------------------------------------- |
| Admin            | Deploys the contract; manages the member registry (`manageMember`)                     |
| First member     | The deployer is registered as the first member at deploy                               |
| Sealed config    | `quorumPercent` / `approvalsRequired` are fixed in the constructor                    |
| Private voting   | Merkle-tree membership + nullifiers; per-proposal counts are public                   |
| Proposer privacy | Proposals committed; identity revealed only to proceed with funding                   |
| Vesting          | Fixed stage schedule per proposal; N reviewers must approve each stage                |
| Collateral       | Deposited at proposal time; returned to losers / winner, slashed on termination       |
| Funds            | Shielded `fundingToken` (e.g. NIGHT) pooled in the contract                           |

## Project layout

```
contract/src/index.compact      main contract (config ledgers, project/vesting circuits)
contract/src/types.compact      shared types (included by index)
contract/src/Membership.compact module: government member registry + anonymous membership
contract/src/types.ts           private-state types
contract/src/witnesses.ts       witness factory + per-role private state
contract/src/managed/           compiler output (generated, gitignored)
contract/__tests__/             native vitest suite
│   GovFundSimulator.ts         CircuitContext test harness (deploy + drive the contract)
│   witnesses.ts                test witnesses + role private states
│   admin.test.ts               admin & membership management
│   membership.test.ts          projects, proposals, voting, funding
│   vesting.test.ts             stage releases, rejections, termination, collateral
│   workflow.test.ts            narrated end-to-end demo (deployer + 5 members, 3 companies)
api/src/index.ts                public API: per-circuit callTx helpers + types
api/src/node.ts                 node-side deploy/find helpers
design.md                       full design document
```

## Build

```bash
npm install
npm run compile    # compile the Compact contract (--skip-zk)
npm run typecheck  # type-check witnesses and tests
npm run compile:zk # compile with full proving keys
```

## Undeployed network

For usage with undeployed network, initialize the services with:

```bash
docker compose up -d
```

and stop them with:

```bash
docker compose down --volumes
```

## Frontend (UI)

The repo includes a browser frontend that demos the full contract lifecycle.
The **UI guide** has a quick walkthrough.

```bash
npm run dev    # starts the UI at http://localhost:5173
```

See [ui/README.md](ui/README.md) for setup, the demo walkthrough, roles, and
troubleshooting.

## Testing

The suite drives the compiled contract directly through the runtime
`CircuitContext` (no proof server or devnet needed), so it runs against the
`--skip-zk` build.

| Command             | Runs                                   | Count |
| ------------------- | -------------------------------------- | ----- |
| `npm test`          | full suite                             | 54    |
| `npm run test:unit` | admin, membership, vesting             | 53    |
| `npm run test:e2e`  | narrated end-to-end workflow (verbose) | 1     |
