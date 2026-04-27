# M2 Underroot Boss Gate

Date: 2026-04-26

## Scope

- The Underroot boss now rejects straight-line rushes until the party has claimed a spoil or completed a hunter branch.
- The viewport cue shows `boss sealed` before the requirement is met and `fight` after it opens.
- The exploration preview now names the Underroot Alpha and shows Bite 10 before combat starts.

## Why

The route was readable, but walking straight to the boss remained the obvious fastest path. This pass makes the player branch at least once before the seal attempt, so reward and fight branches matter to the default run.

## Receipt

- `.logs/underroot-boss-gate-blocked.png` captures the sealed boss gate before branch progress.
- `.logs/underroot-boss-gate-open.png` captures the opened boss gate after claiming Warm Shard.

## Boundary

This does not add locks, keys, scripted dialogue, new rooms, or final boss art.
