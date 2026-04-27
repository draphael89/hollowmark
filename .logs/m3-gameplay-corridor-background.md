# M3 Gameplay Corridor Background

Goal: let exploration use the first approved dungeon plate without weakening the
asset approval gate.

## Changed

- S0/M2 exploration now loads `underroot.corridor.placeholder` through the public
  asset manifest only when its gate is `approved-for-gameplay`.
- The approved corridor plate renders behind the existing slot geometry and
  threat/readability overlays.
- Debug state exposes the exploration background id/path/gate alongside the
  combat background and approved Blood Edge card art.

## Boundary

This wires only the approved corridor background. It does not approve or wire the
Rootbitten Wolf sprite, and it does not replace the movement, threat, minimap, or
combat presentation systems.

## Receipt

- `.logs/s0-exploration-corridor.png` captures the approved corridor plate in
  S0 exploration with slot geometry, minimap, and log text still readable.
