# M1 Weak And Vulnerable Timing

Date: 2026-04-26
Status: implemented

## What Changed

- Weak now reduces the next outgoing hit from the affected actor to 75%, rounded down, then spends one stack.
- Vulnerable now increases the next incoming hit on the affected actor to 150%, rounded down, then spends one stack.
- These rules apply to both hero card damage and the Rootbitten Wolf's attack intent.
- Damage events include `weak` and `vulnerable` tags when either modifier affected the hit.
- Card summary text now names the actual applied status instead of assuming all status cards apply Mark.

## Why

M1 needs statuses to be timing rules, not only stored labels. Weak and Vulnerable are the safest next pair because they modify the existing damage path without adding new content, new enemies, or a broader card DSL.

## Deferred

- Poison and Bleed timing.
- Status-specific FX beyond compact readouts and damage-event tags.
- New cards that apply Weak or Vulnerable.
