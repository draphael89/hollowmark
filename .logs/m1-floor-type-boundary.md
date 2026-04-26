# M1 Floor Type Boundary

Date: 2026-04-26
Status: landed

## Why

Authored floor data should depend on domain types, not runtime system modules.
`S0_FLOOR` was only importing a type from `systems/floor`, but that still made
the data layer point at the system layer.

## Change

Moved the floor data shapes into `src/game/types.ts`:

- `TilePurpose`
- `FloorTile`
- `FloorDef`

`src/systems/floor.ts` now owns only runtime helpers such as `tileAt`,
`isFloorWalkable`, `threatAt`, and `logLineAt`.

## Verification

```txt
pnpm typecheck
pnpm test -- tests/movement.test.ts tests/save.test.ts
pnpm test:browser tests/browser/dev-scenes.spec.ts
pnpm build
```

All pass.
