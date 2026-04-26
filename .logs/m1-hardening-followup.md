# M1 Hardening Follow-Up

Date: 2026-04-26

## Scope

Closed the review findings that blocked the M1 lab from becoming a trustworthy
playtest surface. This pass intentionally did not add new cards, enemies, art, or
floor content.

## Changes

- Save validation now rejects malformed hero rosters, impossible HP/energy/block
  values, non-positive enemy intent damage, and non-integer combat counters.
- M1 lab combat saves now round-trip with the larger starter-lab deck, held card,
  discard pile, hero Ward, enemy Poison/Bleed/Vulnerable, and debt.
- Enemy intent is retargeted again after hero Poison ticks, so next-turn previews
  cannot point at a hero who died at the player-turn boundary.
- Combat Sandbox now supports indexed hand plays, holding the first card, ending
  the M1 lab turn, and structured debug state for browser playtests.

## Deferred

- The M1 deck is still a 13-card starter lab, not the final 24-card deck.
- Status explanations remain compact codes in the main S0 UI.
- Status application feel cues are still mostly indirect through damage/debt
  feedback.
