# Phase 1 Theme, Layout, Motion Extraction

Date: 2026-04-26

## Scope

- Added `src/game/theme.ts` for the S0 palette and Phaser text style.
- Added `src/game/layout.ts` for the 640x360 canvas, panels, S0 view geometry, tray controls, combat targeting, side panel rows, footer, and feedback anchors.
- Added `src/game/motion.ts` for feedback timing, camera shake/pan values, floating text motion, and simple tone constants.
- Refactored `S0Scene` to import theme, layout, and motion tokens instead of owning raw color and timing constants.
- Removed the old `src/game/constants.ts` compatibility shim after callers moved to `layout.ts`.
- Added `tests/layout.test.ts` to prove fixed panels, tray controls, five-card hand footprint, and enemy targeting stay inside the 640x360 presentation.
- Added a theme drift assertion that keeps the numeric Phaser void color and CSS void color paired.
- Moved remaining alpha, panel-border, and debt-warning presentation values into theme/layout tokens.

## Why

S0 is now a proven playable loop. The next risk is letting visual taste, control geometry, and feedback timing scatter through Phaser scene code while M0/M1 work expands. This pass keeps behavior and content unchanged while giving future work one place to tune presentation.

## Hardening follow-up

After review, the scene still had a few raw alpha values, panel inset values, and an old constants re-export path. Those were folded into the same theme/layout surface before moving on to the feel runtime.

## Verification

- `pnpm typecheck`: passed.
- `pnpm test`: 6 files, 31 tests passed.
- `pnpm verify`: passed.
  - `pnpm typecheck`: passed.
  - `pnpm test`: 6 files, 32 tests passed.
  - `pnpm build`: passed. Vite still warns that the Phaser bundle is larger than 500 kB.
  - `pnpm test:browser`: 2 Playwright browser smokes passed and refreshed `.logs/s0-signature-slice.png`.
