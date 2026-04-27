# M3 Gameplay Combat Background

Goal: let gameplay use the first approved visual asset without letting
unapproved sprites slip into the encounter.

## Changed

- S0/M1 combat now loads `underroot.combat.placeholder` through the public asset
  manifest only when its gate is `approved-for-gameplay`.
- The combat background is rendered behind the existing placeholder wolf
  geometry.
- Debug state exposes the gameplay asset contract:
  - approved combat background id/path/gate
  - `enemySprite: null` while the Rootbitten Wolf remains unapproved

## Boundary

This is the first manifest-gated gameplay art use. The Rootbitten Wolf and card
art remain review assets until their passports reach `approved`.
