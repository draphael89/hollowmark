# M1 Golden Scenarios

Date: 2026-04-26

## Goal

Add a pure-system design lab before broad M1 content. These scenarios measure
the current S0 combat substrate so new cards, enemies, and statuses can be
judged against deterministic evidence instead of vibes.

## Added

- `src/systems/scenarios.ts`
- `src/scenes/ScenarioLabScene.ts`
- `tests/scenarios.test.ts`

The first catalog covers:

- S0 one-hallway fight
- energy-starved hand
- held-card payoff
- corruption bargain
- bad draw recovery
- intent preview

Each scenario records commands, events, final state, and metrics:

- cards drawn
- cards played and held
- energy spent and wasted
- debt gained
- hero damage taken
- no-choice turns
- near-death turns
- enemy intent text
- cards played by hero

## Browser preview

`/?scene=scenario-lab` previews the metrics in the 640x360 game shell. Number
keys select scenarios. This keeps the design lab inspectable without moving
scenario logic into Phaser.

## Deliberate limits

This pass does not add cards, enemies, boss phases, or final art. The current
scenarios expose the S0 substrate only. The next useful expansion is to add
richer M1 combat rules against the same metrics.
