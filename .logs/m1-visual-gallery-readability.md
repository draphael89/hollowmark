# M1 Visual Gallery Readability

Date: 2026-04-26
Status: complete

## Scope

Tightened the placeholder asset gallery as a future review surface. No generated
art or asset pipeline breadth was added.

## Changes

- Long asset ids now render as compact in-card labels while full stable ids
  remain available in the selected detail panel and debug state.
- Selected asset details now render as three short lines instead of one cramped
  metadata row.
- Gallery cards now have pointer hit zones, so assets can be selected by mouse
  as well as keyboard.
- The dev debug hook now exposes each selected asset's review focus, so browser
  tests and future visual audits can prove selection carries the curation brief.
- Card dimensions are named constants so future asset-review cards stay stable.

## Verification

```
pnpm typecheck
pnpm test:browser -- tests/browser/dev-scenes.spec.ts
pnpm build
```

The refreshed visual-gallery receipt fits inside the 640x360 canvas without the
asset ids bleeding across card boundaries.
