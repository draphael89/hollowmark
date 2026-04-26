# M1 Status Application Contract

Date: 2026-04-26
Status: implemented

## What Changed

- `apply-status` card effects now carry an explicit `amount`.
- `STATUS_APPLIED` events now include both `amount` and resulting `total`.
- S0 Mark Prey applies `mark` amount 1 through the same contract.
- Hero-targeted status regression coverage now proves multi-stack Ward application.

## Why

M1 cards will need different stack strengths. Keeping status application as an implicit `+1` would make future card data depend on hidden combat behavior and would leave Phaser/log/metrics consumers without enough event detail.

## Deferred

- Cards that apply Poison, Bleed, Weak, Vulnerable, or Ward.
- Dedicated status application FX per status.
