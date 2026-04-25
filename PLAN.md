# HOLLOWMARK — Game Design And Build Plan

> A first-person, grid-stepped, party dungeon crawler with compact shared-deck combat, painted pixel art, and a corruption system that turns greed into debt.

## 0. Thesis

HOLLOWMARK is not trying to win by being the first first-person deck crawler. That space already has nearby comps. It wins by being more authored, more beautiful, more tactile, and more thematically coherent: every step spends safety, every powerful card borrows from the future, and the dungeon remembers what the party owes.

The first goal is not a big game. The first goal is one unforgettable playable proof.

## 1. Hard Locks

- Phaser 3 + TypeScript + Vite.
- First-person grid movement with 90-degree turns.
- No strafe in v1.
- Internal resolution: `640x360`, integer-scaled only.
- Slot-based 2.5D renderer, not raycasting.
- Party of four fixed heroes.
- One shared party deck.
- Five-card combat hand.
- Three shared energy per player turn.
- One hold slot.
- Visible enemy intents.
- One hub town: Marrowgate.
- First playable content target: Underroot.
- No backend in v1. Saves are local and versioned.
- Final GPT Image 2 art comes after the placeholder loop proves itself.

## 2. Pillars

1. **Stepwise dread.** A step is a commitment, not traversal filler.
2. **One readable hand.** Five cards, three energy, one hold slot, visible enemy intent.
3. **Beautiful rot.** Indigo stone, oxblood frames, bone text, warm torch, wet roots, black void.
4. **Corruption is debt.** Power is useful because it creates a later bill.
5. **Juice over content.** One hallway with weight beats three flat regions.
6. **Every tile earns its place.** A tile teaches, threatens, tempts, reveals, rewards, blocks, rests, or escalates.

## 3. Signature Slice Gate

Before M0 expands into a general walking skeleton, build a tiny proof that explains the game in one screenshot and one short play loop.

### S0 — One Hallway, One Fight, One Screenshot

**Goal:** Prove the game identity before building breadth.

**Content:**

- One first-person hallway with a turn or door.
- One visible pre-combat threat cue.
- One short fight against one enemy.
- Four hero panels.
- Five-card shared hand.
- Three energy.
- One hold slot.
- One corruption/debt decision.
- Placeholder art only, but with final layout proportions and juice timing.

**Done when:**

- A single `640x360` screenshot communicates first-person dungeon, party state, card combat, enemy intent, and corruption pressure.
- A player can describe at least two plausible choices in the fight.
- One step feels tactile: bob, bump, sound, and threat feedback.
- The loop can be replayed deterministically from a seed or command log.

If S0 does not feel distinctive, do not move to content expansion.

## 4. Core Loops

### Moment loop

Observe tile -> decide movement/interact/retreat -> commit step or turn -> receive world feedback.

### Combat loop

Intent shown -> draw to five -> spend three energy -> optionally hold one card -> resolve player actions -> enemy acts -> debt/status changes.

### Dive loop

Enter Underroot -> navigate purposeful tiles -> take fights and debt -> reach rest/shortcut/boss -> return to Marrowgate changed.

### Meta loop

Settle debt in Marrowgate -> edit deck -> cleanse/accept scars -> choose another dive.

## 5. Purposeful Dungeon Grammar

Every authored tile uses a purpose contract. Empty filler is allowed only when it still contributes pressure, orientation, or pacing.

### Tile purpose types

- **Teach:** introduces one rule or affordance.
- **Threaten:** raises encounter pressure or previews danger.
- **Tempt:** offers reward with debt, risk, or route cost.
- **Reveal:** gives map, lore, enemy, or route information.
- **Reward:** grants card, gold, rest, shortcut, or safe knowledge.
- **Lock:** blocks progress until key, fight, lever, or debt choice.
- **Rest:** offers recovery with explicit cost.
- **Boss-pressure:** changes music, view, threat, or intent near a major fight.

### Tile contract fields

- `purpose`
- `movement`
- `visualRecipe`
- `threatEffect`
- `interaction`
- `logLine`
- `mapBehavior`
- `encounterIntentPreview`
- `testExpectation`

This contract feeds the renderer, minimap, browser smoke tests, and future content audits.

## 6. Movement And Exploration

