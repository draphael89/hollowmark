---
title: S0 Phaser Signature Slice Review Gates
date: 2026-04-25
category: best-practices
module: hollowmark-s0
problem_type: best_practice
component: development_workflow
severity: medium
applies_when:
  - reviewing Phaser signature slices
  - building browser-game validation slices
  - adding card combat or retained-card UI
  - adding screenshot or browser smoke gates
  - adding replay or debug command paths
tags: [phaser, s0, review-gates, browser-smoke, replay, strict-typescript]
---

# S0 Phaser Signature Slice Review Gates

## Context

HOLLOWMARK's S0 Phaser signature slice was meant to prove one hallway, one fight, one screenshot, a five-card shared hand, a hold slot, one debt choice, and deterministic replay before content expansion.

The initial implementation got the shape on screen, but review found reusable acceptance-gate failures: the fight was not winnable, the held-card UI was one-way, TypeScript strict mode was missing, the screenshot captured the browser viewport instead of the internal canvas, Phaser redraws detached interactive objects without destroying them, and replay/debug commands could reach combat-only paths before combat existed.

## Guidance

Use these gates before calling an S0 Phaser slice complete.

1. **Prove the authored fight is mathematically winnable.**

   Check the enemy HP, draw rules, energy, hand contents, card effects, and turn structure together. If the player has 3 energy and the strongest guaranteed burst is Mark Prey plus Blood Edge plus Iron Cut for 22 damage, a 24 HP enemy is not a one-fight proof unless a second guaranteed turn or another damage source exists.

2. **Treat held cards as playable combat state.**

   A hold slot is not a decoration. If a card moves from hand into hold, the UI must still let the player select and play that card or intentionally return/replace it. Test `hand -> hold -> play` as its own path.

3. **Keep TypeScript strict from the first systems commit.**

   The S0 slice introduces state-machine seams: exploration, combat, victory, replay commands, browser debug hooks, and Phaser dispatch. Missing `strict: true` lets nullable combat state and union fallthroughs survive exactly where the project most needs compiler help.

4. **Screenshot the game canvas, not just the page.**

   The S0 visual gate is about the `640x360` internal presentation. A `1280x720` Playwright viewport screenshot may prove the page exists, but it does not prove the pixel-art canvas has the required composition, framing, or scale.

5. **Destroy Phaser objects when rebuilding interactive layers.**

   A redraw that calls `children.removeAll()` can detach objects without destroying their input zones, timers, tweens, or listeners. When the scene recreates cards, enemies, and hold slots on every render, stale invisible targets are a real risk. Destroy the old display objects or render through owned containers/groups that are cleared with destruction.

6. **Validate command boundaries before touching combat state.**

   Replay, browser debug hooks, keyboard shortcuts, and scripted commands can arrive out of the happy path. A `hold-card` command before combat should fail clearly or be ignored by policy; it should not reach `state.combat!` and crash.

7. **Make browser smoke prove both state and pixels.**

   A debug object is useful for assertions, but it can hide rendering failures. Browser smoke should drive the real input path and also verify that the canvas is nonblank, correctly sized, and showing the expected slice state.

## Why This Matters

S0 is a quality gate, not a content milestone. If the proof slice has an unwinnable fight, dead UI affordance, incorrect screenshot artifact, loose TypeScript boundary, or stale interactive objects, later content will amplify those defects.

These checks protect the project's main architectural bet: pure game systems outside Phaser, thin Phaser scenes that render and dispatch, and browser-verifiable game feel. They also prevent "debug-state passes" where tests prove internal objects changed but the player-visible game is broken.

## When to Apply

- Combat math, card movement, TypeScript config, screenshot gates, Phaser redraws, or replay/debug command paths changed.
- A slice is being promoted from "visible prototype" to "accepted milestone."

## Examples

### Fight Solvability

Before approving a one-fight S0 proof, write the tiny arithmetic next to the test:

```text
Energy: 3
Playable burst: Mark Prey (1) + Blood Edge (1) + Iron Cut (1)
Damage: 12 + 4 mark bonus + 6 = 22
Enemy HP must be <= 22 unless a second turn exists.
```

Then add a replay assertion that reaches victory:

```ts
const state = runReplay([
  { type: 'step-forward' },
  { type: 'step-forward' },
  { type: 'interact' },
  { type: 'play-card', cardId: 'mark-prey' },
  { type: 'play-card', cardId: 'blood-edge' },
  { type: 'play-card', cardId: 'iron-cut' },
]);

expect(state.mode).toBe('victory');
const combat = assertCombat(state);
expect(combat.enemy.hp).toBe(0);
```

### Held-Card Path

Do not only test that a card can enter hold. Test that it remains playable:

```text
click Mark Prey card
click Hold
assert held card is Mark Prey
click held card
click enemy
assert enemy is marked
```

### Screenshot Gate

Prefer capturing the canvas element or asserting the screenshot size:

```ts
const canvas = page.locator('canvas');
await expect(canvas).toHaveJSProperty('width', 640);
await expect(canvas).toHaveJSProperty('height', 360);
await canvas.screenshot({ path: '.logs/s0-signature-slice.png' });
```

### Phaser Redraw Hygiene

Do not use `this.children.removeAll(true)` on a scene display list as a destruction shortcut. For rebuild-heavy UI, prefer an owned container or tracked objects:

```ts
this.uiLayer.destroy(true);
this.uiLayer = this.add.container(0, 0);
```

For one-off objects, destroy them directly:

```ts
this.cardZones.forEach((zone) => zone.destroy());
this.cardZones = [];
```

### Command Boundary Validation

Avoid non-null assertions on command paths:

```ts
if (command.type === 'hold-card') {
  return withCombat(state, holdCard(assertCombat(state), command.cardId));
}
```

## Related

- [PLAN.md](../../../PLAN.md) for the S0 signature-slice definition.
- [CODEX_RUNBOOK.md](../../../CODEX_RUNBOOK.md) for the S0 task prompt and acceptance gates.
- [AGENTS.md](../../../AGENTS.md) for the Phaser, TypeScript, pixel, and pure-system rules.
- [.logs/s0-signature-slice.md](../../../.logs/s0-signature-slice.md) for the first implementation log.
