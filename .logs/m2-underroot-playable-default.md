# M2 Underroot Playable Default

Date: 2026-04-26

## Scope

- Made the deployed default route open the Marrowgate / Underroot loop.
- Preserved the original S0 signature slice behind `?scene=s0`.
- Added an in-viewport purpose cue for the current tile and the tile ahead.
- Added a compact dive progress line for rewards, fights, rest, boss, and debt.

## Why

The live app was stable, but it opened on the older S0 proof instead of the more game-shaped Underroot loop. This pass makes the default route communicate the actual current game goal: enter the Underroot, read the path, claim rewards, survive fights, and return changed.

## Receipt

- `.logs/underroot-default-route.png` captures the new default Marrowgate entry.
- `.logs/underroot-purpose-cues.png` captures the first Underroot step with tile-purpose and dive-progress cues.

## Boundary

This is readability and first-impression work. It does not add new enemies, final reward economy, new card drafting, or more art.
