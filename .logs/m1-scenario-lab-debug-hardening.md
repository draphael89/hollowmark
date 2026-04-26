# M1 Scenario Lab Debug Hardening

Date: 2026-04-26

## Scope

Hardened the M1 scenario lab so browser tests can verify real scenario metrics
instead of only checking that the selected label changed.

## Changes

- Scenario card staging now preserves zone integrity. Pulling a card into a lab
  hand no longer drops another card from all zones.
- Scenario Lab and Combat Sandbox share one explicitly lab-only card staging
  helper, so fixture behavior cannot drift independently between tools.
- Lab combat helper tests now pin the staging contract directly: fixture-only
  staging moves one card into hand, preserves one-zone membership, no-ops for
  already playable cards, and throws if a fixture asks for a missing card.
- Scenario tests assert every final combat report has each card instance in
  exactly one zone.
- Scenario Lab publishes structured debug metrics for browser tests:
  outcome, turns, cards played, energy, debt, damage, and cards played by hero.
- Scenario Lab debug now publishes individual gate labels and pass/fail state,
  so browser tests can assert fixture-vs-replay meaning instead of only counts.
- Browser coverage now selects an M1 scenario and asserts the structured metrics.

## Deferred

- Scenario Lab still shows one selected report at a time.
- Scenario metrics are textual; richer trend/challenge visualization should wait
  until the 24-card starter deck is closer.
