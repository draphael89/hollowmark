# Phase 1H Card Instances

Date: 2026-04-25

Purpose: separate card definitions from playable card instances before M1 deck, draw, discard, and duplicate-card work.

Changes:
- Added `CardInstanceId` and `CardInstance`.
- `CombatState.hand` and `CombatState.held` now store instance IDs.
- `CombatState.cards` maps instance IDs to card definition IDs.
- Added deterministic starter card instance construction from the combat seed.
- Scene selection and commands now dispatch instance IDs while rendering player-facing card definition data.
- Added a regression proving duplicate card definitions can coexist as separate instances.

Verification:
- `pnpm verify`
  - 25 Vitest tests passed.
  - TypeScript build passed.
  - 2 Playwright browser smokes passed.

