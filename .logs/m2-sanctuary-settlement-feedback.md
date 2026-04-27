# M2 Sanctuary Settlement Feedback

## What changed

- Sanctuary settlement now names the debt cleared: `The Sanctuary settles D1...`.
- The same line promises the practical payoff: `The next stair is quiet.`
- Added browser coverage proving settlement clears debt before the next Underroot entry.

## Why

After debt began waking Underroot pressure, settlement needed matching feedback. This keeps the town choice legible: carry debt for a pressured next dive, or clear it for a quiet stair.

## Verification

- `pnpm exec vitest run tests/slice.test.ts`
- `pnpm exec playwright test tests/browser/s0.spec.ts -g "Sanctuary settlement"`

## Receipts

- `.logs/underroot-sanctuary-settlement.png` captures Marrowgate after clearing `D1`.
- `.logs/underroot-settled-quiet-entry.png` captures the next dive entering at quiet pressure.
