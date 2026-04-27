# M2 Underroot Debt Entry Pressure

## What changed

- Unsettled Marrowgate debt now wakes Underroot pressure when the player starts another dive.
- Each town debt adds four pressure ticks on entry, making even one unpaid favor visible as `roots listening`.
- Entering with debt logs `Old debt wakes under the stair.`
- Sanctuary settlement still clears debt before entry, preserving counterplay.

## Why

Debt was visible in Marrowgate, but ignoring it did not change the next dive. This pass makes the debt loop real without exposing the hidden threat number or adding a wider economy.

## Verification

- `pnpm exec vitest run tests/slice.test.ts`
- `pnpm exec playwright test tests/browser/s0.spec.ts -g "unsettled town debt"`

## Receipts

- `.logs/underroot-debt-town-before-reentry.png` captures Marrowgate with unsettled `D1`.
- `.logs/underroot-debt-entry-pressure.png` captures the next Underroot entry with `roots listening`.
