# M2 Underroot Rest Payoff

## What changed

- The Underroot rest tile now resets accumulated pressure to quiet instead of only recording progress.
- The rest log now explicitly says the roots go quiet, matching the footer pressure cue.
- Added reducer and browser coverage so the one-shot rest behavior stays mechanical, not cosmetic.

## Why

The rest site was authored and reachable, but it did not change the run. The M2 loop needs every branch to earn its tile before real asset production. Resetting pressure makes the first sanctuary alcove a real pacing tool without adding wounds, inventory, or a wider recovery economy.

## Verification

- `pnpm exec vitest run tests/slice.test.ts`
- `pnpm exec playwright test tests/browser/s0.spec.ts -g "Marrowgate enters Underroot"`

## Receipt

- `.logs/underroot-rest-pressure-reset.png` captures the rest tile after use with quiet pressure and `rest used` visible.
