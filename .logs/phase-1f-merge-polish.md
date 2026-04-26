# Phase 1F Merge Polish

Date: 2026-04-25

Purpose: tighten the wolf-turn slice before the next Phase 1 step.

Changes:
- Player damage now computes `rawDamage`, `blocked`, and `damage` explicitly so enemy block events match the state transition.
- Added a reducer regression for enemy block absorbing player damage.
- Updated the combat footer to expose `T/Enter` as the end-turn command.

Verification:
- `pnpm verify`
  - 20 Vitest tests passed.
  - TypeScript build passed.
  - Browser smoke passed and refreshed `.logs/s0-signature-slice.png`.

