# M2 Sanctuary Settlement Preview

Date: 2026-04-27

## Change

- Selecting Sanctuary now previews the practical service outcome before settlement:
  - `Sanctuary: settle D1 for quiet stair` when debt is waiting.
  - `Sanctuary: no debt to settle` after debt is cleared.
- Gate and Vellum keep their own decision hints, so Marrowgate services now each communicate why the player would choose them.

## Receipts

- TypeScript: `pnpm exec tsc --noEmit`
- Browser focus: `pnpm exec playwright test tests/browser/s0.spec.ts -g "unsettled town debt|Sanctuary settlement"`
- Canvas receipt: `.logs/m2-sanctuary-settlement-preview.png`

## Readiness

This is still a placeholder town-service surface. It makes the existing debt loop easier to play before adding deck editing, healing costs, or a broader Marrowgate economy.
