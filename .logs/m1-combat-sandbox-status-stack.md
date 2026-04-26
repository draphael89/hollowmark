# M1 Combat Sandbox Status Stack

Date: 2026-04-26

## Scope

Added a deterministic status-heavy M1 preview to Combat Sandbox so status
application, Ward, Poison, Bleed, and debt can be reviewed without playing
through a full combat sequence.

## Changes

- `0 Status stack` creates an M1 lab state by playing Oath Ward, Rootfire, and
  Barbed Shot through real combat rules.
- Combat Sandbox debug now exposes enemy status stacks and hero status stacks.
- Browser coverage asserts the status-heavy board:
  - enemy Poison 2
  - enemy Bleed 2
  - Liese Ward 1
  - Mia debt 1
  - applied-status/debt event labels

## Why

M1 status mechanics need a quick visual receipt before the 24-card deck expands.
This keeps the playtest loop tight while still using the production combat path.
