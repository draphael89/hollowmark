# Phase 1G Turn-Loop Hardening

Date: 2026-04-25

Purpose: make the S0 combat loop sturdier before broadening into M1 combat.

Changes:
- Added `defeat` as a slice mode and `DEFEAT` as a combat event.
- End turns now clear temporary hero block after the enemy action resolves.
- The wolf now retargets the next living hero after the current target drops, allowing defeat to occur through normal gameplay.
- Added a visible tray `End Turn` control alongside the existing `T` / `Enter` keyboard path.
- Added direct EventScheduler coverage for delayed event ordering and pending-count drain.
- Extended browser smoke coverage to reach defeat through repeated end-turn clicks and verify FX/object counts stay bounded.

Verification:
- `pnpm verify`
  - 24 Vitest tests passed.
  - TypeScript build passed.
  - 2 Playwright browser smokes passed.

