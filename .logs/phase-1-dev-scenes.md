# Phase 1 Dev Scenes

Date: 2026-04-26
Status: complete

## Goal

Add production-tool scene stubs before expanding content or importing final art.

## Routes

- `?scene=combat-sandbox`
- `?scene=dungeon-sandbox`
- `?scene=visual-gallery`

The default route still boots S0.

## Scenes

- `CombatSandboxScene` previews representative feel events from keyboard
  triggers without playing the whole S0 loop.
- `DungeonSandboxScene` previews S0 floor position, facing, and computed view
  slots.
- `VisualGalleryScene` displays placeholder manifest entries only.

## Guardrails

- No generated art was added.
- Gameplay state is not mutated by dev scenes.
- The gallery uses stable placeholder asset ids, not raw generated paths.
- Browser tests assert each dev scene boots through query routing.

## Deferred

- Rich controls for each sandbox.
- Screenshot review artifacts.
- Asset passports and processing scripts.
- Final art import.

These scenes are scaffolding for production review, not content expansion.
