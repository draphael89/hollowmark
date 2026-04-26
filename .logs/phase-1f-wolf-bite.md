# Phase 1F wolf bite

Date: 2026-04-25

## Scope

- Added `end-turn` as a combat command.
- Implemented one enemy intent resolver: the Rootbitten Wolf bites Liese for 6.
- Added pure hero damage and block consumption.
- Emitted enemy-turn and next-player-turn events around the bite.
- Bound `T`, and `Enter` with no selected card, to end turn in combat.
- Routed hero damage through the existing event scheduler and floating text FX path.

## Tests

- Added Vitest coverage for the wolf biting Liese for 6.
- Added Vitest coverage for `Hold Fast` block absorbing the wolf bite.
- Added replay coverage for deterministic enemy turn events.
- Extended browser smoke to end a turn, assert Liese HP changes, and wait for scheduled FX to drain.

## Verification

- `pnpm verify`
  - `pnpm test`: 4 files, 19 tests passed.
  - `pnpm build`: passed. Vite still warns that the Phaser bundle is larger than 500 kB.
  - `pnpm test:browser`: passed and refreshed `.logs/s0-signature-slice.png`.

## Remaining debt

The combat loop now has pressure, but it is still intentionally tiny. There is no enemy scaling, no statuses, no defeat condition, no draw/discard loop, and no dedicated hero damage animation beyond scheduled floating text.
