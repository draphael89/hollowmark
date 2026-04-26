# M1 Ward Timing

Date: 2026-04-26

## Goal

Give one non-Mark status an actual timing rule before adding M1 card breadth.

## Rule

Ward prevents one incoming enemy hit before Block or HP is touched, then spends
one Ward stack. It emits `STATUS_CONSUMED` before the `DAMAGE_DEALT` event so FX
and logs can distinguish warded hits from normal blocked hits.

## Notes

- Ward is defensive and readable, so it is the safest first timing rule.
- This does not add a Ward card yet.
- End-of-turn Block clearing still happens after the enemy action.
