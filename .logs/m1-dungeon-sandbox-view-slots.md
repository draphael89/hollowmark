# M1 Dungeon Sandbox View Slots

Date: 2026-04-26
Status: landed

## Why

`DungeonSandboxScene` booted and drew the S0 hallway, but it was not yet a
strong review surface for first-person readability. Before Underroot expands,
the dev scene should make floor data, facing, tile purpose, threat band, and
computed view slots inspectable.

## Change

The dungeon sandbox now:

- publishes structured debug for floor ID, position, facing, current purpose,
  and all computed view slots;
- shows slot purpose alongside slot coordinate and threat;
- supports `1-4` review poses for the important S0 hallway angles;
- keeps movement on `W/S` and turning on `A/D`.

This keeps the scene focused on proving authored floor/view-slot data, not on
adding new dungeon content.

## Verification

The browser dev-scene suite now asserts:

- the initial S0 floor ID and start pose;
- current/front slot purpose and threat;
- the encounter-facing-east review pose;
- wall/null slot behavior;
- no page errors.
