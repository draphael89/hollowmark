# Phase 1I Deck Zones

Date: 2026-04-25

Purpose: make card instance movement explicit before M1 deck, draw, discard, and duplicate-card work expands.

Changes:
- Added `drawPile` and `discardPile` to `CombatState`.
- Playing a card now removes that instance from hand and moves it to discard.
- Held cards remain held through enemy turns and do not enter discard.
- Added `drawToHand()` for deterministic draw-pile movement.
- End turn now discards the unheld hand, refills to 5, and emits `CARD_DRAWN` / `HAND_REFILLED` events.
- Replay victory commands now derive card instance IDs from the initialized combat state instead of hardcoding starter positions.
- Browser smoke now waits for scheduled FX to drain between damage-producing actions.

Verification:
- `pnpm verify`
  - 27 Vitest tests passed.
  - TypeScript build passed.
  - 2 Playwright browser smokes passed.
