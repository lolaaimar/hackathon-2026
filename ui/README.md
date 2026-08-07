# GovFund — Frontend (UI) Guide

This document is a guide to the **GovFund** web frontend. It explains how to
launch the app, what you are looking at, and a complete narrated walkthrough
of every feature.

> The frontend is a **browser demo** of the GovFund Midnight (Compact)
> contract. It simulates the contract's on-chain behavior locally so the full
> lifecycle can be demonstrated without a wallet, a devnet, or real funds.
> The actual contract and its logic live in `contract/` (see the root
> `README.md` and `design.md` for that side).

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
9. [The demo clock](#9-the-demo-clock)
10. [Connecting a real Midnight wallet](#10-connecting-a-real-midnight-wallet)
11. [Config panel (network)](#11-config-panel-network)
12. [State persistence & resetting the demo](#12-state-persistence--resetting-the-demo)
13. [Troubleshooting & FAQ](#13-troubleshooting--faq)
14. [Where to look next](#14-where-to-look-next)

---

## 1. TL;DR — 60-second demo

The fastest way to see the whole product:

1. **Deploy** the contract — set **Approvals / stage = 1** so a single
   reviewer can approve stages, then hit *Deploy contract*.
2. Switch to the **Member** role (top bar), click **New project**, and open a
   project with a short voting window (e.g. **7 days**).
3. Switch to **Company**, click **Bid**, and submit a proposal with a budget
   and a stage schedule (stages must sum to the budget).
4. Back on **Member**, open the project and click a proposal's **vote** button
   (one vote per project — that's the nullifier). Fast-forward with the demo
   clock, then hit **Finalize selection**.
5. As **Company**, open the project and **Reveal company**.
6. As **Member**, **Fund project**.
7. As **Company**, **Request payment** for stage 1. As **Member**, **Approve**
   each stage until the project is **Completed**.

That covers the entire six-state lifecycle in a few minutes. The sections
below explain every step in detail.

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
- **Deadlines** — voting closes at a deadline; funding closes at another. If
  no quorum, the project can be cancelled; if not funded, it expires.

**Important:** in the default demo mode everything runs in your browser,
simulated. Nothing is broadcast and no real money moves. See
[§10](#10-connecting-a-real-midnight-wallet) for the optional real-wallet mode.

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

The app auto-reloads on code changes, so it is ideal for demos. If you need a
static build instead:

```bash
npm run build        # type-checks + bundles the UI into ui/dist
npm run preview      # serves the production build locally
```

> The UI workspace is `ui/`. You can also run `npm run dev --workspace ui`
> from the root, or `npm run dev` from inside `ui/`.

---

## 4. The three roles

The app has three roles, exactly mirroring the contract's participants. The
login screen lets you enter as any of them; the **role switcher in the top
bar** lets you jump between them at any time (useful for demos).

| Role | Label in UI | What they do |
| ---- | ----------- | ------------ |
| **Admin** | `Admin` | Deploys the contract. Manages the government **member registry** (add/remove members) and tunes the **quorum %** and **approvals per stage**. |
| **Member** | `Member` (Government) | Opens **projects**, casts **anonymous votes** on proposals, **reviews/approves milestone stages**, and votes to **terminate** failing work. |
| **Company** | `Company` | Submits **budget proposals** with a stage schedule, deposits **collateral**, reveals identity if it wins, requests **stage payments**, and withdraws collateral. |

The top bar also shows a **wallet chip** (connected address or a *Connect*
link) and an **Exit** button to return to the login screen.

> **One note on the demo:** the demo simulates a **single member's** private
> state. Whatever role you're viewing, there is exactly **one** set of member
> credentials behind the scenes — so you get **one vote per project**, **one
> review per stage attempt**, and **one termination vote**, enforced by
> nullifier-style guards (see [§8 Glossary](#8-glossary)). Thresholds like
> quorum % and approvals/stage are still real contract math, so keep them
> reachable by that single member (see Step 0). The top-bar role switcher is
> for switching between **Admin / Member / Company** duties — it does **not**
> let you vote repeatedly as different members.

---

## 5. Guided walkthrough (full demo)

This is a complete, narrated run-through. It takes about 5 minutes and hits
every feature. The repo starts with one seeded project ("Metro Line 4 —
Signaling Upgrade") in the **Voting** state so you can either follow the full
flow below or jump straight to voting/bidding on the seeded project.

### Step 0 — Deploy the contract

1. On the **login screen**, click **Admin** (or any role).
2. You land on **Deploy the GovFund contract**.
3. Set these values (they keep every threshold reachable by the single
   simulated member):
   - **Funding token**: `NIGHT` (fixed).
   - **Quorum (%)**: the percentage of members that must vote — `60` by
     default. With just the deployer as a member, one vote already meets it
     (1 of 1). If you add members, quorum needs `members × % ÷ 100` votes,
     which a single vote can never satisfy — so keep the registry to one
     member, or lower the % accordingly.
   - **Approvals / stage**: reviewers required per milestone — change this to
     **`1`** so the single reviewer can approve stages. With more members you
     could raise it, but then each stage would need that many distinct reviews,
     which a single member can't provide.
4. Read the note: the address shown (a simulated demo address) becomes the
   **deployer = Admin**, the first member of the registry.
5. Click **Deploy contract**.

A success toast appears and the page becomes the **post-deploy dashboard**
showing the contract address, deployer, quorum and approvals, with three
entry cards: **Government desk**, **Company portal**, and **Enter a contract**.

> **Why it matters on-chain:** deploying instantiates the Compact contract and
> registers the deployer as the initial admin member.

### Step 1 — Admin: look at the member registry

The contract keeps a member registry (identities as Merkle-tree commitments).
After deployment it holds just the deployer (Admin).

1. Click **Government desk** (or use the top-bar role switcher → **Admin**).
2. In **Admin console → Member registry** you'll see the Admin listed with its
   commitment (`leaf 1`, truncated hash) — on-chain the member's identity is
   just that tree leaf.
3. Watch the stat cards: **Members**, **Quorum** (`x votes needed`), and
   **Approvals / stage**.
4. You may add members with the **Add** form to explore the registry UI, but
   remember each new member raises `votes needed` (quorum) — and since the demo
   simulates one member's private state, any threshold above one vote/one
   approval can no longer be reached. **For the walkthrough below, keep the
   registry at one member and `Approvals / stage = 1`.** The UI blocks member
   removals that would make a threshold unreachable; the same logic works in
   reverse if you experiment.

> Each member is shown with a **Merkle-tree commitment** (`leaf n`, truncated
> hash) — on-chain their identity is just a tree leaf.

### Step 2 — Member: open a procurement project

1. Switch to **Member** (top bar) → **Government member desk**.
2. Click **New project** and fill the form:
   - **Title**, e.g. *Street lighting retrofit*.
   - **Description** (optional).
   - **Voting deadline (days)** — proposals and votes close here (use `7`).
   - **Funding deadline (days)** — winner must be funded by here (use `14`,
     must be **after** the voting deadline).
   - **Collateral required (NIGHT)** — what each bidder must deposit (e.g. `10000`).
   - **Max stage rejections** — how many times a stage can be rejected before
     it is blocked (e.g. `2`).
3. Click **Open project**. It appears in the desk with status **Voting**.

> Use the **demo clock** (bottom-right, see [§9](#9-the-demo-clock)) to skip
> time and reach deadlines instantly during the demo.

### Step 3 — Company: bid with a budget + stage schedule

1. Switch to **Company** (top bar) → **Company portal**. It says you are
   bidding as *VoltGrid Industries*.
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
the Company portal to change who you are bidding as (the seeded companies
are *VoltGrid Industries*, *Atlas Rail Systems*, *Reyes Construction*,
*Aeterna Builds*). Each bid deposits its collateral into the treasury pot.

### Step 4 — Member: vote anonymously

1. Switch to **Member** and open the project.
2. The **Vote quorum** meter shows how many of the required votes have been
   cast (`0 of 1`).
3. Under **Proposals**, click **Vote** on a bid. The toast notes the vote is
   recorded as a *fresh nullifier* — you cannot vote twice (the button
   disappears, and the meter is now full).
4. Fast-forward with the **demo clock** until the voting deadline passes (see
   [§9](#9-the-demo-clock)).

> **What's being demonstrated:** vote *counts* are public; vote *identities*
> are hidden. No UI in the app can tell you which member voted for which bid.
> And because the vote consumed a nullifier, no member — not even you, switching
> roles — can vote again on this project.

### Step 5 — Finalize, reveal, fund

Once the voting deadline passes **and** quorum is met, the plurality leader
(the bid with the most votes) can be selected:

1. On the **Member** project page, the **Next action** card shows
   **Finalize selection** — click it. The project moves to **Selected** and
   the winning bid is chosen.
2. Switch to **Company** and open the project. A banner says **Your bid won**.
   Click **Reveal company** to open your hidden commitment. Now the contract
   knows who the winner is.
3. Switch back to **Member**. The **Next action** card now says
   **Fund project** — click it. The project's budget is deposited into the
   contract, and the project moves to **In Progress**.

> If the voting deadline passes **without quorum**, the project can be
> **cancelled** instead, and all collateral becomes refundable. If the
> **Selected** project is never funded by its funding deadline, it can be
> **expired** (also cancelled).

### Step 6 — Vesting: request payment and approve stages

Now the fun part — milestone-based payouts.

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
  **collateral is slashed to the treasury**. (In the demo, one termination
  vote per project.)

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
| `/login` | **Login** | Enter as a demo role (Admin / Member / Company) or connect a real Midnight wallet via DApp Connector. |
| `/deploy` | **Deploy** | Set quorum % and approvals/stage, then deploy the contract. After deployment: a dashboard with links to the Government desk, Company portal, and Contract page. |
| `/contract` | **Enter a contract** | Look up the deployed contract by address and view its details: address, network, funding token, treasury, deployer, member count, quorum, approvals, treasury pot. The "Enter contract" button routes you by role. |
| `/admin` | **Admin console** | Member registry (add/remove members), quorum %, and approvals/stage settings. Remove is blocked if it would make a threshold unreachable. |
| `/member` | **Government member desk** | Open new projects, filter the project list by status, see active-project/ quorum/approvals stats. |
| `/member/projects/:id` | **Project detail (member)** | Quorum meter, proposal list (vote here), **Next action** panel (finalize / cancel / fund / expire), stage panel (approve/reject, terminate), vesting summary. |
| `/company` | **Company portal** | Switch demo identity, list of your proposals (with collateral status), open-for-bids list, and all projects. |
| `/company/projects/:id` | **Project detail (company)** | Reveal-company banner, submit-proposal form, proposal list, stage panel (request payment), your position. |

The **top bar** (present on every page once logged in) contains:

- **GovFund** logo → returns to the deploy dashboard.
- **Contract** link (after deployment) → the contract page.
- **Role switcher** (Admin / Member / Company) — the key to demos.
- **Wallet chip** — connected address or a *Connect* link.
- **Exit** — logs out.

The **bottom-right** has the **demo clock**. The **bottom-left** has a
**Config** button (network picker + restart demo).

---

## 7. Project lifecycle states

Every project travels through the same states. The **lifecycle timeline** at
the top of each project page makes the current position obvious.

| State | Meaning | Who acts next |
| ----- | ------- | ------------- |
| **Voting** | Proposals and votes are accepted until the deadline. | Companies bid; members vote. |
| **Selected** | Voting closed with quorum; the plurality winner is picked but hidden. | Winner reveals; members fund. |
| **In Progress** | Budget is deposited; the winner is paid stage-by-stage. | Company requests payment; members review. |
| **Completed** | All stages approved; collateral returned to the winner. | — |
| **Cancelled** | Voting quorum missed, or funding never provided. Collateral refundable. | Losers withdraw collateral. |
| **Terminated** | Voted out; the winner's collateral is slashed to the treasury. | — |

Status badges are color-coded **and** labelled, so status is never conveyed
by color alone.

---

## 8. Glossary

- **Contract** — one GovFund smart-contract instance that manages all projects
  in the demo.
- **Member** — a government participant registered in the member registry
  (identity stored as a Merkle-tree commitment).
- **Registry** — the list of members stored on-chain.
- **Deployer / Admin** — the address that deployed the contract; the only one
  that can add/remove members.
- **Quorum** — the minimum number of votes required (a % of members) for a
  vote to count. Reaching quorum unlocks **finalize**; missing it unlocks
  **cancel**.
- **Plurality** — the proposal with the most votes wins when quorum is met.
- **Proposal / Bid** — a company's offer: total budget, stage schedule, and
  collateral.
- **Commitment** — a hidden value used to commit to identity on-chain. In the
  UI, proposals and members show truncated commitment hashes.
- **Nullifier** — a one-time value that prevents a member from voting twice
  without revealing who they are. In the demo, this is why you get exactly one
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

## 9. The demo clock

Deadlines (voting and funding) are central to the contract, but no one wants
to wait a week. The **demo clock** (bottom-right) advances the simulated time:

- `+1d` / `+7d` — move the clock forward.
- `-1d` — move it back (handy if you overshoot).

The displayed date is the demo's "now", which drives all `timeFromNow` /
`closes in…` labels and deadline logic. Use it to fast-forward past the voting
deadline, the funding deadline, or to the next stage.

---

## 10. Connecting a real Midnight wallet

The demo roles are the default path, but the app also supports a **real
Midnight wallet** through the DApp Connector API (`window.midnight`, e.g.
Lace or 1AM):

1. Install a DApp Connector wallet extension and refresh the login page.
2. Under **Connect your Midnight wallet**, pick a network with the **Network**
   picker (Preview, or Undeployed/local), then click the wallet to connect.
3. Connecting routes you in as a **Member**. Your unshielded address is shown
   in the top-bar wallet chip.

Notes:

- A real wallet connection lets the app demonstrate the *wallet→contract*
  interaction surface, but the demo state is still simulated locally in this
  build — no transactions are broadcast and no funds move.
- Membership is still tied to the member registry, so a connected address
  must be added by the admin to appear as a registered member.
- Wallet errors (e.g. rejected permission) are surfaced as red toasts.

---

## 11. Config panel (network)

Click **Config** (bottom-left) to open the config modal. It has two parts:

- **Blockchain network** — the network the DApp Connector wallet is asked to
  connect on, and the network used for new deployments. It persists your
  choice across reloads.
- **Restart demo** — wipes all saved demo data and returns to the login
  screen with the seed project restored. See
  [§12](#12-state-persistence--resetting-the-demo).

---

## 12. State persistence & resetting the demo

- All demo state (members, projects, votes, the clock, deployed contract) is
  saved to your browser's `localStorage` under `govfund.state.v1`, so the
  demo **survives page reloads**.
- A seed snapshot (the "Metro Line 4" project) is loaded on first visit.
- **To start completely fresh** with the UI: open **Config** (bottom-left) →
  **Restart demo** → **Confirm restart**. This removes the saved state (and
  the saved network choice), clears the demo back to its seed snapshot, and
  returns you to the login screen.
- If you prefer to clear it manually, you can also remove the key from the
  browser console:

```js
localStorage.removeItem("govfund.state.v1");
location.reload();
```

- The demo also syncs proposal descriptions to a Supabase table when a network
  is available; if it isn't, the sync silently no-ops and the demo is
  unaffected.

---

## 13. Troubleshooting & FAQ

**The login page says "No Midnight wallet detected".**
That's expected in demo mode — click one of the **three role cards** to enter
without a wallet. A wallet is only required for the optional real-wallet flow.

**I deployed but nothing seems to exist yet.**
You start with the seeded "Metro Line 4" project in **Voting**. Open more
projects as Member, and bid as Company. (Adding members in the Admin console
is optional — remember it raises the votes needed for quorum.)

**I can't approve a stage.**
Two common causes:
- `Approvals / stage` is higher than the number of members — with one member,
  set it to `1` in the Admin console.
- The company hasn't **Requested payment** yet — stages only open for review
  after a payment request.

**I can't finalize the vote.**
Finalize only unlocks **after** the voting deadline passes **and** quorum is
met. The demo allows one vote per project, so quorum must be reachable with a
single vote: keep the member registry small (one member meets a `60%` quorum
with one vote) and advance past the voting deadline with the demo clock
(`+7d`).

**The project expired / got cancelled.**
Voting quorum was missed (→ *Cancelled*), or the funding deadline passed
without funding (→ *Cancelled* via *Expire funding*). Re-open a project with a
wider window if you want more time.

**My stage shows "Max rejections reached — stage blocked".**
The project's `max stage rejections` were exhausted. Only termination or a
fresh project resets this.

**The number formatting looks odd (e.g. `1,000,000`).**
All amounts are plain NIGHT values (no decimals) formatted with thousands
separators. `1,000,000 NIGHT = 1M NIGHT`.

**Can I undo something?**
The demo clock can go backwards (`-1d`), but state changes are not undoable.
Use **Config → Restart demo** to wipe the saved state and start over.

---

## 14. Where to look next

- `../README.md` — repository overview, contract features, and the contract
  test suite.
- `../design.md` / `../DESIGN.md` — full design document.
- `../contract/src/index.compact` — the Compact contract behind the UI.
- `../contract/__tests__/workflow.test.ts` — a narrated end-to-end workflow
  test that mirrors this walkthrough.
