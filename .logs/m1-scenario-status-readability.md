# M1 Scenario And Status Readability Pass

Date: 2026-04-26

## Scope

Continued the M1 hardening track without broadening content. The goal was to
make the new M1 mechanics measurable and more legible before adding more cards.

## Changes

- Scenario Lab now includes four M1 lab scenarios:
  - Ward save
  - Poison lethal
  - Bleed payoff
  - Bad-shuffle recovery
- Scenario reports can now measure direct M1 lab combat without forcing the S0
  slice reducer to own non-S0 deck setup.
- Status primitives now expose readable names and one-line rules for UI hints.
- Selecting a status card in S0 can surface the relevant rule in the footer.
- `STATUS_APPLIED` events now produce readable feel cues, so status application
  is not a silent state mutation.

## Deferred

- The final 24-card starter deck is still deferred.
- The status UI is still compact; icons/tooltips are a later UI object pass.
- Scenario Lab still reports metrics textually rather than as charts or spark
  lines.
