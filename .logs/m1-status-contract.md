# M1 Status Contract

Date: 2026-04-26
Status: implemented

## Stack Semantics

- Poison is additive and deals stack damage at its turn boundary, then spends one stack.
- Bleed is additive and opens only when physical HP damage gets through Block, then spends one stack.
- Weak is additive and spends one stack on the affected actor's next outgoing hit.
- Vulnerable is additive and spends one stack on the affected actor's next incoming hit.
- Mark is stored as a stack, but the current tactical hit consumes all Mark.
- Ward is additive and spends one stack to prevent one incoming hit.

## Ordering

- Card damage applies Weak first, then Mark, then Vulnerable.
- Bleed is added after Block only if physical HP damage landed.
- Ward prevents the hit before Block, Vulnerable, or Bleed can affect it.
- Enemy Poison ticks before enemy intent.
- Hero Poison ticks after enemy intent, at the next player-turn boundary.
- Poison damage never opens or spends Bleed.

## Validation

Status mutations require positive integer stack amounts. Save parsing still permits zero stacks because saved status state represents storage, not mutation.

## Proof

Composition tests now cover:

- Weak + Mark + Vulnerable card damage.
- Ward + Vulnerable prevention.
- Bleed with HP damage and fully blocked damage.
- Poison victory before enemy intent.
- Poison defeat after enemy action.
- Poison not spending Bleed.
