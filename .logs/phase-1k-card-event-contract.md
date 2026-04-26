# Phase 1K Card Event Contract

Date: 2026-04-25

Purpose: tighten card identity before M1 adds duplicate cards, deck cycling, and more FX/log consumers.

Changes:
- Branded `CardInstanceId` so arbitrary strings no longer type-check as playable card instances.
- Added `cardInstanceId()` for controlled construction at boundaries and deterministic test setup.
- `CARD_HELD` now carries both the instance ID and card definition ID.
- Starter hand construction now preserves branded instance IDs instead of widening through `Object.keys`.

Verification:
- `pnpm verify`
  - 27 Vitest tests passed.
  - TypeScript build passed.
  - 2 Playwright browser smokes passed.

