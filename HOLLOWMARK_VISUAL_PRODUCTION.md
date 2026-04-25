# HOLLOWMARK Visual Production Guide

This guide defines how HOLLOWMARK becomes beautiful without letting generated art take over the game.

## 1. Visual Thesis

The style phrase is:

**Moonlit oxblood dungeon manuscript.**

Meaning:

- old first-person RPG composition
- painterly pixel source art
- black negative space
- indigo stone
- oxblood corruption and UI enamel
- bone text and highlights
- warm torch accents
- damp low-fantasy horror

Beauty is not decoration. It is the product feature.

## 2. GPT Image 2 Rules

- Use GPT Image 2 for high-resolution source art.
- Do not ask for tiny final sprites directly.
- Do not rely on transparent output.
- Generate textless images only.
- Use low quality for draft exploration, then medium/high for candidates.
- Process, crop, matte, quantize, and downsample before anything enters the game.

Current practical constraint: `gpt-image-2` does not support transparent backgrounds. Use removable flat/dark backgrounds and local post-processing for sprites.

## 3. Asset State Machine

Every asset moves through:

`raw_generated` -> `candidate` -> `processed` -> `in_game_previewed` -> `approved` -> `manifested`

No state may be skipped for shipped assets.

## 4. Asset Passport

Every approved asset needs a sidecar or manifest entry with:

- `id`
- `kind`
- `biome`
- `promptPath`
- `sourceInputs`
- `rawSource`
- `processedPath`
- `finalSize`
- `palette`
- `cropNotes`
- `matteOrMaskNotes`
- `humanEditNotes`
- `inGamePreview`
- `approvalState`
- `rejectionNotes`

Gameplay data references `id`, never raw file paths.

## 5. Target Sizes

| Asset | Final size | Source target |
|---|---:|---:|
| Main viewport plate | 392x220 | 1568x880 or 2048x1152 |
| Enemy sprite | 96x128 | 768x1024 or 1024x1536 |
| Enemy portrait | 48x48 | crop from sprite source |
| Card art | 64x48 | 1024x768 |
| Town/service plate | 392x220 | 1568x880 or 2048x1152 |
| Wall material | 64x64 final crops | 1024x1024 sheet |
| UI ornaments | variable | 1024x1024 sheet |
| FX ingredients | variable atlas | 1024x1024 |

## 6. Palette

Final assets use a 32-color master palette or approved biome subpalette.

Rules:

- No pure white.
- No saturated primary colors.
- Healing is bone/gold or cyan-gold, not bright green.
- Corruption is oxblood/violet, not neon purple.
- UI borders are oxblood and blue-violet.
- Text is bone/parchment.

## 7. Prompt Templates

### Environment plate

```text
Create a textless first-person dungeon-crawler scene plate.
Scene: {scene_description}.
Camera: fixed grid-tile view, old-school first-person RPG perspective, centered focal point, strong foreground frame, deep black distance.
Style: moonlit oxblood dungeon manuscript; painterly pixel-art source for a 16-bit-inspired first-person dungeon RPG; high-contrast silhouettes; deep indigo shadows; bone-colored highlights; muted oxblood accents; sparse warm torch light; damp low-fantasy horror; limited-palette feeling; no clean modern UI; no text.
Lighting: warm off-screen torch plus cold moon ambience.
Use: source image will be cropped, palette-quantized, and downsampled into a 392x220 viewport.
Avoid: readable letters, UI, characters unless specified, wide-angle distortion, bright fantasy colors, photorealism, smooth vector art.
```

### Enemy source

```text
Create one enemy sprite source for a first-person party dungeon crawler.
Subject: {enemy_name}, {enemy_description}, single creature.
Pose: grounded combat idle, full body visible, three-quarter front view, readable silhouette, feet/contact point visible.
Lighting: warm torch from front-left, cold blue rim from upper-right, dark contact shadow below.
Style: moonlit oxblood dungeon manuscript; painterly pixel-art source for a 16-bit-inspired first-person dungeon RPG; high-contrast silhouettes; deep indigo shadows; bone-colored highlights; muted oxblood accents; damp low-fantasy horror; limited-palette feeling; no clean modern UI; no text.
Background: flat near-black or simple dark matte, easy to remove.
Use: will be background-removed, outlined, palette-quantized, and downsampled to 96x128.
Avoid: multiple creatures, cropped limbs, cute cartoon, anime style, bright saturated colors, photorealistic fur, modern objects.
```

### Card art

```text
Create textless card art for a dark first-person dungeon-crawler deckbuilder.
Card concept: {card_name} — {fantasy_effect}.
Visual metaphor: {visual_metaphor}.
Class: {class_name}; use subtle {class_motif} motifs.
Composition: tight crop, strong silhouette, readable at tiny size, no UI frame, no text, no numbers.
Style: moonlit oxblood dungeon manuscript; painterly pixel-art source for a 16-bit-inspired first-person dungeon RPG; high-contrast silhouettes; deep indigo shadows; bone-colored highlights; muted torch accents.
Use: will be cropped to 64x48 inside a card frame.
Avoid: readable lettering, modern symbols, bright saturated colors, detailed full battle scenes, anime style.
```

### UI ornaments

```text
Create a textless UI ornament sheet for a dark pixel-art dungeon RPG.
Contents: restrained panel corners, thin borders, dividers, button plates, card-frame corners, status-icon frames.
Style: moonlit oxblood dungeon manuscript, 16-bit RPG interface, dark indigo panels, oxblood enamel borders, bone/gold accents, worn metal, carved parchment.
Composition: separated items on a simple dark background, no words, no numbers, no logos, no full screen mockup.
Use: will be sliced into Phaser UI pieces and palette-quantized.
Avoid: modern clean UI, glossy mobile game style, excessive decoration, readable text, neon colors.
```

## 8. First Visual Targets

Do not start with marketing art.

Build visual confidence in this order:

1. UI shell with placeholder frame styling.
2. One S0 corridor/hallway view.
3. One combat background.
4. One enemy sprite.
5. Five readable placeholder cards.
6. One corruption/debt FX treatment.
7. One Marrowgate service plate.

## 9. Review Rubric

An asset or screenshot is not approved unless:

- the focal shape reads at thumbnail size
- no generated text appears
- the palette fits
- the silhouette is clear
- the UI remains readable
- the material is legible
- the asset works with adjacent assets
- the in-game preview looks better than the source file alone

Reject pretty assets that fail in-game.

## 10. Dev Scenes

Add these once the Phaser scaffold exists:

- `VisualGalleryScene`: preview backgrounds, sprites, cards, UI pieces, icons, and FX.
- `CombatSandboxScene`: spawn enemy formations, set hand/debt/HP, trigger card effects.
- `DungeonSandboxScene`: inspect wall, door, decor, fog, and view-slot combinations.

These scenes are production tools, not optional extras.
