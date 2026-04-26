# M3 First Batch Curation

Date: 2026-04-26

Goal: make the first real asset batch reviewable before any generated bitmap enters gameplay.

Changes:
- Promoted `title` and `reviewFocus` into `public/assets/manifest.json` so the public passport carries the same review contract as `VisualGalleryScene`.
- Added `pnpm asset:contact-sheet` to render `.curation/contact_sheets/underroot-batch-01.svg` from the manifest and prompt files.
- Tightened asset pipeline tests so public passports stay aligned with the gallery review contract.

Gate:
- Real source art is still not wired into gameplay.
- A generated candidate should be added to the passport only after it can be compared against the contact sheet and then previewed in `?scene=visual-gallery`.