- Forward step: `170ms`, ease-out, 2px bob.
- Back step: `210ms`, heavier.
- Turn: `130ms`, ease-in-out.
- One buffered input maximum.
- Wall bump: 100ms shake and thud.
- Threat is hidden; cues are visual, audio, and log tone.
- No free cursor exploration, object hunting, or dialogue trees in v1.

The first-person renderer uses deterministic slots to depth 3: front walls, side walls, floor/ceiling shade, fog, decor, doors, interactables, and enemy silhouettes.

## 7. Combat

### Party

- **Liese, Warrior:** guard, single-target damage, block transfer.
- **Eris, Priest:** heals, ward, cleanse, anti-corruption.
- **Mia, Mage:** AoE, weak, risky power.
- **Robin, Ranger:** mark, bleed, filtering, consistent ranged pressure.

### Shared-hand fiction

The hand is expedition attention under stress. A card is not abstract permission; it is one hero pushing an action into the moment. The hold slot is a promise or delayed intervention: the party is choosing to remember one option while everything else slips away.

Each card must show:

- owner hero
- cost
- target
- combat verb
- corruption/debt risk, if any
- concise rules text, maximum three short lines

### Starter combat shape

- 24-card starter deck: 6 cards per hero.
- Five-card hand.
- Three energy.
- One hold slot.
- Most cards cost 1.
- Cost 2 cards must feel dramatic.
- Cost 0 cards are setup, draw, or debt hooks, not efficient damage.

### Status cap

Seven statuses only:

- Block
- Poison
- Bleed
- Weak
- Vulnerable
- Mark
- Ward

Adding an eighth requires removing one.

### Enemy intents

Enemy intents are visible and readable as icon plus short value. Later, some intents can be previewed in exploration by scratches, sounds, silhouettes, door markings, or environmental cues.

Allowed normal intents:

- Attack one
- Attack row/all
- Block
- Buff ally
- Debuff hero
- Apply status
- Charge
- Corrupt

## 8. Corruption As Spatial Debt

Corruption is not primarily a morality meter. It is a debt ledger.

### Debt sources

- Corrupting cards.
- Enemy intent.
- Cursed doors.
- Shortcuts.
- Resting in unsafe places.
- Treasures that ask for a price.
- Retreating from certain encounters.

### Debt spends

- Gain energy.
- Draw or hold extra cards.
- Cancel or delay an enemy intent.
- Open a marked door.
- Reveal a route.
- Take a shortcut.
- Save a hero from collapse.

### Rupture thresholds

- **Touched:** one card mutates for the dive.
- **Frayed:** a Whisper enters the draw pile.
- **Marked:** corrupting cards gain power but hurt the owner.
- **Claimed:** the hero collapses after combat and must be recovered in Marrowgate.

### Marrowgate settlement

Marrowgate is not only a safe hub. It is where the bill is settled. Services can heal, cleanse, upgrade, or defer debt, but each service makes the cost visible.

## 9. World Scope

### Marrowgate

Menu-first hub with painted plates. No grid-walking town in v1.

Initial services:

- The Gate: enter Underroot.
- The Vellum: deck edit and upgrades.
- The Sanctuary: heal, cleanse, save.

Forge and Tavern are deferred until the slice needs them.

### Underroot

First vertical slice region.

Mood: beautiful claustrophobia. Roots reclaim stone. Nature is hungry, not healing.

First floor target:

- 10x10 effective playable space.
- 5 normal fights.
- 1 elite.
- 1 boss.
- 1 rest site.
- 3 rewards.
- 1 shortcut.
- 6-10 hero tiles or memorable views.

Do not start Drowned Ward or Hollowmark until Underroot is fun.

## 10. Juice Requirements

### Movement

- Camera bob.
- Material footsteps.
- Wall bump shake and thud.
- Torch/fog/threat shifts.
- Door latch then groan.

### Combat

- Card hover lift and readable expanded state.
- Card play: lift, glide, target flash, impact, discard.
- Hit-stop on damage.
- Screen shake scaled by hit weight.
- Damage number pop, drift, fade.
- HP/corruption bars tween.
- Enemy death: flash, stagger, fall/fade, lingering shadow.
- Victory: reward cards slide in, gold rolls up.

### UI

- Buttons have hover, pressed, disabled states.
- Combat log scrolls smoothly.
- Important state changes flash briefly.
- Nothing important relies on color alone.
- Reduced motion and shake intensity settings are required before ship.

## 11. Technical Architecture

Game Studio guidance for this project: Phaser owns rendering, camera, timing, sprite animation, audio, and effects. Pure TypeScript systems own rules.

