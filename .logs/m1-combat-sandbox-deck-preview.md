# M1 Combat Sandbox Deck Preview

Date: 2026-04-26
Status: implemented

## What Changed

- Combat Sandbox now displays an M1 starter-lab deck preview.
- Pressing `7` advances the sandbox M1 seed and redraws the shuffled hand/draw preview.
- The preview uses `createCombatWithCards()` and `M1_STARTER_CARDS`, so it exercises the same seeded shuffle path as pure tests.

## Why

The first M1 cards need to be inspectable in-browser before they are wired into the default S0 loop. The sandbox is the right surface because it is explicitly a production tool, not content progression.

## Deferred

- Playing M1 lab cards interactively from the sandbox.
- Dedicated card view objects for the expanded deck.
- Enabling M1 deck in the main S0 route.
