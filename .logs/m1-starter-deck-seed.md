# M1 Starter Deck

Date: 2026-04-26
Status: implemented

## What Changed

- Expanded the M1 starter-lab deck to 24 cards: six per hero.
- Kept `createCombat()` pinned to the five-card S0 signature deck.
- Added `createCombatWithCards()` so larger combat labs can initialize an alternate deck without changing S0.
- Added an all-card definition registry so card instances from alternate decks resolve through the same `cardDefFor` path.
- Expanded save card validation to recognize the authored card registry.

## New Cards

- Liese: Iron Cut, Hold Fast, Oath Ward, Sundering Cut, Stone Guard, Ringing Blow.
- Eris: Mend, Sanctuary Veil, Quiet Rebuke, White Thread, Mercy Cut, Prayer Knot.
- Mia: Blood Edge, Glass Hex, Rootfire, Black Spark, Venom Script, Glass Pulse.
- Robin: Mark Prey, Barbed Shot, Shadow Mark, Needle Rain, Marked Step, Tripwire.

## Why

The next deckbuilder step needs real cards, but the S0 slice must remain a stable regression anchor. This pass adds content pressure through an explicit lab initializer rather than silently broadening the default game loop.

## Proof

Tests verify:

- S0 remains the default five-card deck with no draw pile.
- The M1 lab deck initializes with five hand cards and nineteen draw-pile cards.
- The 24-card deck is evenly distributed across the four fixed heroes.
- New status/debt cards resolve through the existing combat rules.

## Deferred

- Wiring the M1 deck into playable S0.
- Seeded shuffling for larger deck initialization.
