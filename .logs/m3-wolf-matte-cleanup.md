# M3 Wolf Matte Cleanup

Goal: improve the first Rootbitten Wolf review preview without pretending it is
final art.

## Changed

- Updated `scripts/matte-sprite.mjs` usage to remove edge-connected dark matte
  while preserving enclosed dark body detail.
- Regenerated `rootbitten-wolf-clean-preview-01.png` from the existing raw draft
  with threshold 24 after comparing thresholds 18, 24, and 30.
- Pointed the public passport and Combat Sandbox composition at the cleaned
  preview.
- Kept `enemy.root-wolf.placeholder` at `in_game_previewed`; the refined sprite
  reads better in combat, but still needs human edge review before approval.

## Receipts

- `.logs/wolf-matte-comparison.png` compares old matte, threshold 18, and
  threshold 24 on a checker background.
- `.logs/wolf-combat-comparison.png` compares all three versions on the approved
  Underroot combat background.
