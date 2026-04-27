# M3 Asset Approval Gate

Goal: make asset approval explicit before any draft bitmap can graduate into
gameplay wiring.

## Changed

- Promoted `underroot.combat.placeholder` from `in_game_previewed` to
  `approved` after Visual Gallery and Combat Sandbox composition review.
- Left the Rootbitten Wolf at `in_game_previewed`; the matted preview has a
  strong silhouette, but edge cleanup is still required before approval.
- Added a derived gallery gate:
  - `approved-for-gameplay` for approved or manifested assets
  - `needs-review` for preview/candidate states
  - `blocked` for rejected assets
- Visual Gallery debug now exposes the selected gate and the current list of
  gameplay-ready asset ids.

## Boundary

Approval is still a manifest/passport state, not direct gameplay wiring. Future
gameplay code should depend on stable asset ids and the manifest gate rather
than raw generated paths.
