# Phase 1 Readability And Viewport Guard

Date: 2026-04-26

## Scope

Closed the first Phase 1 gate from the post-M1 playtest plan: keep the current
combat proof readable before adding Underroot content or final art.

## Changes

- Added an explicit narrow-viewport guard instead of allowing the 640x360 canvas
  to crop in portrait/mobile layouts.
- Kept integer scaling: supported play view remains 640x360 or larger.
- Moved full selected-card rules into the combat side panel when a card is
  selected.
- Kept hand cards compact with stable short labels and effect summaries, so long
  starter-card names do not spill out of their frames.
- Relaxed the enemy-click browser assertion to prove no card play occurs rather
  than depending on stale event history.

## Non-goals

- No Underroot content.
- No generated art.
- No multi-enemy combat.
- No scene architecture split.

## Verification

Targeted browser coverage proves:

- portrait/narrow view shows the guard;
- landscape view shows the integer-scaled canvas;
- long M1 card names expand in selected-card detail;
- enemy clicks only act on selected enemy-target cards.
