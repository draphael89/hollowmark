# M2 Underroot Distinct Spoils

Date: 2026-04-26

## Scope

- Warm Shard now starts later fights with +1 block on each hero.
- Bone Charm now starts later fights with Ward 1 on each hero.
- Silver Nest now starts later fights with Mark 1 on the enemy.
- Reward cues now show the effect shorthand before pickup: `Blk`, `Wd`, or `Mk`.

## Why

The reward branches were readable, but they still played too similarly. This pass gives each spoil a different combat promise while keeping the placeholder reward model small and deterministic.

## Receipt

- `.logs/underroot-spoil-choice-prompt.png` captures the Warm Shard prompt with its block shorthand.
- `.logs/underroot-warm-shard-combat.png` captures a later fight starting with Warm Shard block applied.

## Boundary

This does not add inventory, drafting, permanent upgrades, new reward art, or random loot.
