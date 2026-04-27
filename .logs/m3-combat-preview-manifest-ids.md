# M3 Combat Preview Manifest IDs

Goal: keep draft combat review surfaces behind stable asset passports instead
of hardcoded preview paths.

## Changed

- Added `assetFromManifest()` for stable-id lookup from the public asset
  manifest.
- Combat Sandbox now loads the approved combat background and previewed wolf by
  manifest id, deriving paths and approval states from the passport.
- Browser coverage still proves the concrete paths and approval states in debug,
  but the scene code no longer owns those paths.

## Boundary

This is still a review surface. It does not wire approved art into gameplay
encounters yet; that should be a separate manifest-gated gameplay slice.
