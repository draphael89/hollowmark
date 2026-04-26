# M1 Card Effects

Date: 2026-04-26
Status: complete.

## Why

The next M1 cards need a small effect grammar before the deck grows. Single-purpose `kind`, `amount`, and `debt` fields were enough for S0, but they would force special-case code as soon as a card combines damage, debt, block, heal, or status.

## Changes

- Replaced S0 card `kind`/`amount`/`debt` fields with `effects`.
- Added a narrow `CardEffect` union:
  - `damage`
  - `gain-block`
  - `heal`
  - `apply-status`
  - `gain-debt`
- Resolved effects through one pure combat path after target validation and energy spend.
- Preserved current S0 behavior, event order, log output, debt coloring, Mark bonus, victory, and browser flow.
- Added a unit test that asserts all S0 cards are authored as effect lists.

## Acceptance

- S0 cards still play identically.
- Blood Edge still emits `CARD_PLAYED`, `DAMAGE_DEALT`, then `DEBT_GAINED`.
- Mark bonus and debt events still work.
- Typecheck, unit tests, build, and browser tests pass.

## Verification

```txt
pnpm verify
```

Result: typecheck, 56 Vitest tests, Vite build, and 11 Playwright browser tests passed.
