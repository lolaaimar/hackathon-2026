# GovFund UI — Design

## Theme

A civic procurement desk: clean white paper under a government stamp. Light but
not glaring — a cool, dimmed canvas keeps white cards from shouting. One warm
red-oxide accent carries interactive emphasis; everything else is neutral so
numbers and status stay the loudest thing on screen.

Scene: an official sits at a well-lit desk, reviewing a procurement board against
white paper in daylight. The interface should feel like a well-printed government
form — precise, legible, with a single considered color doing the speaking.

## Color

OKLCH throughout, tokenized in `--color-*` (Tailwind v4 `@theme`).

| Role | Token | Value | Use |
| ---- | ----- | ----- | --- |
| Content bg | `--color-bg` | `oklch(0.94 0.006 255)` | dimmed cool-gray canvas (white cards sit on it) |
| Panel | `--color-panel` | `oklch(0.965 0.005 255)` | toolbars, chips, wells |
| Panel inset | `--color-panel-strong` | `oklch(0.91 0.008 255)` | nested wells, hover states, avatars |
| Ink | `--color-ink` | `oklch(0.21 0.008 255)` | headings, primary text |
| Body | `--color-body` | `oklch(0.36 0.012 255)` | body copy (≥4.5:1 on every surface) |
| Muted | `--color-muted` | `oklch(0.52 0.02 255)` | secondary text (≥4.5:1) |
| Line | `--color-line` | `oklch(0.86 0.008 255)` | borders, dividers |
| Line strong | `--color-line-strong` | `oklch(0.78 0.01 255)` | dashed callouts |
| Primary 600 | `--color-primary-600` | `oklch(0.46 0.185 26)` | primary buttons, active nav |
| Primary 700 | `--color-primary-700` | `oklch(0.39 0.15 26)` | hover, focus rings |
| Primary 100 | `--color-primary-100` | `oklch(0.94 0.02 26)` | selected/tinted wells |
| Accent | `--color-accent` | `oklch(0.6 0.22 23)` | small highlights, links on tint |

Status vocabulary (always paired with labels, never color alone):

| Status | Token |
| ------ | ----- |
| Voting | `oklch(0.63 0.16 75)` amber |
| Selected | `oklch(0.55 0.17 292)` violet |
| InProgress | `oklch(0.55 0.16 255)` blue |
| Completed | `oklch(0.56 0.14 155)` green |
| Cancelled | `oklch(0.58 0.015 255)` slate |
| Terminated | `oklch(0.5 0.2 18)` red (distinct from primary crimson) |

Color strategy: **Restrained** — neutral surfaces, one accent ≤ ~10% of surface,
state colors reserved for status.

## Typography

- **One family**: Inter Variable (`@fontsource-variable/inter`), weights 400–800.
  Product register needs no display/body pairing.
- Fixed rem scale (no clamp): 12 / 13 / 14 / 16 / 20 / 28.
  - `--text-xs` 0.75rem (labels, meta) · `--text-sm` 0.8125rem · body 0.875–1rem ·
    h3 1.25rem · h2 1.75rem · h1 2rem (never larger in-app).
- Body copy line length capped at 72ch; dense data allowed in tables.
- Numerals keep tabular feel via `font-variant-numeric: tabular-nums` for balances
  and counts.
- `text-wrap: balance` on headings, `text-wrap: pretty` on prose.

## Layout

- Fixed app shell: slim top bar (identity + connection + role switcher), content
  column max-width 1200px, generous section spacing (24/32px rhythm).
- **Three zones** in the top nav: **Deploy** (main page — the primary function),
  **Government** (`/gov`, routes to the admin console or member desk by role), and
  **Company** (a parallel portal for bidding). Zones keep the gov and private-sector
  sides apart so the demo isn't confusing; everything except Deploy is gated until
  the contract is deployed.
- 2D layouts with CSS Grid; `repeat(auto-fit, minmax(280px, 1fr))` for responsive
  card rows. No nested cards.
- Forms and data tables on `panel` surfaces with hairline `line` borders; density is
  a virtue in tables.
- Z-index scale (semantic only): dropdown 10 · sticky 20 · backdrop 30 · modal 40 ·
  toast 50 · tooltip 60.
- Ledger values (pooled pot, treasury, funding token, admin key) live in the Config
  modal, not on the desks, so screens stay uncluttered.
- Demo time controls float bottom-right (date + `+1d` / `+7d` / `-1d`); toasts stack
  bottom-left so the two fixed regions never collide.

## Motion

- 150–250ms transitions, exponential ease-out; state-change feedback only
  (hover, active, selected, toasts, status transitions).
- Progress bars and vote meters ease on value change; no orchestrated page-load
  sequences.
- All motion guarded by `@media (prefers-reduced-motion: reduce)` → instant.

## Components

- **Button**: one shape (semi-rounded, 8px), five states (default/hover/active/focus/
  disabled/loading). Primary = `primary-600`; secondary = panel + line; danger =
  status red; ghost = text-only.
- **Badge / StatusBadge**: 14px label with a 6px dot; background tint at 12% of the
  status hue — never full-saturation inactive colors.
- **Field set**: label (13px, body) · control (32–36px, 1px line border, focus ring
  `primary-700`) · helper text · error text in danger.
- **Card**: white surface, 1px line, 16px radius, 16–20px padding. Used for projects
  and proposals; never nested.
- **Table**: header 12px uppercase-ish muted, rows 14px with hover row tint; zebra
  optional, keep minimal.
- **Dialog / Modal**: native `<dialog>` + `::backdrop` (top layer, Esc + focus trap
  for free). Config modal holds network selection + ledger values.
- **Toast**: fixed bottom-left stack, icon + message + auto-dismiss.
- **Demo clock**: floating bottom-right chip with current demo date and time-skip
  buttons; shared `z-toast` layer.

## Icons

Inline SVG, 16–20px, `currentColor`, 1.5px stroke, drawn from a single consistent
set (feather-style). No filled/gradient icons. Used only where they aid scanning
(status dots, role glyphs, actions).
