# Phase 1 Card Affordance Polish

Date: 2026-04-26
Status: complete.

## Why

The S0 card tray was technically functional but too implicit for a new player. Cards needed to expose owner, target, and debt risk more clearly before M1 adds more card effects.

## Changes

- Card top line now shows cost, owner code, and target code.
- Card body text is summarized from effects instead of copied verbatim from card text.
- Debt cards remain visually warmer and now show compact `+D` risk text.
- Hold slot is slimmer and sits above the hand instead of competing with the fifth card.
- Added layout assertions so the hold slot cannot overlap the hand.
- Added a browser screenshot receipt for combat card affordances.

## Acceptance

- Combat card tray remains inside the 640x360 layout.
- Hold slot does not overlap cards.
- Browser screenshot receipt captures selected Blood Edge card affordances.
- `pnpm verify` passes.

## Verification

```txt
pnpm verify
```

Result: typecheck, 56 Vitest tests, Vite build, and 12 Playwright browser tests passed.
