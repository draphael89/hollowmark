# M1 Next Phase Plan

Date: 2026-04-26
Status: scenario-gate hardening in progress

## Current read

The branch is ready for review as an M1 foundation hardening pass. The next work
should not be another broad foundation sweep. It should convert the starter lab
into a fuller combat-core proof while keeping the playable scope contained.

## Goal

Promote the M1 lab from "systems and sandboxes prove the rules" to "a small,
repeatable combat game loop exposes real tactical texture."

## Non-goals

- No generated final art.
- No Underroot floor expansion.
- No multi-enemy formation yet.
- No eighth status.
- No new town or dialogue systems.

## Execution order

### 1. Finish the 24-card starter deck

Status: complete.

Add the remaining eleven cards as authored data, not bespoke runtime branches.
The current card model is intentionally small; keep it that way unless a card
absolutely requires a new effect.

Acceptance:

- 24 card definitions.
- 6 cards per hero.
- Every card has one owner, one target rule, and one to two effects.
- Most cards cost 1.
- Cost 0 cards are setup or debt hooks, not efficient damage.
- Tests prove the per-hero card counts and at least one representative card per
  status family.

### 2. Add golden-scenario balance gates

Status: complete for the first pass.

Extend the scenario lab from descriptive metrics into thresholds. These should
be soft design gates, not brittle exact-turn requirements.

Acceptance:

- S0 victory remains short and deterministic.
- At least one scenario makes debt tempting.
- At least one scenario demonstrates Ward prevention.
- At least one scenario demonstrates Poison as a pre-intent clock.
- At least one scenario demonstrates Bleed payoff.
- No scenario reports a no-choice turn unless it is explicitly named as an
  energy-starved lesson.

Notes:

- Scenario Lab now renders `PASS` / `REVIEW` / `FAIL`, fixture-or-replay kind,
  gate counts, and a short command trace.
- M1 mechanic probes are explicitly marked `fixture`; they are still useful for
  Ward, Poison, and Bleed readability, but they are not treated as shuffle
  proof.
- `m1-bad-shuffle-recovery` is the first natural M1 replay: it uses a real
  seeded opening hand and plays Shadow Mark -> Blood Edge -> Iron Cut without
  staging cards into hand.

### 3. Upgrade Combat Sandbox card review

Status: first pass complete.

The sandbox currently proves card play, hold, end turn, status stack, and feel
cues. The next useful step is selection by visible card label/slot, plus a small
card-detail readout.

Acceptance:

- Clicking or pressing a visible slot selects/plays the same card.
- Debug state exposes selected card id, owner, cost, target, and rules text.
- Browser tests prove the selected details update after seed changes.

Notes:

- Card abbreviations are now unique across the full starter deck.
- The deck preview shows the first playable slot's full card name, owner, cost,
  target rule, and rules text.
- True click-to-select and richer debug detail remain the next UI pass.

### 4. Add status readability in the main S0 UI

The main S0 UI has compact status codes. Keep the compact codes, but make their
meaning discoverable through selected-card hints and combat log/event feedback.

Acceptance:

- Selected status cards show a short rule hint.
- Status application and consumption events appear in the debug event trail.
- Browser tests prove Mark, Ward, Poison, Bleed, Weak, and Vulnerable each have a
  readable label somewhere in the playtest/debug surface.

## Stop condition

Stop after the 24-card starter deck plus scenario gates are green. Do not move
to Underroot layout or generated assets until the scenario lab says the combat
loop has enough tactical variety to deserve a dungeon around it.

## Verification

Required before calling the next phase complete:

```
pnpm typecheck
pnpm test
pnpm build
pnpm test:browser
```