### Boundaries

- `src/systems/`: pure movement, combat, threat, save, rewards, debt.
- `src/scenes/`: Boot, Title, Dungeon, Combat, Town, UI, dev sandboxes.
- `src/data/`: cards, enemies, floors, heroes, items.
- `src/ui/`: game UI components.
- `src/fx/`: hit-stop, shake, floating text, palette shifts.
- `src/input/`: input routing.
- `public/assets/manifest.json`: stable asset IDs.
- `scripts/`: validation, replay, asset processing, screenshot review.

### Required pure systems

- `attemptMove`
- `computeViewSlots`
- `advanceThreatClock`
- `drawCards`
- `validateTarget`
- `resolveTurn`
- `chooseEnemyIntent`
- `applyDebt`
- `serializeSave`
- `migrateSave`

Gameplay randomness uses seeded RNG stored in state.

## 12. Replayable Design Lab

Before broad content, create golden deterministic scenarios:

- S0 one-hallway fight.
- Energy-starved hand.
- Held-card payoff.
- Corruption bargain.
- Bad draw recovery.
- Intent preview into combat.
- Boss phase transition.

Each scenario should run in pure systems and be previewable in browser. Logs should expose:

- cards drawn
- energy spent/wasted
- debt gained/spent
- enemy intents
- no-choice turns
- death or near-death turns

This is a design instrument, not just a test harness.

## 13. Asset Pipeline Summary

See `HOLLOWMARK_VISUAL_PRODUCTION.md` for details.

Rules that affect design:

- GPT Image 2 is source-art production, not final pixel output.
- No generated UI text.
- No raw generated assets in gameplay.
- Every final asset is processed, previewed in-game, and approved.
- Gameplay data references asset IDs, not file paths.

## 14. Milestones

### S0 — Signature slice

One hallway, one fight, one debt choice, one screenshot.

### M0 — Walking skeleton

Phaser app boots, integer scaling works, movement works, one fake combat transition, save/load position and HP.

### M1 — Combat core

Shared deck, five-card hand, three energy, hold slot, four heroes, enemy intents, seven statuses, hit-stop, shake, floating text, draw/play/discard animation.

### M2 — Underroot vertical slice

Marrowgate Gate/Vellum/Sanctuary, one Underroot floor, threat, rest, treasures, elite, boss, rewards, corruption/debt, placeholder art.

### M3 — Visual production pass

Asset pipeline, processed GPT Image 2 source art, visual gallery, combat sandbox, dungeon sandbox, screenshot baselines, audio placeholders/finals.

### M4 — Region 1 complete

Underroot floors 1-3, more enemies, more cards, gear, more town services, balance pass.

### M5 — Campaign expansion

Drowned Ward and Hollowmark only after Region 1 is fun.

### M6 — Ship polish

Settings, accessibility, save migrations, bug bash, balance, deployment.

## 15. Testing Plan

### Unit

- Movement collision and facing.
- View slot calculation.
- Threat clock bands and triggers.
- Draw and reshuffle.
- Target validation.
- Energy spend.
- Status ticks.
- Debt thresholds and debt spends.
- Enemy intent selection.
- Save/load migration.

### Browser

- App loads.
- New run enters S0 hallway.
- Movement changes position/facing.
- Wall bump does not move player.
- Intent preview appears before combat.
- Combat starts.
- Card can be selected and played.
- Hold slot works.
- Debt choice affects hero state.
- Enemy dies and reward/return state appears.
- Save and reload preserve position and party state.

### Screenshot

- Corridor screenshot reads at thumbnail size.
- Busy combat screenshot has no overlapping UI.
- Party state, intent, energy, held card, and debt are legible.
- Visuals remain coherent at integer scales.

## 16. Non-Goals

- No multiplayer.
- No procedural 3D.
- No raycaster.
- No second town.
- No fifth hero.
- No dialogue trees.
- No final art flood before the playable slice works.
- No exposed threat number.
- No broad campaign content before Underroot is fun.

## 17. Open Decisions

- Whether Marrowgate debt settlement should be mostly economic, narrative, or mechanical in v1.
- Whether normal mode shows exact enemy damage numbers or descriptive threat bands.
- Whether the S0 fight should use wolf, cultist, or debt door as the first enemy/choice.
- Whether DOM overlays should be used for dense menus from M0 or introduced only once Phaser UI strains.
