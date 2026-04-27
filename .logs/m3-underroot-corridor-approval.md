# M3 Underroot Corridor Approval

Goal: resolve the first dungeon corridor plate before wiring real exploration
backgrounds into gameplay.

## Changed

- Promoted `underroot.corridor.placeholder` from `in_game_previewed` to
  `approved`.
- Recorded that the side-stone ornament bands were reviewed at the 392x220 game
  plate scale and do not read as generated text.
- Updated asset manifest tests so the corridor now resolves to the
  `approved-for-gameplay` gate.

## Boundary

This approves the corridor plate only. It does not wire the plate into S0 or M2
exploration rendering; that should happen in a later manifest-gated gameplay
slice.
