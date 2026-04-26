# Phase 1 Feel Runtime

Date: 2026-04-26

## Scope

- Added `src/game/feelCalibration.ts` for authored damage bands and debt/blocked cue values.
- Added `src/fx/feelScheduler.ts` to turn domain events into cue plans.
- Routed S0 movement, facing, damage, blocked damage, and debt feedback through cue playback in `S0Scene`.
- Added reduced-motion behavior at the cue-plan layer: shake drops, but hit-stop, floating text, and tones remain.
- Added constrained-frame-budget behavior at the cue-plan layer: low-priority cues can be dropped before critical feedback.
- Added larger floating text for heavier damage bands.
- Wired `prefers-reduced-motion: reduce` into the live scene settings and debug state.
- Made hit-stop overlap-safe by tracking the latest real-time deadline before restoring Phaser time scale.
- Kept gameplay behavior and content unchanged.

## Why

The S0 loop already has feedback, but it was scattered as direct Phaser calls inside `S0Scene`. The next layer needs authored causes and calibrated cue plans before broader combat expands the number of cards, events, and enemies.

## Verification

- `pnpm typecheck`: passed.
- `pnpm test`: 7 files, 39 tests passed.
- `pnpm verify`: passed.
  - `pnpm typecheck`: passed.
  - `pnpm test`: 7 files, 39 tests passed.
  - `pnpm build`: passed. Vite still warns that the Phaser bundle is larger than 500 kB.
  - `pnpm test:browser`: 3 Playwright browser smokes passed and refreshed `.logs/s0-signature-slice.png`.
