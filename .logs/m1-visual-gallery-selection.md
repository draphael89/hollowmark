# M1 Visual Gallery Selection

Date: 2026-04-26
Status: landed

## Why

The Visual Gallery booted, but it was still a passive placeholder grid. For M2
and later asset work, the gallery needs to behave like a review tool before any
generated art is allowed into the project.

## Change

The gallery now:

- uses stable placeholder manifest IDs;
- exposes the selected asset through `window.__HOLLOWMARK_DEV_SCENE__`;
- supports number-key and arrow-key selection;
- displays a small detail inspector with kind, status, ID, and review focus;
- keeps generated art out of the repo and uses only drawn placeholder swatches.

The manifest entries now include a terse `reviewFocus` field so future asset
passes evaluate the right thing: depth, silhouette, crop safety, and small-size
readability instead of generic prettiness.

## Verification

The browser dev-scene suite includes a gallery selection test that asserts:

- the placeholder asset count;
- the exact stable manifest ID order;
- direct number-key selection;
- arrow-key selection;
- no page errors.
