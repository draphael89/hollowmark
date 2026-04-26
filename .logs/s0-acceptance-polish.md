# S0 Acceptance Polish

Date: 2026-04-25

## Scope

- Kept the current S0 gameplay behavior unchanged.
- Made victory and defeat render as outcome states instead of active combat affordance states.
- Removed active enemy/end-turn/card controls from the tray after victory or defeat.
- Expanded the hold slot into a two-line control so held card names remain readable at 640x360.
- Added strict test typechecking through `tsconfig.test.json`.
- Updated `pnpm verify` to run typecheck before unit, build, and browser checks.
- Added browser assertions that victory and defeat leave no live hit zones behind.

## Why

The S0 slice is now a proven loop, so the first execution step was to make the proof cleaner and harder to regress before larger architecture work. The game should not invite combat actions after an outcome, and the hold slot is a core mechanic rather than a cramped debug label.

## Verification

- `pnpm typecheck`
- `pnpm verify`
  - `pnpm typecheck`: passed.
  - `pnpm test`: 5 files, 28 tests passed.
  - `pnpm build`: passed. Vite still warns that the Phaser bundle is larger than 500 kB.
  - `pnpm test:browser`: 2 Playwright browser smokes passed, asserted outcome screens have zero hit zones, and refreshed `.logs/s0-signature-slice.png`.
