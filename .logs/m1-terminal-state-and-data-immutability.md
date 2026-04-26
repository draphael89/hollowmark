# M1 Terminal State and Data Immutability Hardening

Date: 2026-04-26
Status: complete

## Scope

This pass hardened the boundary between authored data, runtime combat state,
terminal modes, and save validation. It did not add new content or art.

## Changes

- `endCombatTurn` now transitions to victory when enemy poison kills the enemy
  during the end-turn sequence.
- Save validation now requires mode and combat facts to agree:
  - explore saves cannot carry combat;
  - combat saves cannot contain dead enemy or dead party terminal facts;
  - victory saves require a dead enemy;
  - defeat saves require a dead party;
  - enemy-dead and party-dead at the same time is rejected.
- Combat saves with zero card instances are rejected instead of passing zone
  validation vacuously.
- Combat save command logs must reference card instances that exist in the saved
  combat state.
- Combat save command logs cannot target enemy ids outside the saved single-enemy
  combat.
- Active combat saves must have enemy intent pointed at a living hero.
- Authored hero and card data exports are readonly.
- `CardDef`, `CardEffect`, `TargetRule`, and `EnemyIntent` now express authored
  immutability in their types.
- Combat creation now clones the wolf status bag instead of sharing the authored
  enemy object's nested status object.
- The hero-targeted status regression test now uses the authored `Oath Ward`
  card instead of mutating `S0_CARDS`.

## Verification

```
pnpm typecheck
pnpm test -- tests/combat.test.ts tests/slice.test.ts tests/save.test.ts
pnpm build
pnpm test:browser
```

Results:

- TypeScript passed.
- Unit tests passed: 110 tests.
- Production build passed.
- Browser tests passed: 19 tests.
