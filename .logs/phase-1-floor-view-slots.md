# Phase 1 Floor And View Slots

Date: 2026-04-26

## Scope

- Added authored S0 floor data in `src/data/floors/s0.ts`.
- Added `src/systems/floor.ts` for tile lookup, walkability, threat, and movement log lines.
- Added `src/systems/viewSlots.ts` for current/front/left/right first-person slots.
- Refactored movement to read start position, facing, walkability, threat, and log lines from floor data.
- Refactored the S0 exploration viewport to compute view slots before rendering.
- Kept the S0 hallway content, threat sequence, combat trigger, and browser flow unchanged.

## Why

The S0 hallway was still hardcoded in movement and implicitly in the renderer. Before save/load or broader M1/M2 work, exploration needs an authored floor contract so new rooms are data, not scattered coordinate conditionals.

## Verification

- `pnpm verify`: passed.
  - `pnpm typecheck`: passed.
  - `pnpm test`: 7 files, 43 tests passed.
  - `pnpm build`: passed. Vite still warns that the Phaser bundle is larger than 500 kB.
  - `pnpm test:browser`: 3 Playwright browser smokes passed and refreshed `.logs/s0-signature-slice.png`.
