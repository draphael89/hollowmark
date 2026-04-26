# M1 Status Readability

Date: 2026-04-26
Status: implemented

## What Changed

- Added compact status summaries for combat UI: `Po`, `Bl`, `We`, `Vu`, `Mk`, `Wd`.
- S0 enemy readout now shows active enemy statuses below HP.
- S0 hero rows now show active hero statuses in the lower-left of each hero card.
- Ward consumption now plans a distinct `warded` feel cue instead of relying only on the following zero-damage event.

## Why

Status stacks are now gameplay state, so the player needs a terse, non-invasive way to read them in the 640x360 frame. This pass keeps the UI compact enough for the current skeleton while making Ward and Mark visible enough to test.

## Deferred

- Full tooltip/rules text for statuses.
- Icon sprites or final status art.
- Multi-enemy status layout.
