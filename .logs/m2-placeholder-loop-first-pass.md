# M2 Placeholder Loop First Pass

Date: 2026-04-26

## What Changed

- Added `town` as a slice mode for Marrowgate.
- Added the `underroot-m2-placeholder` floor with authored tile contract fields for movement, visual recipe, threat effect, map behavior, encounter preview, and test expectation.
- Added one-shot authored tile interactions:
  - `underroot-rest-1`
  - `underroot-reward-1`
  - `underroot-shortcut-1`
  - `underroot-return-1`
  - `underroot-boss-1`
- Routed `?scene=m2-underroot` through `S0Scene` as a dev proof route.
- Kept M2 route saves isolated from the S0 local save slot.
- Added a placeholder Marrowgate debt ledger so reward and shortcut costs persist outside combat.
- Added Sanctuary settlement via `settle-debt` / `C`, without adding a broader town economy.
- Exposed a narrow debug dispatch hook only on lab routes so browser playtest scripts can drive the same scene dispatch path without shipping that mutator on the default S0 route.
- Added a hidden Underroot threat clock. Committed steps spend safety based on the destination tile pressure; the UI renders cue language instead of exposing the number.
- Added placeholder Marrowgate service selection for Gate, Vellum, and Sanctuary. Vellum is a review surface only for now; it does not edit cards yet.
- Added the first normal placeholder encounter tile, proving combat can return to Underroot exploration instead of always ending the route.
- Kept rest as an authored one-shot respite marker. It does not model expedition healing yet; that attrition system stays out of scope until the slice needs persistent wounds.

## Design Notes

This is still a placeholder loop, not Underroot content expansion. The goal is to prove Marrowgate entry, authored exploration interactions, return-to-town progress, and a boss-pressure combat return without adding new enemies, final art, or broader dungeon systems.

The tile interaction model is data-authored and reducer-owned so Phaser stays a renderer and input bridge. S0 combat remains replay-compatible; the S0 victory event stream is unchanged.

## Verification

- `pnpm exec vitest run tests/slice.test.ts tests/save.test.ts --testNamePattern "debt|Underroot|authored rest|M2 town"`
- `pnpm exec vitest run tests/slice.test.ts tests/save.test.ts --testNamePattern "safety|M2 town|numeric"`
- `pnpm exec vitest run tests/slice.test.ts tests/save.test.ts --testNamePattern "Marrowgate service|selected Marrowgate|impossible numeric"`
- `pnpm exec vitest run tests/slice.test.ts --testNamePattern "normal placeholder fight"`
- `pnpm exec vitest run tests/slice.test.ts tests/save.test.ts`
- `pnpm exec playwright test tests/browser/s0.spec.ts --grep "M2 browser smoke"`
- `pnpm exec playwright test tests/browser/s0.spec.ts --grep "M2 browser smoke|S0 browser smoke: move"`
- `pnpm typecheck`
- `pnpm test`
- `pnpm verify`
