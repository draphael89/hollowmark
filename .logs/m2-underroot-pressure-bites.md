# M2 Underroot Pressure Bites

## What changed

- Underroot `roots hunting` pressure now sharpens the next enemy attack by +2.
- Exploration encounter previews use the same pressure rule, so the player sees `Intent: Bite 8` before committing.
- Combat start logs the pressure consequence: `The roots are hunting. The next bite sharpens.`
- Added reducer and browser coverage for the pressure-to-combat contract.

## Why

Pressure was readable but mostly cosmetic. This pass makes extra wandering matter without exposing the hidden threat number or adding a broader encounter system.

## Verification

- `pnpm exec vitest run tests/slice.test.ts`
- `pnpm exec playwright test tests/browser/s0.spec.ts -g "hunting pressure"`

## Receipts

- `.logs/underroot-pressure-hunting-preview.png` captures `roots hunting` and `Intent: Bite 8` before combat.
- `.logs/underroot-pressure-bite-8.png` captures the sharpened combat intent.
