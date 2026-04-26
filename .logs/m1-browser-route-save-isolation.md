# M1 Browser Route Save Isolation

Date: 2026-04-26
Status: implemented

## Scope

Added a contained `?scene=m1-combat` route for browser playtesting the full M1
starter deck without contaminating the default S0 save slot.

## Changes

- `S0Scene` now boots `?scene=m1-combat` directly into a seeded 24-card combat
  lab using `m1-natural-19`.
- The M1 route does not persist to `hollowmark:s0-save`.
- Restarting from victory or defeat preserves the active route: S0 restarts as
  S0, while M1 restarts as the seeded M1 combat lab.
- Browser coverage proves the natural M1 win sequence:
  `Shadow Mark -> Blood Edge -> Iron Cut`.
- Browser coverage proves a natural enemy-turn/refill cycle after
  `Ringing Blow`.
- Browser coverage also proves that returning to `/` after the M1 route starts
  a clean S0 explore state.

## Why

M1 needs a real playable browser proof, but the default S0 signature slice must
remain a stable regression target. A query-routed lab gives us both: a tactical
M1 smoke path for the expanded deck and a clean S0 save/load surface.

## Deferred

- Multi-turn M1 route balance.
- Player-target selection for more complex future cards.
- Multi-enemy M1 route coverage.
