# Phase 1B reducer events

Date: 2026-04-25

## Scope

- Added a `pnpm verify` gate and pinned the local Node runtime through `.nvmrc`.
- Removed unused Vite starter assets and the dead favicon reference.
- Changed `applyCommand` and `runReplay` to return `{ state, events }`.
- Added typed game events for movement, combat start, card hold, card rejection, and wrong-mode command rejection.
- Kept rejected commands in `commandLog` so replay captures player input exactly.
- Changed the wolf intent from UI prose to typed combat data rendered by `renderIntentText`.
- Reworked S0 scene feedback to use reducer events instead of before/after state diffs.

## Tests

- `pnpm verify`
  - `pnpm test`: 4 files, 15 tests passed.
  - `pnpm build`: passed. Vite still warns that the Phaser bundle is larger than 500 kB.
  - `pnpm test:browser`: passed and refreshed `.logs/s0-signature-slice.png`.

## Notes

This is still the S0 signature slice. No enemy turns, status system, scene split, or expanded content were added in this pass.

## Hardening follow-up

- Split commands into `ExploreCommand | CombatCommand` while preserving the public `SliceCommand` union.
- Normalized hold-slot rejection events for full slot and missing card cases.
- Changed intent text rendering to an exhaustive renderer table keyed by intent type.
- Added a no-duplicate-event identity test for single dispatches.
- Added browser coverage for the rendered combat intent text exposed through the debug hook.

## Follow-up verification

- `pnpm verify`
  - `pnpm test`: 4 files, 16 tests passed.
  - `pnpm build`: passed. Vite still warns that the Phaser bundle is larger than 500 kB.
  - `pnpm test:browser`: passed and refreshed `.logs/s0-signature-slice.png`.
