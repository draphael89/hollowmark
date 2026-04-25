# S0 Signature Slice Log

## Scope

Built only the S0 proof: one hallway, one visible threat cue, one one-enemy combat, four hero panels, a five-card shared hand, three energy, one hold slot, and one debt card.

## Decisions

- Kept gameplay state in pure systems under `src/systems/`; Phaser renders and dispatches commands.
- Used a deterministic command log instead of save/load for S0 replay proof.
- Made **Blood Edge** the debt decision: it deals twice the safe damage of Iron Cut but adds 4 debt to Mia.
- Set the Rootbitten Wolf to 22 HP so Mark Prey + Blood Edge + Iron Cut can complete the authored S0 fight with exactly three energy.
- Kept exploration inputs out of combat mode in the pure reducer; combat and victory no longer move the party around the hallway.
- Made the hold slot selectable so a held card can return to the active play path.
- Used placeholder geometry and text only. No generated or final art was added.
- Added a Playwright smoke path that drives keyboard movement, enters combat, holds and plays Mark Prey, plays the debt card, reaches victory, and captures the canvas.

## Screenshot Notes

- The S0 screen is intentionally one dense 640x360 proof: first-person viewport, right-side party/minimap, lower card tray, footer threat state.
- Browser smoke writes the current receipt to `.logs/s0-signature-slice.png`.
- The receipt is captured from the canvas element after the victory state and is verified as 640x360.
- The visual bar for moving forward is still placeholder quality; M0/M1 should improve wall-slot composition and animation before adding content.

## Verification

- `pnpm test` passed: 3 files, 11 tests.
- `pnpm build` passed with the expected Phaser bundle-size warning from Vite.
- `pnpm test:browser` passed and refreshed `.logs/s0-signature-slice.png`.
