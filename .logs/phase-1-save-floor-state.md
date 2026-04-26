# Phase 1 Save And Floor State

Date: 2026-04-26
Status: complete

## Goal

Make the S0 foundation durable across a browser reload without broadening
content.

## Changes

- Added `floorId` to `SliceState`.
- Added a floor registry in `src/data/floors/index.ts`.
- Routed movement and viewport rendering through the active floor id.
- Added `src/systems/save.ts` with versioned `SaveV1` serialization,
  deserialization, and migration entrypoint.
- Kept `localStorage` at the Phaser scene boundary.
- Added a browser smoke that reloads mid-combat, restores the save, and
  finishes the fight.

## Acceptance

- Invalid saves return safe errors instead of throwing.
- Current saves migrate through the migration entrypoint.
- Combat state round-trips with position, facing, mode, floor id, heroes,
  enemy mark, debt, card zones, and held card state intact.
- S0 still reaches victory after a reload.

## Deferred

- Multiple floor registry entries.
- Save menu UI.
- Manual save slots.
- Schema hash/checksum.

Those are not needed for S0. The important contract is now in place: gameplay
state is durable, validated at the boundary, and independent of Phaser.
