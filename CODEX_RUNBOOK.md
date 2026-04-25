# HOLLOWMARK Codex Runbook

Use this file to run Codex in focused passes. Do not ask one run to make the whole game.

## Run 1 — S0 Signature Slice

```text
Use GPT-5.5 in Codex. Read AGENTS.md, PLAN.md, and HOLLOWMARK_VISUAL_PRODUCTION.md first.

Build only S0: one hallway, one fight, one screenshot.

Create a Phaser 3 + TypeScript + Vite project with 640x360 integer scaling.
Use placeholder rectangles and text, not final art.

Implement:
- one first-person hallway view
- step/turn input with bob and wall bump
- four placeholder hero panels
- one enemy with visible intent
- one shared five-card hand
- three energy
- one hold slot
- one corruption/debt choice
- one deterministic replay seed or command log for the slice

Acceptance:
- one 640x360 screenshot communicates first-person dungeon, party state, enemy intent, cards, energy, held card, and debt
- one damaging card has hit-stop, shake, and damage number
- movement feels tactile
- pnpm build succeeds
- tests cover the pure combat/debt/movement pieces introduced
- browser smoke verifies movement and card play

Log decisions and screenshot notes in .logs/s0-signature-slice.md.
Do not generate final art.
```

## Run 2 — M0 Walking Skeleton

```text
Continue from S0. Keep the S0 screenshot gate intact.

Build M0 only:
- BootScene / TitleScene / DungeonScene / CombatScene / UIScene
- local save/load for position and party HP
- transition from dungeon to fake combat and back
- input router for keyboard and mouse
- one browser smoke test for movement, bump, combat transition, and reload

Keep gameplay systems pure. Phaser scenes should render state and dispatch actions.
Run pnpm build and tests.
Log in .logs/m0-walking-skeleton.md.
```

## Run 3 — M1 Combat Core

```text
Implement M1 combat core with placeholder art.

Scope:
- four heroes
- shared 24-card starter deck
- five-card hand
- three energy
- one hold slot
- target validation
- enemy intents
- seven statuses only
- corruption/debt events
- hit-stop, shake, floating damage, card draw/play/discard animation

Add deterministic golden encounters:
- tutorial win
- energy-starved hand
- held-card payoff
- corruption bargain
- bad draw recovery

Unit-test pure systems. Browser-test a busy combat screenshot for overlap and readability.
Do not improve final art.
Log in .logs/m1-combat-core.md.
```

## Run 4 — M2 Underroot Placeholder Slice

```text
Implement the placeholder Underroot vertical slice.

Scope:
- Marrowgate Gate, Vellum, Sanctuary
- one 10x10 effective Underroot floor
- tile purpose contracts
- threat clock and threat cues
- one rest site
- three rewards
- five normal encounters
- one elite
- one boss
- return to Marrowgate with debt settlement

Every authored tile must declare purpose, visual recipe, threat effect, interaction/log line, and test expectation.
Normal fights must stay under five minutes.
Do not generate final art.
Log in .logs/m2-underroot-placeholder.md.
```

## Run 5 — Visual Production Foundation

```text
Use imagegen only if explicitly approved for this run.

Build the visual production foundation, not final content:
- .prompts/ folders
- .curation/contact_sheets/
- .logs/visual-audits/
- asset passport schema
- process-asset/process-sprite/process-background/audit-assets scripts
- VisualGalleryScene
- CombatSandboxScene
- DungeonSandboxScene

Use placeholder/sample assets to prove the pipeline.
Capture browser screenshots and log visual audit notes.
```

## Run 6 — First GPT Image 2 Batch

```text
Only run after M2 placeholder slice is playable and the user approves art generation.

Create a draft Underroot batch:
- one corridor/environment plate
- one combat background
- one enemy source
- one card-art source
- one UI ornament sheet

Use low-quality drafts first.
Save every prompt under .prompts/.
Create contact sheets under .curation/contact_sheets/.
Select at most one candidate per asset class for processing.
Process, preview in VisualGalleryScene, capture screenshots, and log rejection/selection reasons.
Do not wire unapproved raw outputs into gameplay.
```
