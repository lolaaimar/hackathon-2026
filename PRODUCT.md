# Product

## Register

product

## Users

- **Government admins**: deploy and manage the member registry, tune `quorumPercent`
  and `approvalsRequired`. Works in a desktop browser during a hackathon demo; needs
  confidence that thresholds stay reachable.
- **Government members**: open projects, vote anonymously on proposals, review
  milestone stages, and vote to terminate failing work. Trust and clarity matter more
  than flash.
- **Companies**: submit budget proposals with a stage schedule, deposit collateral,
  and collect staged payments if selected. Need to know exactly where their proposal
  and money stand.

## Product Purpose

GovFund is a UI demo for a Midnight contract that runs private, verifiable government
procurement: a single contract manages many projects through a lifecycle of voting,
selection, funding, and stage-based vesting. Voting and reviews are anonymous
(counts are public, identities hidden). The UI exists to make that lifecycle legible
and to demo every use case in the design document. Success means a judge or reviewer
can click through the whole flow — connect a wallet, act as each role, and see money
move between stages — without touching the contract internals.

## Brand Personality

Calm, precise, civic. The feel of an official seal on clean white paper — credible
and deliberate, not buzzy. Warm red-oxide authority, exact numbers, no noise.

## Anti-references

- Generic crypto dApps: dark backgrounds, neon gradients, glassmorphism, rocket/coin emoji.
- The default "gov 2.0" look: bright corporate blue everywhere.
- Edgy fintech: navy-and-gold, gradient text, "hero metric" SaaS landing clichés.
- Interfaces that hide who can do what — every action must be attributable to the
  current role and clearly enabled or disabled.

## Design Principles

1. **Trust through legibility** — public money deserves clarity. Never bury an
   action, a balance, or a deadline.
2. **Anonymous but auditable** — show counts and progress, never who acted.
3. **Lifecycle first** — the project's six-state journey is the organizing metaphor
   for every screen.
4. **Restraint** — the interface disappears into the task; delight is reserved for
   state transitions, not decoration.

## Accessibility & Inclusion

- WCAG 2.1 AA: body text ≥ 4.5:1, large text ≥ 3:1.
- All interactive elements keyboard reachable with visible focus states.
- `prefers-reduced-motion` honored (transitions degrade to instant).
- Status is never conveyed by color alone (always paired with a label/icon).
