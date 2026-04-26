# M1 Target Validation

Date: 2026-04-26
Status: complete.

## Why

M1 combat needs explicit target rules before the deck grows. Without this seam, future multi-enemy fights, hero-targeted support cards, dead-target handling, and UI target prompts would drift back into scene inference.

## Changes

- Added card target rules to authored card data: `enemy` or `owner`.
- Replaced raw target strings with a narrow `TargetRule` union.
- Added `TargetRef` to the combat contract.
- `CARD_PLAYED` now carries the resolved target.
- `playCard` validates explicit targets before spending energy or moving cards.
- Invalid and dead targets emit `CARD_REJECTED` and leave combat unchanged.
- The S0 scene now dispatches an explicit target for played cards while preserving current behavior.
- The S0 footer now exposes target affordance for selected cards.
- Save parsing accepts optional play-card targets and validates them at the save boundary.

## Acceptance

- Existing S0 combat behavior remains unchanged.
- Wrong-kind, wrong-owner, and dead-enemy targets are rejected before mutation.
- Slice-level commands reject invalid explicit targets without mutating combat.
- Save round-trip keeps target-bearing command logs intact.
- Browser smoke proves enemy-target and owner-target card plays emit the expected `CARD_PLAYED.target`.
- Typecheck, unit tests, build, and browser tests pass.

## Verification

```txt
pnpm verify
```

Result: typecheck, 55 Vitest tests, Vite build, and 11 Playwright browser tests passed.
