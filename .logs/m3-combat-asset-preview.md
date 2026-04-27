# M3 Combat Asset Preview

Goal: prove the strongest first-batch combat candidates together before any draft
bitmap is wired into gameplay.

## Changed

- Combat Sandbox now loads the processed Underroot combat plate and matted
  Rootbitten Wolf preview as a draft composition.
- The composition is explicitly labeled as a draft combat comp.
- The dev debug contract exposes the background id/path, enemy id/path, and
  approval state so browser tests can prove the review surface is using the
  intended passports.

## Boundary

This does not approve the assets and does not connect generated bitmaps to
gameplay data. The preview remains a review-only sandbox gate before asset
approval.
