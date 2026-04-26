# M1 Review Readiness

Date: 2026-04-26
Status: ready for review

## What this branch proves

This branch keeps the playable scope narrow while strengthening the surfaces that
M1 combat and M2 placeholder Underroot will depend on:

- status primitives and authored status timing;
- full 24-card starter-lab deck data and deterministic seeded deck order;
- combat sandbox controls for card selection, card play, hold, end turn,
  statuses, and feel cues;
- scenario lab metrics, verdicts, gates, and command traces for golden combat
  scenarios;
- an isolated `?scene=m1-combat` browser route that proves a natural seeded M1
  win plus a natural enemy-turn/refill cycle without writing into the default
  S0 save slot;
- visual gallery selection and review-focus debug data;
- S0 floor data, view-slot sandbox poses, and floor/save validation;
- save/load hardening for combat zones, status stacks, terminal modes, command
  logs, enemy targets, and active enemy intent.

## Verification

Full gate status:

- Typecheck passed.
- Unit tests passed: 117 tests.
- Build passed.
- Browser tests passed: 21 tests.

`pnpm verify` passed end to end.

## Review order

Suggested review slices:

1. Pure combat/status model:
   - `src/systems/status.ts`
   - `src/systems/combat.ts`
   - `src/data/combat.ts`
   - `tests/status.test.ts`
   - `tests/combat.test.ts`

2. Save/replay boundary:
   - `src/systems/save.ts`
   - `src/systems/slice.ts`
   - `tests/save.test.ts`
   - `tests/slice.test.ts`

3. Dev scenes and browser proof:
   - `src/scenes/CombatSandboxScene.ts`
   - `src/scenes/DungeonSandboxScene.ts`
   - `src/scenes/ScenarioLabScene.ts`
   - `src/scenes/VisualGalleryScene.ts`
   - `tests/browser/dev-scenes.spec.ts`
   - `tests/browser/s0.spec.ts`

4. Floor/view-slot boundary:
   - `src/data/floors/`
   - `src/systems/floor.ts`
   - `src/systems/viewSlots.ts`
   - `src/systems/movement.ts`

## Honest remaining risks

- Combat still has one enemy; multi-enemy formation and target validation remain
  future work.
- Status feel cues are useful but still modest; they are readable, not final
  choreography.
- Visual Gallery is now a real placeholder review surface, but it is not yet an
  asset-passport pipeline.
- The M1 route is intentionally a lab route. It proves one natural seeded win,
  one natural enemy-turn/refill cycle, and save isolation, not a full campaign
  loop.
- The bundle size warning remains expected for a Phaser/Vite single-entry build;
  it is not a gameplay blocker at this milestone.
