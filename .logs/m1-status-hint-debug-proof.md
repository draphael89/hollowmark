# M1 Status Hint Debug Proof

Date: 2026-04-26

## Scope

Closed the proof gap around status readability. The S0 footer could already show
a selected status-card rule, but browser tests could not assert that the hint
remained present.

## Changes

- The S0 debug hook now publishes the selected-card hint and selected status
  rule.
- Browser coverage selects Mark Prey and asserts that the UI/debug contract
  exposes `Mark adds burst damage`.

## Why

The compact status codes are useful for dense combat panels, but the player
needs at least one readable rules surface before M1 status cards become a real
playtest deck.
