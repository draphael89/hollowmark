# Phase 1L - Combat Data Extraction

Date: 2026-04-25

## Decision

Moved authored S0 combat data out of `src/systems/combat.ts` into `src/data/combat.ts`.

## Why

`combat.ts` should own pure combat rules. The card list, hero roster, and Rootbitten Wolf definition are authored content. Keeping content data separate makes the M1 starter deck and enemy archetype work easier without changing current S0 behavior.

## Scope

- Added `S0_HEROES`, `S0_CARDS`, and `ROOT_WOLF`.
- Updated `createCombat()` and card-instance construction to read from the data module.
- Added a regression test that locks the current hero order, opening hand order, and wolf definition.

## Verification

- `pnpm test`
- `pnpm verify`
