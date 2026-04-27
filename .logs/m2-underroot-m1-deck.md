# M2 Underroot M1 Deck

Date: 2026-04-26

## Scope

- Underroot combat now uses the authored 24-card M1 starter deck.
- The original S0 signature slice still uses the fixed five-card proof deck behind `?scene=s0`.
- Added reducer coverage proving both deck boundaries.

## Why

The default Underroot route was playable, but its fights still used the tiny S0 proof deck. This made the dive feel repetitive and hid the authored M1 card/status system from the main route. The M2 slice should expose the richer deck where the player is actually playing.

## Receipt

- `.logs/underroot-m1-combat-hand.png` captures an Underroot fight with a shuffled M1 hand and 19 cards left in the draw pile.

## Boundary

This does not add new enemy stats, multi-enemy combat, card rewards, or encounter-specific deck tuning.
