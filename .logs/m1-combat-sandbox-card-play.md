# M1 Combat Sandbox Card Play

Date: 2026-04-26
Status: implemented

## What Changed

- Combat Sandbox now keeps a real M1 lab combat state.
- Pressing `7` reseeds and reshuffles the M1 lab deck.
- Pressing `8` plays the first card in hand through `playCard()`.
- Pressing `Q`-`T` selects visible hand slots; pressing `Enter` plays the
  selected slot.
- Clicking visible hand slots selects the same card exposed in debug state.
- The sandbox readout now shows hand, draw preview, wolf HP/statuses, and hero debt.
- The selected-card detail shows slot, name, owner, cost, target rule, and rules
  text.
- Played card events route through the existing feel scheduler.

## Why

The first M1 cards should be inspectable in-browser before they are promoted into the default S0 loop. This keeps the experiment dev-only while proving that new card data, seeded shuffle, status effects, debt, and FX scheduling compose through the real combat path.

## Deferred

- Target selection for sandbox cards.
- Full card view objects for the expanded deck.
