# M3 Wolf Matte Cleanup

Goal: improve the first Rootbitten Wolf review preview without pretending it is
final art.

## Changed

- Updated `scripts/matte-sprite.mjs` to remove edge-connected dark matte while
  preserving enclosed dark body detail.
- Generated `rootbitten-wolf-clean-preview-01.png` from the existing raw draft.
- Pointed the public passport and Combat Sandbox composition at the cleaned
  preview.
- Kept `enemy.root-wolf.placeholder` at `in_game_previewed`; the cleaned sprite
  reads better in combat, but still needs human edge cleanup before approval.

## Receipts

- `.logs/wolf-matte-comparison.png` compares the old and cleaned alpha on a
  checker background.
- `.logs/wolf-combat-comparison.png` compares both versions on the approved
  Underroot combat background.
