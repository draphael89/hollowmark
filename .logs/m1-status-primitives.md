# M1 Status Primitives

Date: 2026-04-26

## Goal

Represent the planned status ceiling in code before adding more cards. Block
remains a numeric shield field. The non-block status set is now explicit:

- Poison
- Bleed
- Weak
- Vulnerable
- Mark
- Ward

## Added

- `src/systems/status.ts`
- `tests/status.test.ts`

Heroes and enemies now carry zeroed status stacks. Current S0 behavior is
preserved by routing Mark through those stacks:

- Mark Prey adds one Mark stack to the enemy.
- The next damage hit gains the Mark bonus.
- Mark is consumed after that hit.

## Save compatibility

New saves serialize status stacks. The save parser still accepts legacy enemy
`marked` booleans and converts them into `statuses.mark`, so older local S0
saves do not hard-fail solely because of the representation change.

## Deliberate limits

This pass does not implement poison, bleed, weak, vulnerable, or ward timing.
It only makes the allowed status vocabulary and storage shape real. Status
timing rules should be added one at a time with scenario coverage.
