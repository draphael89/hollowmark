# HOLLOWMARK

A first-person grid-stepped party dungeon crawler with shared-deck card combat.
Engine: Phaser 3 + TypeScript + Vite. State: pure external game systems plus thin Phaser scenes. No backend for v1.

## Source of truth

- `PLAN.md` is the game design and build-order source of truth.
- `HOLLOWMARK_VISUAL_PRODUCTION.md` is the art and asset-pipeline source of truth.
- `CODEX_RUNBOOK.md` contains the copy/paste Codex task prompts.
- Follow the milestone order. Do not broaden content until the current slice is fun and readable.
- Do not change a hard lock in `PLAN.md` without asking the human.
- When a new design decision is made, update the appropriate doc and log why in `.logs/`.

## Conventions

- Use pnpm, not npm or yarn.
- One logical change per commit.
- Browser interactions: [@browser-use](plugin://browser-use@openai-bundled).

## Code parsimony

- Write direct, skimmable code.
- Prefer fewer states, narrow parameters, obvious control flow, and early returns.
- Use discriminated unions for multi-shape state and exhaustive handling for impossible variants.
- Validate at boundaries, then trust types inside typed code.
- Avoid override bags and wide configuration surfaces unless strictly necessary.
- Keep straightforward logic together when that is easier to skim.
- Remove incidental flexibility that is not required for the current milestone.

## Tech rules

- TypeScript strict. Avoid `any`; if unavoidable, explain why in `.logs/`.
- Gameplay logic lives in pure modules under `src/systems/` or equivalent.
- Phaser scenes render state and dispatch player actions; they do not own gameplay math.
- No physics engine, no raycaster, no backend in v1.
- Use seeded RNG for gameplay randomness. No `Math.random()` in systems.
- Use stable asset IDs from a manifest, not raw file paths in gameplay data.
- Run tests and build before declaring a task complete.

## Pixel rules

- Internal resolution is `640x360`.
- Integer-scale the canvas only.
- Use Phaser `pixelArt: true` and `roundPixels: true`.
- Never place gameplay sprites, UI, or camera endpoints at sub-pixel positions.
- Render all real text in Phaser/DOM. Generated images must not contain UI text.

## Build order

1. S0 signature slice gate: one hallway, one fight, one screenshot.
2. M0 walking skeleton.
3. M1 card combat core.
4. M2 Underroot vertical slice with placeholder art.
5. M3 visual production and beauty pass.
6. M4+ content expansion.

Do not generate final art before the placeholder slice proves the loop.

## Testing

- Add Vitest coverage for every pure gameplay module.
- Use browser testing after meaningful UI, combat, movement, or visual changes.
- Capture screenshots or notes in `.logs/`.
- Keep deterministic replay seeds for key combat and exploration scenarios.

## Asset workflow

- Use image generation only after the playable placeholder slice is approved, unless explicitly instructed.
- Generate high-resolution source images, never tiny final sprites directly.
- Save prompts under `.prompts/`.
- Never import raw image generations directly into the game.
- Every shipped visual asset needs an asset passport: prompt, source, processing notes, palette pass, in-game preview, and approval state.
- Process selected assets before wiring them into gameplay.

## Juice

Movement bob, wall bump, hit-stop, screen shake, floating damage, card draw/play animation, tweened HP/corruption bars, and UI sound feedback are required early. They are not final polish.

## Anti-patterns

- Do not add per-character hands in v1.
- Do not add a fifth hero.
- Do not add an eighth status effect.
- Do not add dialogue trees.
- Do not add a second town.
- Do not expose the hidden threat number.
- Do not broaden content before the current slice is fun.
- Do not copy reference UI or assets directly.
- Do not let generated art decide the game style; the palette, crop, and post-process decide.
