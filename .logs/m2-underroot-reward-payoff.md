# M2 Underroot Reward Payoff

Date: 2026-04-26

## Scope

- Added authored spoil names to the three Underroot reward interactions.
- Made the exploration cue show concrete reward prompts like `claim Warm Shard +D1`.
- Made claimed rewards stay visible in the tray as `Spoils ...` after pickup.
- Made claimed rewards harden the party with +1 starting block per spoil in later Underroot fights.

## Why

The default route now reaches the right slice, but rewards still felt like branch bookkeeping. This pass gives the player a visible object to pursue, a persistent receipt after the debt choice is taken, and a small combat payoff that makes the risk legible.

## Receipt

- `.logs/underroot-reward-ahead.png` captures the reward prompt before entering the reliquary tile.
- `.logs/underroot-reward-claimed.png` captures the claimed reward state and persistent spoil line.
- `.logs/underroot-spoil-block.png` captures the next fight starting with reward-granted block.

## Boundary

This is still placeholder reward feedback. It does not add a permanent economy, inventory screen, final reward art, or card drafting.
