# Phase 1C retained scene shell

Date: 2026-04-25

## Scope

- Replaced the full-scene `children.destroy()` render path with retained graphics objects for the shell, viewport, tray, side panel, and footer.
- Kept dynamic state labels and hit zones isolated in explicit groups that are cleared per render.
- Preserved event-driven movement, card, damage, and debt feedback.
- Left gameplay systems unchanged.

## Why

The S0 scene can now keep transient FX alive across state syncs. This is the minimum rendering shape needed before real hit-stop, card-play tweens, damage floats, and enemy-turn feedback can be made reliable.

## Verification

- `pnpm verify`
  - `pnpm test`: 4 files, 16 tests passed.
  - `pnpm build`: passed. Vite still warns that the Phaser bundle is larger than 500 kB.
  - `pnpm test:browser`: passed and refreshed `.logs/s0-signature-slice.png`.

## Remaining debt

This is a retained shell, not the final view-object architecture. Cards, party rows, and enemy presentation still redraw as graphics and labels inside section syncs. The next UI/FX pass should graduate those into dedicated persistent view objects as animations become more specific.

## Phase 1D merge hardening

- Renamed scene sync from `render()` to `syncFromState()`.
- Added debug object counts for total display objects, dynamic labels, hit zones, and FX.
- Added an explicit FX group for floating text so transient effects are intentionally preserved across state syncs and removed on tween completion.
- Extended the browser smoke with repeated card-selection syncs and bounded object-count assertions.
- Verified FX appears during combat feedback and returns to zero after tween cleanup.

## Phase 1D verification

- `pnpm verify`
  - `pnpm test`: 4 files, 16 tests passed.
  - `pnpm build`: passed. Vite still warns that the Phaser bundle is larger than 500 kB.
  - `pnpm test:browser`: passed and refreshed `.logs/s0-signature-slice.png`.
