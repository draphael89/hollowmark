# S0 Signature Slice Log

## Scope

Built only the S0 proof: one hallway, one visible threat cue, one one-enemy combat, four hero panels, a five-card shared hand, three energy, one hold slot, and one debt card.

## Decisions

- Kept gameplay state in pure systems under `src/systems/`; Phaser renders and dispatches commands.
- Used a deterministic command log instead of save/load for S0 replay proof.
- Made **Blood Edge** the debt decision: it deals twice the safe damage of Iron Cut but adds 4 debt to Mia.
- Used placeholder geometry and text only. No generated or final art was added.
- Added a Playwright smoke path that drives keyboard movement, enters combat, and plays the debt card.

## Screenshot Notes

- The S0 screen is intentionally one dense 640x360 proof: first-person viewport, right-side party/minimap, lower card tray, footer threat state.
- Browser smoke writes the current receipt to `.logs/s0-signature-slice.png`.
- The visual bar for moving forward is still placeholder quality; M0/M1 should improve wall-slot composition and animation before adding content.
