# M1 Poison And Bleed Timing

Date: 2026-04-26
Status: implemented

## What Changed

- Poison deals damage equal to its current stack count at turn boundaries, then spends one stack.
- Enemy Poison ticks at the start of the enemy turn before intent resolution. If it kills the enemy, combat ends in victory before the enemy acts.
- Hero Poison ticks at the next player-turn boundary after enemy actions and block clearing.
- Bleed opens only when physical HP damage gets through Block, adds its current stack count to the hit, then spends one stack.
- Blocked physical hits do not spend Bleed.
- Damage events now include `poison` and `bleed` tags when those rules affect a hit.

## Why

Poison and Bleed needed distinct timing rules before M1 cards start applying them. Poison is a turn-boundary pressure clock. Bleed is a wound that matters only when damage actually lands. Both rules stay deterministic and pure.

## Deferred

- Cards that apply Poison or Bleed.
- Dedicated Poison/Bleed visual grammar beyond existing damage cue routing.
- Multi-enemy poison ticks.
