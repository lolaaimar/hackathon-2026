# GovFund — Frontend (UI) Guide

This document is a guide to the **GovFund** web frontend. It explains how to
launch the app, what you are looking at, and a complete narrated walkthrough
of every feature.

---

## Table of contents

1. [TL;DR — 60-second demo](#1-tldr--60-second-demo)
2. [What this app does](#2-what-this-app-does)
3. [Quick start](#3-quick-start)
4. [The three roles](#4-the-three-roles)
5. [Guided walkthrough (full demo)](#5-guided-walkthrough-full-demo)
6. [Screen-by-screen reference](#6-screen-by-screen-reference)
7. [Project lifecycle states](#7-project-lifecycle-states)
8. [Glossary](#8-glossary)
9. [Config panel (network & restart)](#9-config-panel-network--restart)
10. [State persistence & resetting](#10-state-persistence--resetting)
11. [Troubleshooting & FAQ](#11-troubleshooting--faq)
12. [Where to look next](#12-where-to-look-next)

---

## 1. TL;DR — 60-second demo

The fastest way to see the whole product:

1. **Deploy** the contract — set **Approvals / stage = 1** so a single reviewer
   can approve stages, then hit *Deploy contract*.
2. As **Admin**, open the **Admin console** and add one member to the registry.
3. Switch to the **Member** role (top bar), click **New project**, and open a
   project.
4. Switch to **Company**, click **Bid**, and submit a proposal with a budget
   and a stage schedule (stages must sum to the budget). Use **Switch demo
   identity** to bid from several companies.
5. Back on **Member**, open the project and click a proposal's **vote** button
   (one vote per project — that's the nullifier), then **Finalize selection**.
6. As **Company**, open the project and **Reveal company**.
7. As **Member**, **Fund project**.
8. As **Company**, **Request payment** for stage 1. As **Member**, **Approve**
   each stage until the project is **Completed**.

That covers the entire lifecycle in a few minutes. The sections below explain
every step in detail.

---

## 2. What this app does

GovFund is a government-procurement platform on the Midnight blockchain. One
**smart contract instance** manages many procurement projects. The UI is the
window onto that contract.

Key properties demonstrated by the frontend:

- **Anonymous voting** — government members vote on proposals; the contract
  knows *a* member voted (via a nullifier) but never *who*. The UI shows vote
  counts, never voters.
- **Proposer privacy** — companies submit bids behind a hidden commitment.
  Only the **winning** company reveals its identity, and only at the funding
  step.
- **Stage-based vesting** — a winning company is paid in **milestone stages**,
  each released only after the required number of reviewers **approve** it.
- **Collateral** — companies deposit collateral with their bid. Losers get it
  back, the winner gets it back on completion, or it is slashed to the
  treasury if the project is terminated.
- **Access control** — the deployer is the contract **admin**: only they can
  add or remove government members. Members open projects, vote, and review
  stages; companies bid, reveal, and collect payments.

---

## 3. Quick start

### Prerequisites

- **Node.js** 20+ and `npm` (the monorepo is already set up; `node_modules`
  is installed at the root).

### Install & run

From the repository root:

```bash
npm install          # once, if node_modules isn't present
npm run dev          # starts the UI dev server (Vite)
```

Vite prints a local URL — open it in your browser:

```
http://localhost:5173
```

The app auto-reloads on code changes. If you need a static build instead:

```bash
npm run build        # type-checks + bundles the UI into ui/dist
npm run preview      # serves the production build locally
```

> The UI workspace is `ui/`. You can also run `npm run dev --workspace ui`
> from the root, or `npm run dev` from inside `ui/`.

---

## 4. The three roles

The app has three roles, mirroring the contract's participants. The login
screen lets you enter as any of them; the **role switcher in the top bar**
lets you jump between them at any time (useful for demos).

| Role | Label in UI | What they do |
| ---- | ----------- | ------------ |
| **Admin** | `Admin` | Deploys the contract. Manages the government **member registry** (add/remove members). |
| **Member** | `Member` (Government) | Opens **projects**, casts **anonymous votes** on proposals, **reviews/approves milestone stages**, and votes to **terminate** failing work. |
| **Company** | `Company` | Submits **budget proposals** with a stage schedule, deposits **collateral**, reveals identity if it wins, requests **stage payments**, and withdraws collateral. |

The top bar also shows a **wallet chip** (connected address or a *Connect*
link) and an **Exit** button to return to the login screen.

> **One note on thresholds:** the app presents a **single member's** view. No
> matter the role you're viewing, there is exactly **one** set of member
> credentials behind the scenes — so you get **one vote per project**, **one
> review per stage attempt**, and **one termination vote**, enforced by
> nullifier-style guards (see [§8 Glossary](#8-glossary)). Quorum % and
> approvals/stage are still real contract math, so keep them reachable by that
> single member (see [Step 0](#step-0--deploy-the-contract)). The top-bar role
> switcher is for switching between **Admin / Member / Company** duties — it
> does **not** let you vote repeatedly as different members.

---

## 5. Guided walkthrough (full demo)

This is a complete, narrated run-through. It takes about 5 minutes and hits
every feature.

### Step 0 — Deploy the contract

1. On the **login screen**, click **Admin** (or any role).
2. You land on **Deploy the GovFund contract**.
3. Set these values (they keep every threshold reachable by the single
   member):
   - **Funding token**: `NIGHT` (fixed).
   - **Quorum (%)**: the percentage of members that must vote — `50` by
     default. One vote reaches quorum when `members × % ≤ 100`: one member at
     any %, two members at ≤ 50%, three at ≤ 33%.
   - **Approvals / stage**: reviewers required per milestone — set this to
     **`1`** so the single reviewer can approve stages.
4. Read the note: the address shown becomes the **deployer = Admin**, the only
   account that can manage the member registry.
5. Click **Deploy contract**.

A success toast appears and the page becomes the **post-deploy dashboard**
showing the contract address, deployer, quorum and approvals, with three
entry cards: **Government desk**, **Company portal**, and **Enter a contract**.

> **Why it matters on-chain:** deploying instantiates the Compact contract and
> seals the deployer as the admin.

### Step 1 — Admin: manage the member registry

The contract keeps a member registry (identities as Merkle-tree commitments).

1. Click **Government desk** (or use the top-bar role switcher → **Admin**).
2. In **Admin console → Member registry**, add members with the **Add** form
   (a name and an address). Each member is shown with its **commitment**
   (`leaf n`, truncated hash) — on-chain the member's identity is just a tree
   leaf.
3. Watch the stat cards: **Members**, **Quorum** (`x votes needed`), and
   **Approvals / stage**.
4. Removals are blocked when they would make `approvals / stage` or quorum
   unreachable with the remaining members.

> Adding members raises `votes needed` for quorum. Since the demo acts as a
> single member (one vote per project), keep `members × quorum %` at or below
> `100` so one vote still meets quorum.

### Step 2 — Member: open a procurement project

1. Switch to **Member** (top bar) → **Government member desk**.
2. Click **New project** and fill the form:
   - **Title**, e.g. *Street lighting retrofit*.
   - **Description** (optional).
   - **Collateral required (NIGHT)** — what each bidder must deposit
     (e.g. `10000`).
   - **Max stage rejections** — how many times a stage can be rejected before
     it is blocked (e.g. `2`).
3. Click **Open project**. It appears in the desk with status **Voting**.

### Step 3 — Company: bid with a budget + stage schedule

1. Switch to **Company** (top bar) → **Company portal**. It says you are
   bidding as a demo company.
2. Under **Open for bids**, click **Bid** on the project.
3. In **Submit a proposal**:
   - **Total budget (NIGHT)** — your bid amount, e.g. `900000`.
   - **Collateral (NIGHT)** — pre-filled to the project's requirement. This
     is **deposited** into the contract pot.
   - **Proposal description** — optional.
   - **Stage schedule** — add/remove milestone stages. **The stage amounts must
     sum exactly to the total budget** (a live counter shows `0 remaining` in
     green when valid). E.g. Stage 1 `300000`, Stage 2 `600000`.
4. Click **Submit bid**. The proposal appears in the list; your identity is
   hidden behind a commitment.

Submit bids from several companies: use the **Switch demo identity** card in
the Company portal to change who you are bidding as (the seeded companies are
*My Company*, *VoltGrid Industries*, *Atlas Rail Systems*, *Reyes
Construction*, and *Aeterna Builds*). Each demo company keeps its own identity
and commitment, so switching lets you place multiple independent bids. Each
bid deposits its collateral into the treasury pot.

### Step 4 — Member: vote anonymously

1. Switch to **Member** and open the project.
2. The **Vote quorum** meter shows how many of the required votes have been
   cast (e.g. `0 of 1`).
3. Under **Proposals**, click **Vote** on a bid. The toast notes the vote is
   recorded as a *fresh nullifier* — you cannot vote twice (the button
   disappears, and the meter is now full).
4. Once quorum is met, the **Next action** panel offers **Finalize
   selection**.

> **What's being demonstrated:** vote *counts* are public; vote *identities*
> are hidden. No UI in the app can tell you which member voted for which bid.
> And because the vote consumed a nullifier, no member — not even you, switching
> roles — can vote again on this project.

### Step 5 — Finalize, reveal, fund

Once quorum is met, the plurality leader (the bid with the most votes) can be
selected:

1. On the **Member** project page, the **Next action** card shows
   **Finalize selection** — click it. The project moves to **Selected** and
   the winning bid is chosen.
2. Switch to **Company** and open the project. A banner says **Your bid won**.
   Click **Reveal company** to open your hidden commitment. Now the contract
   knows who the winner is.
3. Switch back to **Member**. The **Next action** card now says
   **Fund project** — click it. The winner's budget is deposited into the
   contract, and the project moves to **In Progress**.

> The **Next action** panel only offers *Fund project* after the winner has
> revealed its identity; before that it shows **Waiting for reveal**.

### Step 6 — Vesting: request payment and approve stages

Now the milestone-based payouts:

1. Switch to **Company**, open the project. The **Stage panel** shows
   **Stage 1 of N** with the amount. Click **Request payment**.
2. Switch to **Member**, open the project. The stage panel shows
   **Awaiting reviewer approval** with an approvals counter
   (`0/1 approvals`). Click **Approve**.
3. The stage amount is **disbursed** to the winner and the next stage becomes
   current. (With `Approvals / stage = 1`, one approve releases the stage.)
4. Repeat for every stage. After the final stage is approved the project
   becomes **Completed** and the winner's **collateral is returned**.

**Alternatives in this phase:**

- **Reject** a stage — reviewers can reject; the company can re-request, but
  only up to **max stage rejections** before the stage is blocked.
- **Vote to terminate** — members can vote to terminate an in-progress (or
  selected) project. Reaching quorum terminates it, and the winner's
  **collateral is slashed to the treasury**. (One termination vote per
  project.)

### Step 7 — Collateral outcomes

Watch the **Treasury pot** (Contract page) throughout:

- Each bid **adds** its collateral to the pot.
- **Losers** can withdraw their collateral (Company portal, **Withdraw**
  button) once voting has concluded.
- The **winner** gets its collateral back on **completion**, or it is
  **slashed to the treasury** on termination.

---

## 6. Screen-by-screen reference

| Route | Screen | What it offers |
| ----- | ------ | -------------- |
| `/login` | **Login** | Enter as a demo role (Admin / Member / Company) or connect a Midnight wallet via DApp Connector. |
| `/deploy` | **Deploy** | Set quorum % and approvals/stage, then deploy the contract. After deployment: a dashboard with links to the Government desk, Company portal, and Contract page. |
| `/contract` | **Enter a contract** | Look up the deployed contract by address and view its details: address, network, funding token, treasury, deployer, member count, quorum, approvals, treasury pot. The "Enter contract" button routes you by role. |
| `/admin` | **Admin console** | Member registry (add/remove members) and threshold stats. Remove is blocked if it would make a threshold unreachable. |
| `/member` | **Government member desk** | Open new projects, filter the project list by status, see active-project/ quorum/approvals stats. |
| `/member/projects/:id` | **Project detail (member)** | Quorum meter, proposal list (vote here), **Next action** panel (finalize / wait for reveal / fund), stage panel (approve/reject, terminate), vesting summary. |
| `/company` | **Company portal** | Switch demo identity, list of your proposals (with collateral status), open-for-bids list, and all projects. |
| `/company/projects/:id` | **Project detail (company)** | Reveal-company banner, submit-proposal form, proposal list, stage panel (request payment), your position. |

The **top bar** (present on every page once logged in) contains:

- **GovFund** logo → returns to the deploy dashboard.
- **Contract** link (after deployment) → the contract page.
- **Role switcher** (Admin / Member / Company) — the key to demos.
- **Wallet chip** — connected address or a *Connect* link.
- **Exit** — logs out.

The **bottom-left** has a **Config** button (network picker + restart).

---

## 7. Project lifecycle states

Every project travels through the same states. The **lifecycle timeline** at
the top of each project page makes the current position obvious.

| State | Meaning | Who acts next |
| ----- | ------- | ------------- |
| **Voting** | Proposals and votes are accepted. | Companies bid; members vote. |
| **Selected** | Voting closed with quorum; the plurality winner is picked but hidden. | Winner reveals; members fund. |
| **In Progress** | Budget is deposited; the winner is paid stage-by-stage. | Company requests payment; members review. |
| **Completed** | All stages approved; collateral returned to the winner. | — |
| **Terminated** | Voted out; the winner's collateral is slashed to the treasury. | — |

Status badges are color-coded **and** labelled, so status is never conveyed
by color alone.

---

## 8. Glossary

- **Contract** — one GovFund smart-contract instance that manages all projects
  in the app.
- **Member** — a government participant registered in the member registry
  (identity stored as a Merkle-tree commitment).
- **Registry** — the list of members stored on-chain.
- **Deployer / Admin** — the address that deployed the contract; the only one
  that can add/remove members.
- **Quorum** — the minimum number of votes required (a % of members) for a
  vote to count. Reaching quorum unlocks **finalize**.
- **Plurality** — the proposal with the most votes wins when quorum is met.
- **Proposal / Bid** — a company's offer: total budget, stage schedule, and
  collateral.
- **Commitment** — a hidden value used to commit to identity on-chain. In the
  UI, proposals and members show truncated commitment hashes.
- **Nullifier** — a one-time value that prevents a member from voting twice
  without revealing who they are. In the app, this is why you get exactly one
  vote per project (and one review per stage attempt).
- **Collateral** — money a bidder deposits; returned to losers/winner or
  slashed on termination.
- **Stage / Milestone** — a slice of the budget released upon reviewer
  approval.
- **Vesting** — releasing funds gradually across stages rather than all at once.
- **Treasury / Pot** — the shielded pool holding the funding token (NIGHT)
  and deposited collateral.
- **Funding token** — the shielded token used to fund projects (`NIGHT`).

---

## 9. Config panel (network & restart)

Click **Config** (bottom-left) to open the config modal. It has two parts:

- **Blockchain network** — the network the DApp Connector wallet is asked to
  connect on, and the network used for new deployments. It persists your
  choice across reloads.
- **Restart demo** — wipes all saved demo data and returns to the login
  screen. See [§10](#10-state-persistence--resetting).

---

## 10. State persistence & resetting

- All app state (members, projects, votes, the deployed contract) is saved to
  your browser's `localStorage` under `govfund.app.v1`, so the demo
  **survives page reloads**. Demo identities are stored separately under
  `govfund.identities.v1`, and the selected network under `govfund.networkId`.
- **To start completely fresh:** open **Config** (bottom-left) →
  **Restart demo** → **Confirm restart**. This clears the saved state and
  returns you to the login screen.
- If you prefer to clear it manually, you can also remove the keys from the
  browser console:

```js
localStorage.removeItem("govfund.app.v1");
localStorage.removeItem("govfund.identities.v1");
location.reload();
```

---

## 11. Troubleshooting & FAQ

**The login page says "No Midnight wallet detected".**
That's fine — click one of the **three role cards** to enter as a demo role.
A wallet is only used for the optional DApp Connector sign-in path.

**I deployed but the registry is empty.**
Deployment starts with an empty member registry. As **Admin**, open the Admin
console and add members before switching to the Member role to open projects.

**I can't finalize a project.**
Finalize only unlocks once **quorum is met** (the vote meter is full). One
vote reaches quorum only when `members × quorum % ≤ 100` — keep the registry
small or lower the quorum %.

**I can't approve a stage.**
Two common causes:
- `Approvals / stage` is higher than 1 — with a single reviewer, set it to
  `1` at deploy time.
- The company hasn't **Requested payment** yet — stages only open for review
  after a payment request.

**I can't place a second bid on the same project.**
Each demo company is its own identity with its own commitment. Switch to a
different company with the **Switch demo identity** card, then bid again.

**My stage shows "Max rejections reached — stage blocked".**
The project's `max stage rejections` were exhausted. Only termination or a
fresh project resets this.

**The number formatting looks odd (e.g. `1,000,000`).**
All amounts are plain NIGHT values (no decimals) formatted with thousands
separators. `1,000,000 NIGHT = 1M NIGHT`.

**Can I undo something?**
State changes are not undoable. Use **Config → Restart demo** to wipe the
saved state and start over.

---

## 12. Where to look next

- `../README.md` — repository overview, contract features, and the contract
  test suite.
- `../design.md` / `../DESIGN.md` — full design document.
- `../contract/src/index.compact` — the Compact contract behind the UI.
- `../contract/__tests__/workflow.test.ts` — a narrated end-to-end workflow
  test that mirrors this walkthrough.
