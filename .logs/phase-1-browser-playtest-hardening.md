# Phase 1 Browser Playtest Hardening

Date: 2026-04-26
Status: complete.

## Why

The browser playtest proved the current S0 loop and dev scenes boot cleanly, but it exposed three foundation gaps:

- outcome screens had no explicit new-run path;
- CombatSandboxScene rebuilt its display list after cue triggers, which could erase transient feel previews;
- visual receipts existed for the S0 screenshot, but not for the dev-scene review surfaces.

## Changes

- Added an `R` new-run action on victory and defeat.
- Reset now clears the versioned S0 save, cancels scheduled FX, clears transient FX labels, and restores a fresh S0 state.
- CombatSandboxScene now keeps a retained shell/status label and only uses the FX group for transient feedback.
- Added browser coverage for sandbox cue keys.
- Added browser-generated visual audit receipts for S0, CombatSandboxScene, DungeonSandboxScene, and VisualGalleryScene.

## Acceptance

- `pnpm verify` passes.
- Outcome reset returns to fresh explore state and clears `hollowmark:s0-save`.
- Combat sandbox cue labels update through keyboard input without page errors.
- Visual audit screenshots are written under `.logs/visual-audits/` at 640x360.

## Verification

```txt
pnpm verify
```

Result: typecheck, Vitest, Vite build, and 10 Playwright browser tests passed.
