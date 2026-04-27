# M3 Rootbitten Wolf Approval

Goal: decide whether the active batch-02 Rootbitten Wolf candidate can enter the
approved gameplay asset pool.

## Reviewed

- `public/assets/drafts/underroot/batch-02/rootbitten-wolf-preview-01.png`
- `.logs/root-wolf-batch-02-review.png`
- `.logs/visual-audits/combat-sandbox.png`

## Result

Promoted `enemy.root-wolf.placeholder` from `in_game_previewed` to `approved`.

The batch-02 candidate passes the current M3 visual-production rubric:

- focal wolf shape reads at thumbnail size;
- no generated text is visible;
- palette fits the approved corridor and combat plates;
- silhouette is clear enough for 96x128 use;
- edge cleanup is acceptable on checkerboard;
- Combat Sandbox composition reads better than the source image alone.

## Boundary

Approval does not wire the sprite into S0/M2 gameplay yet. The next gameplay
slice should consume this asset through the manifest by stable id and keep the
fallback placeholder if the gate ever drops below `approved-for-gameplay`.
