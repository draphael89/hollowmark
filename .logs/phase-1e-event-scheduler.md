# Phase 1E event scheduler

Date: 2026-04-25

## Scope

- Added `src/fx/eventScheduler.ts` with narrow event timing constants and queued Phaser timer dispatch.
- Routed `S0Scene` event feedback through the scheduler instead of immediate state-diff callbacks.
- Moved damage and debt feedback into scheduled event handlers.
- Published scheduler pending-event count through the debug hook.
- Extended browser smoke to prove scheduled FX appears and both FX and pending events drain to zero.

## Why

Enemy turns and real card-play animation need a single timing seam. This pass keeps gameplay systems deterministic while giving Phaser a controlled way to sequence visual/audio feedback without pausing the scene clock.

## Verification

- `pnpm verify`
  - `pnpm test`: 4 files, 16 tests passed.
  - `pnpm build`: passed. Vite still warns that the Phaser bundle is larger than 500 kB.
  - `pnpm test:browser`: passed and refreshed `.logs/s0-signature-slice.png`.

## Remaining debt

The scheduler is intentionally small. It sequences event cues, but cards, enemy presentation, and party rows are not dedicated persistent view objects yet. Hit-stop is represented by delayed cue timing rather than a full authored impact graph.
