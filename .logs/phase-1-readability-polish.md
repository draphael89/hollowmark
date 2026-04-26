# Phase 1 Readability Polish

Date: 2026-04-26
Status: complete.

## Why

The Browser Use playtest found two presentation issues in the otherwise stable S0 foundation:

- the explore footer showed combat instructions before combat started;
- DungeonSandbox labels overlapped, which made the dev tool harder to trust.

## Changes

- Explore footer now shows movement and interaction verbs.
- Combat footer still shows selected-card targeting and turn/hold instructions.
- DungeonSandbox separates tile squares from the purpose legend so labels no longer collide.

## Acceptance

- Fresh S0 screenshot should no longer mention combat controls before combat.
- DungeonSandbox visual audit should show readable purpose labels.
- `pnpm verify` passes and refreshes visual audit receipts.

## Verification

```txt
pnpm verify
```

Result: typecheck, 56 Vitest tests, Vite build, and 11 Playwright browser tests passed.
