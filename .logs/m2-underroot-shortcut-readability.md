# M2 Underroot Shortcut Readability

## What changed

- The shortcut cue now reads `shortcut back +D1` so the player sees both the payoff and the debt.
- The shortcut result log now names the main seam return instead of only saying the roots folded back.
- Added browser coverage that drives the shortcut branch through the real scene and verifies the foldback position, debt, and log.

## Why

The shortcut already moved the party and charged debt, but it read like a generic interaction. This pass makes the branch a clearer tactical offer: pay one future favor to skip back toward the central Underroot seam.

## Verification

- `pnpm exec vitest run tests/slice.test.ts`
- `pnpm exec playwright test tests/browser/s0.spec.ts -g "shortcut branch"`

## Receipts

- `.logs/underroot-shortcut-prompt.png` captures the shortcut prompt before use.
- `.logs/underroot-shortcut-foldback.png` captures the returned main-seam position and `D1` debt.
