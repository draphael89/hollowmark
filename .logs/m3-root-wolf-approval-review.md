# M3 Rootbitten Wolf Approval Review

Goal: decide whether the current Rootbitten Wolf candidate can graduate from
`in_game_previewed` to `approved`.

## Reviewed

- Current processed preview:
  `public/assets/drafts/underroot/batch-01/rootbitten-wolf-clean-preview-01.png`
- Prior receipts:
  `.logs/wolf-matte-comparison.png`
  `.logs/wolf-combat-comparison.png`
- Temporary cleanup experiments:
  threshold/spur removal variants and a hard-outline cutout variant.

## Result

Do not approve the current Rootbitten Wolf candidate.

The combat read is strong enough for sandbox review, but the checkerboard alpha
review still shows ragged rear-leg and twig-edge breakup. Additional threshold
or isolated-pixel cleanup does not materially fix the problem, and a hard
outline makes the sprite feel pasted-on rather than painterly.

## Decision

- Keep `enemy.root-wolf.placeholder` at `in_game_previewed`.
- Keep it out of S0/M2 gameplay.
- Generate a batch-02 source candidate with a cleaner matte target instead of
  spending more time patching this source.

## Next Prompt

Added `.prompts/underroot/root-wolf-enemy-batch-02.txt` with stricter
requirements:

- flat dark blue-gray matte, not near-black;
- no dangling twig clusters or separated pixel islands;
- connected limb silhouette;
- checkerboard and combat-background readability as explicit acceptance tests.
