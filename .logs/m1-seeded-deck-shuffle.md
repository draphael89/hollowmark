# M1 Seeded Deck Shuffle

Date: 2026-04-26
Status: implemented

## What Changed

- `createCombatWithCards()` now shuffles the lab deck by seed.
- `createCombat()` still uses the authored S0 card order, preserving replay IDs and browser smoke paths.
- Card instance IDs remain based on authored deck order, not shuffled position.

## Why

M1 deck labs need real draw variance, but the signature slice still needs to be a stable regression anchor. Shuffling only the explicit lab initializer gives both.

## Proof

Tests verify:

- Same seed gives the same M1 deck order.
- Different seeds produce different M1 deck orders.
- All cards remain present exactly once.
- S0 default combat still opens with the original five-card hand and empty draw pile.
