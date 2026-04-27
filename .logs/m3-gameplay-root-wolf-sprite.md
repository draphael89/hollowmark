# M3 Gameplay Root Wolf Sprite

Date: 2026-04-26

## Scope

- Wired the approved `enemy.root-wolf.placeholder` sprite into `S0Scene` combat gameplay.
- Kept the old geometric wolf as the fallback when the manifest asset is missing or not approved.
- Did not add enemies, new art, new combat rules, or broader scene architecture.

## Gate

The gameplay scene only loads the wolf sprite when the public manifest resolves it as:

- `kind: "sprite"`
- `approvalGate: "approved-for-gameplay"`

## Receipt

- Updated `.logs/s0-signature-slice.png` with the approved wolf visible in the S0 combat room.
- Focused browser smoke confirms `__HOLLOWMARK_DEBUG__.gameplayAssets.enemySprite` points at `/assets/drafts/underroot/batch-02/rootbitten-wolf-preview-01.png`.

## Visual Notes

The fallback wolf shadow/body renderer is skipped when the approved sprite is active so the authored silhouette stays readable. The enemy hitbox outline remains visible as the current click-target affordance.
