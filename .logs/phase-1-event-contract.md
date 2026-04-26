# Phase 1 Event Contract Hardening

Date: 2026-04-26

## Scope

- Renamed S0 combat effect events to production-facing names:
  - `DAMAGE` -> `DAMAGE_DEALT`
  - `DEBT` -> `DEBT_GAINED`
  - `BLOCK` -> `BLOCK_GAINED`
  - `HEAL` -> `HEAL_APPLIED`
  - `MARK` -> `STATUS_APPLIED`
- Added `CARD_PLAYED` before authored card effects.
- Added actor refs for combat causes and targets.
- Added card identity to card-driven effects.
- Added `lethal` and damage `tags` to `DAMAGE_DEALT`.
- Updated the event scheduler and feel scheduler to consume the new event names.
- Updated replay, combat, feel, and event-scheduler tests.

## Why

The feel runtime should react to authored causes, not infer meaning from visible state changes. This pass gives Phaser enough event identity to animate, sound, and log combat without comparing HP before and after.

## Verification

- `pnpm verify`: passed.
  - `pnpm typecheck`: passed.
  - `pnpm test`: 7 files, 40 tests passed.
  - `pnpm build`: passed. Vite still warns that the Phaser bundle is larger than 500 kB.
  - `pnpm test:browser`: 3 Playwright browser smokes passed and refreshed `.logs/s0-signature-slice.png`.
