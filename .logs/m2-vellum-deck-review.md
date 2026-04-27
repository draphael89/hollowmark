# M2 Vellum Deck Review

Date: 2026-04-27

## Change

- Selecting Vellum in Marrowgate now exposes the concrete starter-deck review line: `Vellum deck 24 cards  LIE6 ERI6 MIA6 ROB6`.
- The town reducer log now records that Vellum laid out 24 starter cards, preserving the service choice in replay/save history without adding deck editing yet.

## Receipts

- Pure reducer: `pnpm exec vitest run tests/slice.test.ts`
- TypeScript: `pnpm exec tsc --noEmit`
- Browser smoke: `pnpm exec playwright test tests/browser/s0.spec.ts -g "Marrowgate enters Underroot"`
- Canvas receipt: `.logs/m2-vellum-deck-review.png`

## Readiness

This is a readability slice, not a deck-management feature. Vellum now proves the authored M1 party deck is visible from town before real asset work, while upgrades and editing remain out of scope until the placeholder loop is approved.
