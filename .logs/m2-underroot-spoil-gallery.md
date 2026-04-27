# M2 Underroot Spoil Gallery

## What changed

- Added an Underroot Spoils review panel to the Visual Gallery dev scene.
- Exposed the three spoil identities through the dev-scene debug contract:
  - Warm Shard: `Blk +D1`, party block
  - Bone Charm: `Wd +D1`, party ward
  - Silver Nest: `Mk +D1`, enemy mark
- Kept the pass as placeholder review tooling only; no final art was generated or imported.

## Verification

- `pnpm typecheck`
- `pnpm exec playwright test tests/browser/dev-scenes.spec.ts -g "visual gallery"`

## Receipt

- `.logs/underroot-spoil-gallery.png` captures the Visual Gallery with all three spoil effects visible in one review pose.
