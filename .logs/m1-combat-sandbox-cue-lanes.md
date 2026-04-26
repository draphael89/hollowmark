# M1 Combat Sandbox Cue Lanes

Date: 2026-04-26
Status: landed

## Why

The `0 Status stack` sandbox preset fires several authored combat events at once:

- `CARD_PLAYED`
- `BLOCK_GAINED`
- `STATUS_APPLIED`
- `DEBT_GAINED`
- `DAMAGE_DEALT`

That proved the M1 status/debt event contract, but it made the visual preview
harder to read because float labels could spawn on top of each other. The
production feel runtime was not wrong; the dev sandbox was compressing several
player actions into one keypress.

## Change

`CombatSandboxScene` now handles sandbox-only event bursts with:

- a short per-event cue stagger;
- deterministic float lanes reset per sandbox action;
- wrapped hand/draw preview lines;
- a separated enemy silhouette target inside the sandbox preview;
- no gameplay changes;
- no change to the production `feelScheduler` cue contract.

This keeps the dev scene useful for reviewing status stacks without teaching
the real game a special-case timing rule.

## Verification

```txt
pnpm typecheck
pnpm test:browser tests/browser/dev-scenes.spec.ts
```

Both pass. The dev-scene hand-play assertion now checks the durable contract
instead of pinning one M1 card effect to a four-card hand: after a play, the
hand must shrink from five, remain in the expected lab range, discard must grow,
and events must publish.
