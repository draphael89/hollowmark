# M2 Gate Pressure Preview

Date: 2026-04-27

## Change

- Gate now previews the next dive's pressure before the player enters:
  - `Gate next dive: quiet stair` with no town debt.
  - `Gate next dive: roots listening from D1` when unsettled debt will wake the Underroot.
- Sanctuary and Vellum keep their service-specific town hint lines.

## Receipts

- TypeScript: `pnpm exec tsc --noEmit`
- Browser focus: `pnpm exec playwright test tests/browser/s0.spec.ts -g "Marrowgate enters Underroot|unsettled town debt|Sanctuary settlement"`
- Canvas receipt: `.logs/m2-gate-pressure-preview.png`

## Readiness

This keeps the debt loop legible at the decision point. The player sees the cost of ignoring Sanctuary before committing to the Gate, without exposing the hidden numeric threat clock.
